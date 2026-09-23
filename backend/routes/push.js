import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getVapidKey, subscribe, unsubscribe, status } from '../controllers/pushController.js';

const router = express.Router();
router.use(authenticate);

router.get('/vapid-public-key', getVapidKey);
router.get('/status', status);
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);

export default router;
