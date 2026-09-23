-- ============================================================
-- migration_28_user_objective.sql
-- The user's investing objective + optional risk profile.
--
-- Drives the AI experience: "What are you trying to accomplish?" → Swing /
-- Long-term / Explore. Everything is optional and nullable — the AI is useful
-- with just the objective set, so the advanced profile can stay empty.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS objective        VARCHAR(16),   -- 'swing' | 'longterm' | 'explore'
  ADD COLUMN IF NOT EXISTS risk_tolerance   VARCHAR(16),   -- 'low' | 'moderate' | 'high'
  ADD COLUMN IF NOT EXISTS preferred_market VARCHAR(4),    -- 'US' | 'NG' | NULL = both
  ADD COLUMN IF NOT EXISTS investor_profile JSONB;         -- optional: capital range, sectors, holding period, etc.
