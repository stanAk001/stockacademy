// ============================================================
// entitlementService.js — read/increment Free usage, decide access.
//
// The whole Free→Premium funnel runs through here. Premium users bypass every
// count (they're unlimited). Free users are metered against FREE_LIMITS inside a
// rolling window keyed by a truncated period_start, so a new month/day just lands
// on a fresh row — no reset cron needed.
//
// checkAccess() is READ-ONLY (does not consume). Consume AFTER the work succeeds,
// via consume(), so a failed AI call or a cache hit never burns a Free slot.
// ============================================================
import db from '../config/db.js';
import { FREE_LIMITS, freeLimitFor, isPremiumUser } from '../config/entitlements.js';

// Window start for a period. 'total' = a fixed epoch so the row is permanent.
function periodStart(period) {
  const now = new Date();
  if (period === 'day') return now.toISOString().slice(0, 10);            // YYYY-MM-DD
  if (period === 'total') return '1970-01-01';
  // month
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

async function currentUsage(userId, feature, period) {
  const start = periodStart(period);
  try {
    const { rows } = await db.query(
      `SELECT used FROM feature_usage
        WHERE user_id = $1 AND feature = $2 AND period = $3 AND period_start = $4`,
      [userId, feature, period, start]
    );
    return rows[0]?.used || 0;
  } catch (e) {
    // Before migration_34 is applied the table won't exist — don't 500 the user.
    // Treat as "no usage yet" so Free access still works; consume() is a no-op too.
    console.error('feature_usage read failed (treating as 0):', e.message);
    return 0;
  }
}

/**
 * checkAccess — can this user use `feature` right now? Read-only.
 * @returns {Promise<{ allowed, premium, limit, used, remaining, period, feature }>}
 */
export async function checkAccess(user, feature) {
  const cfg = freeLimitFor(feature);
  if (isPremiumUser(user)) {
    return { allowed: true, premium: true, limit: null, used: 0, remaining: null, period: cfg?.period || 'month', feature };
  }
  // No configured Free limit for this feature → treat as premium-only.
  if (!cfg) {
    return { allowed: false, premium: false, limit: 0, used: 0, remaining: 0, period: 'month', feature, premiumOnly: true };
  }
  const used = await currentUsage(user.id, feature, cfg.period);
  const remaining = Math.max(0, cfg.limit - used);
  return { allowed: remaining > 0, premium: false, limit: cfg.limit, used, remaining, period: cfg.period, feature };
}

/**
 * consume — record one use for a Free user. No-op for Premium. Best-effort:
 * a metering failure must never break the feature the user just paid for / used.
 */
export async function consume(user, feature) {
  if (isPremiumUser(user)) return;
  const cfg = freeLimitFor(feature);
  if (!cfg) return;
  const start = periodStart(cfg.period);
  try {
    await db.query(
      `INSERT INTO feature_usage (user_id, feature, period, period_start, used, updated_at)
       VALUES ($1, $2, $3, $4, 1, NOW())
       ON CONFLICT (user_id, feature, period, period_start)
       DO UPDATE SET used = feature_usage.used + 1, updated_at = NOW()`,
      [user.id, feature, cfg.period, start]
    );
  } catch (e) {
    console.error('entitlement consume failed:', e.message);
  }
}

// A full snapshot of a user's Free allowances — for the dashboard/upgrade UI.
export async function usageSummary(user) {
  const premium = isPremiumUser(user);
  const out = {};
  for (const [feature, cfg] of Object.entries(FREE_LIMITS)) {
    if (premium) { out[feature] = { premium: true, limit: null, used: 0, remaining: null, label: cfg.label }; continue; }
    const used = await currentUsage(user.id, feature, cfg.period);
    out[feature] = {
      premium: false, limit: cfg.limit, used,
      remaining: Math.max(0, cfg.limit - used), period: cfg.period, label: cfg.label,
    };
  }
  return { premium, features: out };
}
