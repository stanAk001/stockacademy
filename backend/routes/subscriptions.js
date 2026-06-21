import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getSubscription,
  startSubscription,
  verifySubscription,
  cancelSubscription,
  setAutoRenew,
} from '../controllers/subscriptionController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getSubscription);
router.post('/start', startSubscription);
router.post('/verify', verifySubscription);
router.post('/cancel', cancelSubscription);
router.post('/auto-renew', setAutoRenew);

export default router;
