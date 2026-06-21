import crypto from 'crypto';
import axios from 'axios';
import db from '../config/db.js';
import { notifyNewPremium } from '../services/telegramService.js';

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || '';
const FLW_WEBHOOK_HASH = process.env.FLUTTERWAVE_WEBHOOK_HASH || '';
const FLW_BASE = 'https://api.flutterwave.com/v3';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const PREMIUM_USD = (parseInt(process.env.PRICING_USD_CENTS) || 1000) / 100;

const genReference = (prefix) => prefix + '_' + crypto.randomBytes(10).toString('hex').toUpperCase();

/* ============================================
 * POST /api/plan/initialize-international
 * Initialize a Flutterwave premium upgrade transaction.
 * ============================================ */
export const initializeUpgradeInternational = async (req, res) => {
  try {
    if (req.user.plan === 'premium') {
      return res.status(400).json({ success: false, message: "You're already a Premium member." });
    }
    if (!FLW_SECRET || FLW_SECRET.startsWith('FLWSECK_TEST-your')) {
      return res.status(503).json({
        success: false,
        message: 'International payments not yet configured. Please contact support.',
      });
    }

    const reference = genReference('FLW');
    const returnTo = req.body?.return_to || null;
    const country = req.body?.country?.toUpperCase() || null;

    await db.query(
      `INSERT INTO plan_upgrades (user_id, reference, amount_kobo, currency, status, return_to,
                                  processor, country_code)
       VALUES ($1, $2, $3, $4, 'pending', $5, 'flutterwave', $6)`,
      [req.user.id, reference, PREMIUM_USD * 100, 'USD', returnTo, country]
    );

    try {
      const { data } = await axios.post(
        `${FLW_BASE}/payments`,
        {
          tx_ref: reference,
          amount: PREMIUM_USD,
          currency: 'USD',
          redirect_url: `${CLIENT_URL}/upgrade/verify?reference=${reference}&processor=flutterwave`,
          customer: {
            email: req.user.email,
            name: req.user.full_name || req.user.username,
          },
          customizations: {
            title: 'StockAcademia Premium',
            description: 'Monthly Premium subscription',
          },
          meta: {
            user_id: req.user.id,
            purpose: 'premium_upgrade',
            return_to: returnTo,
          },
        },
        { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
      );

      const link = data?.data?.link;
      if (!link) throw new Error('No checkout link from Flutterwave');

      res.json({ success: true, reference, authorization_url: link });
    } catch (e) {
      console.error('Flutterwave init error:', e.response?.data || e.message);
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
    res.status(500).json({ success: false, message: 'Initialization failed' });
  }
};

/* ============================================
 * POST /api/plan/verify-international
 * Verify a Flutterwave premium upgrade transaction.
 * ============================================ */
export const verifyUpgradeInternational = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ success: false, message: 'Reference required' });

    const upRes = await db.query('SELECT * FROM plan_upgrades WHERE reference = $1', [reference]);
    if (upRes.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Upgrade record not found' });
    const upgrade = upRes.rows[0];

    if (upgrade.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your upgrade' });
    }

    if (upgrade.status === 'paid') {
      const u = await db.query(
        `SELECT id, username, email, full_name, avatar_url, plan, plan_expires_at, is_admin
         FROM users WHERE id = $1`,
        [req.user.id]
      );
      return res.json({
        success: true,
        user: u.rows[0],
        already_verified: true,
        return_to: upgrade.return_to,
      });
    }

    if (!FLW_SECRET) {
      return res.status(503).json({ success: false, message: 'Processor not configured' });
    }

    const { data } = await axios.get(
      `${FLW_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
    );
    const tx = data?.data;
    if (!tx || tx.status !== 'successful') {
      await db.query(`UPDATE plan_upgrades SET status='failed' WHERE reference=$1`, [reference]);
      return res.status(400).json({ success: false, message: 'Payment was not successful.' });
    }

    const expectedAmount = upgrade.amount_kobo / 100;
    if (parseFloat(tx.amount) !== expectedAmount || tx.currency !== upgrade.currency) {
      console.error('Amount/currency mismatch:', { expected: expectedAmount, got: tx.amount });
      return res.status(400).json({ success: false, message: 'Payment amount mismatch.' });
    }

    await activatePremiumViaFlutterwave(req.user.id, reference, String(tx.id));

    const updated = await db.query(
      `SELECT id, username, email, full_name, avatar_url, virtual_balance, total_xp,
              experience_level, auth_provider, plan, plan_expires_at, is_admin
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    // Telegram notification — fire and forget
    notifyNewPremium(updated.rows[0], upgrade.amount_kobo, upgrade.currency, 'flutterwave').catch(() => {});

    res.json({ success: true, user: updated.rows[0], return_to: upgrade.return_to });
  } catch (err) {
    console.error('verify international error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/* ============================================
 * POST /api/plan/flutterwave-webhook
 * Server-to-server fallback path for plan upgrades.
 * ============================================ */
export const flutterwaveWebhook = async (req, res) => {
  try {
    if (!FLW_WEBHOOK_HASH) return res.sendStatus(200);

    const signature = req.headers['verif-hash'];
    if (signature !== FLW_WEBHOOK_HASH) return res.status(401).send('invalid signature');

    const event = req.body;
    if (event?.event !== 'charge.completed') return res.sendStatus(200);
    if (event?.data?.status !== 'successful') return res.sendStatus(200);

    const ref = event.data.tx_ref;
    if (!ref?.startsWith('FLW_')) return res.sendStatus(200);

    const { rows } = await db.query('SELECT * FROM plan_upgrades WHERE reference = $1', [ref]);
    const upgrade = rows[0];
    if (!upgrade || upgrade.status === 'paid') return res.sendStatus(200);

    const expectedAmount = upgrade.amount_kobo / 100;
    if (parseFloat(event.data.amount) !== expectedAmount || event.data.currency !== upgrade.currency) {
      console.error('Webhook amount mismatch:', { expected: expectedAmount, got: event.data.amount });
      return res.sendStatus(200);
    }

    await activatePremiumViaFlutterwave(upgrade.user_id, ref, String(event.data.id));

    // Telegram notification — fire and forget (webhook fallback)
    const userRes = await db.query(
      `SELECT id, username, email, full_name FROM users WHERE id = $1`,
      [upgrade.user_id]
    );
    if (userRes.rows.length > 0) {
      notifyNewPremium(userRes.rows[0], upgrade.amount_kobo, upgrade.currency, 'flutterwave').catch(() => {});
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('flutterwave webhook error:', err);
    res.sendStatus(500);
  }
};

async function activatePremiumViaFlutterwave(userId, reference, flwTxId) {
  const expires = new Date();
  expires.setMonth(expires.getMonth() + 1);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE plan_upgrades SET status='paid', paid_at=NOW(), paystack_reference=$1
       WHERE reference=$2`,
      [flwTxId, reference]
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