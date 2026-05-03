import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/userController.js';

const router = express.Router();
router.use(authenticate);

router.get('/stats', c.getDashboardStats);
router.get('/leaderboard', c.getLeaderboard);
router.get('/recently-viewed', c.getRecentlyViewed);
router.patch('/profile', c.updateProfile);

export default router;
