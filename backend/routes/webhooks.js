import express from 'express';
import { paystackWebhook } from '../controllers/subscriptionController.js';
import { flutterwaveWebhook } from '../controllers/flutterwaveWebhookController.js';
import { telegramWebhook } from '../controllers/telegramController.js';

const router = express.Router();

// Public endpoints — verified by signature (Paystack/Flutterwave) / processed
// best-effort (Telegram).
//
// Each processor allows ONE webhook URL per account, so these two are routers:
// they dispatch on the reference prefix to premium / certificates / bookings.
// Point the dashboards at exactly these:
//   Paystack    → /api/webhooks/paystack
//   Flutterwave → /api/webhooks/flutterwave
router.post('/paystack', paystackWebhook);
router.post('/flutterwave', flutterwaveWebhook);
router.post('/telegram', telegramWebhook);

export default router;
