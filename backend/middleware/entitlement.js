// ============================================================
// entitlement.js — metered access middleware (the Free → Premium gate).
//
// Unlike requirePremium (hard 403), this lets a Free user THROUGH while they have
// allowance left, attaches req.entitlement, and only walls them off — with a
// 402 upsell payload the frontend renders as "Unlock full AI" — once they're out.
//
// It does NOT consume the slot. The controller calls consumeEntitlement(req)
// AFTER the work succeeds, so failed AI calls and cache hits never burn a slot.
// Premium users always pass and are never metered.
//
//   router.get('/scout', meterFeature('ai_scout'), stockScout)
//   // inside stockScout, on success:  await consumeEntitlement(req)
// ============================================================
import db from '../config/db.js';
import { checkAccess, consume } from '../services/entitlementService.js';
import { isPremiumUser } from '../config/entitlements.js';
import { logEvent } from '../services/analytics.js';

// For preview-able pages (Radar, My Market): let everyone through, but set
// req.isPremium so the controller can trim the payload for Free users.
// The trim happens server-side, so a Free user can't get the full board by
// calling the API directly.
export async function attachPlan(req, res, next) {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'Please log in.' });
    req.isPremium = isPremiumUser(await loadUserPlan(req));
    next();
  } catch (err) {
    console.error('attachPlan error:', err);
    res.status(500).json({ success: false, message: 'Server error checking access' });
  }
}

async function loadUserPlan(req) {
  // req.user from authenticate may not carry plan/renewal — fetch the fields the
  // entitlement check needs, once, and cache on req.
  if (req._planUser) return req._planUser;
  const { rows } = await db.query(
    `SELECT id, plan, trial_ends_at, plan_renews_at, plan_expires_at FROM users WHERE id = $1`,
    [req.user.id]
  );
  req._planUser = rows[0] || { id: req.user.id, plan: 'free' };
  return req._planUser;
}

export function meterFeature(feature) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) return res.status(401).json({ success: false, message: 'Please log in.' });
      const user = await loadUserPlan(req);
      const access = await checkAccess(user, feature);
      req.entitlement = { ...access, feature };

      if (!access.allowed) {
        logEvent(req.user.id, 'limit_reached', { feature, premium_only: !!access.premiumOnly });
        const label = access.premiumOnly ? 'This feature' : `Your free ${feature.replace(/^ai_/, '')} allowance`;
        return res.status(402).json({
          success: false,
          upgrade: true,
          feature,
          limit: access.limit,
          used: access.used,
          period: access.period,
          upgrade_url: '/pricing',
          message: access.premiumOnly
            ? 'This is a Premium feature. Upgrade to unlock continuous market intelligence.'
            : `${label} is used up (${access.used}/${access.limit} this ${access.period}). Upgrade to Premium for unlimited access.`,
        });
      }
      next();
    } catch (err) {
      console.error('meterFeature error:', err);
      res.status(500).json({ success: false, message: 'Server error checking access' });
    }
  };
}

// Call AFTER the metered work succeeds (never on error / cache hit).
export async function consumeEntitlement(req) {
  if (!req.user?.id || !req.entitlement) return;
  const user = req._planUser || req.user;
  await consume(user, req.entitlement.feature);
  logEvent(req.user.id, 'ai_feature_used', { feature: req.entitlement.feature, premium: !!req.entitlement.premium });
}

export default meterFeature;
