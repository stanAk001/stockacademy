import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as admin from '../controllers/adminController.js';

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
router.post('/stocks/refresh-one/:symbol', admin.refreshOneStock);

// NGX stock data management
router.get('/stocks', admin.listAdminStocks);
router.patch('/stocks/:symbol', admin.updateAdminStock);
router.post('/stocks/bulk-prices', admin.bulkUpdatePrices);

export default router;