// requirePremium.js — gate for premium-only endpoints.
//
// Uses the shared rule in config/entitlements.js: plan === 'premium', any trial
// still running, and the paid period (plus the grace days) not yet over. The
// end date is read from plan_renews_at OR the legacy plan_expires_at.
//
// Mount AFTER `authenticate` so req.user.id is set.
import db from '../config/db.js';
import { isPremiumUser } from '../config/entitlements.js';

export const requirePremium = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'Please log in.' });
    }

    const { rows } = await db.query(
      `SELECT plan, trial_ends_at, plan_renews_at, plan_expires_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    const isPremium = isPremiumUser(rows[0]);

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
