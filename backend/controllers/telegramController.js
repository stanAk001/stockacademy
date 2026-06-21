// telegramController.js — link-code flow + webhook + admin broadcast.
import crypto from 'crypto';
import db from '../config/db.js';
import { processTelegramUpdate, broadcastToPremium } from '../services/telegramService.js';

const escapeHtml = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* POST /api/telegram/link-code  — issue a fresh 15-minute code (authenticated) */
export const getLinkCode = async (req, res) => {
  try {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await db.query(
      'INSERT INTO telegram_link_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
      [req.user.id, code, expires]
    );
    res.json({
      success: true,
      code,
      expires_at: expires,
      bot_username: process.env.TELEGRAM_BOT_USERNAME || null,
      instructions: `Open the StockAcademia bot on Telegram and send:  /link ${code}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not generate a link code' });
  }
};

/* GET /api/telegram/status */
export const getTelegramStatus = async (req, res) => {
  const { rows } = await db.query('SELECT telegram_chat_id FROM users WHERE id = $1', [req.user.id]);
  res.json({ success: true, linked: Boolean(rows[0]?.telegram_chat_id) });
};

/* POST /api/telegram/unlink */
export const unlinkTelegram = async (req, res) => {
  await db.query('UPDATE users SET telegram_chat_id = NULL WHERE id = $1', [req.user.id]);
  res.json({ success: true, message: 'Telegram disconnected.' });
};

/* POST /api/webhooks/telegram — Telegram delivers updates here (public). */
export const telegramWebhook = async (req, res) => {
  try {
    await processTelegramUpdate(req.body);
  } catch (e) {
    console.error('telegram webhook error:', e.message);
  }
  res.sendStatus(200); // always 200 so Telegram doesn't retry-storm
};

/* POST /api/admin/broadcast-telegram — admin only */
export const broadcastTelegram = async (req, res) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ success: false, message: 'Admins only' });
  }
  const message = (req.body?.message || '').trim();
  if (!message) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }
  try {
    const result = await broadcastToPremium(`📣 <b>StockAcademia Premium</b>\n\n${escapeHtml(message)}`);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Broadcast failed' });
  }
};
