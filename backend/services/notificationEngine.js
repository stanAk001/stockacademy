// ============================================================
// notificationEngine.js — ONE place that decides how a notification reaches a user.
//
//   event → dispatch() → preferences → channels { in-app · push · Telegram · email }
//
// Every new feature notifies through here instead of wiring its own fan-out, so
// user preferences and entitlement are honoured in exactly one place. Delivery is
// best-effort per channel: one channel failing never blocks the others, and a
// missing preferences row means "defaults" (opt-out model), so existing users
// need no backfill.
// ============================================================
import db from '../config/db.js';
import { sendToUser } from './telegramService.js';
import { sendPush } from './pushService.js';
import { sendEmail } from './emailService.js';

const DEFAULT_PREF = { in_app: true, push: true, telegram: true, email: false };
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function getPref(userId, category) {
  try {
    const { rows } = await db.query(
      'SELECT in_app, push, telegram, email FROM notification_preferences WHERE user_id = $1 AND category = $2',
      [userId, category]
    );
    return rows[0] || DEFAULT_PREF;
  } catch {
    return DEFAULT_PREF; // table not migrated yet → defaults
  }
}

// Insert the in-app (bell) row. Falls back to a minimal insert if the newer
// category/deep_link/severity columns aren't there yet.
async function insertInApp({ userId, type, message, category, deepLink, severity }) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, message, category, deep_link, severity)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, type, message, category, deepLink, severity]
    );
  } catch {
    try {
      await db.query('INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)', [userId, type, message]);
    } catch (e) { console.warn('[notify] in-app insert failed:', e.message); }
  }
}

/**
 * Deliver one notification across the channels the user allows.
 * @param {object} o
 * @param {number} o.userId
 * @param {string} o.category      trading | ai | portfolio | market | news | product
 * @param {string} o.type          short machine tag (e.g. 'ai_setup')
 * @param {string} o.title         push/telegram/email heading
 * @param {string} o.message       the body (also the bell text)
 * @param {string=} o.deepLink     in-app path to open on click (e.g. '/setups')
 * @param {string=} o.severity     info | success | warning | critical
 * @param {string[]=} o.channels   force a channel set, bypassing preferences
 * @param {string=} o.telegramHtml pre-formatted Telegram HTML (else built from title+message)
 */
export async function dispatch({
  userId, category = 'product', type = category, title, message,
  deepLink = null, severity = 'info', channels = null, telegramHtml = null,
}) {
  if (!userId || !message) return;
  const pref = await getPref(userId, category);
  const want = (ch) => (channels ? channels.includes(ch) : pref[ch]);

  const { rows } = await db.query('SELECT email, telegram_chat_id FROM users WHERE id = $1', [userId]);
  const u = rows[0] || {};

  if (want('in_app')) {
    await insertInApp({ userId, type, message, category, deepLink, severity });
  }
  if (want('push')) {
    sendPush(userId, { title: title || 'StockAcademia', body: message, url: deepLink || '/' }).catch(() => {});
  }
  if (want('telegram') && u.telegram_chat_id) {
    sendToUser(userId, telegramHtml || `<b>${escapeHtml(title || 'StockAcademia')}</b>\n\n${escapeHtml(message)}`).catch(() => {});
  }
  if (want('email') && u.email) {
    sendEmail({
      to: u.email,
      subject: title || 'StockAcademia update',
      html: `<p>${escapeHtml(message)}</p>`,
      text: message,
    }).catch(() => {});
  }
}
