// portfolioReviewController.js — human-handled portfolio reviews.
//   Premium users submit ONE request per 90 days; an admin replies in writing.
import db from '../config/db.js';
import { notifyReviewComplete, notifyPortfolioReviewSubmitted } from '../services/telegramService.js';

const COOLDOWN_DAYS = 90;
const MAX_SNAPSHOT_BYTES = 100 * 1024; // 100KB
const MIN_NOTES = 20;
const MIN_RESPONSE = 50;
const addDays = (d, n) => new Date(new Date(d).getTime() + n * 24 * 60 * 60 * 1000);

/* POST /api/portfolio-reviews/submit  (premium)
 * body: { portfolio_snapshot (JSON object/array), user_notes }
 * If portfolio_snapshot is omitted we snapshot the user's simulator holdings. */
export const submitReview = async (req, res) => {
  try {
    const userNotes = (req.body?.user_notes || '').trim();
    if (userNotes.length < MIN_NOTES) {
      return res.status(400).json({
        success: false,
        message: `Tell us what you'd like feedback on (at least ${MIN_NOTES} characters).`,
      });
    }

    // Build / validate the portfolio snapshot.
    let snapshot = req.body?.portfolio_snapshot ?? req.body?.holdings;
    if (snapshot === undefined || snapshot === null ||
        (Array.isArray(snapshot) && snapshot.length === 0)) {
      const { rows } = await db.query(
        `SELECT symbol, company_name, shares, avg_buy_price FROM portfolios WHERE user_id = $1`,
        [req.user.id]
      );
      snapshot = rows.map((r) => ({
        symbol: r.symbol, name: r.company_name,
        shares: parseFloat(r.shares), avg_buy_price: parseFloat(r.avg_buy_price),
      }));
    }

    let snapshotStr;
    try {
      snapshotStr = JSON.stringify(snapshot);
    } catch {
      return res.status(400).json({ success: false, message: 'Portfolio must be valid data.' });
    }
    if (!snapshotStr || snapshotStr === 'null' || snapshotStr === '{}' || snapshotStr === '[]') {
      return res.status(400).json({ success: false, message: 'Please include your portfolio.' });
    }
    if (Buffer.byteLength(snapshotStr, 'utf8') > MAX_SNAPSHOT_BYTES) {
      return res.status(413).json({ success: false, message: 'Portfolio is too large (max 100KB).' });
    }

    // One submission per 90 days.
    const { rows: recent } = await db.query(
      `SELECT submitted_at FROM portfolio_review_requests
       WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (recent.length) {
      const nextEligible = addDays(recent[0].submitted_at, COOLDOWN_DAYS);
      if (nextEligible > new Date()) {
        return res.status(429).json({
          success: false,
          message: `You can submit one review per quarter. Next eligible: ${nextEligible.toLocaleDateString()}`,
          next_eligible: nextEligible,
        });
      }
    }

    const { rows } = await db.query(
      `INSERT INTO portfolio_review_requests (user_id, portfolio_snapshot, user_notes)
       VALUES ($1, $2, $3) RETURNING id, submitted_at, status`,
      [req.user.id, snapshotStr, userNotes]
    );

    // Tell the admin on Telegram (best-effort).
    const uRes = await db.query('SELECT email, username, full_name FROM users WHERE id = $1', [req.user.id]);
    if (uRes.rows[0]) notifyPortfolioReviewSubmitted(uRes.rows[0]).catch(() => {});

    res.json({ success: true, request: rows[0], message: 'Submitted — your mentor will review it soon.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not submit your review' });
  }
};

/* GET /api/portfolio-reviews/mine */
export const myReviews = async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, submitted_at, portfolio_snapshot, user_notes, status, admin_response, reviewed_at
     FROM portfolio_review_requests
     WHERE user_id = $1 ORDER BY submitted_at DESC`,
    [req.user.id]
  );
  const last = rows[0]?.submitted_at;
  const nextEligible = last ? addDays(last, COOLDOWN_DAYS) : null;
  res.json({
    success: true,
    reviews: rows,
    can_submit: !nextEligible || nextEligible <= new Date(),
    next_eligible: nextEligible,
  });
};

/* ---- admin ---- */

/* GET /api/admin/portfolio-reviews?status=pending  (admin-only) */
export const listReviews = async (req, res) => {
  if (!req.user?.is_admin) return res.status(403).json({ success: false, message: 'Admins only' });
  const status = req.query.status;
  const params = [];
  let where = '';
  if (status) { params.push(status); where = `WHERE r.status = $1`; }
  const { rows } = await db.query(
    `SELECT r.*, u.username, u.email, u.full_name
     FROM portfolio_review_requests r
     JOIN users u ON u.id = r.user_id
     ${where}
     ORDER BY (r.status = 'pending') DESC, r.submitted_at ASC`,
    params
  );
  res.json({ success: true, reviews: rows });
};

/* POST /api/admin/portfolio-reviews/:id/respond  { admin_response, status }  (admin-only) */
export const respondReview = async (req, res) => {
  if (!req.user?.is_admin) return res.status(403).json({ success: false, message: 'Admins only' });
  const text = (req.body?.admin_response ?? req.body?.response ?? '').trim();
  if (text.length < MIN_RESPONSE) {
    return res.status(400).json({
      success: false,
      message: `Write a proper response (at least ${MIN_RESPONSE} characters).`,
    });
  }

  try {
    const { rows } = await db.query(
      `UPDATE portfolio_review_requests
         SET admin_response = $1, status = 'reviewed', reviewed_at = NOW()
       WHERE id = $2
       RETURNING user_id`,
      [text, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Review not found' });

    // Notify the user on Telegram if they've linked a chat.
    const uRes = await db.query('SELECT telegram_chat_id FROM users WHERE id = $1', [rows[0].user_id]);
    const chatId = uRes.rows[0]?.telegram_chat_id;
    if (chatId) notifyReviewComplete(chatId).catch(() => {});

    res.json({ success: true, message: 'Response sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not save response' });
  }
};
