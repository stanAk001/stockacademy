-- ============================================================
-- migration_32_push.sql
-- Web Push subscriptions — one row per browser/device a user opts in from.
--
-- A user can have many (laptop, phone, another browser). endpoint is unique so
-- re-subscribing the same device upserts. Dead subscriptions (the browser
-- returns 404/410 on send) are pruned by the push sender.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint    TEXT UNIQUE NOT NULL,
    p256dh      TEXT NOT NULL,          -- client public key (from PushSubscription)
    auth        TEXT NOT NULL,          -- client auth secret
    user_agent  TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
