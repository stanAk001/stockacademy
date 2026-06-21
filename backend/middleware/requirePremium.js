// requirePremium.js — gate for premium-only endpoints.
//
// A user is premium if plan === 'premium' AND they are still inside either
// their trial window or their paid period:
//   (trial_ends_at IS NULL OR trial_ends_at > NOW())
//   AND (plan_renews_at IS NULL OR plan_renews_at > NOW())
//
// Mount AFTER `authenticate` so req.user.id is set.
import db from '../config/db.js';

export const requirePremium = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Please log in.' });
    }

    const { rows } = await db.query(
      `SELECT plan, trial_ends_at, plan_renews_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    const u = rows[0];

    const now = Date.now();
    const trialOk = !u?.trial_ends_at || new Date(u.trial_ends_at).getTime() > now;
    const paidOk = !u?.plan_renews_at || new Date(u.plan_renews_at).getTime() > now;
    const isPremium = u?.plan === 'premium' && trialOk && paidOk;

    if (!isPremium) {
      return res.status(403).json({
        success: false,
        message: 'This feature requires Premium',
        upgrade_url: '/pricing',
      });
    }

    next();
  } catch (err) {
    console.error('requirePremium error:', err);
    res.status(500).json({ success: false, message: 'Server error checking subscription' });
  }
};

export default requirePremium;
