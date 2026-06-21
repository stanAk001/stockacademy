-- ============================================================
-- migration_17_social_interactions.sql
-- Social-style community interactions:
--   • notifications  — alert users when someone likes/comments/replies
--   • comment_votes  — let users "like" individual comments
--   • forum_comments.parent_comment_id — one level of threaded replies
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- recipient
  actor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,           -- who triggered it
  type VARCHAR(30) NOT NULL,                                         -- post_like | post_comment | comment_reply | comment_like
  post_id INTEGER REFERENCES forum_posts(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES forum_comments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS comment_votes (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id INTEGER NOT NULL REFERENCES forum_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, comment_id)
);

ALTER TABLE forum_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id INTEGER REFERENCES forum_comments(id) ON DELETE CASCADE;
