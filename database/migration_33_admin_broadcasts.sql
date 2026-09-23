-- ============================================================
-- migration_33_admin_broadcasts.sql
-- History of admin broadcasts (in-app / push / Telegram), with audience + status.
-- Lets the admin see what was sent, to whom, and reach; supports scheduling.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_broadcasts (
    id           SERIAL PRIMARY KEY,
    admin_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    audience     VARCHAR(16) NOT NULL DEFAULT 'all',  -- all | premium | free | push
    channels     TEXT[] NOT NULL DEFAULT '{in_app}',  -- in_app | push | telegram
    title        VARCHAR(160),
    body         TEXT NOT NULL,
    deep_link    TEXT,
    scheduled_at TIMESTAMP,                            -- null = send now
    sent_at      TIMESTAMP,
    recipients   INTEGER DEFAULT 0,
    status       VARCHAR(16) NOT NULL DEFAULT 'sent',  -- scheduled | sent | failed
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON admin_broadcasts(created_at DESC);
