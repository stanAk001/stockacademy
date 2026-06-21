-- ============================================
-- StockAcademia — Personal Portfolio Reviews (Phase 1)
-- Purpose: premium users submit one portfolio for a human review per quarter;
--          an admin replies, and the user sees the response in their dashboard.
-- Depends on: schema.sql (users), migration_10_premium_subscriptions.sql.
-- What changes:
--   • Creates portfolio_review_requests (the request + admin response).
-- Idempotent — safe to re-run.
-- ============================================

CREATE TABLE IF NOT EXISTS portfolio_review_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP DEFAULT NOW(),
  portfolio_snapshot JSONB,
  user_notes TEXT,
  status TEXT DEFAULT 'pending',          -- 'pending' | 'reviewed'
  admin_response TEXT,
  reviewed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portfolio_reviews_user
  ON portfolio_review_requests (user_id, submitted_at DESC);
