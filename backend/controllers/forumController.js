import db from '../config/db.js';
import { notify } from './notificationsController.js';

/* ============================================
 *  COMMUNITY "NEW POSTS" BADGE
 *  Count of discussions by others since the user last opened the
 *  forum (baseline = their last visit, or account creation if never).
 * ============================================ */
export const forumNewCount = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM forum_posts p
       WHERE p.is_removed = FALSE
         AND p.user_id <> $1
         AND p.created_at > COALESCE(
           (SELECT forum_last_seen_at FROM users WHERE id = $1),
           (SELECT created_at FROM users WHERE id = $1)
         )`,
      [req.user.id]
    );
    res.json({ success: true, count: rows[0].count });
  } catch (err) {
    console.error('forumNewCount error:', err);
    res.status(500).json({ success: false, message: 'Failed to load count' });
  }
};

export const markForumSeen = async (req, res) => {
  try {
    await db.query('UPDATE users SET forum_last_seen_at = NOW() WHERE id = $1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('markForumSeen error:', err);
    res.status(500).json({ success: false, message: 'Failed' });
  }
};

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
    // The full image_url (a large data URL) is intentionally NOT selected here —
    // we send only the small image_thumb for the feed preview, so the payload
    // stays light. The full image loads on the post detail page.
    const { rows } = await db.query(
      `SELECT p.id, p.user_id, p.title, p.content, p.category, p.tags, p.upvotes, p.views,
              p.created_at, p.updated_at, (p.image_url IS NOT NULL) AS has_image, p.image_thumb,
              u.username, u.avatar_url, u.full_name, u.plan,
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
      `SELECT p.*, u.username, u.avatar_url, u.full_name, u.plan,
              EXISTS(SELECT 1 FROM post_votes pv WHERE pv.post_id = p.id AND pv.user_id = $2) AS liked
       FROM forum_posts p JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`,
      [id, req.user.id]
    );
    if (postRes.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Post not found' });

    const post = postRes.rows[0];

    // Hide removed posts from non-admins
    if (post.is_removed && !req.user?.is_admin) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Count a view at most once per OTHER user — the author's own views never
    // count, and re-opening the post doesn't inflate the number.
    if (post.user_id !== req.user.id) {
      const ins = await db.query(
        'INSERT INTO forum_post_views (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, req.user.id]
      );
      if (ins.rowCount === 1) {
        await db.query('UPDATE forum_posts SET views = views + 1 WHERE id = $1', [id]);
        post.views = (post.views || 0) + 1; // reflect it in this response
      }
    }

    const commentsRes = await db.query(
      `SELECT c.*, u.username, u.avatar_url, u.plan,
              EXISTS(SELECT 1 FROM comment_votes cv WHERE cv.comment_id = c.id AND cv.user_id = $2) AS liked
       FROM forum_comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1 ORDER BY c.created_at ASC`,
      [id, req.user.id]
    );

    // For non-admins, tombstone removed comments
    const comments = commentsRes.rows.map((c) => {
      if (c.is_removed && !req.user?.is_admin) {
        return {
          ...c,
          content: '[This comment was removed by a moderator]',
          username: '[removed]',
          avatar_url: null,
          plan: null,
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

    const { title, content, category, tags, image_url, image_thumb } = req.body;
    const t = (title || '').trim();
    const ct = (content || '').trim();
    const img = typeof image_url === 'string' ? image_url.trim() : '';
    const thumbRaw = typeof image_thumb === 'string' ? image_thumb.trim() : '';
    // Only keep a thumbnail if there's a real image and it looks like image data.
    const thumb = img && /^data:image\//.test(thumbRaw) ? thumbRaw : null;

    // Social-style: a post just needs at least ONE of title / text / image.
    if (!t && !ct && !img) {
      return res.status(400).json({ success: false, message: 'Add a title, some text, or an image to post.' });
    }
    if (t.length > 300 || ct.length > 5000) {
      return res.status(400).json({ success: false, message: 'That post is too long.' });
    }
    if (img) {
      const ok = /^data:image\/(png|jpe?g|webp|gif);base64,/.test(img) || /^https?:\/\//.test(img);
      if (!ok) return res.status(400).json({ success: false, message: 'Unsupported image format.' });
      if (img.length > 5_000_000) {
        return res.status(413).json({ success: false, message: 'That image is too large — please choose a smaller one.' });
      }
    }

    const { rows } = await db.query(
      `INSERT INTO forum_posts (user_id, title, content, category, tags, image_url, image_thumb)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, t || null, ct || null, category || 'general', tags || [], img || null, thumb]
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
    const { content, parent_comment_id } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Comment content required' });
    if (content.length > 2000) return res.status(400).json({ success: false, message: 'That comment is too long.' });
    const parentId = parent_comment_id ? Number(parent_comment_id) : null;

    const { rows } = await db.query(
      'INSERT INTO forum_comments (post_id, user_id, content, parent_comment_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, req.user.id, content, parentId]
    );
    const comment = rows[0];

    // Notify: a reply pings the parent commenter; a top-level comment pings the post owner.
    if (parentId) {
      const parent = await db.query('SELECT user_id FROM forum_comments WHERE id = $1', [parentId]);
      await notify({ recipientId: parent.rows[0]?.user_id, actorId: req.user.id, type: 'comment_reply', postId: Number(id), commentId: comment.id });
    } else {
      const post = await db.query('SELECT user_id FROM forum_posts WHERE id = $1', [id]);
      await notify({ recipientId: post.rows[0]?.user_id, actorId: req.user.id, type: 'post_comment', postId: Number(id), commentId: comment.id });
    }

    res.json({ success: true, comment });
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

    const owner = await db.query('SELECT user_id FROM forum_posts WHERE id = $1', [id]);
    await notify({ recipientId: owner.rows[0]?.user_id, actorId: req.user.id, type: 'post_like', postId: Number(id) });

    res.json({ success: true, voted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Vote failed' });
  }
};

/* ============================================
 *  LIKE / UNLIKE A COMMENT (toggle)
 * ============================================ */
export const voteComment = async (req, res) => {
  try {
    if (req.user.is_banned) {
      return res.status(403).json({ success: false, message: 'Your account is suspended.' });
    }

    const { commentId } = req.params;
    const existing = await db.query(
      'SELECT 1 FROM comment_votes WHERE user_id = $1 AND comment_id = $2',
      [req.user.id, commentId]
    );
    if (existing.rows.length > 0) {
      await db.query('DELETE FROM comment_votes WHERE user_id = $1 AND comment_id = $2', [req.user.id, commentId]);
      await db.query('UPDATE forum_comments SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = $1', [commentId]);
      return res.json({ success: true, liked: false });
    }
    await db.query('INSERT INTO comment_votes (user_id, comment_id) VALUES ($1, $2)', [req.user.id, commentId]);
    await db.query('UPDATE forum_comments SET upvotes = upvotes + 1 WHERE id = $1', [commentId]);

    const owner = await db.query('SELECT user_id, post_id FROM forum_comments WHERE id = $1', [commentId]);
    await notify({
      recipientId: owner.rows[0]?.user_id, actorId: req.user.id,
      type: 'comment_like', postId: owner.rows[0]?.post_id, commentId: Number(commentId),
    });

    res.json({ success: true, liked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Vote failed' });
  }
};