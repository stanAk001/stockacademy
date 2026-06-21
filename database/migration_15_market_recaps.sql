-- ============================================
-- StockAcademia — Daily market recaps (SEO content engine)
-- Purpose: store AI-generated daily NGX+US market recaps that are served as
--          public, crawlable HTML pages (/insights) to win organic search
--          traffic that funnels into signups.
-- Depends on: schema.sql (stocks for movers), ai_usage_log (migration_13).
-- What changes: creates market_recaps.
-- Idempotent — safe to re-run.
-- ============================================

CREATE TABLE IF NOT EXISTS market_recaps (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,           -- used as the meta description
  body_html TEXT,         -- rendered article body (server-controlled HTML)
  published_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_recaps_published ON market_recaps (published_at DESC);
