import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { requirePremium } from '../middleware/requirePremium.js';
import { meterFeature, attachPlan } from '../middleware/entitlement.js';
import { usageSummary } from '../services/entitlementService.js';
import { FREE_LIMITS } from '../config/entitlements.js';
import db from '../config/db.js';
import { compareStocks, analyzePortfolio, scanNews, tutorChat, explainStock } from '../controllers/aiController.js';
import { stockScout } from '../controllers/scoutController.js';
import { swingRadar, listSetups, untrackSetup, listMissedSetups } from '../controllers/swingController.js';
import { longTermResearch, opportunityRadar, getMarketRegime, deskStats } from '../controllers/researchController.js';
import {
  createPosition, listPositions, getPosition, updatePosition, closePosition, deletePosition,
} from '../controllers/positionsController.js';
import { createThesis, listTheses, getThesis, deleteThesis } from '../controllers/thesisController.js';
import { myMarket } from '../controllers/briefingController.js';
import {
  listJournal, createJournal, deleteJournal, postTradeReview, getPersonalInsights,
} from '../controllers/journalController.js';

const router = express.Router();

// Per-user daily quota across all AI tools — a hard cap on OpenAI spend
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

// PUBLIC: the free monthly AI allowances, straight from config/entitlements.js.
// The Pricing page shows these (also to logged-out visitors), so the numbers it
// advertises are always the ones the server actually enforces.
router.get('/free-limits', (req, res) => {
  const limits = Object.fromEntries(
    Object.entries(FREE_LIMITS).map(([k, v]) => [k, { limit: v.limit, period: v.period, label: v.label }])
  );
  res.json({ success: true, limits });
});

// Authenticate everyone else.
router.use(authenticate);

// The user's Free allowances (what's left this month) — powers the upgrade UI.
// Cheap read, no model call, no quota.
router.get('/usage', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, plan, trial_ends_at, plan_renews_at, plan_expires_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    const summary = await usageSummary(rows[0] || { id: req.user.id, plan: 'free' });
    res.json({ success: true, ...summary });
  } catch (err) {
    console.error('usage summary error:', err);
    res.status(500).json({ success: false, message: 'Failed to load usage' });
  }
});

// AI tutor — free users get a couple of free questions (capped in the controller),
// then a nudge to upgrade. Premium users are unlimited within the shared daily cap.
router.post('/tutor', aiDailyLimit, tutorLimit, tutorChat);

// ---- Metered "taste the intelligence" tools (spec §20/§22) ----------------
// Free users get a small monthly allowance (config/entitlements.js); Premium is
// unlimited. meterFeature checks the allowance BEFORE the work; the controller
// records the use AFTER success (so cache hits / errors never burn a slot). The
// daily AI spend cap still applies on top as a cost backstop.
router.get('/explain-stock/:symbol', aiDailyLimit, meterFeature('ai_analysis'), explainStock);
router.get('/scout', aiDailyLimit, meterFeature('ai_scout'), stockScout);
router.get('/research/:symbol', aiDailyLimit, meterFeature('ai_research'), longTermResearch);
router.post('/compare-stocks', aiDailyLimit, meterFeature('ai_comparison'), compareStocks);
router.post('/scan-news', aiDailyLimit, meterFeature('ai_news'), scanNews);

// ---- Premium-only, no AI model call → off the daily AI quota ----------------
// Tracked-setup management, the live Opportunity board, breadth read, desk counts.
router.get('/setups', requirePremium, listSetups);
router.delete('/setups/:id', requirePremium, untrackSetup);
router.get('/missed-setups', requirePremium, listMissedSetups); // §14, no AI call
// Free users get a trimmed preview (top 3, no depth) — trimmed in the controller.
router.get('/opportunities', attachPlan, opportunityRadar);
router.get('/market-regime', requirePremium, getMarketRegime);
router.get('/desk-stats', requirePremium, deskStats);

// Position monitoring (§9) — record real entries, track thesis vs market.
router.post('/positions', requirePremium, createPosition);
router.get('/positions', requirePremium, listPositions);
router.get('/positions/:id', requirePremium, getPosition);
router.patch('/positions/:id', requirePremium, updatePosition);
router.post('/positions/:id/close', requirePremium, closePosition);
router.delete('/positions/:id', requirePremium, deletePosition);

// "My Market" briefing (§13/§25) — what changed since last visit. No AI call.
router.get('/my-market', attachPlan, myMarket); // Free → preview payload

// Journal + personal insights (§14/§15) — deterministic, no AI model call.
router.get('/journal', requirePremium, listJournal);
router.post('/journal', requirePremium, createJournal);
router.delete('/journal/:id', requirePremium, deleteJournal);
router.get('/insights', requirePremium, getPersonalInsights);

// Long-term Investment Thesis (§10/§11) — track + explain material changes.
router.post('/theses', requirePremium, createThesis);
router.get('/theses', requirePremium, listTheses);
router.get('/theses/:id', requirePremium, getThesis);
router.delete('/theses/:id', requirePremium, deleteThesis);

// ---- Premium-only AI tools (deep analysis) → premium + daily AI quota -------
router.use(requirePremium, aiDailyLimit);

// AI Swing Radar — full per-symbol entry plan (entry planning is Premium, §22).
router.get('/swing/:symbol', swingRadar);
router.post('/analyze-portfolio', analyzePortfolio);

// AI post-trade review (§16) — on-demand, cached on the entry after first run.
router.get('/journal/:id/review', postTradeReview);

export default router;
