import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getLinkCode, getTelegramStatus, unlinkTelegram } from '../controllers/telegramController.js';

const router = express.Router();
router.use(authenticate);

router.post('/link-code', getLinkCode);
router.get('/status', getTelegramStatus);
router.post('/unlink', unlinkTelegram);

export default router;
