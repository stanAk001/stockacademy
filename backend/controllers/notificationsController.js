import db from '../config/db.js';

// Create a notification. Never notify yourself, and fail silently — a missing
// notification must never break the action that triggered it.
export async function notify({ recipientId, actorId = null, type, postId = null, commentId = null, message = null }) {
  if (!recipientId || (actorId && Number(recipientId) === Number(actorId))) return;
  try {
    await db.query(
      `INSERT INTO notifications (user_id, actor_id, type, post_id, comment_id, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [recipientId, actorId, type, postId, commentId, message]
    );
  } catch (e) {
    console.error('notify failed:', e.message);
  }
}

// GET /api/notifications — recent items + unread count
export const listNotifications = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT n.id, n.type, n.is_read, n.created_at, n.post_id, n.comment_id, n.message,
              u.username AS actor_username, u.avatar_url AS actor_avatar, u.plan AS actor_plan,
              p.title AS post_title
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_id
       LEFT JOIN forum_posts p ON p.id = n.post_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 30`,
      [req.user.id]
    );
    const unread = await db.query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ success: true, notifications: rows, unread: unread.rows[0].count });
  } catch (err) {
    console.error('listNotifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
};

// POST /api/notifications/read — mark all read, or one if { id } is passed
export const markRead = async (req, res) => {
  try {
    const { id } = req.body || {};
    if (id) {
      await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND id = $2', [req.user.id, id]);
    } else {
      await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('markRead error:', err);
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
};
