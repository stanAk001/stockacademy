-- ============================================================
-- migration_34_feature_usage.sql
-- Server-side metering for the Free → Premium funnel.
--
-- The old model was all-or-nothing: requirePremium returned a hard 403 and Free
-- users saw nothing. The product now wants Free users to TASTE the intelligence
-- (a few Scout scans, a few analyses) and then hit a soft wall that sells Premium.
-- This table counts billable actions per user, per feature, inside a rolling
-- window. Limits themselves live in code (backend/config/entitlements.js) so they
-- stay configurable without a migration.
--
-- One row per (user, feature, period_start). We upsert-and-increment; a nightly
-- job isn't required because we key the window by a truncated period_start, so a
-- new month/day simply lands on a new row.
-- ============================================================

CREATE TABLE IF NOT EXISTS feature_usage (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature      VARCHAR(40) NOT NULL,           -- ai_scout | ai_analysis | ai_comparison | tracked_setup | ...
    period       VARCHAR(8)  NOT NULL,           -- 'month' | 'day' — which window this row counts
    period_start DATE        NOT NULL,           -- truncated start of the window (date_trunc)
    used         INTEGER     NOT NULL DEFAULT 0,
    updated_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, feature, period, period_start)
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_lookup
  ON feature_usage(user_id, feature, period, period_start);

-- ------------------------------------------------------------
-- analytics_events — lightweight product analytics (spec §41).
-- Meaningful funnel + retention events. Kept generic (event + props JSONB) so we
-- don't add a column per event; user_id nullable for pre-auth/anonymous events.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_events (
    id         BIGSERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event      VARCHAR(48) NOT NULL,             -- scout_used | upgrade_clicked | setup_created | ...
    props      JSONB,                            -- { symbol, market, feature, ... }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_event  ON analytics_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user   ON analytics_events(user_id, created_at DESC);
