import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/tradingController.js';

const router = express.Router();
router.use(authenticate);

router.get('/market', c.getMarketOverview);
router.get('/quote/:symbol', c.getStockQuote);
router.get('/candles/:symbol', c.getCandles);
router.get('/portfolio', c.getPortfolio);
router.get('/transactions', c.getTransactions);
router.post('/buy', c.buy);
router.post('/sell', c.sell);

export default router;
