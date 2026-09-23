-- ============================================================
-- migration_37_journal.sql
-- Trading/investment journal + post-trade review + personal insights (§14-16).
--
-- A journal entry is the record of a trade the user took: their thesis, the AI's
-- thesis, entry/exit, result, and lessons. Most are created AUTOMATICALLY when a
-- position closes (we already capture entry/exit/P&L there) — the user can also
-- add one by hand. The post-trade AI review is generated on demand and cached on
-- the row (`review`), so re-opening it costs nothing.
--
-- personal_insights caches the latest behavioural read ("you do better with
-- pullbacks", "you enter before confirmation") — computed from the journal only
-- when there's enough history to be honest about it. Deterministic stats first;
-- the AI just phrases them.
-- ============================================================

CREATE TABLE IF NOT EXISTS journal_entries (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position_id   INTEGER REFERENCES positions(id) ON DELETE SET NULL, -- source position, if auto-created
    symbol        VARCHAR(20) NOT NULL,
    market        VARCHAR(4),                          -- 'US' | 'NG'
    objective     VARCHAR(16),                         -- 'swing' | 'longterm'
    setup         VARCHAR(24),                         -- breakout / pullback / ... (from the AI setup, if any)

    entry_price   DECIMAL(18, 4),
    exit_price    DECIMAL(18, 4),
    quantity      DECIMAL(18, 4),
    entry_date    DATE,
    exit_date     DATE,
    holding_days  INTEGER,
    result_pct    DECIMAL(10, 2),                      -- (exit-entry)/entry * 100
    realized_pnl  DECIMAL(18, 4),
    outcome       VARCHAR(10),                         -- win | loss | breakeven

    ai_thesis     TEXT,                                -- what the AI setup/thesis said
    user_thesis   TEXT,                                -- the user's own reason
    notes         TEXT,
    review        JSONB,                               -- cached AI post-trade review

    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_journal_user    ON journal_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_outcome ON journal_entries(user_id, outcome);

CREATE TABLE IF NOT EXISTS personal_insights (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sample_size  INTEGER NOT NULL,
    stats        JSONB,                                -- the deterministic numbers behind the read
    insights     JSONB,                                -- [string] the plain-language patterns
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id)
);
