// ============================================================
// positionsController.js — record + review real positions (spec §9, §16).
//
//   POST   /api/ai/positions          — record an entry (optionally from a setup)
//   GET    /api/ai/positions          — list the user's positions + latest event
//   GET    /api/ai/positions/:id      — one position + its full event history
//   PATCH  /api/ai/positions/:id      — edit stop / target / notes
//   POST   /api/ai/positions/:id/close— close it (records exit + realized P&L)
//   DELETE /api/ai/positions/:id      — delete
//
// Positions are Premium (continuous monitoring is the paid promise). Deterministic
// throughout; the post-trade review narrative is generated on demand elsewhere.
// ============================================================
import db from '../config/db.js';
import { logEvent } from '../services/analytics.js';
import { recordClosedTrade } from './journalController.js';

const num = (v) => (v === null || v === undefined || v === '' ? null : parseFloat(v));
const ccy = (c) => (c === 'NGN' ? '₦' : '$');

async function findStock(ticker) {
  const t = String(ticker || '').trim().toUpperCase();
  if (!t) return null;
  const { rows } = await db.query(
    `SELECT * FROM stocks WHERE UPPER(symbol) = $1 OR UPPER(display_symbol) = $1 LIMIT 1`,
    [t]
  );
  return rows[0] || null;
}

export const createPosition = async (req, res) => {
  try {
    const b = req.body || {};
    const stock = await findStock(b.symbol);
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found.' });

    const entry = num(b.entry_price);
    const qty = num(b.quantity);
    if (!(entry > 0) || !(qty > 0)) {
      return res.status(400).json({ success: false, message: 'Entry price and quantity must be positive numbers.' });
    }

    const market = stock.country === 'NG' ? 'NG' : 'US';
    const objective = b.objective === 'longterm' ? 'longterm' : 'swing';

    // If a setup_id is passed, only accept it when it belongs to this user.
    let setupId = null;
    if (b.setup_id) {
      const { rows } = await db.query('SELECT id FROM ai_setups WHERE id = $1 AND user_id = $2', [b.setup_id, req.user.id]);
      setupId = rows[0]?.id || null;
    }

    const { rows } = await db.query(
      `INSERT INTO positions
         (user_id, symbol, market, objective, setup_id, entry_price, quantity,
          entry_date, stop_price, target_price, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE($8, CURRENT_DATE), $9,$10,$11)
       RETURNING id`,
      [req.user.id, stock.symbol, market, objective, setupId, entry, qty,
       b.entry_date || null, num(b.stop_price), num(b.target_price), (b.notes || '').slice(0, 2000)]
    );
    const id = rows[0].id;
    await db.query(
      `INSERT INTO position_events (position_id, kind, to_state, note, price_at)
       VALUES ($1,'note','intact','Position recorded — now monitoring your thesis.',$2)`,
      [id, entry]
    );
    logEvent(req.user.id, 'position_created', { symbol: stock.symbol, market, objective });
    res.json({ success: true, id });
  } catch (err) {
    console.error('createPosition error:', err);
    res.status(500).json({ success: false, message: 'Could not record the position.' });
  }
};

function shape(r) {
  const entry = num(r.entry_price), price = num(r.last_price), qty = num(r.quantity);
  const unrealized = price != null ? +((price - entry) * qty).toFixed(2) : null;
  const changePct = price != null ? +(((price - entry) / entry) * 100).toFixed(2) : null;
  return {
    id: r.id,
    symbol: r.display_symbol || r.symbol,
    name: r.name,
    market: r.market,
    currency: r.currency,
    currency_symbol: ccy(r.currency),
    objective: r.objective,
    setup_id: r.setup_id,
    entry_price: entry,
    quantity: qty,
    entry_date: r.entry_date,
    stop_price: num(r.stop_price),
    target_price: num(r.target_price),
    last_price: price,
    unrealized_pnl: r.status === 'open' ? unrealized : null,
    change_pct: r.status === 'open' ? changePct : null,
    realized_pnl: num(r.realized_pnl),
    status: r.status,
    thesis_state: r.thesis_state,
    target_hit: r.target_hit,
    exit_price: num(r.exit_price),
    exit_date: r.exit_date,
    close_reason: r.close_reason,
    notes: r.notes,
    updated_at: r.updated_at,
  };
}

export const listPositions = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, s.display_symbol, s.name, s.currency, s.last_price,
              e.note AS last_note, e.created_at AS last_event_at, e.to_state AS last_state
         FROM positions p
         JOIN stocks s ON s.symbol = p.symbol
         LEFT JOIN LATERAL (
           SELECT note, created_at, to_state FROM position_events
           WHERE position_id = p.id ORDER BY created_at DESC LIMIT 1
         ) e ON TRUE
        WHERE p.user_id = $1
        ORDER BY CASE WHEN p.status = 'open' THEN 0 ELSE 1 END, p.updated_at DESC
        LIMIT 100`,
      [req.user.id]
    );
    res.json({
      success: true,
      positions: rows.map((r) => ({
        ...shape(r),
        last_event: r.last_note ? { note: r.last_note, state: r.last_state, at: r.last_event_at } : null,
      })),
    });
  } catch (err) {
    console.error('listPositions error:', err);
    res.status(500).json({ success: false, message: 'Failed to load positions' });
  }
};

export const getPosition = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, s.display_symbol, s.name, s.currency, s.last_price
         FROM positions p JOIN stocks s ON s.symbol = p.symbol
        WHERE p.id = $1 AND p.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: 'Position not found.' });
    const events = await db.query(
      `SELECT kind, from_state, to_state, note, price_at, created_at
         FROM position_events WHERE position_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ success: true, position: shape(rows[0]), events: events.rows });
  } catch (err) {
    console.error('getPosition error:', err);
    res.status(500).json({ success: false, message: 'Failed to load position' });
  }
};

export const updatePosition = async (req, res) => {
  try {
    const b = req.body || {};
    const { rowCount } = await db.query(
      `UPDATE positions SET stop_price = COALESCE($1, stop_price),
         target_price = COALESCE($2, target_price),
         notes = COALESCE($3, notes), updated_at = NOW()
       WHERE id = $4 AND user_id = $5 AND status = 'open'`,
      [num(b.stop_price), num(b.target_price), b.notes != null ? String(b.notes).slice(0, 2000) : null,
       req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: 'Open position not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('updatePosition error:', err);
    res.status(500).json({ success: false, message: 'Failed to update position' });
  }
};

export const closePosition = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM positions WHERE id = $1 AND user_id = $2 AND status = $3',
      [req.params.id, req.user.id, 'open']
    );
    const pos = rows[0];
    if (!pos) return res.status(404).json({ success: false, message: 'Open position not found.' });

    const exit = num(req.body?.exit_price);
    if (!(exit > 0)) return res.status(400).json({ success: false, message: 'Provide a valid exit price.' });
    const reasonIn = String(req.body?.close_reason || 'manual');
    const reason = ['target', 'stop', 'manual', 'thesis_change'].includes(reasonIn) ? reasonIn : 'manual';
    const pnl = +((exit - num(pos.entry_price)) * num(pos.quantity)).toFixed(2);

    await db.query(
      `UPDATE positions SET status='closed', exit_price=$1, exit_date=COALESCE($2, CURRENT_DATE),
         close_reason=$3, realized_pnl=$4, updated_at=NOW() WHERE id=$5`,
      [exit, req.body?.exit_date || null, reason, pnl, pos.id]
    );
    await db.query(
      `INSERT INTO position_events (position_id, kind, from_state, to_state, note, price_at)
       VALUES ($1,'closed',$2,'closed',$3,$4)`,
      [pos.id, pos.thesis_state, `Position closed at ${ccy(pos.currency)}${exit} (${reason}). P&L ${pnl >= 0 ? '+' : ''}${pnl}.`, exit]
    );
    logEvent(req.user.id, 'position_closed', { symbol: pos.symbol, reason, pnl });
    // Auto-journal the closed trade (best-effort — never blocks the close).
    await recordClosedTrade(pos, exit, pnl);
    res.json({ success: true, realized_pnl: pnl });
  } catch (err) {
    console.error('closePosition error:', err);
    res.status(500).json({ success: false, message: 'Failed to close position' });
  }
};

export const deletePosition = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM positions WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rowCount) return res.status(404).json({ success: false, message: 'Position not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('deletePosition error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete position' });
  }
};
