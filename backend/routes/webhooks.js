import express from 'express';
import { paystackWebhook } from '../controllers/subscriptionController.js';
import { telegramWebhook } from '../controllers/telegramController.js';

const router = express.Router();

// Public endpoints — verified by signature (Paystack) / processed best-effort (Telegram).
router.post('/paystack', paystackWebhook);
router.post('/telegram', telegramWebhook);

export default router;
