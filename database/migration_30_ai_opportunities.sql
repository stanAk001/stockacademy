-- ============================================================
-- migration_30_ai_opportunities.sql
-- Scout/Radar output cache + per-user Smart Watchlist insights.
--
-- ai_opportunities holds the latest ranked candidate batch for a given scope
-- (market + objective), written by the quant→AI funnel on a schedule and read by
-- the Opportunity Radar dashboard. Keyed by scope + generated_at so we can serve
-- the freshest run and prune old ones. This is a CACHE — never the source of a
-- number; it stores what the engine already computed.
--
-- ai_watchlist_insights holds the latest per-(user, symbol) read for the Smart
-- Watchlist ("momentum improving" / "setup weakening").
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_opportunities (
    id            SERIAL PRIMARY KEY,
    scope         VARCHAR(40) NOT NULL,            -- e.g. 'US:swing', 'NG:longterm'
    symbol        VARCHAR(20) NOT NULL REFERENCES stocks(symbol) ON DELETE CASCADE,
    rank          SMALLINT,
    quality_score SMALLINT,
    setup         VARCHAR(24),
    category      VARCHAR(24),                     -- strong / developing / weakening / momentum / pullback / catalyst
    summary       JSONB,                           -- { headline, why[], watch[], risk[] } from the AI pass
    generated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_opps_scope ON ai_opportunities(scope, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_opps_symbol ON ai_opportunities(symbol);

CREATE TABLE IF NOT EXISTS ai_watchlist_insights (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol      VARCHAR(20) NOT NULL REFERENCES stocks(symbol) ON DELETE CASCADE,
    status      VARCHAR(24),                       -- healthy_uptrend / weakening / approaching_setup / ...
    headline    TEXT,
    insight     JSONB,                             -- structured detail behind the headline
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, symbol)
);
