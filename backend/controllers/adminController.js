import db from '../config/db.js';
import { notifyNewSignup } from '../services/telegramService.js';
import { updateAllUSStocks, updateSingleStock } from '../services/stockFundamentalsUpdater.js';

function requireAdmin(req, res) {
  if (!req.user?.is_admin) {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return false;
  }
  return true;
}

async function logAction(adminId, action, targetType, targetId, metadata = {}) {
  try {
    await db.query(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, action, targetType, targetId, metadata]
    );
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

/* ============================================
 * GET /api/admin/overview
 * ============================================ */
export const getOverview = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const [users, signupsToday, signupsWeek, premiumCount, bookings, totalLessons, completions] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query("SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE"),
      db.query("SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'"),
      db.query("SELECT COUNT(*) FROM users WHERE plan = 'premium'"),
      db.query("SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'"),
      db.query('SELECT COUNT(*) FROM lessons'),
      db.query('SELECT COUNT(*) FROM user_progress WHERE completed = TRUE'),
    ]);

    const premiumRevenue = await db.query(
      `SELECT COALESCE(SUM(amount_kobo), 0) AS total FROM plan_upgrades
       WHERE status = 'paid' AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)`
    );
    const bookingRevenue = await db.query(
      `SELECT COALESCE(SUM(amount_kobo), 0) AS total FROM bookings
       WHERE payment_status = 'paid' AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)`
    );

    const flaggedPosts = await db.query("SELECT COUNT(*) FROM forum_posts WHERE is_removed = FALSE");
    const flaggedComments = await db.query("SELECT COUNT(*) FROM forum_comments WHERE is_removed = FALSE");

    res.json({
      success: true,
      stats: {
        total_users: parseInt(users.rows[0].count),
        signups_today: parseInt(signupsToday.rows[0].count),
        signups_week: parseInt(signupsWeek.rows[0].count),
        premium_subscribers: parseInt(premiumCount.rows[0].count),
        confirmed_bookings: parseInt(bookings.rows[0].count),
        total_lessons: parseInt(totalLessons.rows[0].count),
        lessons_completed: parseInt(completions.rows[0].count),
        revenue_this_month_kobo:
          parseInt(premiumRevenue.rows[0].total) + parseInt(bookingRevenue.rows[0].total),
        active_posts: parseInt(flaggedPosts.rows[0].count),
        active_comments: parseInt(flaggedComments.rows[0].count),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load overview' });
  }
};

/* ============================================
 * GET /api/admin/recent-activity
 * ============================================ */
export const getRecentActivity = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const [signups, bookings, posts] = await Promise.all([
      db.query(`SELECT id, username, email, created_at, plan, auth_provider
                FROM users ORDER BY created_at DESC LIMIT 5`),
      db.query(`SELECT b.id, b.name, b.email, b.session_date, b.status, b.created_at, st.name AS session_type
                FROM bookings b LEFT JOIN session_types st ON st.id = b.session_type_id
                ORDER BY b.created_at DESC LIMIT 5`),
      db.query(`SELECT p.id, p.title, p.created_at, u.username
                FROM forum_posts p JOIN users u ON u.id = p.user_id
                WHERE p.is_removed = FALSE
                ORDER BY p.created_at DESC LIMIT 5`),
    ]);

    res.json({
      success: true,
      signups: signups.rows,
      bookings: bookings.rows,
      posts: posts.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load activity' });
  }
};

/* ============================================
 * GET /api/admin/users
 * ============================================ */
export const listUsers = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { q = '', filter = 'all', page = 1 } = req.query;
    const limit = 25;
    const offset = (parseInt(page) - 1) * limit;
    const params = [];
    const where = [];

    if (q) {
      params.push(`%${q}%`);
      where.push(`(username ILIKE $${params.length} OR email ILIKE $${params.length} OR full_name ILIKE $${params.length})`);
    }
    if (filter === 'premium') where.push(`plan = 'premium'`);
    if (filter === 'free') where.push(`plan = 'free'`);
    if (filter === 'banned') where.push(`is_banned = TRUE`);
    if (filter === 'admins') where.push(`is_admin = TRUE`);

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const usersRes = await db.query(
      `SELECT id, username, email, full_name, avatar_url, plan, total_xp, is_admin, is_banned,
              auth_provider, created_at, last_login_at
       FROM users ${whereClause}
       ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    const countRes = await db.query(
      `SELECT COUNT(*) FROM users ${whereClause}`, params
    );

    res.json({
      success: true,
      users: usersRes.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load users' });
  }
};

/* ============================================
 * GET /api/admin/users/:id
 * ============================================ */
export const getUserDetail = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const userRes = await db.query(
      `SELECT id, username, email, full_name, avatar_url, bio, plan, plan_expires_at,
              total_xp, virtual_balance, experience_level, auth_provider, is_admin,
              is_banned, banned_reason, banned_at, created_at, last_login_at
       FROM users WHERE id = $1`, [id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const [progress, quizzes, bookings, posts, comments, transactions] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM user_progress WHERE user_id = $1 AND completed = TRUE`, [id]),
      db.query(`SELECT COUNT(*) FROM quiz_attempts WHERE user_id = $1 AND passed = TRUE`, [id]),
      db.query(`SELECT b.*, st.name AS session_type FROM bookings b
                LEFT JOIN session_types st ON st.id = b.session_type_id
                WHERE b.user_id = $1 ORDER BY b.created_at DESC LIMIT 10`, [id]),
      db.query(`SELECT id, title, created_at, is_removed FROM forum_posts
                WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [id]),
      db.query(`SELECT id, post_id, content, created_at, is_removed FROM forum_comments
                WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`, [id]),
      db.query(`SELECT COUNT(*) FROM transactions WHERE user_id = $1`, [id]),
    ]);

    res.json({
      success: true,
      user: userRes.rows[0],
      stats: {
        lessons_completed: parseInt(progress.rows[0].count),
        quizzes_passed: parseInt(quizzes.rows[0].count),
        total_trades: parseInt(transactions.rows[0].count),
      },
      bookings: bookings.rows,
      posts: posts.rows,
      comments: comments.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load user' });
  }
};

/* ============================================
 * PATCH /api/admin/users/:id
 * ============================================ */
export const updateUser = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: "Can't perform admin actions on your own account" });
    }

    let updateSql = '';
    let params = [];
    let actionLog = '';

    switch (action) {
      case 'ban':
        updateSql = `UPDATE users SET is_banned = TRUE, banned_reason = $1, banned_at = NOW(), banned_by = $2 WHERE id = $3 RETURNING *`;
        params = [reason || 'No reason given', req.user.id, id];
        actionLog = 'ban_user';
        break;
      case 'unban':
        updateSql = `UPDATE users SET is_banned = FALSE, banned_reason = NULL, banned_at = NULL, banned_by = NULL WHERE id = $1 RETURNING *`;
        params = [id];
        actionLog = 'unban_user';
        break;
      case 'grant_premium': {
        const expires = new Date();
        expires.setMonth(expires.getMonth() + 1);
        updateSql = `UPDATE users SET plan = 'premium', plan_started_at = NOW(), plan_expires_at = $1 WHERE id = $2 RETURNING *`;
        params = [expires, id];
        actionLog = 'grant_premium';
        break;
      }
      case 'revoke_premium':
        updateSql = `UPDATE users SET plan = 'free', plan_expires_at = NULL WHERE id = $1 RETURNING *`;
        params = [id];
        actionLog = 'revoke_premium';
        break;
      default:
        return res.status(400).json({ success: false, message: 'Unknown action' });
    }

    const result = await db.query(updateSql, params);
    await logAction(req.user.id, actionLog, 'user', parseInt(id), { reason });
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

/* ============================================
 * GET /api/admin/forum
 * ============================================ */
export const listForumContent = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { type = 'all', filter = 'active' } = req.query;
    const removedClause = filter === 'removed' ? 'TRUE' : 'FALSE';

    const result = { posts: [], comments: [] };

    if (type === 'posts' || type === 'all') {
      const r = await db.query(
        `SELECT p.id, p.title, p.content, p.created_at, p.upvotes, p.is_removed, p.removed_reason,
                (p.image_url IS NOT NULL) AS has_image,
                COALESCE(p.image_thumb, p.image_url) AS image_preview,
                u.id AS author_id, u.username, u.avatar_url, u.is_banned
         FROM forum_posts p JOIN users u ON u.id = p.user_id
         WHERE p.is_removed = ${removedClause}
         ORDER BY p.created_at DESC LIMIT 50`
      );
      result.posts = r.rows;
    }
    if (type === 'comments' || type === 'all') {
      const r = await db.query(
        `SELECT c.id, c.post_id, c.content, c.created_at, c.is_removed, c.removed_reason,
                u.id AS author_id, u.username, u.avatar_url, u.is_banned,
                p.title AS post_title
         FROM forum_comments c
         JOIN users u ON u.id = c.user_id
         JOIN forum_posts p ON p.id = c.post_id
         WHERE c.is_removed = ${removedClause}
         ORDER BY c.created_at DESC LIMIT 50`
      );
      result.comments = r.rows;
    }
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load forum content' });
  }
};

/* ============================================
 * PATCH /api/admin/forum/posts/:id
 * ============================================ */
export const moderatePost = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    const sql = action === 'remove'
      ? `UPDATE forum_posts SET is_removed = TRUE, removed_reason = $1, removed_at = NOW(), removed_by = $2 WHERE id = $3 RETURNING *`
      : `UPDATE forum_posts SET is_removed = FALSE, removed_reason = NULL, removed_at = NULL, removed_by = NULL WHERE id = $1 RETURNING *`;
    const params = action === 'remove' ? [reason || 'No reason given', req.user.id, id] : [id];
    const result = await db.query(sql, params);
    await logAction(req.user.id, action === 'remove' ? 'remove_post' : 'restore_post', 'post', parseInt(id), { reason });
    res.json({ success: true, post: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Moderation failed' });
  }
};

/* ============================================
 * PATCH /api/admin/forum/comments/:id
 * ============================================ */
export const moderateComment = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    const sql = action === 'remove'
      ? `UPDATE forum_comments SET is_removed = TRUE, removed_reason = $1, removed_at = NOW(), removed_by = $2 WHERE id = $3 RETURNING *`
      : `UPDATE forum_comments SET is_removed = FALSE, removed_reason = NULL, removed_at = NULL, removed_by = NULL WHERE id = $1 RETURNING *`;
    const params = action === 'remove' ? [reason || 'No reason given', req.user.id, id] : [id];
    const result = await db.query(sql, params);
    await logAction(req.user.id, action === 'remove' ? 'remove_comment' : 'restore_comment', 'comment', parseInt(id), { reason });
    res.json({ success: true, comment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Moderation failed' });
  }
};

/* ============================================
 * GET /api/admin/revenue
 * ============================================ */
export const getRevenue = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const premiumTotal = await db.query(
      `SELECT COALESCE(SUM(amount_kobo), 0) AS total, COUNT(*) AS count
       FROM plan_upgrades WHERE status = 'paid'`
    );
    const bookingTotal = await db.query(
      `SELECT COALESCE(SUM(amount_kobo), 0) AS total, COUNT(*) AS count
       FROM bookings WHERE payment_status = 'paid'`
    );

    const monthly = await db.query(`
      WITH months AS (
        SELECT GENERATE_SERIES(
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'),
          DATE_TRUNC('month', CURRENT_DATE),
          INTERVAL '1 month'
        ) AS month
      )
      SELECT
        TO_CHAR(m.month, 'Mon YYYY') AS label,
        m.month,
        COALESCE((SELECT SUM(amount_kobo) FROM plan_upgrades
                  WHERE status='paid' AND DATE_TRUNC('month', paid_at) = m.month), 0) AS premium_kobo,
        COALESCE((SELECT SUM(amount_kobo) FROM bookings
                  WHERE payment_status='paid' AND DATE_TRUNC('month', paid_at) = m.month), 0) AS bookings_kobo
      FROM months m ORDER BY m.month ASC
    `);

    const activePremium = await db.query(
      `SELECT COUNT(*) FROM users WHERE plan = 'premium' AND (plan_expires_at IS NULL OR plan_expires_at > NOW())`
    );

    const recent = await db.query(
      `SELECT 'premium' AS source, pu.id, pu.amount_kobo, pu.currency, pu.paid_at, u.username, u.email
       FROM plan_upgrades pu LEFT JOIN users u ON u.id = pu.user_id
       WHERE pu.status = 'paid' AND pu.paid_at IS NOT NULL
       UNION ALL
       SELECT 'booking' AS source, b.id, b.amount_kobo, b.currency, b.paid_at, b.name AS username, b.email
       FROM bookings b WHERE b.payment_status = 'paid' AND b.paid_at IS NOT NULL
       ORDER BY paid_at DESC LIMIT 20`
    );

    res.json({
      success: true,
      totals: {
        premium_total_kobo: parseInt(premiumTotal.rows[0].total),
        premium_count: parseInt(premiumTotal.rows[0].count),
        bookings_total_kobo: parseInt(bookingTotal.rows[0].total),
        bookings_count: parseInt(bookingTotal.rows[0].count),
        active_premium_subscribers: parseInt(activePremium.rows[0].count),
      },
      monthly: monthly.rows.map(r => ({
        label: r.label,
        premium: parseInt(r.premium_kobo) / 100,
        bookings: parseInt(r.bookings_kobo) / 100,
        total: (parseInt(r.premium_kobo) + parseInt(r.bookings_kobo)) / 100,
      })),
      recent: recent.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load revenue' });
  }
};

/* ============================================
 * GET /api/admin/stocks
 * Returns NGX stocks with all editable data
 * ============================================ */
export const listAdminStocks = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { country = 'NG' } = req.query;
    const { rows } = await db.query(
      `SELECT id, symbol, display_symbol, name, sector, country, currency,
              last_price AS price, day_change_pct AS change_pct,
              avg_daily_volume_millions AS volume, high_52w, low_52w,
              pe_ratio, pb_ratio, ps_ratio, ev_ebitda, peg_ratio,
              dividend_yield, eps, market_cap_millions,
              roe, roa, gross_margin, net_margin,
              debt_to_equity, current_ratio,
              revenue_growth_yoy, earnings_growth_yoy,
              beta, volatility_1y,
              return_1m, return_3m, return_6m, return_1y,
              data_updated_at
       FROM stocks WHERE country = $1
       ORDER BY symbol ASC`,
      [country]
    );
    res.json({ success: true, stocks: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load stocks' });
  }
};

/* ============================================
 * PATCH /api/admin/stocks/:symbol
 * Update any combination of fields for one stock
 * ============================================ */
export const updateAdminStock = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const symbol = req.params.symbol.toUpperCase();
    // Map API field names → real DB columns. Keys are what the frontend sends;
    // values are the actual `stocks` columns.
    const fieldToColumn = {
      price: 'last_price', change_pct: 'day_change_pct', volume: 'avg_daily_volume_millions',
      high_52w: 'high_52w', low_52w: 'low_52w',
      pe_ratio: 'pe_ratio', pb_ratio: 'pb_ratio', ps_ratio: 'ps_ratio', ev_ebitda: 'ev_ebitda', peg_ratio: 'peg_ratio',
      dividend_yield: 'dividend_yield', eps: 'eps', market_cap_millions: 'market_cap_millions',
      roe: 'roe', roa: 'roa', gross_margin: 'gross_margin', net_margin: 'net_margin',
      debt_to_equity: 'debt_to_equity', current_ratio: 'current_ratio',
      revenue_growth_yoy: 'revenue_growth_yoy', earnings_growth_yoy: 'earnings_growth_yoy',
      beta: 'beta', volatility_1y: 'volatility_1y',
      return_1m: 'return_1m', return_3m: 'return_3m', return_6m: 'return_6m', return_1y: 'return_1y',
    };

    const setClauses = [];
    const values = [];
    let i = 1;
    for (const [field, val] of Object.entries(req.body || {})) {
      const column = fieldToColumn[field];
      if (!column) continue;
      if (val === '' || val === null) {
        setClauses.push(`${column} = NULL`);
      } else {
        const num = parseFloat(val);
        if (!Number.isFinite(num)) continue;
        setClauses.push(`${column} = $${i++}`);
        values.push(num);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    setClauses.push(`data_updated_at = NOW()`);
    values.push(symbol);

    const result = await db.query(
      `UPDATE stocks SET ${setClauses.join(', ')}
       WHERE symbol = $${i} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Stock not found' });
    }

    await logAction(req.user.id, 'update_stock', 'stock', null, { symbol });
    res.json({ success: true, stock: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};

/* ============================================
 * POST /api/admin/stocks/bulk-prices
 * Quick daily price update for many stocks at once
 * ============================================ */
export const bulkUpdatePrices = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    let updatedCount = 0;
    const errors = [];

    for (const u of updates) {
      const symbol = (u.symbol || '').toUpperCase();
      const price = parseFloat(u.price);
      if (!symbol || !Number.isFinite(price)) {
        errors.push(`Skipped ${symbol}: invalid price`);
        continue;
      }
      try {
        const result = await db.query(
          `UPDATE stocks SET last_price = $1, data_updated_at = NOW() WHERE symbol = $2`,
          [price, symbol]
        );
        if (result.rowCount > 0) updatedCount++;
      } catch (e) {
        errors.push(`${symbol}: ${e.message}`);
      }
    }

    await logAction(req.user.id, 'bulk_price_update', 'stock', null, { count: updatedCount });
    res.json({ success: true, updated: updatedCount, total: updates.length, errors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Bulk update failed' });
  }
};

/* ============================================
 * POST /api/admin/stocks/refresh-us
 * Manually trigger US stocks auto-update from Yahoo Finance
 * ============================================ */
export const refreshUSStocks = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await updateAllUSStocks();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Refresh failed' });
  }
};

/* ============================================
 * POST /api/admin/stocks/refresh-one/:symbol
 * Manually refresh one stock from Yahoo Finance
 * ============================================ */
export const refreshOneStock = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await updateSingleStock(req.params.symbol);
    res.json({ success: result.success, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Refresh failed' });
  }
};