-- ============================================================
-- migration_31_notifications_platform.sql
-- Generalize the in-app notifications table into a multi-category feed, and add
-- per-category channel preferences.
--
-- The notifications table was forum-shaped (actor/post/comment). These columns
-- let market/AI/portfolio events live in the same bell: a category to group and
-- filter by, a deep link to open on click, and a severity for styling. All
-- additive — existing forum notifications keep working (category just null).
-- ============================================================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS category  VARCHAR(24),          -- trading | ai | portfolio | market | news | product | social
  ADD COLUMN IF NOT EXISTS deep_link TEXT,                 -- in-app path to open, e.g. '/setups'
  ADD COLUMN IF NOT EXISTS severity  VARCHAR(12) DEFAULT 'info'; -- info | success | warning | critical

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- One row per (user, category). A missing row means "all channels on" (opt-out
-- model) — the engine treats absence as the default, so existing users need no
-- backfill.
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category  VARCHAR(24) NOT NULL,
    in_app    BOOLEAN DEFAULT TRUE,
    push      BOOLEAN DEFAULT TRUE,
    telegram  BOOLEAN DEFAULT TRUE,
    email     BOOLEAN DEFAULT FALSE,   -- email is opt-IN per category (avoid inbox spam)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, category)
);
