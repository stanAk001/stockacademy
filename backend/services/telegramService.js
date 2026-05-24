import axios from 'axios';

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
    `🎉 <b>New StockAcademy Signup</b>\n\n` +
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
    `✅ <b>StockAcademy notifications are working!</b>\n\nYou'll receive alerts for:\n• New signups\n• Premium subscriptions\n• Mentorship bookings\n• Certificates issued\n\n🕐 ${formatTime()}`
  );
}

export default {
  notifyNewSignup,
  notifyNewPremium,
  notifyNewBooking,
  notifyNewCertificate,
  sendTestNotification,
};