-- ============================================================
-- migration_39_membership.sql
-- Premium membership lifecycle: reminders, grace period, automatic downgrade.
--
-- Bug this fixes: two payment paths and admin grants stored the end date in
-- plan_expires_at, while the Premium check only read plan_renews_at, and
-- nothing ever moved an expired user back to 'free'. Result: users stayed
-- Premium long after their paid period ended.
--
-- 1. membership_events: which notice was sent for which paid period, so the
--    lifecycle job never sends the same reminder twice.
--      reminder   → a few days before the end
--      expired    → the period ended; grace period running
--      downgraded → grace over, account moved to Free
-- 2. Make both end-date columns agree for every Premium user, so every part of
--    the app reads the same date.
-- ============================================================


CREATE TABLE IF NOT EXISTS membership_events (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        VARCHAR(16) NOT NULL,             -- reminder | expired | downgraded
    period_end  TIMESTAMP NOT NULL,               -- the access end date this event is about
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, kind, period_end)
);

CREATE INDEX IF NOT EXISTS idx_membership_events_user ON membership_events(user_id, created_at DESC);

-- Legacy rows: copy the end date into whichever column is missing.
UPDATE users SET plan_renews_at = plan_expires_at
 WHERE plan = 'premium' AND plan_renews_at IS NULL AND plan_expires_at IS NOT NULL;

UPDATE users SET plan_expires_at = plan_renews_at
 WHERE plan = 'premium' AND plan_expires_at IS NULL AND plan_renews_at IS NOT NULL;
