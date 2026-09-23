// ============================================================
// pushService.js — Web Push delivery (VAPID).
//
// Deliberately defensive: web-push is dynamically imported and VAPID is read
// from env, so a host WITHOUT the dependency or the keys simply has push
// disabled — it never crashes the server or blocks a notification's other
// channels. Dead subscriptions (410/404 from the push service) are pruned.
//
// Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto: or https URL).
// Generate a keypair once with:  npx web-push generate-vapid-keys
// ============================================================
import db from '../config/db.js';

let webpush = null;
let ready = false;
let triedLoad = false;

async function ensure() {
  if (ready) return webpush;
  if (triedLoad && !ready) return null;
  triedLoad = true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return null; // keys not configured → push off
  try {
    const mod = await import('web-push');
    webpush = mod.default || mod;
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:support@stockacademia.com', pub, priv);
    ready = true;
    return webpush;
  } catch (e) {
    console.warn('[push] web-push not available:', e.message);
    return null;
  }
}

export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

/**
 * Send a push to every device a user has subscribed. Best-effort: prunes any
 * subscription the push service reports as gone. Returns how many were delivered.
 */
export async function sendPush(userId, { title, body, url = '/', tag } = {}) {
  const wp = await ensure();
  if (!wp) return 0;

  const { rows } = await db.query(
    'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );
  if (!rows.length) return 0;

  const payload = JSON.stringify({ title, body, url, tag: tag || 'stockacademia' });
  let sent = 0;

  await Promise.all(rows.map(async (s) => {
    const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
    try {
      await wp.sendNotification(subscription, payload);
      sent++;
      db.query('UPDATE push_subscriptions SET last_used_at = NOW() WHERE id = $1', [s.id]).catch(() => {});
    } catch (err) {
      // 404/410 = the browser dropped this subscription → remove it.
      if (err.statusCode === 404 || err.statusCode === 410) {
        db.query('DELETE FROM push_subscriptions WHERE id = $1', [s.id]).catch(() => {});
      } else {
        console.warn('[push] send failed:', err.statusCode || err.message);
      }
    }
  }));

  return sent;
}
