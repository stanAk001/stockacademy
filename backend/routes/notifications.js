import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { listNotifications, markRead } from '../controllers/notificationsController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', listNotifications);
router.post('/read', markRead);

export default router;
