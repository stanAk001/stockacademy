-- ============================================================
-- migration_36_briefing.sql
-- "My Market" personalized briefing (spec §13/§25).
--
-- The briefing answers "what changed since you last checked?" — so we need to
-- remember when the user last opened it. One nullable column does the job: on
-- each briefing load we read the old value to compute the deltas, then stamp it
-- to NOW. No new table — the briefing itself is computed live from the setups /
-- positions / theses / events that already exist.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_briefing_at TIMESTAMP;
