-- ============================================
-- StockAcademia — Optional card auto-renew (Phase 1 add-on)
-- Purpose: let users who pay BY CARD opt in to automatic renewal. We store
--          the Paystack reusable card authorization and a daily cron charges
--          it just before access lapses. Transfer/USSD/Opay can't auto-renew
--          (no reusable token), so this only applies to card payers.
-- Depends on: migration_10_premium_subscriptions.sql (users billing columns).
-- What changes:
--   • Adds auto-renew flag + stored card authorization to users.
-- Idempotent — safe to re-run.
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS paystack_authorization_code TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS renew_interval TEXT NULL;   -- 'monthly' | 'annual'
ALTER TABLE users ADD COLUMN IF NOT EXISTS renew_currency TEXT NULL;   -- 'NGN' | 'USD'
ALTER TABLE users ADD COLUMN IF NOT EXISTS card_last4 TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS card_brand TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_users_auto_renew ON users (auto_renew) WHERE auto_renew = TRUE;
