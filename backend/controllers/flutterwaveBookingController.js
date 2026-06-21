import crypto from 'crypto';
import axios from 'axios';
import db from '../config/db.js';
import { notifyNewPremium } from '../services/telegramService.js';

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || '';
const FLW_WEBHOOK_HASH = process.env.FLUTTERWAVE_WEBHOOK_HASH || '';
const FLW_BASE = 'https://api.flutterwave.com/v3';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const genRef = () => 'FLB_' + crypto.randomBytes(10).toString('hex').toUpperCase();

const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fromMinutes = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

function priceUsdForSession(sessionType) {
  const overrides = {
    1: parseInt(process.env.BOOKING_USD_30MIN) || 10,
    2: parseInt(process.env.BOOKING_USD_60MIN) || 20,
    3: parseInt(process.env.BOOKING_USD_WEEKLY) || 70,
  };
  return overrides[sessionType] || 10;
}

/* POST /api/bookings/initialize-international */
export const initializeBookingInternational = async (req, res) => {
  const client = await db.getClient();
  try {
    const { session_type_id, name, email, phone, date, start_time, notes, country } = req.body;

    if (!session_type_id || !name || !email || !date || !start_time) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!FLW_SECRET || FLW_SECRET.startsWith('FLWSECK_TEST-your')) {
      return res.status(503).json({
        success: false,
        message: 'International payments not yet configured. Please contact support.',
      });
    }

    await client.query('BEGIN');

    const stRes = await client.query(
      'SELECT * FROM session_types WHERE id = $1 AND enabled = TRUE',
      [session_type_id]
    );
    if (stRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Session type not available' });
    }
    const st = stRes.rows[0];

    if (st.premium_only && req.user?.plan !== 'premium') {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Premium members only.' });
    }

    const endMin = toMinutes(start_time) + st.duration_minutes;
    const end_time = fromMinutes(endMin);

    const conflict = await client.query(
      `SELECT 1 FROM bookings
       WHERE session_date = $1 AND status NOT IN ('cancelled')
         AND payment_status NOT IN ('failed','refunded')
         AND (start_time, end_time) OVERLAPS ($2::time, $3::time)
       LIMIT 1`,
      [date, start_time, end_time]
    );
    if (conflict.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'That slot was just taken. Please pick another.' });
    }

    const reference = genRef();
    const usdAmount = priceUsdForSession(session_type_id);
    const amountCents = usdAmount * 100;

    const { rows } = await client.query(
      `INSERT INTO bookings
        (reference, user_id, session_type_id, name, email, phone, session_date, start_time, end_time,
         notes, amount_kobo, currency, payment_status, status, payment_provider, processor, country_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', 'pending',
               'flutterwave', 'flutterwave', $13)
       RETURNING *`,
      [
        reference, req.user?.id || null, session_type_id,
        name.trim(), email.toLowerCase().trim(), phone || null,
        date, start_time, end_time, notes || null,
        amountCents, 'USD', country?.toUpperCase() || null,
      ]
    );

    await client.query('COMMIT');
    const booking = rows[0];

    try {
      const { data } = await axios.post(
        `${FLW_BASE}/payments`,
        {
          tx_ref: reference,
          amount: usdAmount,
          currency: 'USD',
          redirect_url: `${CLIENT_URL}/book-session/verify?reference=${reference}&processor=flutterwave`,
          customer: { email, name },
          customizations: {
            title: `Mentorship — ${st.name}`,
            description: `Session for ${date} at ${start_time}`,
          },
          meta: {
            booking_id: booking.id,
            session_type_id,
            user_id: req.user?.id,
          },
        },
        { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
      );

      const link = data?.data?.link;
      if (!link) throw new Error('No checkout link from Flutterwave');

      res.json({
        success: true,
        booking: {
          id: booking.id, reference: booking.reference,
          session_date: booking.session_date, start_time: booking.start_time,
          amount_kobo: booking.amount_kobo, currency: booking.currency,
        },
        authorization_url: link,
      });
    } catch (e) {
      console.error('Flutterwave booking init error:', e.response?.data || e.message);
      await db.query(
        `UPDATE bookings SET payment_status='failed', status='cancelled' WHERE reference=$1`,
        [reference]
      );
      return res.status(502).json({
        success: false,
        message: 'Could not start payment. Please try again.',
      });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('initialize international error:', err);
    res.status(500).json({ success: false, message: 'Initialization failed' });
  } finally {
    client.release();
  }
};

/* POST /api/bookings/verify-international */
export const verifyBookingInternational = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ success: false, message: 'Reference required' });

    const bRes = await db.query('SELECT * FROM bookings WHERE reference = $1', [reference]);
    if (bRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const booking = bRes.rows[0];

    if (booking.payment_status === 'paid') {
      return res.json({ success: true, booking, already_verified: true });
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
      await db.query(
        `UPDATE bookings SET payment_status='failed', status='cancelled' WHERE reference=$1`,
        [reference]
      );
      return res.status(400).json({ success: false, message: 'Payment was not successful.' });
    }

    const expectedAmount = booking.amount_kobo / 100;
    if (parseFloat(tx.amount) !== expectedAmount || tx.currency !== booking.currency) {
      console.error('Booking amount mismatch:', { expected: expectedAmount, got: tx.amount });
      return res.status(400).json({ success: false, message: 'Payment amount mismatch.' });
    }

    await confirmBookingViaFlutterwave(booking.id, reference, String(tx.id));

    const updated = await db.query('SELECT * FROM bookings WHERE id = $1', [booking.id]);
    res.json({ success: true, booking: updated.rows[0] });
  } catch (err) {
    console.error('verify booking international error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/* POST /api/bookings/flutterwave-webhook */
export const flutterwaveBookingWebhook = async (req, res) => {
  try {
    if (!FLW_WEBHOOK_HASH) return res.sendStatus(200);

    const signature = req.headers['verif-hash'];
    if (signature !== FLW_WEBHOOK_HASH) return res.status(401).send('invalid signature');

    const event = req.body;
    if (event?.event !== 'charge.completed') return res.sendStatus(200);
    if (event?.data?.status !== 'successful') return res.sendStatus(200);

    const ref = event.data.tx_ref;
    if (!ref?.startsWith('FLB_')) return res.sendStatus(200);

    const { rows } = await db.query('SELECT * FROM bookings WHERE reference = $1', [ref]);
    const booking = rows[0];
    if (!booking || booking.payment_status === 'paid') return res.sendStatus(200);

    const expectedAmount = booking.amount_kobo / 100;
    if (parseFloat(event.data.amount) !== expectedAmount || event.data.currency !== booking.currency) {
      console.error('Webhook amount mismatch:', { expected: expectedAmount, got: event.data.amount });
      return res.sendStatus(200);
    }

    await confirmBookingViaFlutterwave(booking.id, ref, String(event.data.id));
    res.sendStatus(200);
  } catch (err) {
    console.error('flutterwave booking webhook error:', err);
    res.sendStatus(500);
  }
};

async function confirmBookingViaFlutterwave(bookingId, reference, flwTxId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE bookings
       SET payment_status = 'paid', status = 'confirmed', paid_at = NOW(),
           payment_reference = $1
       WHERE id = $2`,
      [flwTxId, bookingId]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}