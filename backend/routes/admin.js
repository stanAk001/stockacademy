import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as admin from '../controllers/adminController.js';
import { broadcastTelegram } from '../controllers/telegramController.js';
import { listReviews, respondReview } from '../controllers/portfolioReviewController.js';
import { getAiUsageStats, sendDigestNow } from '../controllers/aiController.js';
import { adminGenerateRecap } from '../controllers/insightsController.js';
import { sendBroadcast, listBroadcasts } from '../controllers/broadcastController.js';
import { getFunnel } from '../controllers/analyticsController.js';

const router = express.Router();
router.use(authenticate);

// Dashboard overview
router.get('/overview', admin.getOverview);
router.get('/recent-activity', admin.getRecentActivity);

// User management
router.get('/users', admin.listUsers);
router.get('/users/:id', admin.getUserDetail);
router.patch('/users/:id', admin.updateUser);

// Forum moderation
router.get('/forum', admin.listForumContent);
router.patch('/forum/posts/:id', admin.moderatePost);
router.patch('/forum/comments/:id', admin.moderateComment);

// Revenue & analytics
router.get('/revenue', admin.getRevenue);
router.post('/stocks/refresh-us', admin.refreshUSStocks);
router.post('/stocks/refresh-ngx', admin.refreshNgxFundamentals);
// Destructive: wipes paper-trading state. Requires { confirm: "RESET" }.
router.post('/simulator/reset', admin.resetSimulator);
router.post('/stocks/refresh-one/:symbol', admin.refreshOneStock);

// NGX stock data management
router.get('/stocks', admin.listAdminStocks);
router.patch('/stocks/:symbol', admin.updateAdminStock);
router.post('/stocks/bulk-prices', admin.bulkUpdatePrices);

// Premium Telegram broadcast (admin only — checked in the controller)
router.post('/broadcast-telegram', broadcastTelegram);

// Multi-channel broadcast (in-app / push / Telegram) + history (admin-gated)
router.post('/broadcast', sendBroadcast);
router.get('/broadcasts', listBroadcasts);

// Personal portfolio reviews (admin only — checked in the controllers)
router.get('/portfolio-reviews', listReviews);
router.post('/portfolio-reviews/:id/respond', respondReview);

// AI spend monitoring (admin only — checked in the controller)
router.get('/ai-usage', getAiUsageStats);
router.get('/analytics/funnel', getFunnel); // admin check inside the controller

// Manually generate + broadcast the weekly digest now (admin only)
router.post('/send-digest', sendDigestNow);

// Manually generate today's public market recap (admin only)
router.post('/generate-recap', adminGenerateRecap);

export default router;