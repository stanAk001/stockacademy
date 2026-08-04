-- ============================================================
-- migration_26_ngn_wallet.sql
-- Separate Naira practice wallet for the simulator.
--
-- Before this, there was ONE virtual_balance and NGX buys (priced in ₦) were
-- deducted from it as if ₦ were $ — a ~1,600x error, and portfolio equity summed
-- ₦ and $ into one meaningless number. Now: virtual_balance = the US ($) wallet,
-- virtual_balance_ngn = the NGX (₦) wallet. Each stays in its own currency.
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS virtual_balance_ngn DECIMAL(15, 2) DEFAULT 10000000.00;

-- Fill existing users with the starting ₦ practice pot (ADD COLUMN ... DEFAULT
-- backfills, but be explicit for any row that predates the default).
UPDATE users
  SET virtual_balance_ngn = 10000000.00
  WHERE virtual_balance_ngn IS NULL;
