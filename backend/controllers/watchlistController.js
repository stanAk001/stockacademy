import db from '../config/db.js';
import { watchlistInsight } from '../services/indicators.js';

const num = (v) => (v === null || v === undefined ? null : parseFloat(v));

// Layer the user's OWN activity (tracked setups, investment theses) and the
// stock's fundamentals on top of the raw technicals read, so each watched stock
// shows what's actually happening with it (spec §12). Priority: a tracked thesis
// or setup lifecycle is the most decision-relevant, then a fundamental read, then
// the technicals fallback. Returns { status, headline, tone } — the frontend
// colours by tone, so new statuses render safely.
// Exported: the background watchlist monitor uses the same read.
export function smartStatus(r) {
  const tech = r.trend
    ? watchlistInsight({ trend: r.trend, rsi14: num(r.rsi14), setup: r.setup, quality_score: r.quality_score })
    : null;

  // 1) A long-term thesis the user is tracking wins.
  if (r.thesis_state) {
    const m = {
      strengthening: ['thesis_strengthening', 'Your thesis is strengthening — fundamentals improving.', 'bull'],
      weakening: ['thesis_weakening', 'Your thesis is weakening — worth a look at the fundamentals.', 'bear'],
      invalidated: ['thesis_invalidated', 'Thesis invalidated — the story materially changed.', 'bear'],
      intact: ['thesis_intact', 'Thesis intact — no material change.', 'ink'],
    };
    const [status, headline, tone] = m[r.thesis_state] || m.intact;
    return { status, headline, tone };
  }

  // 2) A swing setup the user is tracking, by its lifecycle stage.
  if (r.setup_status) {
    const m = {
      active: ['ready', 'Setup active — price is in your entry zone.', 'bull'],
      triggered: ['ready', 'Setup triggered — watch for follow-through.', 'bull'],
      confirmed: ['confirmed', 'Setup confirmed — conditions have lined up.', 'bull'],
      approaching: ['approaching', 'Approaching your entry zone.', 'bull'],
      watching: ['developing', 'Setup developing — being monitored.', 'ink'],
    };
    const [status, headline, tone] = m[r.setup_status] || ['developing', 'Being monitored.', 'ink'];
    return { status, headline, tone };
  }

  // 3) No position yet, but the fundamentals stand out.
  const roe = num(r.roe), eg = num(r.earnings_growth_yoy), de = num(r.debt_to_equity);
  const noSetup = !r.setup || r.setup === 'none';
  if (roe != null && roe >= 15 && (eg == null || eg >= 0) && (de == null || de <= 1.5) && noSetup) {
    return { status: 'fundamentally_attractive', headline: 'Fundamentally attractive — strong returns, healthy balance sheet.', tone: 'bull' };
  }

  // 4) Fall back to the pure technicals read.
  return tech || { status: 'no_data', headline: 'No read yet — technicals are still being computed.', tone: 'ink' };
}

// The full query pulls the user's tracked setup + thesis + a few fundamentals.
// Those tables arrive in later migrations, so if the join fails (not migrated
// yet) we fall back to the original technicals-only read — the watchlist must
// never break.
async function listEnriched(userId) {
  const { rows } = await db.query(
    `SELECT w.*, s.display_symbol, s.name AS stock_name, s.currency, s.last_price, s.day_change_pct,
            s.roe, s.earnings_growth_yoy, s.debt_to_equity,
            t.trend, t.rsi14, t.setup, t.quality_score,
            a.status AS setup_status, th.state AS thesis_state
       FROM watchlist w
       LEFT JOIN stocks s
         ON UPPER(s.symbol) = UPPER(w.symbol) OR UPPER(s.display_symbol) = UPPER(w.symbol)
       LEFT JOIN stock_technicals t ON t.symbol = s.symbol
       LEFT JOIN LATERAL (
         SELECT status FROM ai_setups a
          WHERE a.user_id = w.user_id AND a.symbol = s.symbol
            AND a.status NOT IN ('target','invalidated','expired')
          ORDER BY updated_at DESC LIMIT 1
       ) a ON TRUE
       LEFT JOIN investment_theses th ON th.user_id = w.user_id AND th.symbol = s.symbol
      WHERE w.user_id = $1
      ORDER BY w.added_at DESC`,
    [userId]
  );
  return rows;
}

async function listBasic(userId) {
  const { rows } = await db.query(
    `SELECT w.*, s.display_symbol, s.name AS stock_name, s.currency, s.last_price, s.day_change_pct,
            t.trend, t.rsi14, t.setup, t.quality_score
       FROM watchlist w
       LEFT JOIN stocks s
         ON UPPER(s.symbol) = UPPER(w.symbol) OR UPPER(s.display_symbol) = UPPER(w.symbol)
       LEFT JOIN stock_technicals t ON t.symbol = s.symbol
      WHERE w.user_id = $1
      ORDER BY w.added_at DESC`,
    [userId]
  );
  return rows;
}

export const list = async (req, res) => {
  try {
    let rows;
    try { rows = await listEnriched(req.user.id); }
    catch (e) { console.warn('watchlist enriched read failed, using basic:', e.message); rows = await listBasic(req.user.id); }

    const watchlist = rows.map((r) => ({
      ...r,
      currency: r.currency || 'USD',
      last_price: num(r.last_price),
      day_change_pct: num(r.day_change_pct),
      tracked_setup: !!r.setup_status,
      has_thesis: !!r.thesis_state,
      insight: (r.trend || r.setup_status || r.thesis_state) ? smartStatus(r) : null,
    }));

    res.json({ success: true, watchlist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load watchlist' });
  }
};

export const add = async (req, res) => {
  try {
    const { symbol, company_name, note } = req.body;
    if (!symbol) return res.status(400).json({ success: false, message: 'Symbol required' });

    if (req.user.plan !== 'premium') {
      const count = await db.query('SELECT COUNT(*) FROM watchlist WHERE user_id = $1', [req.user.id]);
      if (parseInt(count.rows[0].count) >= 5) {
        return res.status(403).json({
          success: false,
          message: 'Free plan allows up to 5 stocks. Upgrade to Premium for unlimited watchlist.',
          upgrade: true,
        });
      }
    }

    const { rows } = await db.query(
      `INSERT INTO watchlist (user_id, symbol, company_name, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, symbol) DO UPDATE SET note = EXCLUDED.note
       RETURNING *`,
      [req.user.id, symbol.toUpperCase(), company_name, note]
    );
    res.json({ success: true, item: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add' });
  }
};

export const remove = async (req, res) => {
  try {
    const { symbol } = req.params;
    await db.query('DELETE FROM watchlist WHERE user_id = $1 AND symbol = $2', [req.user.id, symbol.toUpperCase()]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to remove' });
  }
};
