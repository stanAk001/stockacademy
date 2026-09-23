// ============================================================
// pushReminder.js — nudge users who are monitoring stocks but have no device
// receiving push.
//
// Why this exists: monitoring is only worth anything if the alert reaches the
// user's phone. Someone who tracked a setup but never allowed notifications
// finds out only when they next open the monitoring page — which is exactly the
// thing we promised they wouldn't have to do.
//
// The reminder itself goes out on the channels they DO have (bell + Telegram/
// email per their preferences), and deep-links to the place that asks for
// permission. At most one per user every REMIND_EVERY_DAYS, enforced by looking
// for the previous reminder in `notifications` — no extra table, no migration.
// ============================================================
import db from '../config/db.js';
import { dispatch } from './notificationEngine.js';

const REMIND_EVERY_DAYS = Number(process.env.PUSH_REMINDER_DAYS || 14);
const TYPE = 'push_reminder';

/**
 * Find users who are monitoring something, have zero push subscriptions, and
 * haven't been reminded recently. Best-effort: never throws into the cron.
 * @returns {Promise<{reminded:number}>}
 */
export async function remindMissingPush() {
  let reminded = 0;
  try {
    const { rows } = await db.query(
      `WITH monitoring AS (
         SELECT user_id, COUNT(*)::int AS n FROM price_alerts WHERE triggered = FALSE AND user_id IS NOT NULL GROUP BY user_id
         UNION ALL
         SELECT user_id, COUNT(*)::int FROM watchlist WHERE user_id IS NOT NULL GROUP BY user_id
         UNION ALL
         SELECT user_id, COUNT(*)::int FROM positions WHERE user_id IS NOT NULL GROUP BY user_id
         UNION ALL
         SELECT user_id, COUNT(*)::int FROM investment_theses WHERE user_id IS NOT NULL GROUP BY user_id
         UNION ALL
         SELECT user_id, COUNT(*)::int FROM ai_setups WHERE user_id IS NOT NULL GROUP BY user_id
       ), totals AS (
         SELECT user_id, SUM(n)::int AS watching FROM monitoring GROUP BY user_id
       )
       SELECT t.user_id, t.watching
       FROM totals t
       WHERE NOT EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id = t.user_id)
         AND NOT EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.user_id = t.user_id AND n.type = $1
             AND n.created_at > NOW() - ($2 || ' days')::interval
         )
       LIMIT 500`,
      [TYPE, String(REMIND_EVERY_DAYS)]
    );

    for (const r of rows) {
      const n = r.watching;
      const thing = n === 1 ? '1 stock' : `${n} stocks`;
      await dispatch({
        userId: r.user_id,
        category: 'product',
        type: TYPE,
        title: 'Turn on phone alerts',
        message:
          `We're watching ${thing} for you, but nothing can reach your phone yet. ` +
          `Turn on notifications and we'll ping you the moment a price, entry or target is hit — ` +
          `no need to open the app to find out.`,
        deepLink: '/profile?notifications=1',
        severity: 'warning',
      });
      reminded++;
    }
  } catch (err) {
    // A missing table on an un-migrated host must not break the monitor run.
    console.warn('[pushReminder] skipped:', err.message);
  }
  return { reminded };
}
