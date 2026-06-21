import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { requirePremium } from '../middleware/requirePremium.js';
import { compareStocks, analyzePortfolio, scanNews, tutorChat, explainStock } from '../controllers/aiController.js';

const router = express.Router();

// Per-user daily quota across all AI tools — a hard cap on Anthropic spend
// even if caching is bypassed. Keyed by user id (auth runs first).
const aiDailyLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: Number(process.env.AI_DAILY_LIMIT) || 25,
  keyGenerator: (req) => String(req.user?.id || req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "You've reached today's limit for AI tools. It resets in 24 hours." },
});

// The tutor is conversational, so it can burn the daily budget fast. Give it a
// tighter but frequently-resetting hourly cap, and return the reset time so the
// UI can show a friendly "try again in X" countdown.
const tutorLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: Number(process.env.AI_TUTOR_HOURLY_LIMIT) || 20,
  keyGenerator: (req) => String(req.user?.id || req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  // Only count real, billable model calls. Cached answers (X-AI-Cache: hit),
  // errors, and blocked requests are decremented back so they don't burn quota.
  skipFailedRequests: true,
  requestWasSuccessful: (req, res) => res.statusCode < 400 && res.getHeader('X-AI-Cache') !== 'hit',
  handler: (req, res) => {
    const resetMs = req.rateLimit?.resetTime
      ? new Date(req.rateLimit.resetTime).getTime() - Date.now()
      : 60 * 60 * 1000;
    const seconds = Math.max(1, Math.ceil(resetMs / 1000));
    const mins = Math.ceil(seconds / 60);
    res.status(429).json({
      success: false,
      limited: true,
      retry_after_seconds: seconds,
      message: `You've reached the tutor limit for now. Take a short break — it resets in about ${mins} minute${mins === 1 ? '' : 's'}.`,
    });
  },
});

// All AI features are premium-only, then rate-limited per user.
router.use(authenticate, requirePremium, aiDailyLimit);

// Premium: the plain-English stock verdict. Cached 24h per stock+language.
router.get('/explain-stock/:symbol', explainStock);

router.post('/compare-stocks', compareStocks);
router.post('/analyze-portfolio', analyzePortfolio);
router.post('/scan-news', scanNews);
router.post('/tutor', tutorLimit, tutorChat);

export default router;
