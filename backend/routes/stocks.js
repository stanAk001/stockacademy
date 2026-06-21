import express from 'express';
import { verifyToken } from '../utils/jwt.js';
import db from '../config/db.js';
import * as stocks from '../controllers/stockController.js';
import * as analysis from '../controllers/analysisController.js';

const router = express.Router();

// True optional auth — decode token if present, attach req.user,
// but never reject the request. Public endpoints work for guests;
// logged-in users get user-aware features.
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null)
      || req.cookies?.token;
    if (!token) return next();

    const decoded = verifyToken(token);
    if (!decoded) return next();

    const { rows } = await db.query(
      `SELECT id, username, email, full_name, avatar_url, virtual_balance, total_xp,
              experience_level, auth_provider, plan, plan_expires_at, is_admin
       FROM users WHERE id = $1`,
      [decoded.id]
    );
    if (rows.length > 0) req.user = rows[0];
  } catch { /* swallow — public endpoint */ }
  return next();
}

// Stock data — public (search and read)
router.get('/search', optionalAuth, stocks.searchStocks);
router.get('/overview', optionalAuth, stocks.marketOverview);
router.get('/quote/:symbol', optionalAuth, stocks.getQuote);
router.get('/candles/:symbol', optionalAuth, stocks.getCandles);

// Analysis — public list, premium unlocks the deep report
router.get('/analysis/rankings', optionalAuth, analysis.getRankings);
router.get('/analysis/:symbol', optionalAuth, analysis.getAnalysis);

export default router;
