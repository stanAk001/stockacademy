import express from 'express';
import { listInsights, getInsight } from '../controllers/insightsController.js';

// Public JSON for the in-app Insights pages (no auth — it's public content).
const router = express.Router();

router.get('/', listInsights);
router.get('/:slug', getInsight);

export default router;
