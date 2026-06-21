-- ============================================================
-- migration_18_forum_last_seen.sql
-- Track when each user last opened the community, so we can show a
-- lightweight "new posts" badge (count of discussions since their last
-- visit) instead of spamming a notification per post.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS forum_last_seen_at TIMESTAMP;
