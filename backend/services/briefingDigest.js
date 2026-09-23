// ============================================================
// briefingDigest.js — the daily "Your StockAcademia briefing" alert (§13, §29).
//
// Once a day, tell each Premium user what changed since they last opened
// My Market: setups approaching / reaching entry, position updates, real thesis
// changes, and material news on their stocks. Sent only when something changed.
//
// It does NOT move last_briefing_at (that marks the user's last visit, so My
// Market can still show "since your last visit"). last_briefing_sent_on stops a
// scheduler that pings more than once a day from sending twice.
// ============================================================
import db from '../config/db.js';
import { dispatch } from './notificationEngine.js';
import { premiumSql } from '../config/entitlements.js';

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Pure: the alert text for a set of counts, or null when nothing changed. */
export function briefingMessage(c = {}) {
  const parts = [];
  if (c.approaching) parts.push(`${plural(c.approaching, 'setup')} approaching entry`);
  if (c.confirmed) parts.push(`${plural(c.confirmed, 'setup')} reaching the entry zone`);
  if (c.positions) parts.push(plural(c.positions, 'position update'));
  if (c.theses) parts.push(plural(c.theses, 'thesis change'));
  if (c.news) parts.push(`${plural(c.news, 'news item')} on your stocks`);
  return parts.length ? `Since your last visit: ${parts.join(', ')}.` : null;
}

// Today's date in Lagos, as YYYY-MM-DD.
export const lagosDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(d);

export async function sendDailyBriefings() {
  const today = lagosDate();
  const out = { users: 0, sent: 0 };
  try {
    const { rows: users } = await db.query(
      `SELECT u.id, COALESCE(u.last_briefing_at, NOW() - INTERVAL '1 day') AS since
         FROM users u
        WHERE ${premiumSql('u')}
          AND (u.last_briefing_sent_on IS NULL OR u.last_briefing_sent_on <> $1::date)`,
      [today]
    );

    for (const u of users) {
      out.users++;
      const { rows: [c] } = await db.query(
        `SELECT
           (SELECT COUNT(*) FROM ai_setup_events e JOIN ai_setups s ON s.id = e.setup_id
             WHERE s.user_id = $1 AND e.created_at > $2 AND e.to_status = 'approaching')::int AS approaching,
           (SELECT COUNT(*) FROM ai_setup_events e JOIN ai_setups s ON s.id = e.setup_id
             WHERE s.user_id = $1 AND e.created_at > $2 AND e.to_status IN ('triggered','confirmed','active'))::int AS confirmed,
           (SELECT COUNT(*) FROM position_events e JOIN positions p ON p.id = e.position_id
             WHERE p.user_id = $1 AND e.created_at > $2 AND e.kind <> 'note')::int AS positions,
           (SELECT COUNT(*) FROM thesis_events e JOIN investment_theses t ON t.id = e.thesis_id
             WHERE t.user_id = $1 AND e.created_at > $2
               AND e.from_state IS DISTINCT FROM e.to_state)::int AS theses`,
        [u.id, u.since]
      );
      // News arrives with migration_38; count 0 if the table isn't there yet.
      const news = await db.query(
        `SELECT COUNT(*)::int AS n FROM news_events ne
          WHERE ne.material AND ne.created_at > $2 AND ne.symbol IN (
            SELECT symbol FROM positions WHERE user_id = $1 AND status = 'open'
            UNION SELECT symbol FROM investment_theses WHERE user_id = $1
            UNION SELECT symbol FROM ai_setups WHERE user_id = $1 AND status NOT IN ('target','invalidated','expired')
            UNION SELECT s.symbol FROM watchlist w
                    JOIN stocks s ON UPPER(s.symbol) = UPPER(w.symbol) OR UPPER(s.display_symbol) = UPPER(w.symbol)
                   WHERE w.user_id = $1)`,
        [u.id, u.since]
      ).catch(() => ({ rows: [{ n: 0 }] }));

      const message = briefingMessage({ ...c, news: news.rows[0]?.n || 0 });
      if (message) {
        await dispatch({
          userId: u.id,
          category: 'market',
          type: 'briefing',
          title: 'Your StockAcademia briefing',
          message,
          deepLink: '/my-market',
          severity: 'info',
        });
        out.sent++;
      }
      // Mark today as done either way, so repeat pings don't recount.
      await db.query('UPDATE users SET last_briefing_sent_on = $1::date WHERE id = $2', [today, u.id]);
    }
  } catch (err) {
    console.error('sendDailyBriefings error:', err.message);
    out.error = err.message;
  }
  return out;
}
