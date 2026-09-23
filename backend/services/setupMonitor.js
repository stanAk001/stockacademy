// ============================================================
// setupMonitor.js — advance tracked swing setups through their lifecycle.
//
// Runs on the price cron. For every live setup it compares the latest price to
// the setup's own levels and moves it forward through:
//   watching → approaching → triggered → active → target
//                                       ↘ invalidated   (any state, terminal)
//                                       ↘ expired        (past expires_at)
// A notification fires ONLY on a real stage change — never on raw ticks. Levels
// come from the setup itself (set deterministically at creation); the monitor
// never invents a number.
// ============================================================
import db from '../config/db.js';
import { dispatch } from './notificationEngine.js';

const TERMINAL = new Set(['target', 'invalidated', 'expired']);
const ORDER = { watching: 0, approaching: 1, triggered: 2, confirmed: 3, active: 4 };
const ccy = (c) => (c === 'NGN' ? '₦' : '$');
const f = (v) => Number(v).toFixed(2);

// Pure: given the current status, the setup's levels, and the price, return the
// status it should now be in. Forward-only (a dip can't demote an active setup),
// except the terminal invalidation/target transitions, which always win.
export function advanceSetupStatus(current, levels, price) {
  if (TERMINAL.has(current)) return current;
  const { entry_low, entry_high, invalidation, targets } = levels;
  if (price <= invalidation) return 'invalidated';

  const levelVals = (targets || []).map((t) => t.level).filter((n) => Number.isFinite(n));
  const lastTarget = levelVals.length ? Math.max(...levelVals) : null;
  const engaged = ORDER[current] >= ORDER.triggered;
  if (engaged && lastTarget != null && price >= lastTarget) return 'target';

  const entryMid = (entry_low + entry_high) / 2;
  const buffer = Math.max(entryMid - invalidation, entry_high - entry_low) * 0.5;

  let cand;
  if (price > entry_high) cand = 'active';
  else if (price >= entry_low) cand = 'triggered';
  else if (price >= entry_low - buffer) cand = 'approaching';
  else cand = 'watching';

  return ORDER[cand] > ORDER[current] ? cand : current;
}

function message(status, s) {
  const sym = ccy(s.currency);
  const label = s.display_symbol || s.symbol;
  const t = (s.targets || []).map((x) => `${sym}${f(x.level)}`).join(' / ');
  switch (status) {
    case 'approaching':
      return `👀 ${label} is approaching your entry zone (${sym}${f(s.entry_low)}–${sym}${f(s.entry_high)}).`;
    case 'triggered':
      return `🎯 ${label} entered the ${sym}${f(s.entry_low)}–${sym}${f(s.entry_high)} entry zone. Watch for confirmation.`;
    case 'active':
      return `✅ ${label} setup is active — price cleared ${sym}${f(s.entry_high)}.${t ? ` Targets: ${t}.` : ''}`;
    case 'target':
      return `🏆 ${label} reached its target. Nice read.`;
    case 'invalidated':
      return `⚠️ ${label} setup invalidated — price hit its ${sym}${f(s.invalidation)} stop level.`;
    case 'expired':
      return `⌛ ${label} setup expired without triggering.`;
    default:
      return `${label} setup update: ${status}.`;
  }
}

/**
 * Advance every live setup once. Cheap: reads stocks.last_price (already kept
 * fresh by the price cron), so it can run on a short interval.
 */
export async function monitorSetups() {
  let changed = 0;
  try {
    const { rows } = await db.query(
      `SELECT s.*, st.display_symbol, st.currency, st.last_price, u.telegram_chat_id
         FROM ai_setups s
         JOIN stocks st ON st.symbol = s.symbol
         JOIN users u ON u.id = s.user_id
        WHERE s.status NOT IN ('target','invalidated','expired')
          AND st.last_price IS NOT NULL`
    );

    for (const s of rows) {
      const price = Number(s.last_price);
      let next;
      if (s.expires_at && new Date(s.expires_at).getTime() < Date.now()) {
        next = 'expired';
      } else {
        next = advanceSetupStatus(s.status, {
          entry_low: Number(s.entry_low),
          entry_high: Number(s.entry_high),
          invalidation: Number(s.invalidation),
          targets: s.targets || [],
        }, price);
      }
      if (next === s.status) continue;

      // Move first so a crash mid-loop can't re-fire the same transition.
      await db.query('UPDATE ai_setups SET status = $1, updated_at = NOW() WHERE id = $2 AND status = $3',
        [next, s.id, s.status]);

      const note = message(next, s);
      await db.query(
        `INSERT INTO ai_setup_events (setup_id, from_status, to_status, note, price_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [s.id, s.status, next, note, price]
      );

      // One dispatch → bell + push + Telegram, per the user's preferences.
      await dispatch({
        userId: s.user_id,
        category: 'ai',
        type: 'ai_setup',
        title: 'AI Swing Radar',
        message: note,
        deepLink: '/setups',
        severity: next === 'invalidated' ? 'warning' : next === 'target' ? 'success' : 'info',
        telegramHtml: `<b>AI Swing Radar</b>\n\n${note}`,
      });
      changed++;
    }
  } catch (err) {
    console.error('monitorSetups error:', err.message);
  }
  return changed;
}
