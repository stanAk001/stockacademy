-- ============================================================
-- migration_35_positions_theses.sql
-- Position monitoring (spec §9) + long-term Investment Thesis (spec §10/§11).
--
-- A POSITION is a real trade the user actually entered (they record it after a
-- tracked setup or on their own). We connect it to the originating ai_setup when
-- there is one, then continuously compare the ORIGINAL thesis to the CURRENT
-- market and surface a state: intact / strengthening / weakening / invalidated.
--
-- An INVESTMENT_THESIS is the long-term equivalent: a buy-and-hold rationale for
-- a company. We snapshot the fundamentals at creation (baseline) so the monitor
-- can detect a MATERIAL change and explain WHAT changed (§11) — never an opaque
-- 0-100 score; quality stays a transparent tier + named reasons.
--
-- Monitoring is deterministic (price vs the position's own levels; current
-- fundamentals vs the baseline). AI narrative is generated ON DEMAND when the
-- user opens the item, never in the background loop — keeps cost bounded (§29/§43).
-- ============================================================

CREATE TABLE IF NOT EXISTS positions (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol        VARCHAR(20) NOT NULL REFERENCES stocks(symbol) ON DELETE CASCADE,
    market        VARCHAR(4)  NOT NULL,                 -- 'US' | 'NG'
    objective     VARCHAR(16) DEFAULT 'swing',          -- 'swing' | 'longterm'
    setup_id      INTEGER REFERENCES ai_setups(id) ON DELETE SET NULL, -- originating AI setup (§9), if any

    entry_price   DECIMAL(18, 4) NOT NULL,
    quantity      DECIMAL(18, 4) NOT NULL,
    entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    stop_price    DECIMAL(18, 4),                       -- invalidation level
    target_price  DECIMAL(18, 4),
    notes         TEXT,

    status        VARCHAR(10) NOT NULL DEFAULT 'open',  -- open | closed
    thesis_state  VARCHAR(16) NOT NULL DEFAULT 'intact',-- intact | strengthening | weakening | invalidated
    target_hit    BOOLEAN NOT NULL DEFAULT FALSE,       -- one-shot flag so we notify a target once

    exit_price    DECIMAL(18, 4),
    exit_date     DATE,
    close_reason  VARCHAR(24),                          -- target | stop | manual | thesis_change
    realized_pnl  DECIMAL(18, 4),                       -- (exit-entry)*qty, set on close

    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_positions_user   ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_open    ON positions(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);

-- Position lifecycle log — feeds notifications now and the post-trade review (§16).
CREATE TABLE IF NOT EXISTS position_events (
    id          SERIAL PRIMARY KEY,
    position_id INTEGER NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    kind        VARCHAR(24) NOT NULL,                   -- state_change | target | stop | closed | note
    from_state  VARCHAR(16),
    to_state    VARCHAR(16),
    note        TEXT,
    price_at    DECIMAL(18, 4),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_position_events_pos ON position_events(position_id, created_at);

-- ------------------------------------------------------------
-- investment_theses — long-term buy-and-hold rationale per (user, symbol).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investment_theses (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol         VARCHAR(20) NOT NULL REFERENCES stocks(symbol) ON DELETE CASCADE,
    market         VARCHAR(4) NOT NULL,

    quality_tier   VARCHAR(16),                         -- strong | solid | speculative (NO 0-100 score)
    summary        TEXT,                                -- the user's / AI's rationale at creation
    baseline       JSONB,                               -- snapshot of key fundamentals at creation (§11 diffing)
    watch_items    JSONB,                               -- [string] what would change the thesis

    state          VARCHAR(16) NOT NULL DEFAULT 'intact', -- intact | strengthening | weakening | invalidated
    last_reviewed_at TIMESTAMP,

    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_theses_user   ON investment_theses(user_id);
CREATE INDEX IF NOT EXISTS idx_theses_symbol ON investment_theses(symbol);

-- Thesis change log — powers "Your GTCO thesis changed" + the "Why did this
-- change?" component (§11). changed_fields records the exact factual moves.
CREATE TABLE IF NOT EXISTS thesis_events (
    id             SERIAL PRIMARY KEY,
    thesis_id      INTEGER NOT NULL REFERENCES investment_theses(id) ON DELETE CASCADE,
    from_state     VARCHAR(16),
    to_state       VARCHAR(16) NOT NULL,
    note           TEXT,                                -- plain-language what/why
    changed_fields JSONB,                               -- [{ field, from, to, direction }]
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_thesis_events_thesis ON thesis_events(thesis_id, created_at);
