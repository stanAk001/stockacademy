-- ============================================
-- StockAcademia — Premium Subscriptions (Phase 1)
-- Purpose: recurring Paystack subscription billing with a 7-day free trial,
--          plus the Telegram link plumbing for the premium channel.
-- Depends on: schema.sql (users), migration_01_features.sql (users.plan),
--             migration_09_flutterwave.sql (latest prior migration).
-- What changes:
--   • Adds subscription/trial/Paystack/Telegram columns to users.
--   • Creates subscription_events  (audit trail of every Paystack webhook).
--   • Creates telegram_link_codes  (short-lived codes to link a Telegram chat).
-- Idempotent — safe to re-run.
-- ============================================

-- --- users: plan + billing state ---
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_renews_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT NULL;

-- --- audit trail of every subscription webhook we receive ---
CREATE TABLE IF NOT EXISTS subscription_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);

-- --- short-lived codes the user pastes into the Telegram bot via /link ---
CREATE TABLE IF NOT EXISTS telegram_link_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  code TEXT UNIQUE,
  expires_at TIMESTAMP,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_code ON telegram_link_codes(code);
