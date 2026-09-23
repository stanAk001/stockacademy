// ============================================================
// positionMonitor.js — compare each open position's thesis to the market (§9).
//
// Runs on the price cron. Deterministic only — reads stocks.last_price against
// the position's OWN levels (entry / stop / target) and derives a thesis_state:
//   intact | strengthening | weakening | invalidated
// Notifies ONLY on a real state change or the first time a target is reached —
// never on raw ticks. No AI here; the narrative is generated on demand when the
// user opens the position (keeps background cost at zero — §29/§43).
// ============================================================
import db from '../config/db.js';
import { dispatch } from './notificationEngine.js';

const ccy = (c) => (c === 'NGN' ? '₦' : '$');
const f = (v) => Number(v).toFixed(2);

// Pure: the thesis state a position should be in at `price`. Forward-neutral —
// state can move both ways (a recovering position can go weakening → intact),
// but invalidation (stop hit) is terminal-ish and always wins.
export function deriveThesisState(entry, stop, target, price) {
  if (stop != null && price <= stop) return 'invalidated';
  // Big move toward/through target → strengthening.
  const up = (price - entry) / entry;
  if (target != null && price >= target) return 'strengthening';
  if (up >= 0.03) return 'strengthening';
  if (up <= -0.03) return 'weakening';
  return 'intact';
}

function stateNote(state, p) {
  const sym = ccy(p.currency);
  const label = p.display_symbol || p.symbol;
  switch (state) {
    case 'strengthening':
      return `📈 Your ${label} position is strengthening — price is ${sym}${f(p.last_price)}, above your ${sym}${f(p.entry_price)} entry. Thesis holding up.`;
    case 'weakening':
      return `⚠️ Your ${label} position is weakening — price slipped to ${sym}${f(p.last_price)} from your ${sym}${f(p.entry_price)} entry. Watch your ${p.stop_price != null ? `${sym}${f(p.stop_price)} stop` : 'invalidation level'}.`;
    case 'invalidated':
      return `🛑 Your ${label} thesis is invalidated — price hit your ${sym}${f(p.stop_price)} stop level. Time to review the trade.`;
    default:
      return `Your ${label} position: thesis intact at ${sym}${f(p.last_price)}.`;
  }
}

export async function monitorPositions() {
  let changed = 0;
  try {
    const { rows } = await db.query(
      `SELECT p.*, st.display_symbol, st.currency, st.last_price
         FROM positions p
         JOIN stocks st ON st.symbol = p.symbol
        WHERE p.status = 'open' AND st.last_price IS NOT NULL`
    );

    for (const p of rows) {
      const price = Number(p.last_price);
      const entry = Number(p.entry_price);
      const stop = p.stop_price != null ? Number(p.stop_price) : null;
      const target = p.target_price != null ? Number(p.target_price) : null;

      // Target reached — notify once (does not close the position; the user decides).
      if (!p.target_hit && target != null && price >= target) {
        await db.query('UPDATE positions SET target_hit = TRUE, updated_at = NOW() WHERE id = $1', [p.id]);
        const note = `🏆 Your ${p.display_symbol || p.symbol} position reached its ${ccy(p.currency)}${f(target)} target. Consider your plan from here.`;
        await db.query(
          `INSERT INTO position_events (position_id, kind, note, price_at) VALUES ($1,'target',$2,$3)`,
          [p.id, note, price]
        );
        await dispatch({
          userId: p.user_id, category: 'portfolio', type: 'position_target',
          title: 'Position target reached', message: note, deepLink: '/positions', severity: 'success',
        });
        changed++;
      }

      const next = deriveThesisState(entry, stop, target, price);
      if (next === p.thesis_state) continue;

      await db.query(
        'UPDATE positions SET thesis_state = $1, updated_at = NOW() WHERE id = $2 AND thesis_state = $3',
        [next, p.id, p.thesis_state]
      );
      const note = stateNote(next, p);
      await db.query(
        `INSERT INTO position_events (position_id, kind, from_state, to_state, note, price_at)
         VALUES ($1,'state_change',$2,$3,$4,$5)`,
        [p.id, p.thesis_state, next, note, price]
      );
      await dispatch({
        userId: p.user_id, category: 'portfolio', type: 'position_state',
        title: 'Position update', message: note, deepLink: '/positions',
        severity: next === 'invalidated' ? 'warning' : next === 'strengthening' ? 'success' : 'info',
      });
      changed++;
    }
  } catch (err) {
    console.error('monitorPositions error:', err.message);
  }
  return changed;
}
