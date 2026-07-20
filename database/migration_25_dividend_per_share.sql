-- Migration 25: dividend per share, so yield can be DERIVED not stored.
--
-- Why: P/E and dividend yield are arithmetic on the live price:
--     P/E   = price / EPS
--     yield = dividend per share / price
-- Storing the ratio itself means it goes stale the moment the price moves.
-- (DANGCEM's old P/E of 18.13 was computed from ₦480 while the real price was
-- ₦1,047 — the ratio was wrong because the price underneath it had changed.)
--
-- EPS and dividend-per-share are published once or twice a year in company
-- results, so an admin enters them once and the ratios recompute themselves on
-- every price update. Real inputs, always-current output, no paid data plan.
--
-- Safe to run repeatedly.

ALTER TABLE stocks
  ADD COLUMN IF NOT EXISTS dividend_per_share DECIMAL(12, 4);

COMMENT ON COLUMN stocks.dividend_per_share IS
  'Annual dividend per share from published results. Yield = this / last_price, recomputed on every price update.';

COMMENT ON COLUMN stocks.eps IS
  'Earnings per share from published results. P/E = last_price / this, recomputed on every price update.';
