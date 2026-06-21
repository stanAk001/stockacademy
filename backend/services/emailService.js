import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, CLIENT_URL } = process.env;
const PORT = Number(SMTP_PORT) || 587;

export const isEmailConfigured = () => Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter = null;
function getTransporter() {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: PORT,
      secure: PORT === 465, // 465 = SSL, 587 = STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

// Clean, on-brand HTML wrapper (no external assets so it renders everywhere).
// `footer` lets each email set its own context line (price alert vs reset, etc.).
function shell(bodyHtml, footer) {
  const foot = footer || 'Educational analysis only — not financial advice.';
  return `<!doctype html><html><body style="margin:0;background:#FDF8F0;font-family:Arial,Helvetica,sans-serif;color:#0F1419;">
  <div style="max-width:520px;margin:0 auto;padding:24px;">
    <div style="background:#0F1419;border-radius:16px;padding:14px 20px;margin-bottom:16px;">
      <span style="color:#FBBF24;font-weight:800;font-size:18px;letter-spacing:.3px;">Stock<span style="color:#10B981;">Academia</span></span>
    </div>
    <div style="background:#ffffff;border:1px solid rgba(15,20,25,.06);border-radius:16px;padding:24px;line-height:1.55;">
      ${bodyHtml}
    </div>
    <p style="color:rgba(15,20,25,.5);font-size:11px;margin-top:16px;text-align:center;">
      ${foot}
    </p>
  </div></body></html>`;
}

export async function sendEmail({ to, subject, html, text, footer }) {
  const t = getTransporter();
  if (!t || !to) return false;
  try {
    await t.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject,
      text: text || undefined,
      html: html ? shell(html, footer) : undefined,
    });
    return true;
  } catch (err) {
    console.error('[email] send error:', err.message);
    return false;
  }
}

// Used by the price-alert engine for users who haven't linked Telegram.
export function priceAlertEmail({ label, verb, sym, price, target, direction, note }) {
  const url = `${CLIENT_URL || ''}/alerts`;
  return {
    subject: `🎯 ${label} hit your price target`,
    text: `${label} ${verb} ${sym}${price}. Your target was ${direction} ${sym}${target}.`,
    html:
      `<p style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#F43F5E;margin:0 0 6px;">Price alert hit</p>
       <h2 style="font-size:22px;margin:0 0 12px;">${label} ${verb} ${sym}${price}</h2>
       <p style="margin:0 0 4px;">Your target: <b>${direction} ${sym}${target}</b>.</p>
       ${note ? `<p style="color:rgba(15,20,25,.55);margin:8px 0 0;">📝 ${note}</p>` : ''}
       <a href="${url}" style="display:inline-block;margin-top:18px;background:#0F1419;color:#FDF8F0;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:999px;">View your alerts →</a>`,
  };
}

// Password-reset email — friendly, on-brand, with a clear one-tap button.
export function passwordResetEmail({ name, url, ttlMin }) {
  const safeName = String(name || '').replace(/[<>]/g, '').trim();
  const hi = safeName ? `, ${safeName}` : '';
  return {
    subject: 'Reset your StockAcademia password',
    text: `Forgot your password? Choose a new one with this link (valid for ${ttlMin} minutes, one use only): ${url}`,
    footer:
      "You're receiving this because a password reset was requested for your StockAcademia account. " +
      "If it wasn't you, you can safely ignore this email — nothing changes until the link is used.",
    html:
      `<p style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#F43F5E;margin:0 0 6px;">Password reset</p>
       <h2 style="font-size:22px;margin:0 0 12px;">Let's get you back in${hi}.</h2>
       <p style="margin:0 0 8px;">No problem — it happens. Tap the button below to choose a new password.</p>
       <p style="margin:0 0 4px;color:rgba(15,20,25,.6);">For your security, this link works <b>once</b> and expires in <b>${ttlMin} minutes</b>.</p>
       <a href="${url}" style="display:inline-block;margin-top:18px;background:#0F1419;color:#FDF8F0;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;">Reset my password →</a>
       <p style="margin:20px 0 0;font-size:12px;color:rgba(15,20,25,.5);">If the button doesn't work, paste this link into your browser:<br>
         <span style="word-break:break-all;color:#047857;">${url}</span></p>`,
  };
}
