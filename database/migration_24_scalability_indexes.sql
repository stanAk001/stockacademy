-- Migration 24: indexes that keep hot paths fast as the app grows.
-- Safe to run repeatedly (IF NOT EXISTS).

-- The AI tutor free-tier check counts a user's tutor calls on every request.
-- Without this it seq-scans ai_usage_log, which only grows.
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_feature
  ON ai_usage_log (user_id, feature);

-- ai_cache is read on every AI request (compare/explain/news/tutor/brief).
CREATE INDEX IF NOT EXISTS idx_ai_cache_key
  ON ai_cache (cache_key);

-- Daily recap "top movers" + rankings filter/sort on these.
CREATE INDEX IF NOT EXISTS idx_stocks_country_active
  ON stocks (country, is_active);

-- Notifications and forum views are per-user reads on busy pages.
CREATE INDEX IF NOT EXISTS idx_ai_usage_created
  ON ai_usage_log (created_at);
