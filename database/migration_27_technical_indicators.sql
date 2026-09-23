-- ============================================================
-- migration_27_technical_indicators.sql
-- Cache of computed technical indicators + transparent setup score per stock.
--
-- Filled by a scheduled job (services/indicators.js does the math from daily
-- candles). A few columns are promoted out of the JSON so the screener/Scout can
-- filter on them in SQL; the rest live in JSONB. Nothing here is user data and
-- nothing is destructive.
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_technicals (
    symbol        VARCHAR(20) PRIMARY KEY REFERENCES stocks(symbol) ON DELETE CASCADE,

    -- Promoted, queryable fields (used by Scout/screener filters)
    trend         VARCHAR(10),          -- bullish / bearish / sideways / unknown
    rsi14         DECIMAL(6, 2),
    quality_score SMALLINT,             -- 0-100 setup quality (NULL when setup = none)
    setup         VARCHAR(24),          -- breakout / pullback / trend_continuation / support_bounce / none
    has_ohlc      BOOLEAN DEFAULT FALSE, -- false for close-only markets (NGX) → ATR/rel-vol absent
    has_volume    BOOLEAN DEFAULT FALSE,
    bars          INTEGER,              -- how much history the compute saw

    -- Everything else, as computed by computeTechnicals(): sma/ema/macd/atr/
    -- support/resistance/range_position/ma_cross, plus setup_reason and the
    -- scored factor breakdown (the "why 82?" list — Decision 1 of the 2.0 plan).
    technicals    JSONB,
    factors       JSONB,
    setup_reason  TEXT,

    computed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discovery/screener access patterns.
CREATE INDEX IF NOT EXISTS idx_technicals_setup ON stock_technicals(setup);
CREATE INDEX IF NOT EXISTS idx_technicals_score ON stock_technicals(quality_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_technicals_trend ON stock_technicals(trend);
