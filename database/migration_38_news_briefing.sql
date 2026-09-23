-- ============================================================
-- migration_38_news_briefing.sql
-- Background news monitoring + the daily briefing alert (spec §29, §13, §17).
--
-- news_events: every headline the news monitor has seen for a stock, keyed by
-- (symbol, url_hash) so the same article never alerts twice. `material` is set
-- by a deterministic keyword classifier (results, dividends, deals, legal,
-- regulatory, leadership, outlook, capital actions). No AI involved.
--
-- users.last_briefing_sent_on: the (Lagos) date the daily briefing alert was
-- last sent, so a scheduler that pings more than once a day never double-sends.
-- It is separate from last_briefing_at, which records when the user last OPENED
-- My Market ("since your last visit").
-- ============================================================

CREATE TABLE IF NOT EXISTS news_events (
    id           SERIAL PRIMARY KEY,
    symbol       VARCHAR(20) NOT NULL REFERENCES stocks(symbol) ON DELETE CASCADE,
    url_hash     VARCHAR(32) NOT NULL,
    headline     TEXT NOT NULL,
    url          TEXT,
    source       VARCHAR(120),
    published_at TIMESTAMP,
    kind         VARCHAR(16),                      -- earnings | dividend | m&a | legal | regulatory | leadership | guidance | capital
    material     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (symbol, url_hash)
);

CREATE INDEX IF NOT EXISTS idx_news_events_symbol   ON news_events(symbol, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_events_material ON news_events(created_at DESC) WHERE material;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_briefing_sent_on DATE;
