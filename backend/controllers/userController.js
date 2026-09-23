import db from '../config/db.js';
import { cleanProfile, normalizeRisk } from '../services/investorProfile.js';

export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [lessonsDone, quizzesPassed, portfolio, transactions, achievements] = await Promise.all([
      db.query(
        'SELECT COUNT(*) AS count FROM user_progress WHERE user_id = $1 AND completed = true',
        [userId]
      ),
      db.query('SELECT COUNT(*) AS count FROM quiz_attempts WHERE user_id = $1 AND passed = true', [userId]),
      db.query('SELECT COUNT(*) AS count FROM portfolios WHERE user_id = $1', [userId]),
      db.query('SELECT COUNT(*) AS count FROM transactions WHERE user_id = $1', [userId]),
      db.query('SELECT COUNT(*) AS count FROM user_achievements WHERE user_id = $1', [userId]),
    ]);

    const totalLessons = await db.query('SELECT COUNT(*) AS count FROM lessons');
    const progressPct = totalLessons.rows[0].count > 0
      ? Math.round((parseInt(lessonsDone.rows[0].count) / parseInt(totalLessons.rows[0].count)) * 100)
      : 0;

    res.json({
      success: true,
      stats: {
        lessons_completed: parseInt(lessonsDone.rows[0].count),
        total_lessons: parseInt(totalLessons.rows[0].count),
        progress_pct: progressPct,
        quizzes_passed: parseInt(quizzesPassed.rows[0].count),
        holdings: parseInt(portfolio.rows[0].count),
        trades: parseInt(transactions.rows[0].count),
        achievements: parseInt(achievements.rows[0].count),
        xp: req.user.total_xp,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
};

// PATCH /api/users/objective — save the investment profile (spec §3).
// Only the keys actually sent are updated, and null CLEARS a value (e.g. the
// Scout's "Both" market sends preferred_market: null). Uses migration_28 columns.
const OBJECTIVES = ['swing', 'longterm', 'explore'];

export const updateObjective = async (req, res) => {
  try {
    const b = req.body || {};
    const sets = [];
    const vals = [];
    const add = (col, val) => { vals.push(val); sets.push(`${col} = $${vals.length}`); };

    if ('objective' in b) {
      if (b.objective != null && !OBJECTIVES.includes(b.objective)) {
        return res.status(400).json({ success: false, message: 'Invalid objective.' });
      }
      add('objective', b.objective ?? null);
    }
    if ('risk_tolerance' in b) {
      const r = b.risk_tolerance == null ? null : normalizeRisk(b.risk_tolerance);
      if (b.risk_tolerance != null && !r) {
        return res.status(400).json({ success: false, message: 'Invalid risk tolerance.' });
      }
      add('risk_tolerance', r);
    }
    if ('preferred_market' in b) {
      const m = b.preferred_market;
      const market = m == null || m === 'ALL' || m === 'BOTH' ? null : (m === 'US' || m === 'NG') ? m : undefined;
      if (market === undefined) return res.status(400).json({ success: false, message: 'Invalid market.' });
      add('preferred_market', market);
    }
    if ('investor_profile' in b) add('investor_profile', JSON.stringify(cleanProfile(b.investor_profile)));

    if (!sets.length) return res.status(400).json({ success: false, message: 'Nothing to update.' });

    vals.push(req.user.id);
    const { rows } = await db.query(
      `UPDATE users SET ${sets.join(', ')}, updated_at = NOW()
        WHERE id = $${vals.length}
        RETURNING objective, risk_tolerance, preferred_market, investor_profile`,
      vals
    );
    res.json({ success: true, ...rows[0] });
  } catch (err) {
    console.error('updateObjective error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to save objective' });
  }
};

// GET /api/users/objective — the saved profile (normalised) plus the sectors
// available to pick from, for the Investment Profile page.
export const getObjective = async (req, res) => {
  try {
    const [u, sec] = await Promise.all([
      db.query(
        `SELECT objective, risk_tolerance, preferred_market, investor_profile FROM users WHERE id = $1`,
        [req.user.id]
      ),
      db.query(
        `SELECT sector, COUNT(*)::int AS n FROM stocks
          WHERE is_active = TRUE AND sector IS NOT NULL AND sector <> ''
          GROUP BY sector ORDER BY n DESC LIMIT 30`
      ),
    ]);
    const r = u.rows[0] || {};
    res.json({
      success: true,
      objective: r.objective || null,
      risk_tolerance: normalizeRisk(r.risk_tolerance),
      preferred_market: r.preferred_market || null,
      investor_profile: cleanProfile(r.investor_profile || {}),
      sectors: sec.rows.map((x) => x.sector),
    });
  } catch (err) {
    console.error('getObjective error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load your profile' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { full_name, bio, experience_level } = req.body;
    const { rows } = await db.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), bio = COALESCE($2, bio),
        experience_level = COALESCE($3, experience_level), updated_at = NOW()
       WHERE id = $4
       RETURNING id, username, email, full_name, bio, avatar_url, experience_level, virtual_balance, total_xp, auth_provider, plan`,
      [full_name, bio, experience_level, req.user.id]
    );
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

export const getLeaderboard = async (req, res) => {
  const { rows } = await db.query(
    `SELECT username, full_name, avatar_url, total_xp
     FROM users
     ORDER BY total_xp DESC LIMIT 20`
  );
  res.json({ success: true, leaderboard: rows });
};

/* ============================================
 *  Recently viewed stocks — uses stock_views table
 * ============================================ */
export const getRecentlyViewed = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT ON (sv.symbol)
         sv.symbol, sv.viewed_at,
         s.display_symbol, s.name, s.country, s.currency, s.last_price, s.day_change_pct, s.sector
       FROM stock_views sv
       JOIN stocks s ON s.symbol = sv.symbol
       WHERE sv.user_id = $1
       ORDER BY sv.symbol, sv.viewed_at DESC
       LIMIT 6`,
      [req.user.id]
    );
    // Re-sort by viewed_at across the deduped set
    rows.sort((a, b) => new Date(b.viewed_at) - new Date(a.viewed_at));
    res.json({ success: true, recent: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load recent stocks' });
  }
};
