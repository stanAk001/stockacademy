// ============================================================
// flutterwaveWebhookController.js — the ONE Flutterwave webhook.
//
// Flutterwave (like Paystack) allows a single webhook URL per account, but we
// sell three things through it. The old per-product handlers
// (/api/plan/flutterwave-webhook, /api/bookings/flutterwave-webhook) could never
// all be wired at once — whichever URL you set, the other products got nothing.
//
// So this is the single entry point. It verifies the signature once and routes
// on the tx_ref prefix:
//
//   FLW_…      → premium upgrade      (plan_upgrades)
//   FLB_…      → mentorship booking   (bookings)
//   CERTFLW-…  → course certificate   (certificates)
//
// Point Flutterwave at:  POST /api/webhooks/flutterwave
// ============================================================
import db from '../config/db.js';
import { isPaid } from '../utils/paymentStatus.js';
import { grantCertificateForReference } from './certificateController.js';
import { activatePremiumViaFlutterwave } from './flutterwaveController.js';
import { confirmBookingViaFlutterwave } from './flutterwaveBookingController.js';
import { notifyNewPremium, notifyNewBooking } from '../services/telegramService.js';

const FLW_WEBHOOK_HASH = process.env.FLW_WEBHOOK_HASH || '';

export const flutterwaveWebhook = async (req, res) => {
  try {
    if (!FLW_WEBHOOK_HASH) return res.sendStatus(200); // not configured → ignore quietly

    if (req.headers['verif-hash'] !== FLW_WEBHOOK_HASH) {
      return res.status(401).send('invalid signature');
    }

    const event = req.body;
    if (event?.event !== 'charge.completed') return res.sendStatus(200);
    // Only act on money that actually landed. Pending/failed → nothing to do;
    // the client's polling handles the in-flight case.
    if (!isPaid(event?.data?.status)) return res.sendStatus(200);

    const data = event.data || {};
    const ref = String(data.tx_ref || '');
    const flwTxId = String(data.id || '');

    if (ref.startsWith('CERTFLW-')) {
      await handleCertificate(ref, data);
    } else if (ref.startsWith('FLB_')) {
      await handleBooking(ref, data, flwTxId);
    } else if (ref.startsWith('FLW_')) {
      await handlePremium(ref, data, flwTxId);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('flutterwave webhook error:', err);
    res.sendStatus(500);
  }
};

async function handleCertificate(ref, data) {
  const result = await grantCertificateForReference({
    reference: ref,
    amount: parseFloat(data.amount),
    userId: data?.meta?.user_id || null,
    email: data?.customer?.email,
  });
  if (!result.ok) console.warn('flw cert webhook could not issue:', ref, result.reason);
}

async function handleBooking(ref, data, flwTxId) {
  const { rows } = await db.query('SELECT * FROM bookings WHERE reference = $1', [ref]);
  const booking = rows[0];
  if (!booking || booking.payment_status === 'paid') return; // idempotent

  // Never trust the wire amount — it must match what we charged.
  if (parseFloat(data.amount) !== booking.amount_kobo / 100 || data.currency !== booking.currency) {
    console.error('flw booking webhook amount mismatch:', ref);
    return;
  }

  await confirmBookingViaFlutterwave(booking.id, ref, flwTxId);

  const updated = await db.query('SELECT * FROM bookings WHERE id = $1', [booking.id]);
  const st = await db.query('SELECT name FROM session_types WHERE id = $1', [booking.session_type_id]);
  notifyNewBooking(updated.rows[0], st.rows[0]?.name || 'Mentorship Session').catch(() => {});
}

async function handlePremium(ref, data, flwTxId) {
  const { rows } = await db.query('SELECT * FROM plan_upgrades WHERE reference = $1', [ref]);
  const upgrade = rows[0];
  if (!upgrade || upgrade.status === 'paid') return; // idempotent

  if (parseFloat(data.amount) !== upgrade.amount_kobo / 100 || data.currency !== upgrade.currency) {
    console.error('flw premium webhook amount mismatch:', ref);
    return;
  }

  await activatePremiumViaFlutterwave(upgrade.user_id, ref, flwTxId);

  const u = await db.query('SELECT id, username, email, full_name FROM users WHERE id = $1', [upgrade.user_id]);
  if (u.rows[0]) notifyNewPremium(u.rows[0], upgrade.amount_kobo, upgrade.currency, 'flutterwave').catch(() => {});
}
