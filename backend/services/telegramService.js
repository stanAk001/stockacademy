import axios from 'axios';
import db from '../config/db.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const isConfigured = () => Boolean(BOT_TOKEN && ADMIN_CHAT_ID);

async function sendToAdmin(text, options = {}) {
  if (!isConfigured()) {
    console.log('[telegram] skipped — not configured');
    return;
  }
  try {
    await axios.post(
      `${TELEGRAM_API}/sendMessage`,
      {
        chat_id: ADMIN_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options,
      },
      { timeout: 5000 }
    );
    console.log('[telegram] sent OK');
  } catch (err) {
    console.error('[telegram] send error:', err.response?.data || err.message);
  }
}

const formatTime = (date = new Date()) =>
  date.toLocaleString('en-NG', {
    timeZone: 'Africa/Lagos',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const escape = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export async function notifyNewSignup(user, method = 'email') {
  const methodEmoji = method === 'google' ? '🔐 Google' : '📧 Email';
  const text =
    `🎉 <b>New StockAcademia Signup</b>\n\n` +
    `👤 <b>${escape(user.full_name || user.username || 'Unnamed')}</b>\n` +
    `📧 ${escape(user.email)}\n` +
    `👥 @${escape(user.username)}\n` +
    `📱 ${methodEmoji}\n` +
    `🆔 User ID: ${user.id}\n` +
    `🕐 ${formatTime()}`;

  await sendToAdmin(text);
}

export async function notifyNewPremium(user, amount_kobo, currency, processor) {
  const amount =
    currency === 'USD'
      ? `$${(amount_kobo / 100).toFixed(2)}`
      : `₦${(amount_kobo / 100).toLocaleString()}`;

  const text =
    `💎 <b>New Premium Subscription!</b>\n\n` +
    `👤 ${escape(user.full_name || user.username)}\n` +
    `📧 ${escape(user.email)}\n` +
    `💰 ${amount}\n` +
    `💳 via ${processor === 'flutterwave' ? 'Flutterwave (intl)' : 'Paystack (NG)'}\n` +
    `🕐 ${formatTime()}`;

  await sendToAdmin(text);
}

export async function notifyNewBooking(booking, sessionTypeName) {
  const amount =
    booking.currency === 'USD'
      ? `$${(booking.amount_kobo / 100).toFixed(2)}`
      : `₦${(booking.amount_kobo / 100).toLocaleString()}`;

  const date = new Date(booking.session_date).toLocaleDateString('en-NG', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  });

  const text =
    `📅 <b>New Mentorship Booking!</b>\n\n` +
    `👤 ${escape(booking.name)}\n` +
    `📧 ${escape(booking.email)}\n` +
    `📞 ${escape(booking.phone || 'No phone')}\n` +
    `🎯 ${escape(sessionTypeName)}\n` +
    `📆 ${date} at ${booking.start_time}\n` +
    `💰 ${amount}\n` +
    `💳 via ${booking.processor === 'flutterwave' ? 'Flutterwave (intl)' : 'Paystack (NG)'}\n` +
    (booking.notes ? `\n📝 <i>${escape(booking.notes)}</i>\n` : '') +
    `🕐 Booked: ${formatTime()}`;

  await sendToAdmin(text);
}

export async function notifyNewCertificate(cert, wasFree) {
  const type = wasFree ? '🌟 Premium (free)' : `💰 Paid ₦${cert.amount_paid}`;
  const text =
    `🎓 <b>New Certificate Issued!</b>\n\n` +
    `👤 ${escape(cert.full_name)}\n` +
    `🔖 Cert #: ${escape(cert.certificate_number)}\n` +
    `${type}\n` +
    `🕐 ${formatTime()}`;

  await sendToAdmin(text);
}

export async function sendTestNotification() {
  await sendToAdmin(
    `✅ <b>StockAcademia notifications are working!</b>\n\nYou'll receive alerts for:\n• New signups\n• Premium subscriptions\n• Mentorship bookings\n• Certificates issued\n\n🕐 ${formatTime()}`
  );
}

// ============================================================
// PREMIUM CHANNEL — direct messages to linked premium users
// ============================================================

// Send a message to a specific Telegram chat (a linked user).
export async function sendToChat(chatId, text, options = {}) {
  if (!BOT_TOKEN || !chatId) {
    console.log('[telegram] sendToChat skipped — not configured / no chat id');
    return false;
  }
  try {
    await axios.post(
      `${TELEGRAM_API}/sendMessage`,
      { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...options },
      { timeout: 5000 }
    );
    return true;
  } catch (err) {
    console.error('[telegram] sendToChat error:', err.response?.data || err.message);
    return false;
  }
}

// Send a message to ONE user (by id) if they've linked Telegram. Returns
// true if delivered. Used for personal pings like price alerts.
export async function sendToUser(userId, htmlText) {
  try {
    const { rows } = await db.query(
      'SELECT telegram_chat_id FROM users WHERE id = $1 AND telegram_chat_id IS NOT NULL',
      [userId]
    );
    if (!rows[0]?.telegram_chat_id) return false;
    return await sendToChat(rows[0].telegram_chat_id, htmlText);
  } catch (e) {
    console.error('[telegram] sendToUser error:', e.message);
    return false;
  }
}

// Broadcast to every premium user with a linked Telegram chat.
// Plan is re-checked AT SEND TIME so lapsed/free users never receive messages.
export async function broadcastToPremium(htmlText) {
  const { rows } = await db.query(
    `SELECT telegram_chat_id FROM users
      WHERE plan = 'premium'
        AND telegram_chat_id IS NOT NULL
        AND (trial_ends_at  IS NULL OR trial_ends_at  > NOW())
        AND (plan_renews_at IS NULL OR plan_renews_at > NOW())`
  );
  let sent = 0, failed = 0;
  for (const r of rows) {
    const ok = await sendToChat(r.telegram_chat_id, htmlText);
    ok ? sent++ : failed++;
  }
  return { recipients: rows.length, sent, failed };
}

// Notify the admin that a user submitted a portfolio review.
export async function notifyPortfolioReviewSubmitted(user) {
  const text =
    `📝 <b>New portfolio review submitted</b>\n\n` +
    `👤 ${escape(user.full_name || user.username || 'Unnamed')}\n` +
    `📧 ${escape(user.email)}\n` +
    `🕐 ${formatTime()}\n\n` +
    `Open the admin → Portfolio reviews page to respond.`;
  await sendToAdmin(text);
}

// Notify a single user that their portfolio review is ready.
export async function notifyReviewComplete(chatId) {
  return sendToChat(
    chatId,
    `✅ <b>Your portfolio review is ready</b>\n\nYour StockAcademia mentor has replied. Open your dashboard to read the response.`
  );
}

// Handle an incoming Telegram update (from the webhook). Supports /start and
// "/link CODE" to connect a chat to a StockAcademia account.
export async function processTelegramUpdate(update) {
  const msg = update?.message;
  const text = msg?.text?.trim();
  const chatId = msg?.chat?.id;
  if (!text || !chatId) return;

  // /start, or /start CODE from a one-tap deep link (t.me/<bot>?start=CODE)
  const start = text.match(/^\/start(?:\s+([A-Za-z0-9]+))?$/);
  if (start) {
    if (start[1]) return void linkChatToCode(start[1].toUpperCase(), chatId);
    await sendToChat(
      chatId,
      `👋 <b>Welcome to StockAcademia.</b>\n\nTo link this chat to your account, open your Profile, tap "Connect Telegram", and follow the link — or send:\n\n<code>/link YOUR_CODE</code>`
    );
    return;
  }

  const m = text.match(/^\/link\s+([A-Za-z0-9]+)/);
  if (m) return void linkChatToCode(m[1].toUpperCase(), chatId);
}

// Match a link code to a user account and connect this chat to it.
async function linkChatToCode(code, chatId) {
  const { rows } = await db.query('SELECT * FROM telegram_link_codes WHERE code = $1', [code]);
  const row = rows[0];
  if (!row) return void sendToChat(chatId, '❌ That code is invalid. Generate a fresh one from your Profile.');
  if (row.used) return void sendToChat(chatId, '❌ That code was already used. Generate a fresh one.');
  if (new Date(row.expires_at) < new Date())
    return void sendToChat(chatId, '❌ That code has expired. Generate a fresh one from your Profile.');

  await db.query('UPDATE telegram_link_codes SET used = TRUE WHERE id = $1', [row.id]);
  await db.query('UPDATE users SET telegram_chat_id = $1 WHERE id = $2', [String(chatId), row.user_id]);
  await sendToChat(
    chatId,
    `✅ <b>Linked!</b> This chat is now connected to your StockAcademia account. You'll get price-alert pings and Premium updates right here.`
  );
}

// ============================================================
// LOCAL DEV: long-polling — no public webhook needed.
// Enable with TELEGRAM_POLLING=true in .env (great for localhost).
// In production leave it OFF and use the webhook instead — a bot can't
// use a webhook and polling at the same time.
// ============================================================
let polling = false;
export async function startTelegramPolling() {
  if (!BOT_TOKEN) {
    console.log('[telegram] polling skipped — no TELEGRAM_BOT_TOKEN set');
    return;
  }
  if (polling) return;
  polling = true;

  // Drop any existing webhook, otherwise getUpdates is rejected (409).
  try { await axios.get(`${TELEGRAM_API}/deleteWebhook`); } catch { /* ignore */ }
  console.log('🤖 Telegram bot listening via long-polling (local mode)');

  let offset = 0;
  for (;;) {
    try {
      const { data } = await axios.get(`${TELEGRAM_API}/getUpdates`, {
        params: { offset, timeout: 30 },
        timeout: 35000,
      });
      for (const update of data.result || []) {
        offset = update.update_id + 1;
        processTelegramUpdate(update).catch((e) => console.error('[telegram] update error:', e.message));
      }
    } catch (err) {
      // Network blip or timeout — pause briefly, then keep listening.
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export default {
  notifyNewSignup,
  notifyNewPremium,
  notifyNewBooking,
  notifyNewCertificate,
  sendTestNotification,
};