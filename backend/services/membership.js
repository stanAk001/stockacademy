// ============================================================
// membership.js — the Premium membership lifecycle.
//
//   active ──(REMINDER_DAYS before end)──▶ ending_soon ──(end)──▶ grace ──(GRACE_DAYS)──▶ lapsed → Free
//
// runMembershipLifecycle() runs hourly (and via POST /api/cron/monitor):
//   ending_soon → one reminder per paid period ("renews on…" for auto-renew users)
//   grace       → one "your Premium ended, you keep access until…" notice
//   lapsed      → moved to Free, with a "your data is saved" notice
//
// Nobody is moved to Free without a warning first. If a user reaches "lapsed"
// without ever getting the "ended" notice (they expired before this system
// existed, or the job didn't run), they get the notice now and a full grace
// window from today.
//
// Retention, honestly: every notice says what Premium is doing for this user
// right now (their live setups, positions, theses, watchlist), and that
// renewing early loses nothing (the new period starts when the current one
// ends). Nothing is deleted on downgrade.
// ============================================================
import db from '../config/db.js';
import { dispatch } from './notificationEngine.js';
import { logEvent } from './analytics.js';
import { accessEnd, GRACE_DAYS, REMINDER_DAYS } from '../config/entitlements.js';

const DAY = 24 * 60 * 60 * 1000;
const LIFETIME_MS = 5 * 365 * DAY; // an end date this far away is a lifetime grant (e.g. admins)
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos',
});
const listJoin = (parts) => (parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`);

/** Pure: where is this user in the membership lifecycle? */
export function membershipState(u, now = Date.now()) {
  if (!u || u.plan !== 'premium') return { state: 'free' };
  const end = accessEnd(u);
  if (!end || end.getTime() - now > LIFETIME_MS) return { state: 'active', ends_at: end, lifetime: true };

  const t = end.getTime();
  const graceEnd = new Date(t + GRACE_DAYS * DAY);
  const base = { ends_at: end, grace_ends_at: graceEnd, lifetime: false };
  if (now < t - REMINDER_DAYS * DAY) return { ...base, state: 'active', days_left: Math.ceil((t - now) / DAY) };
  if (now < t) return { ...base, state: 'ending_soon', days_left: Math.max(1, Math.ceil((t - now) / DAY)) };
  if (now < graceEnd.getTime()) return { ...base, state: 'grace', days_left: 0 };
  return { ...base, state: 'lapsed', days_left: 0 };
}

/** Pure: "Premium is watching 3 setups, 2 positions and 1 investment thesis for you." */
export function keepingLine(k = {}) {
  const parts = [];
  if (k.setups) parts.push(plural(k.setups, 'setup'));
  if (k.positions) parts.push(plural(k.positions, 'position'));
  if (k.theses) parts.push(plural(k.theses, 'investment thesis', 'investment theses'));
  if (k.watchlist) parts.push(plural(k.watchlist, 'watched stock'));
  return parts.length ? `Premium is watching ${listJoin(parts)} for you.` : null;
}

/** Pure: title + message for a lifecycle notice. */
export function membershipMessage(kind, { endsAt, graceEndsAt, autoRenew, cardLast4, keeping } = {}, now = Date.now()) {
  const k = keeping ? ` ${keeping}` : '';
  if (kind === 'reminder') {
    if (autoRenew) {
      return {
        title: 'Your Premium renews soon',
        message: `Your Premium renews automatically on ${fmtDate(endsAt)}${cardLast4 ? ` (card ending ${cardLast4})` : ''}. There's nothing you need to do.${k}`,
      };
    }
    const days = Math.max(1, Math.ceil((new Date(endsAt).getTime() - now) / DAY));
    return {
      title: `Your Premium ends in ${plural(days, 'day')}`,
      message: `Your Premium ends on ${fmtDate(endsAt)}.${k} Renew now to keep it running: your new period starts when this one ends, so renewing early loses nothing.`,
    };
  }
  if (kind === 'expired') {
    return {
      title: 'Your Premium has ended',
      message: `Your Premium period ended on ${fmtDate(endsAt)}. You keep full access until ${fmtDate(graceEndsAt)}. Renew by then and nothing stops.${k}`,
    };
  }
  // downgraded
  return {
    title: "You're now on the Free plan",
    message: `Your Premium wasn't renewed, so your account has moved to Free. ${keeping ? keeping.replace(/^Premium is watching (.*) for you\.$/, 'Your $1 are saved.') : 'Everything you set up is saved.'} Renew any time to switch monitoring and alerts back on.`,
  };
}

/** Live counts of what Premium is doing for this user. Never throws. */
export async function keepingCounts(userId) {
  try {
    const { rows } = await db.query(
      `SELECT
         (SELECT COUNT(*) FROM ai_setups WHERE user_id = $1 AND status NOT IN ('target','invalidated','expired'))::int AS setups,
         (SELECT COUNT(*) FROM positions WHERE user_id = $1 AND status = 'open')::int AS positions,
         (SELECT COUNT(*) FROM investment_theses WHERE user_id = $1)::int AS theses,
         (SELECT COUNT(*) FROM watchlist WHERE user_id = $1)::int AS watchlist`,
      [userId]
    );
    return rows[0] || {};
  } catch {
    return {};
  }
}

// Record a notice for the user's CURRENT paid period (read in SQL, so the date
// matches exactly). Returns true only the first time: that's what keeps every
// notice to once per period, however often the job runs.
async function recordOnce(userId, kind) {
  const { rows } = await db.query(
    `INSERT INTO membership_events (user_id, kind, period_end)
     SELECT id, $2, COALESCE(plan_renews_at, plan_expires_at) FROM users
      WHERE id = $1 AND COALESCE(plan_renews_at, plan_expires_at) IS NOT NULL
     ON CONFLICT (user_id, kind, period_end) DO NOTHING
     RETURNING id`,
    [userId, kind]
  );
  return rows.length > 0;
}

async function notify(u, kind, s, now) {
  const keeping = keepingLine(await keepingCounts(u.id));
  const { title, message } = membershipMessage(kind, {
    endsAt: s.ends_at, graceEndsAt: s.grace_ends_at, autoRenew: u.auto_renew, cardLast4: u.card_last4, keeping,
  }, now);
  // Billing notices are account messages, so they go out on every channel the
  // user has (in-app always; push, Telegram and email where set up).
  await dispatch({
    userId: u.id, category: 'product', type: `membership_${kind}`, title, message,
    deepLink: '/pricing', severity: kind === 'reminder' ? 'info' : 'warning',
    channels: ['in_app', 'push', 'telegram', 'email'],
  });
  logEvent(u.id, `membership_${kind}`, { ends_at: s.ends_at });
}

export async function runMembershipLifecycle(now = Date.now()) {
  const out = { checked: 0, reminders: 0, expired: 0, downgraded: 0, fair_notice: 0 };
  try {
    const { rows } = await db.query(
      `SELECT id, plan, trial_ends_at, plan_renews_at, plan_expires_at, auto_renew, card_last4
         FROM users WHERE plan = 'premium'`
    );
    for (const u of rows) {
      out.checked++;
      const s = membershipState(u, now);
      if (s.lifetime || !s.ends_at) continue;

      if (s.state === 'ending_soon') {
        if (await recordOnce(u.id, 'reminder')) { await notify(u, 'reminder', s, now); out.reminders++; }
      } else if (s.state === 'grace') {
        if (await recordOnce(u.id, 'expired')) { await notify(u, 'expired', s, now); out.expired++; }
      } else if (s.state === 'lapsed') {
        const noticed = await db.query(
          `SELECT 1 FROM membership_events e JOIN users u ON u.id = e.user_id
            WHERE e.user_id = $1 AND e.kind = 'expired'
              AND e.period_end = COALESCE(u.plan_renews_at, u.plan_expires_at)`,
          [u.id]
        );
        if (!noticed.rows.length) {
          // Never warned: start a fair grace window today instead of cutting them off.
          await db.query(
            `UPDATE users SET plan_renews_at = NOW(), plan_expires_at = NOW() WHERE id = $1 AND plan = 'premium'`,
            [u.id]
          );
          await recordOnce(u.id, 'expired');
          await notify(u, 'expired', { ends_at: s.ends_at, grace_ends_at: new Date(now + GRACE_DAYS * DAY) }, now);
          out.expired++; out.fair_notice++;
        } else {
          const r = await db.query(`UPDATE users SET plan = 'free' WHERE id = $1 AND plan = 'premium' RETURNING id`, [u.id]);
          if (r.rows.length) {
            await recordOnce(u.id, 'downgraded');
            await notify(u, 'downgraded', s, now);
            out.downgraded++;
          }
        }
      }
    }
  } catch (err) {
    console.error('runMembershipLifecycle error:', err.message);
    out.error = err.message;
  }
  return out;
}
