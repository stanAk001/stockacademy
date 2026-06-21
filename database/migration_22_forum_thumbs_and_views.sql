-- ============================================================
-- migration_22_forum_thumbs_and_views.sql
--   1. image_thumb — a small preview shown directly in the feed, so people
--      see an image post without having to open it.
--   2. forum_post_views — count a view at most once per OTHER user. The
--      author's own views never count, and re-opening a post doesn't inflate
--      the number.
--
--   We also reset the old `views` counter to 0 so it matches this new source
--   of truth — the previous counts were inflated by the old "+1 on every load"
--   logic (including the author's own visits).
-- ============================================================

ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS image_thumb TEXT;

CREATE TABLE IF NOT EXISTS forum_post_views (
    post_id   INTEGER NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- Start the counter from an accurate baseline (the old values were inflated).
UPDATE forum_posts SET views = 0;
