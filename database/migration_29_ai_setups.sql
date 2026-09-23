-- ============================================================
-- migration_29_ai_setups.sql
-- Swing-setup records + their lifecycle event log.
--
-- A setup is a monitored trade idea produced by the Swing Radar. It moves
-- through a lifecycle (watching → approaching → triggered → confirmed → active →
-- target/invalidated/expired); every transition is appended to ai_setup_events
-- so the UI can show where a setup stands and the engine can fire a notification
-- ONLY on a meaningful stage change (never on raw metric ticks).
--
-- user_id is nullable: a setup can be system-wide (surfaced in the Opportunity
-- Radar) or tied to a user's Smart Watchlist entry.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_setups (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE, -- NULL = system/market-wide
    symbol        VARCHAR(20) NOT NULL REFERENCES stocks(symbol) ON DELETE CASCADE,
    market        VARCHAR(4)  NOT NULL,            -- 'US' | 'NG'
    objective     VARCHAR(16) DEFAULT 'swing',
    setup         VARCHAR(24) NOT NULL,            -- breakout / pullback / ...
    quality_score SMALLINT,                        -- 0-100 (transparent, factor-backed)
    confidence    DECIMAL(4, 3),                   -- 0-1 from the AI interpretation

    status        VARCHAR(16) NOT NULL DEFAULT 'watching',
    -- watching | approaching | triggered | confirmed | active | target | invalidated | expired

    -- Analysis (NOT advice) — a potential zone, not a promised entry.
    entry_low     DECIMAL(18, 4),
    entry_high    DECIMAL(18, 4),
    confirmation  TEXT,                            -- what would confirm the setup
    invalidation  DECIMAL(18, 4),                  -- level that kills the idea
    targets       JSONB,                           -- [{ level, rationale }]
    reasons       JSONB,                           -- [string]
    risks         JSONB,                           -- [string]
    catalysts     JSONB,                           -- [{ label, date }]

    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at    TIMESTAMP                        -- setups go stale; the monitor expires them
);

CREATE INDEX IF NOT EXISTS idx_ai_setups_user   ON ai_setups(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_setups_symbol ON ai_setups(symbol);
CREATE INDEX IF NOT EXISTS idx_ai_setups_status ON ai_setups(status);
-- The monitor scans "live" setups every run; keep that lookup cheap.
CREATE INDEX IF NOT EXISTS idx_ai_setups_active ON ai_setups(status)
  WHERE status IN ('watching', 'approaching', 'triggered', 'confirmed', 'active');

CREATE TABLE IF NOT EXISTS ai_setup_events (
    id          SERIAL PRIMARY KEY,
    setup_id    INTEGER NOT NULL REFERENCES ai_setups(id) ON DELETE CASCADE,
    from_status VARCHAR(16),
    to_status   VARCHAR(16) NOT NULL,
    note        TEXT,                              -- plain-language "what changed"
    price_at    DECIMAL(18, 4),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_setup_events_setup ON ai_setup_events(setup_id, created_at);
