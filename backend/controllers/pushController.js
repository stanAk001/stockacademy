// ============================================================
// pushController.js — Web Push subscription management.
//   GET  /api/push/vapid-public-key  — the key the browser needs to subscribe
//   POST /api/push/subscribe         — save this device's PushSubscription
//   POST /api/push/unsubscribe       — drop it
// ============================================================
import db from '../config/db.js';
import { vapidPublicKey, pushConfigured } from '../services/pushService.js';

export const getVapidKey = (req, res) => {
  res.json({ success: true, configured: pushConfigured(), key: vapidPublicKey() });
};

// How many devices of this user can actually receive a push. The UI uses it to
// tell "allowed here" apart from "allowed on my laptop, but not on my phone".
export const status = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT COUNT(*)::int AS devices, MAX(last_used_at) AS last_used FROM push_subscriptions WHERE user_id = $1',
      [req.user.id]
    );
    res.json({
      success: true,
      configured: pushConfigured(),
      devices: rows[0]?.devices || 0,
      last_used_at: rows[0]?.last_used || null,
    });
  } catch (err) {
    console.error('push status error:', err.message);
    res.status(500).json({ success: false, message: 'Could not read push status' });
  }
};

export const subscribe = async (req, res) => {
  try {
    const sub = req.body?.subscription || req.body;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      return res.status(400).json({ success: false, message: 'Invalid push subscription.' });
    }
    await db.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, last_used_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
             user_agent = EXCLUDED.user_agent, last_used_at = NOW()`,
      [req.user.id, endpoint, p256dh, auth, req.get('user-agent') || null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('push subscribe error:', err.message);
    res.status(500).json({ success: false, message: 'Could not save subscription' });
  }
};

export const unsubscribe = async (req, res) => {
  try {
    const endpoint = req.body?.endpoint;
    if (!endpoint) return res.status(400).json({ success: false, message: 'endpoint required' });
    await db.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [req.user.id, endpoint]);
    res.json({ success: true });
  } catch (err) {
    console.error('push unsubscribe error:', err.message);
    res.status(500).json({ success: false, message: 'Could not remove subscription' });
  }
};
