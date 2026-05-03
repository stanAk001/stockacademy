import db from '../config/db.js';

/* ============================================
 *  LIST POSTS
 *  Hides soft-removed posts from non-admins
 * ============================================ */
export const listPosts = async (req, res) => {
  try {
    const { category } = req.query;
    const params = [];
    let where = 'WHERE p.is_removed = FALSE';
    if (category && category !== 'all') {
      params.push(category);
      where += ` AND p.category = $1`;
    }
    const { rows } = await db.query(
      `SELECT p.*, u.username, u.avatar_url, u.full_name,
        (SELECT COUNT(*) FROM forum_comments c WHERE c.post_id = p.id AND c.is_removed = FALSE) AS comment_count
       FROM forum_posts p
       JOIN users u ON u.id = p.user_id
       ${where}
       ORDER BY p.created_at DESC LIMIT 100`,
      params
    );
    res.json({ success: true, posts: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load posts' });
  }
};

/* ============================================
 *  GET POST
 *  - Removed posts return 404 to non-admins
 *  - Removed comments return as tombstones to non-admins
 *  - Admins see everything
 * ============================================ */
export const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    const postRes = await db.query(
      `SELECT p.*, u.username, u.avatar_url, u.full_name
       FROM forum_posts p JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`,
      [id]
    );
    if (postRes.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Post not found' });

    const post = postRes.rows[0];

    // Hide removed posts from non-admins
    if (post.is_removed && !req.user?.is_admin) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    await db.query('UPDATE forum_posts SET views = views + 1 WHERE id = $1', [id]);

    const commentsRes = await db.query(
      `SELECT c.*, u.username, u.avatar_url
       FROM forum_comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
      [id]
    );

    // For non-admins, tombstone removed comments
    const comments = commentsRes.rows.map((c) => {
      if (c.is_removed && !req.user?.is_admin) {
        return {
          ...c,
          content: '[This comment was removed by a moderator]',
          username: '[removed]',
          avatar_url: null,
        };
      }
      return c;
    });

    res.json({ success: true, post, comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load post' });
  }
};

/* ============================================
 *  CREATE POST
 *  Banned users blocked
 * ============================================ */
export const createPost = async (req, res) => {
  try {
    if (req.user.is_banned) {
      return res.status(403).json({ success: false, message: 'Your account is suspended.' });
    }

    const { title, content, category, tags } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content required' });
    }
    const { rows } = await db.query(
      `INSERT INTO forum_posts (user_id, title, content, category, tags)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, title, content, category || 'general', tags || []]
    );
    res.json({ success: true, post: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create post' });
  }
};

/* ============================================
 *  ADD COMMENT
 *  Banned users blocked
 * ============================================ */
export const addComment = async (req, res) => {
  try {
    if (req.user.is_banned) {
      return res.status(403).json({ success: false, message: 'Your account is suspended.' });
    }

    const { id } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Comment content required' });

    const { rows } = await db.query(
      'INSERT INTO forum_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [id, req.user.id, content]
    );
    res.json({ success: true, comment: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
};

/* ============================================
 *  VOTE ON POST
 *  Banned users blocked
 * ============================================ */
export const votePost = async (req, res) => {
  try {
    if (req.user.is_banned) {
      return res.status(403).json({ success: false, message: 'Your account is suspended.' });
    }

    const { id } = req.params;
    const existing = await db.query(
      'SELECT vote_type FROM post_votes WHERE user_id = $1 AND post_id = $2',
      [req.user.id, id]
    );
    if (existing.rows.length > 0) {
      await db.query('DELETE FROM post_votes WHERE user_id = $1 AND post_id = $2', [req.user.id, id]);
      await db.query('UPDATE forum_posts SET upvotes = upvotes - 1 WHERE id = $1', [id]);
      return res.json({ success: true, voted: false });
    }
    await db.query(
      'INSERT INTO post_votes (user_id, post_id, vote_type) VALUES ($1, $2, 1)',
      [req.user.id, id]
    );
    await db.query('UPDATE forum_posts SET upvotes = upvotes + 1 WHERE id = $1', [id]);
    res.json({ success: true, voted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Vote failed' });
  }
};