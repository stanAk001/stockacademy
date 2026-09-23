import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { trackEvent } from '../controllers/analyticsController.js';

const router = express.Router();

// A UI event is cheap, but cap it so a script can't flood analytics_events.
const eventLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req) => String(req.user?.id || req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many events' },
});

router.post('/event', authenticate, eventLimit, trackEvent);

export default router;
