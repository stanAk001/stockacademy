-- ============================================================
-- migration_19_notification_message.sql
-- Allow notifications to carry a custom message (for system alerts
-- like price alerts that have no "actor" or forum post to derive
-- their text from). Forum notifications leave this NULL.
-- ============================================================

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
