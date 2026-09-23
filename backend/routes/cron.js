import express from 'express';
import { cronMonitor, cronNews, cronBriefing } from '../controllers/cronController.js';

// External-scheduler hooks. No user auth: each handler checks CRON_SECRET.
const router = express.Router();

router.post('/monitor', cronMonitor);
router.post('/news', cronNews);
router.post('/briefing', cronBriefing);

export default router;
