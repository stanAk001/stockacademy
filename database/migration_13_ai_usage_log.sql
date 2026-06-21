-- ============================================
-- StockAcademia — AI usage / cost log (Phase 1)
-- Purpose: record every AI call (tokens + estimated cost) so spending can be
--          queried at any time, e.g.
--            SELECT SUM(estimated_cost_usd) FROM ai_usage_log
--            WHERE created_at >= date_trunc('month', NOW());
-- Depends on: schema.sql, migration_12_ai_cache.sql.
-- What changes:
--   • Creates ai_usage_log (one row per real Anthropic call).
-- Idempotent — safe to re-run.
-- ============================================

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  feature TEXT,                            -- 'compare_stocks' | 'analyze_portfolio'
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost_usd NUMERIC(10, 6),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created ON ai_usage_log (created_at);
