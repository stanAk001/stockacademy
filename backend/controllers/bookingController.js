import crypto from 'crypto';
import axios from 'axios';
import validator from 'validator';
import db from '../config/db.js';
import { notifyNewBooking } from '../services/telegramService.js';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE = 'https://api.paystack.co';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const genReference = () => 'BK_' + crypto.randomBytes(10).toString('hex').toUpperCase();

const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fromMinutes = (mins) => {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
};

export const listSessionTypes = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM session_types WHERE enabled = TRUE ORDER BY sort_order ASC'
    );
    res.json({ success: true, session_types: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load session types' });
  }
};

export const availableSlots = async (req, res) => {
  try {
    const { session_type_id, date } = req.query;
    if (!session_type_id || !date) {
      return res.status(400).json({ success: false, message: 'session_type_id and date are required' });
    }

    const stRes = await db.query('SELECT duration_minutes FROM session_types WHERE id = $1', [session_type_id]);
    if (stRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Session type not found' });
    const duration = stRes.rows[0].duration_minutes;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const requested = new Date(date + 'T00:00:00');
    if (requested < today) return res.json({ success: true, slots: [] });

    const day = requested.getDay();
    const availRes = await db.query(
      'SELECT start_time, end_time FROM tutor_availability WHERE day_of_week = $1 AND enabled = TRUE',
      [day]
    );
    if (availRes.rows.length === 0) return res.json({ success: true, slots: [] });

    const bookedRes = await db.query(
      `SELECT start_time, end_time FROM bookings
       WHERE session_date = $1 AND status NOT IN ('cancelled')
         AND payment_status NOT IN ('failed','refunded')`,
      [date]
    );
    const booked = bookedRes.rows.map((b) => [toMinutes(b.start_time), toMinutes(b.end_time)]);

    const STEP = 30;
    const slots = [];
    for (const window of availRes.rows) {
      const wStart = toMinutes(window.start_time);
      const wEnd = toMinutes(window.end_time);
      for (let s = wStart; s + duration <= wEnd; s += STEP) {
        const e = s + duration;
        if (!booked.some(([bs, be]) => s < be && e > bs)) {
          slots.push({ start: fromMinutes(s), end: fromMinutes(e) });
        }
      }
    }

    if (requested.toDateString() === new Date().toDateString()) {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      return res.json({ success: true, slots: slots.filter((sl) => toMinutes(sl.start) > nowMin + 30) });
    }
    res.json({ success: true, slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load slots' });
  }
};

export const createBooking = async (req, res) => {
  const client = await db.getClient();
  try {
    const { session_type_id, name, email, phone, date, start_time, notes } = req.body;

    if (!session_type_id || !name || !email || !date || !start_time) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!validator.isEmail(email)) return res.status(400).json({ success: false, message: 'Invalid email' });
    if (!validator.isDate(date)) return res.status(400).json({ success: false, message: 'Invalid date' });

    await client.query('BEGIN');

    const stRes = await client.query('SELECT * FROM session_types WHERE id = $1 AND enabled = TRUE', [session_type_id]);
    if (stRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Session type not available' });
    }
    const st = stRes.rows[0];

    if (st.premium_only && req.user?.plan !== 'premium') {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Premium users only.', upgrade: true });
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

    const reference = genReference();
    const { rows } = await client.query(
      `INSERT INTO bookings
        (reference, user_id, session_type_id, name, email, phone, session_date, start_time, end_time,
         notes, amount_kobo, currency, payment_status, status, payment_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', 'pending', 'paystack')
       RETURNING *`,
      [reference, req.user?.id || null, session_type_id, name.trim(),
       email.toLowerCase().trim(), phone || null, date, start_time, end_time, notes || null,
       st.price_kobo, st.currency]
    );

    await client.query('COMMIT');
    const booking = rows[0];

    let authorization_url = null;
    if (PAYSTACK_SECRET) {
      try {
        const { data } = await axios.post(
          `${PAYSTACK_BASE}/transaction/initialize`,
          {
            email: booking.email,
            amount: booking.amount_kobo,
            currency: booking.currency,
            reference: booking.reference,
            callback_url: `${CLIENT_URL}/book-session/verify?reference=${booking.reference}`,
            metadata: { booking_id: booking.id, session_type: st.key, user_id: req.user?.id || null },
          },
          { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
        );
        authorization_url = data?.data?.authorization_url || null;
      } catch (e) {
        console.error('Paystack init error:', e.response?.data || e.message);
      }
    }

    res.json({
      success: true,
      booking: {
        id: booking.id, reference: booking.reference,
        session_date: booking.session_date, start_time: booking.start_time, end_time: booking.end_time,
        amount_kobo: booking.amount_kobo, currency: booking.currency,
        status: booking.status, payment_status: booking.payment_status,
      },
      authorization_url,
      demo: !PAYSTACK_SECRET,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  } finally {
    client.release();
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ success: false, message: 'Reference required' });

    const bRes = await db.query('SELECT * FROM bookings WHERE reference = $1', [reference]);
    if (bRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });
    const booking = bRes.rows[0];

    if (booking.payment_status === 'paid') {
      return res.json({ success: true, booking, already_verified: true });
    }

    if (PAYSTACK_SECRET) {
      const { data } = await axios.get(
        `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
      );
      const p = data?.data;
      if (!p || p.status !== 'success') {
        await db.query(`UPDATE bookings SET payment_status='failed', updated_at=NOW() WHERE reference=$1`, [reference]);
        return res.status(400).json({ success: false, message: 'Payment not successful' });
      }
      if (p.amount !== booking.amount_kobo || p.currency !== booking.currency) {
        return res.status(400).json({ success: false, message: 'Payment amount mismatch' });
      }

      const meetingUrl = process.env.DEFAULT_MEETING_URL || '';
      const upd = await db.query(
        `UPDATE bookings SET payment_status='paid', payment_reference=$1, paid_at=NOW(),
           status='confirmed', meeting_url=COALESCE($2, meeting_url), updated_at=NOW()
         WHERE reference=$3 RETURNING *`,
        [p.reference, meetingUrl || null, reference]
      );
      const finalBooking = upd.rows[0];

      // Telegram notification — fire and forget
      const stRes = await db.query('SELECT name FROM session_types WHERE id = $1', [finalBooking.session_type_id]);
      const sessionTypeName = stRes.rows[0]?.name || 'Mentorship Session';
      notifyNewBooking(finalBooking, sessionTypeName).catch(() => {});

      return res.json({ success: true, booking: finalBooking });
    }

    // DEMO mode
    if (req.user && (req.user.id === booking.user_id || req.user.is_admin)) {
      const upd = await db.query(
        `UPDATE bookings SET payment_status='paid', status='confirmed', paid_at=NOW(), updated_at=NOW()
         WHERE reference=$1 RETURNING *`,
        [reference]
      );
      const finalBooking = upd.rows[0];

      // Telegram notification (demo mode)
      const stRes = await db.query('SELECT name FROM session_types WHERE id = $1', [finalBooking.session_type_id]);
      const sessionTypeName = stRes.rows[0]?.name || 'Mentorship Session';
      notifyNewBooking(finalBooking, sessionTypeName).catch(() => {});

      return res.json({ success: true, booking: finalBooking, demo: true });
    }

    return res.status(402).json({ success: false, message: 'Payment verification requires Paystack credentials.' });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

export const paystackWebhook = async (req, res) => {
  try {
    if (!PAYSTACK_SECRET) return res.sendStatus(200);
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) return res.status(401).send('invalid signature');

    const event = req.body;
    if (event?.event === 'charge.success') {
      const ref = event.data.reference;
      const { rows } = await db.query('SELECT * FROM bookings WHERE reference = $1', [ref]);
      const booking = rows[0];
      if (booking && booking.payment_status !== 'paid'
          && booking.amount_kobo === event.data.amount
          && booking.currency === event.data.currency) {
        await db.query(
          `UPDATE bookings SET payment_status='paid', status='confirmed', paid_at=NOW(),
             payment_reference=$1, updated_at=NOW() WHERE reference=$2`,
          [ref, ref]
        );

        // Telegram notification — fire and forget (webhook fallback)
        const updatedB = await db.query('SELECT * FROM bookings WHERE reference = $1', [ref]);
        const stRes = await db.query('SELECT name FROM session_types WHERE id = $1', [booking.session_type_id]);
        const sessionTypeName = stRes.rows[0]?.name || 'Mentorship Session';
        notifyNewBooking(updatedB.rows[0], sessionTypeName).catch(() => {});
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('webhook error:', err);
    res.sendStatus(500);
  }
};

export const myBookings = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.*, st.name AS session_type_name, st.icon AS session_icon, st.duration_minutes
       FROM bookings b LEFT JOIN session_types st ON st.id = b.session_type_id
       WHERE b.user_id = $1 ORDER BY b.session_date DESC, b.start_time DESC`,
      [req.user.id]
    );
    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load bookings' });
  }
};

export const adminList = async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ success: false, message: 'Admin only' });
  try {
    const { status } = req.query;
    const params = [];
    let where = '';
    if (status) { params.push(status); where = 'WHERE b.status = $1'; }
    const { rows } = await db.query(
      `SELECT b.*, st.name AS session_type_name, st.duration_minutes, u.username
       FROM bookings b LEFT JOIN session_types st ON st.id = b.session_type_id
       LEFT JOIN users u ON u.id = b.user_id ${where}
       ORDER BY b.session_date DESC, b.start_time DESC LIMIT 200`,
      params
    );
    res.json({ success: true, bookings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load' });
  }
};

export const adminUpdate = async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ success: false, message: 'Admin only' });
  try {
    const { id } = req.params;
    const { status, meeting_url, session_date, start_time } = req.body;
    const { rows } = await db.query(
      `UPDATE bookings SET status = COALESCE($1, status), meeting_url = COALESCE($2, meeting_url),
         session_date = COALESCE($3, session_date), start_time = COALESCE($4, start_time),
         updated_at = NOW() WHERE id = $5 RETURNING *`,
      [status, meeting_url, session_date, start_time, id]
    );
    res.json({ success: true, booking: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};