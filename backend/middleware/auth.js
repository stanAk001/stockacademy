import { verifyToken } from '../utils/jwt.js';
import db from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;
    const token = tokenFromHeader || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided. Please log in.' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    const { rows } = await db.query(
      `SELECT id, username, email, full_name, avatar_url, virtual_balance, total_xp,
              experience_level, auth_provider, plan, plan_expires_at, is_admin
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ success: false, message: 'Server error in auth' });
  }
};
