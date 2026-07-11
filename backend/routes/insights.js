import express from 'express';
import { listInsights, getInsight, cronDailyRecap } from '../controllers/insightsController.js';

// Public JSON for the in-app Insights pages (no auth — it's public content).
const router = express.Router();

// External daily scheduler hook (secret-gated) — must come before '/:slug'.
router.post('/cron/daily', cronDailyRecap);

router.get('/', listInsights);
router.get('/:slug', getInsight);

export default router;
