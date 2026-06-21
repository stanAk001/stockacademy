-- ============================================
-- StockAcademia — AI response cache (Phase 1)
-- Purpose: cache AI results per key (e.g. "compare:AAPL:MSFT", "portfolio:42")
--          so repeated requests don't re-bill the Anthropic API.
-- Depends on: schema.sql, migration_10_premium_subscriptions.sql.
-- What changes:
--   • Creates ai_cache (cache_key → response JSON with an expiry).
-- Idempotent — safe to re-run.
-- ============================================

CREATE TABLE IF NOT EXISTS ai_cache (
  id SERIAL PRIMARY KEY,
  cache_key TEXT UNIQUE,
  response JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_cache (cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache (expires_at);
