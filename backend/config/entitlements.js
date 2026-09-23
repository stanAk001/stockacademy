// ============================================================
// entitlements.js — the single source of truth for Free vs Premium limits.
//
// Spec §20/§24: Free users don't get locked out — they get a TASTE, metered
// server-side, then a soft wall that sells Premium. Limits live here (not in a
// migration) so they're trivially tunable, and every one is overridable via env
// so we can loosen a funnel without a deploy.
//
// A limit of null = unlimited. Premium is unlimited on everything here; the
// per-day AI spend cap in routes/ai.js still applies on top as a cost backstop.
// ============================================================

const n = (envKey, fallback) => {
  const v = Number(process.env[envKey]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

// Each feature: how many a FREE user gets, and the window it resets on.
// period 'month' → resets on the 1st; 'day' → resets at midnight (server TZ).
export const FREE_LIMITS = {
  ai_scout:      { limit: n('FREE_SCOUT_LIMIT', 2),      period: 'month', label: 'Scout scans' },
  ai_analysis:   { limit: n('FREE_ANALYSIS_LIMIT', 3),   period: 'month', label: 'stock analyses' },
  ai_comparison: { limit: n('FREE_COMPARISON_LIMIT', 1), period: 'month', label: 'comparisons' },
  ai_research:   { limit: n('FREE_RESEARCH_LIMIT', 1),   period: 'month', label: 'research reports' },
  ai_news:       { limit: n('FREE_NEWS_LIMIT', 2),       period: 'month', label: 'news scans' },
  tracked_setup: { limit: n('FREE_TRACKED_SETUPS', 1),   period: 'total', label: 'tracked setups' },
};

// Features a Free user can see but only in preview form (no metering — the
// controller trims the payload). Listed here so the frontend and docs agree.
export const PREVIEW_FEATURES = new Set(['opportunity_radar', 'market_briefing']);

export function freeLimitFor(feature) {
  return FREE_LIMITS[feature] || null;
}

// ---- Premium membership window ---------------------------------------------
// After the paid period ends, Premium keeps working for GRACE_DAYS so a user who
// is a day late renewing doesn't lose monitoring and alerts. The lifecycle job
// (services/membership.js) reminds them REMINDER_DAYS before the end, warns them
// when it ends, and moves them to Free once the grace period is over.
export const GRACE_DAYS = n('PREMIUM_GRACE_DAYS', 2);
export const REMINDER_DAYS = n('PREMIUM_REMINDER_DAYS', 3);
const DAY_MS = 24 * 60 * 60 * 1000;

// The one access end date. Older payment paths wrote plan_expires_at, newer
// ones plan_renews_at; migration_39 syncs them, and this reads either.
export function accessEnd(u) {
  const v = u?.plan_renews_at || u?.plan_expires_at;
  return v ? new Date(v) : null;
}

// A user is premium if plan==='premium', any trial is still running, and the
// paid period (plus the grace days) hasn't passed. requirePremium, the metering
// middleware and every background job use this same rule.
export function isPremiumUser(u, now = Date.now()) {
  if (!u || u.plan !== 'premium') return false;
  const trialOk = !u.trial_ends_at || new Date(u.trial_ends_at).getTime() > now;
  const end = accessEnd(u);
  const paidOk = !end || end.getTime() + GRACE_DAYS * DAY_MS > now;
  return trialOk && paidOk;
}

// The same rule in SQL, for queries over many users. `a` is the users alias.
export const premiumSql = (a = 'u') => `${a}.plan = 'premium'
  AND (${a}.trial_ends_at IS NULL OR ${a}.trial_ends_at > NOW())
  AND (COALESCE(${a}.plan_renews_at, ${a}.plan_expires_at) IS NULL
       OR COALESCE(${a}.plan_renews_at, ${a}.plan_expires_at) + INTERVAL '${Number(GRACE_DAYS)} days' > NOW())`;
