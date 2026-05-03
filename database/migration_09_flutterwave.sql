-- Flutterwave dual-processor support for premium upgrades and bookings

-- Add processor tracking to plan_upgrades
ALTER TABLE plan_upgrades
  ADD COLUMN IF NOT EXISTS processor VARCHAR(20) DEFAULT 'paystack',
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

-- Add processor tracking to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS processor VARCHAR(20) DEFAULT 'paystack',
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

-- Backfill existing rows
UPDATE plan_upgrades SET processor = 'paystack' WHERE processor IS NULL;
UPDATE bookings SET processor = 'paystack' WHERE processor IS NULL;

-- Indexes for admin reporting
CREATE INDEX IF NOT EXISTS idx_plan_upgrades_processor ON plan_upgrades(processor);
CREATE INDEX IF NOT EXISTS idx_bookings_processor ON bookings(processor);