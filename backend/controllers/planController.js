import crypto from 'crypto';
import axios from 'axios';
import db from '../config/db.js';
import { notifyNewPremium } from '../services/telegramService.js';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE = 'https://api.paystack.co';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Premium plan price in NGN kobo (4500 NGN = 450000 kobo)
const PREMIUM_PRICE_KOBO = parseInt(process.env.PREMIUM_PRICE_KOBO) || 450000;
const PREMIUM_CURRENCY = 'NGN';

const genReference = () => 'PLN_' + crypto.randomBytes(10).toString('hex').toUpperCase();

/* ============================================
 *  GET /api/plan
 *  Return current plan + price
 * ============================================ */
export const getPlan = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT plan, plan_started_at, plan_expires_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({
      success: true,
      ...rows[0],
      premium_price_kobo: PREMIUM_PRICE_KOBO,
      premium_currency: PREMIUM_CURRENCY,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load plan' });
  }
};

/* ============================================
 *  POST /api/plan/initialize-upgrade
 *  Creates a pending plan_upgrade row + Paystack transaction.
 *  Returns authorization_url for browser redirect.
 * ============================================ */
export const initializeUpgrade = async (req, res) => {
  try {
    if (req.user.plan === 'premium') {
      return res.status(400).json({ success: false, message: 'You\'re already a Premium member.' });
    }

    const reference = genReference();
    const returnTo = req.body?.return_to || null;

    await db.query(
      `INSERT INTO plan_upgrades (user_id, reference, amount_kobo, currency, status, return_to)
       VALUES ($1, $2, $3, $4, 'pending', $5)`,
      [req.user.id, reference, PREMIUM_PRICE_KOBO, PREMIUM_CURRENCY, returnTo]
    );

    if (!PAYSTACK_SECRET) {
      return res.json({
        success: true,
        demo: true,
        reference,
        demo_verify_url: `${CLIENT_URL}/upgrade/verify?reference=${reference}&demo=1`,
      });
    }

    try {
      const { data } = await axios.post(
        `${PAYSTACK_BASE}/transaction/initialize`,
        {
          email: req.user.email,
          amount: PREMIUM_PRICE_KOBO,
          currency: PREMIUM_CURRENCY,
          reference,
          callback_url: `${CLIENT_URL}/upgrade/verify?reference=${reference}`,
          metadata: {
            user_id: req.user.id,
            purpose: 'premium_upgrade',
            return_to: returnTo,
          },
          channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        },
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
      );
      const authorization_url = data?.data?.authorization_url;
      if (!authorization_url) throw new Error('No authorization URL from Paystack');
      res.json({ success: true, reference, authorization_url });
    } catch (e) {
      console.error('Paystack init error:', e.response?.data || e.message);
      await db.query(
        `UPDATE plan_upgrades SET status='failed' WHERE reference=$1`,
        [reference]
      );
      return res.status(502).json({
        success: false,
        message: 'Could not start payment. Please try again or contact support.',
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Upgrade init failed' });
  }
};

/* ============================================
 *  POST /api/plan/verify-upgrade
 * ============================================ */
export const verifyUpgrade = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ success: false, message: 'Reference required' });

    const upRes = await db.query('SELECT * FROM plan_upgrades WHERE reference = $1', [reference]);
    if (upRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Upgrade record not found' });
    const upgrade = upRes.rows[0];

    if (upgrade.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your upgrade' });
    }

    if (upgrade.status === 'paid') {
      const u = await db.query('SELECT id, username, email, full_name, avatar_url, plan, plan_expires_at FROM users WHERE id = $1', [req.user.id]);
      return res.json({ success: true, user: u.rows[0], already_verified: true, return_to: upgrade.return_to });
    }

    if (PAYSTACK_SECRET) {
      const { data } = await axios.get(
        `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
      );
      const p = data?.data;
      if (!p || p.status !== 'success') {
        await db.query(`UPDATE plan_upgrades SET status='failed' WHERE reference=$1`, [reference]);
        return res.status(400).json({ success: false, message: 'Payment was not successful.' });
      }
      if (p.amount !== upgrade.amount_kobo || p.currency !== upgrade.currency) {
        return res.status(400).json({ success: false, message: 'Payment amount mismatch.' });
      }

      await activatePremium(req.user.id, reference, p.reference);
    } else {
      await activatePremium(req.user.id, reference, null);
    }

    const updated = await db.query(
      `SELECT id, username, email, full_name, avatar_url, virtual_balance, total_xp,
              experience_level, auth_provider, plan, plan_expires_at, is_admin
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    // Telegram notification — fire-and-forget
    notifyNewPremium(updated.rows[0], upgrade.amount_kobo, upgrade.currency, 'paystack').catch(() => {});

    res.json({
      success: true,
      user: updated.rows[0],
      return_to: upgrade.return_to,
      demo: !PAYSTACK_SECRET,
    });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/* ============================================
 *  POST /api/plan/webhook  (Paystack)
 * ============================================ */
export const paystackWebhook = async (req, res) => {
  try {
    if (!PAYSTACK_SECRET) return res.sendStatus(200);

    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET)
      .update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) return res.status(401).send('invalid signature');

    const event = req.body;
    if (event?.event !== 'charge.success') return res.sendStatus(200);

    const ref = event.data.reference;
    if (!ref?.startsWith('PLN_')) return res.sendStatus(200);

    const { rows } = await db.query('SELECT * FROM plan_upgrades WHERE reference = $1', [ref]);
    const upgrade = rows[0];
    if (!upgrade || upgrade.status === 'paid') return res.sendStatus(200);
    if (upgrade.amount_kobo !== event.data.amount || upgrade.currency !== event.data.currency) {
      return res.sendStatus(200);
    }

    await activatePremium(upgrade.user_id, ref, event.data.reference);

    // Telegram notification — fire-and-forget (webhook fallback path)
    const userRes = await db.query(
      `SELECT id, username, email, full_name FROM users WHERE id = $1`,
      [upgrade.user_id]
    );
    if (userRes.rows.length > 0) {
      notifyNewPremium(userRes.rows[0], upgrade.amount_kobo, upgrade.currency, 'paystack').catch(() => {});
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('plan webhook error:', err);
    res.sendStatus(500);
  }
};

async function activatePremium(userId, reference, paystackRef) {
  const expires = new Date();
  expires.setMonth(expires.getMonth() + 1);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE plan_upgrades SET status='paid', paid_at=NOW(), paystack_reference=$1
       WHERE reference=$2`,
      [paystackRef, reference]
    );
    await client.query(
      `UPDATE users SET plan='premium', plan_started_at=NOW(), plan_expires_at=$1 WHERE id=$2`,
      [expires, userId]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/* ============================================
 *  POST /api/plan/cancel
 * ============================================ */
export const cancelPremium = async (req, res) => {
  try {
    await db.query(
      `UPDATE users SET plan = 'free', plan_expires_at = NULL WHERE id = $1`,
      [req.user.id]
    );
    res.json({ success: true, message: 'Downgraded to free plan.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Downgrade failed' });
  }
};