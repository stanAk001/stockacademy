// ============================================================
// thesisController.js — long-term Investment Thesis tracking (§10/§11).
//
//   POST   /api/ai/theses          — start tracking a thesis (snapshots baseline)
//   GET    /api/ai/theses          — the user's theses + current state
//   GET    /api/ai/theses/:id      — one thesis + its change history (Why changed?)
//   DELETE /api/ai/theses/:id      — stop tracking
//
// Premium. The baseline is the fundamentals AT CREATION so thesisMonitor can later
// diff current vs baseline and explain exactly what moved. Quality is a transparent
// tier (strong/solid/speculative) — never an opaque 0-100 score.
// ============================================================
import db from '../config/db.js';
import { logEvent } from '../services/analytics.js';

const num = (v) => (v === null || v === undefined || v === '' ? null : parseFloat(v));

// The exact fields thesisMonitor diffs — snapshot them so the comparison is apples
// to apples even if we add columns later.
function baselineFrom(s) {
  return {
    revenue_growth_yoy: num(s.revenue_growth_yoy),
    earnings_growth_yoy: num(s.earnings_growth_yoy),
    net_margin: num(s.net_margin),
    roe: num(s.roe),
    debt_to_equity: num(s.debt_to_equity),
    dividend_yield: num(s.dividend_yield),
    snapshot_at: new Date().toISOString(),
    price_at: num(s.last_price),
  };
}

async function findStock(ticker) {
  const t = String(ticker || '').trim().toUpperCase();
  if (!t) return null;
  const { rows } = await db.query(
    `SELECT * FROM stocks WHERE UPPER(symbol) = $1 OR UPPER(display_symbol) = $1 LIMIT 1`,
    [t]
  );
  return rows[0] || null;
}

export const createThesis = async (req, res) => {
  try {
    const b = req.body || {};
    const stock = await findStock(b.symbol);
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found.' });

    const market = stock.country === 'NG' ? 'NG' : 'US';
    const tier = ['strong', 'solid', 'speculative'].includes(b.quality_tier) ? b.quality_tier : null;
    const watch = Array.isArray(b.watch_items) ? b.watch_items.slice(0, 8).map((s) => String(s).slice(0, 200)) : [];

    const { rows } = await db.query(
      `INSERT INTO investment_theses (user_id, symbol, market, quality_tier, summary, baseline, watch_items, last_reviewed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())
       ON CONFLICT (user_id, symbol)
       DO UPDATE SET quality_tier = EXCLUDED.quality_tier, summary = EXCLUDED.summary,
         baseline = EXCLUDED.baseline, watch_items = EXCLUDED.watch_items,
         state = 'intact', last_reviewed_at = NOW(), updated_at = NOW()
       RETURNING id`,
      [req.user.id, stock.symbol, market, tier, (b.summary || '').slice(0, 3000),
       JSON.stringify(baselineFrom(stock)), JSON.stringify(watch)]
    );
    logEvent(req.user.id, 'thesis_created', { symbol: stock.symbol, market });
    res.json({ success: true, id: rows[0].id });
  } catch (err) {
    console.error('createThesis error:', err);
    res.status(500).json({ success: false, message: 'Could not start the thesis.' });
  }
};

export const listTheses = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, s.display_symbol, s.name, s.currency, s.last_price,
              e.note AS last_note, e.created_at AS last_event_at
         FROM investment_theses t
         JOIN stocks s ON s.symbol = t.symbol
         LEFT JOIN LATERAL (
           SELECT note, created_at FROM thesis_events
           WHERE thesis_id = t.id ORDER BY created_at DESC LIMIT 1
         ) e ON TRUE
        WHERE t.user_id = $1
        ORDER BY CASE t.state WHEN 'invalidated' THEN 0 WHEN 'weakening' THEN 1 ELSE 2 END, t.updated_at DESC
        LIMIT 100`,
      [req.user.id]
    );
    res.json({
      success: true,
      theses: rows.map((t) => ({
        id: t.id,
        symbol: t.display_symbol || t.symbol,
        name: t.name,
        market: t.market,
        currency: t.currency,
        last_price: num(t.last_price),
        quality_tier: t.quality_tier,
        summary: t.summary,
        watch_items: t.watch_items || [],
        state: t.state,
        last_reviewed_at: t.last_reviewed_at,
        last_event: t.last_note ? { note: t.last_note, at: t.last_event_at } : null,
        updated_at: t.updated_at,
      })),
    });
  } catch (err) {
    console.error('listTheses error:', err);
    res.status(500).json({ success: false, message: 'Failed to load theses' });
  }
};

export const getThesis = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT t.*, s.display_symbol, s.name, s.currency, s.last_price
         FROM investment_theses t JOIN stocks s ON s.symbol = t.symbol
        WHERE t.id = $1 AND t.user_id = $2`,
      [req.params.id, req.user.id]
    );
    const t = rows[0];
    if (!t) return res.status(404).json({ success: false, message: 'Thesis not found.' });
    const events = await db.query(
      `SELECT from_state, to_state, note, changed_fields, created_at
         FROM thesis_events WHERE thesis_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({
      success: true,
      thesis: {
        id: t.id, symbol: t.display_symbol || t.symbol, name: t.name, market: t.market,
        currency: t.currency, last_price: num(t.last_price), quality_tier: t.quality_tier,
        summary: t.summary, baseline: t.baseline, watch_items: t.watch_items || [],
        state: t.state, last_reviewed_at: t.last_reviewed_at, created_at: t.created_at,
      },
      events: events.rows,
    });
  } catch (err) {
    console.error('getThesis error:', err);
    res.status(500).json({ success: false, message: 'Failed to load thesis' });
  }
};

export const deleteThesis = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM investment_theses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rowCount) return res.status(404).json({ success: false, message: 'Thesis not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteThesis error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete thesis' });
  }
};
