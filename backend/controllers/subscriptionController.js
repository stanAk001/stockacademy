// ============================================================
// subscriptionController.js — Premium access via Paystack (PAY-FIRST model)
//
// No free trial. A user pays for a period (monthly/annual, NGN/USD) through
// Paystack — by CARD, BANK TRANSFER, USSD, Opay, etc. — and Premium is granted
// for that period. When plan_renews_at passes, access lapses until they pay
// again. Abuse-proof (nothing free to exploit) and transfer-friendly.
//
// OPTIONAL card auto-renew: if a user pays by card AND opts in, we store the
// reusable Paystack authorization and a daily cron (runAutoRenewals) charges it
// ~1 day before each period ends. Transfer/USSD can't auto-renew (no token).
//
//   POST /api/subscriptions/start   → initialise a Paystack transaction
//   POST /api/subscriptions/verify  → confirm payment + grant access
//   POST /api/webhooks/paystack     → authoritative grant (works even if the
//                                     user closes the tab before /verify)
//   GET  /api/subscriptions         → current status for the UI
//   POST /api/subscriptions/cancel  → informational (access lapses on its own)
//
// Every meaningful event is recorded in subscription_events.
// ============================================================
import crypto from 'crypto';
import axios from 'axios';
import db from '../config/db.js';
import { notifyNewPremium, sendToChat } from '../services/telegramService.js';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET || PAYSTACK_SECRET;
const PAYSTACK_BASE = 'https://api.paystack.co';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Amounts are in the smallest unit (kobo for NGN, cents for USD).
const PRICES = {
  NGN: {
    monthly: { amount: 350000,  currency: 'NGN' }, // ₦3,500
    annual:  { amount: 3300000, currency: 'NGN' }, // ₦33,000
  },
  USD: {
    monthly: { amount: 1000, currency: 'USD' }, // $10
    annual:  { amount: 9600, currency: 'USD' }, // $96
  },
};

const genReference = () => 'SUB_' + crypto.randomBytes(10).toString('hex').toUpperCase();

function periodEnd(interval, from) {
  const d = new Date(from);
  if (interval === 'annual') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

async function recordEvent(userId, eventType, payload) {
  try {
    await db.query(
      `INSERT INTO subscription_events (user_id, event_type, raw_payload) VALUES ($1, $2, $3)`,
      [userId || null, eventType, payload]
    );
  } catch (e) {
    console.error('subscription_events insert failed:', e.message);
  }
}

// Grant premium for one period. Idempotent on `reference` so the webhook and
// the /verify call can't double-extend. Paying while still active STACKS time.
async function activateForPeriod(userId, interval, reference) {
  const dupe = await db.query(
    `SELECT 1 FROM subscription_events
     WHERE event_type = 'premium.activated' AND raw_payload->>'reference' = $1 LIMIT 1`,
    [reference]
  );
  if (dupe.rows.length) return false;

  const uRes = await db.query('SELECT plan_renews_at FROM users WHERE id = $1', [userId]);
  const current = uRes.rows[0]?.plan_renews_at ? new Date(uRes.rows[0].plan_renews_at) : null;
  const base = current && current > new Date() ? current : new Date();
  const end = periodEnd(interval, base);

  await db.query(
    `UPDATE users SET plan='premium', trial_ends_at=NULL, plan_renews_at=$1 WHERE id=$2`,
    [end, userId]
  );
  await recordEvent(userId, 'premium.activated', { reference, interval, until: end });
  return true;
}

// If the payment used a reusable CARD, store its authorization so the user can
// auto-renew. We only flip auto_renew ON when they explicitly opted in AND a
// reusable card token exists (transfer/USSD payments have none).
async function storeCardForRenewal(userId, authorization, interval, currency, wantAutoRenew) {
  const code = authorization?.authorization_code;
  const reusable = authorization?.reusable;
  if (!code || !reusable) return; // not a reusable card → can't auto-renew

  await db.query(
    `UPDATE users
       SET paystack_authorization_code = $1,
           card_last4 = $2,
           card_brand = $3,
           renew_interval = $4,
           renew_currency = $5,
           auto_renew = $6
     WHERE id = $7`,
    [
      code,
      authorization.last4 || null,
      authorization.brand || authorization.card_type || null,
      interval,
      currency,
      Boolean(wantAutoRenew),
      userId,
    ]
  );
}

/* ============================================================
 *  GET /api/subscriptions
 * ============================================================ */
export const getSubscription = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT plan, plan_renews_at, auto_renew, card_last4, card_brand,
              paystack_authorization_code
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    const u = rows[0] || {};
    const active = u.plan === 'premium' && (!u.plan_renews_at || new Date(u.plan_renews_at) > new Date());
    res.json({
      success: true,
      plan: u.plan || 'free',
      active,
      access_ends_at: u.plan_renews_at,      // when current access lapses
      auto_renew: Boolean(u.auto_renew),
      can_auto_renew: Boolean(u.paystack_authorization_code), // a card is on file
      card_last4: u.card_last4 || null,
      card_brand: u.card_brand || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load subscription' });
  }
};

/* ============================================================
 *  POST /api/subscriptions/start
 *  body: { interval: 'monthly'|'annual', currency: 'NGN'|'USD', return_to? }
 * ============================================================ */
export const startSubscription = async (req, res) => {
  try {
    const interval = req.body?.interval === 'annual' ? 'annual' : 'monthly';
    const currency = req.body?.currency === 'USD' ? 'USD' : 'NGN';
    const returnTo = req.body?.return_to || null;
    const wantAutoRenew = Boolean(req.body?.auto_renew);
    const price = PRICES[currency][interval];
    const reference = genReference();

    // Demo mode (no Paystack key) — grant the period immediately so the flow
    // is testable end-to-end.
    if (!PAYSTACK_SECRET) {
      await activateForPeriod(req.user.id, interval, reference);
      return res.json({
        success: true,
        demo: true,
        message: 'Demo mode — Premium activated without payment.',
        redirect_url: `${CLIENT_URL}${returnTo || '/dashboard'}`,
      });
    }

    try {
      const { data } = await axios.post(
        `${PAYSTACK_BASE}/transaction/initialize`,
        {
          email: req.user.email,
          amount: price.amount,
          currency: price.currency,
          reference,
          callback_url: `${CLIENT_URL}/upgrade/verify?reference=${reference}`,
          metadata: {
            user_id: req.user.id,
            purpose: 'premium_purchase',
            interval,
            currency,
            auto_renew: wantAutoRenew,
            return_to: returnTo,
          },
          // Let users pay however they trust — card, transfer, USSD, Opay, QR.
          channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        },
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
      );
      const authorization_url = data?.data?.authorization_url;
      if (!authorization_url) throw new Error('No authorization URL from Paystack');
      await recordEvent(req.user.id, 'purchase.initialized', { reference, interval, currency });
      res.json({ success: true, reference, authorization_url });
    } catch (e) {
      console.error('Paystack init error:', e.response?.data || e.message);
      res.status(502).json({ success: false, message: 'Could not start checkout. Please try again.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not start purchase' });
  }
};

/* ============================================================
 *  POST /api/subscriptions/verify   { reference }
 *  Called by the payment-return page. Authoritative check against Paystack.
 * ============================================================ */
export const verifySubscription = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ success: false, message: 'Reference required' });

    // Demo mode already granted access at /start.
    if (!PAYSTACK_SECRET) {
      const u = await db.query(
        `SELECT id, username, email, full_name, avatar_url, virtual_balance, total_xp,
                experience_level, auth_provider, plan, plan_expires_at, plan_renews_at, is_admin
         FROM users WHERE id = $1`,
        [req.user.id]
      );
      return res.json({ success: true, demo: true, user: u.rows[0] });
    }

    const { data } = await axios.get(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );
    const p = data?.data;
    if (!p || p.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Payment was not successful.' });
    }

    const interval = p?.metadata?.interval === 'annual' ? 'annual' : 'monthly';
    const currency = p?.currency === 'USD' ? 'USD' : 'NGN';
    const userId = p?.metadata?.user_id || req.user.id;
    const granted = await activateForPeriod(userId, interval, reference);

    // Store the card for auto-renew if they opted in and paid by reusable card.
    await storeCardForRenewal(userId, p?.authorization, interval, currency, p?.metadata?.auto_renew);

    if (granted) {
      const uRes = await db.query('SELECT id, username, email, full_name FROM users WHERE id = $1', [userId]);
      if (uRes.rows[0]) notifyNewPremium(uRes.rows[0], p?.amount || 0, p?.currency || 'NGN', 'paystack').catch(() => {});
    }

    // Return the full user so the client can refresh auth state.
    const u = await db.query(
      `SELECT id, username, email, full_name, avatar_url, virtual_balance, total_xp,
              experience_level, auth_provider, plan, plan_expires_at, plan_renews_at, is_admin
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json({ success: true, user: u.rows[0], return_to: p?.metadata?.return_to });
  } catch (err) {
    console.error('verify error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/* ============================================================
 *  POST /api/subscriptions/cancel
 *  Turns off auto-renew (if on) and forgets the saved card. Current access
 *  stays until it lapses — there's no mid-period charge to refund.
 * ============================================================ */
export const cancelSubscription = async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE users
         SET auto_renew = FALSE, paystack_authorization_code = NULL,
             card_last4 = NULL, card_brand = NULL
       WHERE id = $1
       RETURNING plan_renews_at`,
      [req.user.id]
    );
    await recordEvent(req.user.id, 'subscription.cancelled', {});
    res.json({
      success: true,
      message: rows[0]?.plan_renews_at
        ? `Done. Auto-renew is off and your card is removed. Your access runs until ${new Date(rows[0].plan_renews_at).toLocaleDateString()}, then stops.`
        : "You're on the Free plan.",
      access_ends_at: rows[0]?.plan_renews_at || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

/* ============================================================
 *  POST /api/subscriptions/auto-renew   { enabled: boolean }
 *  Opt in/out of card auto-renew. Enabling needs a saved card on file.
 * ============================================================ */
export const setAutoRenew = async (req, res) => {
  try {
    const enabled = Boolean(req.body?.enabled);
    const { rows } = await db.query(
      'SELECT paystack_authorization_code FROM users WHERE id = $1', [req.user.id]
    );

    if (enabled && !rows[0]?.paystack_authorization_code) {
      return res.status(400).json({
        success: false,
        message: "To turn on auto-renew, pay once with a card. Bank transfer / USSD payments can't auto-renew.",
      });
    }

    if (enabled) {
      await db.query('UPDATE users SET auto_renew = TRUE WHERE id = $1', [req.user.id]);
      await recordEvent(req.user.id, 'autorenew.enabled', {});
      return res.json({
        success: true,
        auto_renew: true,
        message: "Auto-renew is on. We'll charge your saved card about a day before each period ends.",
      });
    }

    // Disable AND forget the stored card, for privacy.
    await db.query(
      `UPDATE users SET auto_renew = FALSE, paystack_authorization_code = NULL,
              card_last4 = NULL, card_brand = NULL WHERE id = $1`,
      [req.user.id]
    );
    await recordEvent(req.user.id, 'autorenew.disabled', {});
    res.json({
      success: true,
      auto_renew: false,
      message: 'Auto-renew is off. Your current access stays until it lapses; nothing else will be charged.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not update auto-renew' });
  }
};

/* ============================================================
 *  runAutoRenewals — daily cron. Charges saved cards ~1 day before
 *  access lapses. On failure, turns auto-renew off (no daily retry storm)
 *  and notifies the user to renew manually.
 * ============================================================ */
export async function runAutoRenewals() {
  if (!PAYSTACK_SECRET) return;

  let due = [];
  try {
    const { rows } = await db.query(
      `SELECT id, email, renew_interval, renew_currency, paystack_authorization_code
       FROM users
       WHERE auto_renew = TRUE
         AND plan = 'premium'
         AND paystack_authorization_code IS NOT NULL
         AND plan_renews_at IS NOT NULL
         AND plan_renews_at <= NOW() + INTERVAL '1 day'`
    );
    due = rows;
  } catch (e) {
    console.error('[autorenew] query failed:', e.message);
    return;
  }

  for (const u of due) {
    const interval = u.renew_interval === 'annual' ? 'annual' : 'monthly';
    const currency = u.renew_currency === 'USD' ? 'USD' : 'NGN';
    const price = PRICES[currency][interval];
    const reference = genReference();
    try {
      const { data } = await axios.post(
        `${PAYSTACK_BASE}/transaction/charge_authorization`,
        {
          email: u.email,
          amount: price.amount,
          currency: price.currency,
          authorization_code: u.paystack_authorization_code,
          reference,
          metadata: { user_id: u.id, purpose: 'premium_renewal', interval, currency, auto_renew: true },
        },
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
      );
      if (data?.data?.status === 'success') {
        await activateForPeriod(u.id, interval, reference);
        await recordEvent(u.id, 'renewal.success', { reference, interval });
      } else {
        await handleRenewalFailure(u.id, reference, data?.data?.gateway_response || 'declined');
      }
    } catch (e) {
      await handleRenewalFailure(u.id, reference, e.response?.data?.message || e.message);
    }
  }
}

async function handleRenewalFailure(userId, reference, reason) {
  await db.query('UPDATE users SET auto_renew = FALSE WHERE id = $1', [userId]);
  await recordEvent(userId, 'renewal.failed', { reference, reason });
  try {
    const { rows } = await db.query('SELECT telegram_chat_id FROM users WHERE id = $1', [userId]);
    const chatId = rows[0]?.telegram_chat_id;
    if (chatId) {
      await sendToChat(
        chatId,
        `⚠️ <b>Auto-renew failed</b>\n\nWe couldn't charge your saved card for StockAcademia Premium (${reason}). Auto-renew is now off — please renew manually from your dashboard.`
      );
    }
  } catch { /* best-effort */ }
}

/* ============================================================
 *  POST /api/webhooks/paystack — authoritative grant + audit trail
 * ============================================================ */
export const paystackWebhook = async (req, res) => {
  try {
    if (!PAYSTACK_WEBHOOK_SECRET) return res.sendStatus(200);

    const hash = crypto
      .createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).send('invalid signature');
    }

    const event = req.body;
    const data = event?.data || {};
    const reference = data?.reference;

    // Only our premium purchases.
    if (event?.event === 'charge.success' && String(reference || '').startsWith('SUB_')) {
      const interval = data?.metadata?.interval === 'annual' ? 'annual' : 'monthly';
      let userId = data?.metadata?.user_id || null;
      if (!userId && data?.customer?.email) {
        const { rows } = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [data.customer.email]);
        userId = rows[0]?.id || null;
      }
      await recordEvent(userId, 'charge.success', event);
      if (userId) {
        const granted = await activateForPeriod(userId, interval, reference);
        const currency = data?.currency === 'USD' ? 'USD' : 'NGN';
        await storeCardForRenewal(userId, data?.authorization, interval, currency, data?.metadata?.auto_renew);
        if (granted) {
          const uRes = await db.query('SELECT id, username, email, full_name FROM users WHERE id = $1', [userId]);
          if (uRes.rows[0]) notifyNewPremium(uRes.rows[0], data?.amount || 0, data?.currency || 'NGN', 'paystack').catch(() => {});
        }
      }
    } else {
      await recordEvent(data?.metadata?.user_id || null, event?.event || 'unknown', event);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('paystack webhook error:', err);
    res.sendStatus(500);
  }
};
