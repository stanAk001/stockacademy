// ============================================================
// watchlistMonitor.js — alert when a watched stock's status changes (§12, §29).
//
// For every Premium user's watchlist, compute the same smart status the
// watchlist page shows (smartStatus), compare it with the last one stored in
// ai_watchlist_insights, and alert only on a move INTO a status worth acting on.
//
// Noise guards: the first reading for a stock is stored silently (no alert on
// day one), and the same status never re-alerts within 72 hours, so a stock
// that flips back and forth across a threshold doesn't spam the user.
// ============================================================
import db from '../config/db.js';
import { dispatch } from './notificationEngine.js';
import { smartStatus } from '../controllers/watchlistController.js';
import { premiumSql } from '../config/entitlements.js';

const ALERT_STATUSES = new Set([
  'ready', 'confirmed', 'approaching', 'strong_setup',
  'fundamentally_attractive', 'thesis_weakening', 'thesis_invalidated',
]);
const COOLDOWN_MS = 72 * 3600 * 1000;

/** Pure: should a move from `prev` to `next` alert, given what was last alerted? */
export function shouldNotifyWatchlist(prev, next, lastAlert = {}, now = Date.now()) {
  if (!prev || !next || prev === next) return false; // first sighting, or no change
  if (!ALERT_STATUSES.has(next)) return false;
  if (lastAlert?.last_alert_status === next && lastAlert.last_alert_at
      && now - new Date(lastAlert.last_alert_at).getTime() < COOLDOWN_MS) return false;
  return true;
}

export async function monitorWatchlists() {
  let alerts = 0;
  try {
    const { rows } = await db.query(
      `SELECT w.user_id, s.symbol, s.display_symbol,
              s.roe, s.earnings_growth_yoy, s.debt_to_equity,
              t.trend, t.rsi14, t.setup, t.quality_score,
              a.status AS setup_status, th.state AS thesis_state,
              wi.status AS prev_status, wi.insight AS prev_insight
         FROM watchlist w
         JOIN users u ON u.id = w.user_id AND ${premiumSql('u')}
         JOIN stocks s ON UPPER(s.symbol) = UPPER(w.symbol) OR UPPER(s.display_symbol) = UPPER(w.symbol)
         LEFT JOIN stock_technicals t ON t.symbol = s.symbol
         LEFT JOIN LATERAL (
           SELECT status FROM ai_setups a
            WHERE a.user_id = w.user_id AND a.symbol = s.symbol
              AND a.status NOT IN ('target','invalidated','expired')
            ORDER BY updated_at DESC LIMIT 1
         ) a ON TRUE
         LEFT JOIN investment_theses th ON th.user_id = w.user_id AND th.symbol = s.symbol
         LEFT JOIN ai_watchlist_insights wi ON wi.user_id = w.user_id AND wi.symbol = s.symbol`
    );

    for (const r of rows) {
      if (!(r.trend || r.setup_status || r.thesis_state)) continue; // nothing to read yet
      const next = smartStatus(r);
      const prevInsight = r.prev_insight || {};
      const notify = shouldNotifyWatchlist(r.prev_status, next.status, prevInsight);
      if (r.prev_status === next.status && !notify) continue; // unchanged: no write needed

      const insight = {
        ...prevInsight,
        tone: next.tone,
        ...(notify ? { last_alert_status: next.status, last_alert_at: new Date().toISOString() } : {}),
      };
      await db.query(
        `INSERT INTO ai_watchlist_insights (user_id, symbol, status, headline, insight, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, symbol)
         DO UPDATE SET status = EXCLUDED.status, headline = EXCLUDED.headline,
                       insight = EXCLUDED.insight, updated_at = NOW()`,
        [r.user_id, r.symbol, next.status, next.headline, JSON.stringify(insight)]
      );

      if (notify) {
        const label = r.display_symbol || r.symbol;
        await dispatch({
          userId: r.user_id,
          category: 'market',
          type: 'watchlist_change',
          title: `${label}: watchlist update`,
          message: `${label}: ${next.headline}`,
          deepLink: '/watchlist',
          severity: next.tone === 'bear' ? 'warning' : 'info',
        });
        alerts++;
      }
    }
  } catch (err) {
    console.error('monitorWatchlists error:', err.message);
  }
  return alerts;
}
