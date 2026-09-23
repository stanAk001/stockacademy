// ============================================================
// analytics.js — fire-and-forget product event logging (spec §41).
//
// Records funnel + retention events (scout_used, upgrade_clicked, setup_created,
// …) to analytics_events. Never throws, never blocks the request — a logging
// failure must not affect the user's response.
// ============================================================
import db from '../config/db.js';

export function logEvent(userId, event, props = null) {
  // Intentionally not awaited by callers; swallow all errors.
  db.query(
    `INSERT INTO analytics_events (user_id, event, props) VALUES ($1, $2, $3)`,
    [userId || null, String(event).slice(0, 48), props ? JSON.stringify(props) : null]
  ).catch((e) => console.error('analytics logEvent failed:', e.message));
}

export default { logEvent };
