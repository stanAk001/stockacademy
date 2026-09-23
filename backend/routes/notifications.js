import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { listNotifications, markRead, getPreferences, updatePreferences } from '../controllers/notificationsController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', listNotifications);
router.post('/read', markRead);
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

export default router;
