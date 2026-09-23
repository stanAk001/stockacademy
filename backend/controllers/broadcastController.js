// ============================================================
// broadcastController.js — admin broadcast across in-app / push / Telegram.
//   POST /api/admin/broadcast          — send now to an audience
//   GET  /api/admin/broadcasts         — history
//
// Reuses the notification engine so a broadcast honours the same channels as any
// other notification. Audience is resolved to a user id list, then dispatched
// one by one (best-effort). Admin-gated in the controller.
// ============================================================
import db from '../config/db.js';
import { dispatch } from '../services/notificationEngine.js';

// swing / longterm target users by the objective they chose (users.objective).
const AUDIENCES = ['all', 'premium', 'free', 'push', 'swing', 'longterm'];
const CHANNELS = ['in_app', 'push', 'telegram'];

async function resolveAudience(audience) {
  if (audience === 'swing' || audience === 'longterm') {
    return db.query(`SELECT id FROM users WHERE objective = $1`, [audience]);
  }
  if (audience === 'premium') {
    return db.query(`SELECT id FROM users WHERE plan = 'premium'`);
  }
  if (audience === 'free') {
    return db.query(`SELECT id FROM users WHERE plan IS NULL OR plan <> 'premium'`);
  }
  if (audience === 'push') {
    return db.query(`SELECT DISTINCT user_id AS id FROM push_subscriptions`);
  }
  return db.query('SELECT id FROM users');
}

export const sendBroadcast = async (req, res) => {
  if (!req.user?.is_admin) return res.status(403).json({ success: false, message: 'Admins only' });
  try {
    const { title, body, deep_link } = req.body || {};
    const audience = AUDIENCES.includes(req.body?.audience) ? req.body.audience : 'all';
    const channels = Array.isArray(req.body?.channels)
      ? req.body.channels.filter((c) => CHANNELS.includes(c))
      : ['in_app'];
    if (!body || !body.trim()) return res.status(400).json({ success: false, message: 'Message body is required.' });
    if (!channels.length) return res.status(400).json({ success: false, message: 'Pick at least one channel.' });

    const { rows: recipients } = await resolveAudience(audience);
    const msg = body.trim();

    // Record history + respond right away with the intended reach; then deliver
    // in the BACKGROUND. Awaiting a fan-out to every user would hold the request
    // open for a large audience and risk a gateway timeout / partial send.
    try {
      await db.query(
        `INSERT INTO admin_broadcasts (admin_id, audience, channels, title, body, deep_link, sent_at, recipients, status)
         VALUES ($1,$2,$3,$4,$5,$6, NOW(), $7, 'sent')`,
        [req.user.id, audience, channels, title || null, msg, deep_link || null, recipients.length]
      );
    } catch (e) { console.warn('broadcast history insert failed:', e.message); }

    // Fire-and-forget delivery. Force the admin-chosen channels (a broadcast is an
    // intentional announcement, so it bypasses per-user category preferences).
    (async () => {
      for (const r of recipients) {
        await dispatch({
          userId: r.id, category: 'product', type: 'broadcast',
          title: title || 'StockAcademia', message: msg,
          deepLink: deep_link || null, severity: 'info', channels,
        }).catch(() => {});
      }
      console.log(`[broadcast] delivered to ${recipients.length} (${audience}) via ${channels.join(',')}`);
    })();

    res.json({ success: true, audience, channels, recipients: recipients.length });
  } catch (err) {
    console.error('sendBroadcast error:', err);
    res.status(500).json({ success: false, message: 'Broadcast failed' });
  }
};

export const listBroadcasts = async (req, res) => {
  if (!req.user?.is_admin) return res.status(403).json({ success: false, message: 'Admins only' });
  try {
    const { rows } = await db.query(
      `SELECT id, audience, channels, title, body, deep_link, sent_at, recipients, status, created_at
         FROM admin_broadcasts ORDER BY created_at DESC LIMIT 30`
    );
    res.json({ success: true, broadcasts: rows });
  } catch (err) {
    // Table not migrated yet → empty history rather than an error.
    res.json({ success: true, broadcasts: [] });
  }
};
