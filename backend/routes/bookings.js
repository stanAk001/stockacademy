import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as bookings from '../controllers/bookingController.js';
import * as flwBookings from '../controllers/flutterwaveBookingController.js';

const router = express.Router();

// Optional auth — works for guests, attaches req.user when token present
async function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return next();
  const token = auth.substring(7);
  try {
    const { default: jwt } = await import('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = (await import('../config/db.js')).default;
    const { rows } = await db.query(
      `SELECT id, username, email, plan, is_admin, is_banned FROM users WHERE id = $1`,
      [decoded.id]
    );
    if (rows.length > 0) req.user = rows[0];
  } catch { /* swallow — guest flow */ }
  next();
}

// Webhooks — no auth, signature-verified inside controllers
router.post('/webhook', bookings.paystackWebhook);
router.post('/flutterwave-webhook', flwBookings.flutterwaveBookingWebhook);

// Public / optionally authenticated
router.get('/session-types', bookings.listSessionTypes);
router.get('/availability', bookings.availableSlots);
router.get('/available-slots', bookings.availableSlots);
router.post('/initialize', optionalAuth, bookings.createBooking);
router.post('/verify', optionalAuth, bookings.verifyPayment);

// Flutterwave international booking flow
router.post('/initialize-international', optionalAuth, flwBookings.initializeBookingInternational);
router.post('/verify-international', optionalAuth, flwBookings.verifyBookingInternational);

// Authenticated only
router.get('/mine', authenticate, bookings.myBookings);

// Admin
router.get('/admin/all', authenticate, bookings.adminList);
router.patch('/admin/:id', authenticate, bookings.adminUpdate);

export default router;