-- ============================================
-- StockAcademia — Mentorship Bookings Migration
-- Run after migration_01_features.sql
-- ============================================

-- Session types (editable from DB)
CREATE TABLE IF NOT EXISTS session_types (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,        -- 'quick', 'deep', 'weekly'
    name VARCHAR(100) NOT NULL,
    duration_minutes INTEGER NOT NULL,      -- 30, 60, 240 (weekly = 4h total across month)
    price_kobo INTEGER NOT NULL,            -- price in Paystack kobo (NGN * 100) or cents
    currency VARCHAR(3) DEFAULT 'NGN',
    description TEXT,
    features JSONB DEFAULT '[]'::jsonb,     -- array of feature strings
    premium_only BOOLEAN DEFAULT FALSE,
    icon VARCHAR(20),
    color VARCHAR(30),
    enabled BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0
);

-- Tutor availability (simple recurring weekly schedule)
-- Day 0=Sun, 6=Sat. Times are 24h "HH:MM" stored as text for clarity.
CREATE TABLE IF NOT EXISTS tutor_availability (
    id SERIAL PRIMARY KEY,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    enabled BOOLEAN DEFAULT TRUE
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    reference VARCHAR(50) UNIQUE NOT NULL,  -- e.g. 'BK_' + uuid part — used as Paystack ref
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_type_id INTEGER REFERENCES session_types(id),

    -- Contact snapshot (in case user is deleted)
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(40),

    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(60) DEFAULT 'Africa/Lagos',
    notes TEXT,

    -- Payment
    amount_kobo INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending | paid | failed | refunded
    payment_provider VARCHAR(20),                 -- paystack | flutterwave | manual
    payment_reference VARCHAR(150),               -- external transaction ref
    paid_at TIMESTAMP,

    -- Booking lifecycle
    status VARCHAR(20) DEFAULT 'pending',         -- pending | confirmed | completed | cancelled
    meeting_url TEXT,                             -- Google Meet / Zoom link

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Prevent double-booking: unique slot per (date, start_time) for confirmed/paid rows.
    -- We enforce in controller + partial index below.
    CONSTRAINT ck_status CHECK (status IN ('pending','confirmed','completed','cancelled')),
    CONSTRAINT ck_payment CHECK (payment_status IN ('pending','paid','failed','refunded'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(session_date, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_ref  ON bookings(reference);

-- A unique index that only applies when the slot is actually committed
-- (prevents paid/confirmed overlapping slots, but pending cancellations don't block).
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_confirmed_slot
  ON bookings(session_date, start_time)
  WHERE payment_status = 'paid' OR status = 'confirmed';

-- Add an is_admin flag on users for the admin dashboard
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- ============================================
-- SEED: session types
-- ============================================
INSERT INTO session_types (key, name, duration_minutes, price_kobo, currency, description, features, premium_only, icon, color, sort_order)
VALUES
 ('quick',  '30-min Quick Session',
  30,  500000, 'NGN',
  'A focused 30 minutes to get one specific question answered — a chart breakdown, a concept you''re stuck on, or feedback on your paper-trading portfolio.',
  '["30 minutes 1-on-1","1 chart or topic deep-dive","Recording on request","Educational only"]'::jsonb,
  FALSE, '⚡', 'from-sun-300 to-sun-500', 1),

 ('deep',   '1-hour Deep Dive',
  60,  1000000, 'NGN',
  'A full hour to walk through fundamental + technical analysis on a ticker you care about, review your portfolio structure, and build a learning plan.',
  '["60 minutes 1-on-1","Chart + fundamentals walkthrough","Portfolio review","Follow-up notes","Recording included"]'::jsonb,
  FALSE, '📈', 'from-bull-400 to-bull-600', 2),

 ('weekly', 'Weekly Mentorship (4 weeks)',
  240, 3500000, 'NGN',
  'Four weekly 1-hour sessions + ongoing chat support over one month. For students who want structured, accountable progress.',
  '["4 × 60-minute sessions","Async chat support between sessions","Personalised learning plan","Priority scheduling","Educational only — not managed advice"]'::jsonb,
  TRUE,  '🏆', 'from-coral-400 to-coral-600', 3)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- SEED: availability — Mon–Fri, 18:00–22:00 Africa/Lagos
-- (Edit these in pgAdmin to match your real schedule)
-- ============================================
INSERT INTO tutor_availability (day_of_week, start_time, end_time) VALUES
 (1, '18:00', '22:00'),
 (2, '18:00', '22:00'),
 (3, '18:00', '22:00'),
 (4, '18:00', '22:00'),
 (5, '18:00', '22:00')
ON CONFLICT DO NOTHING;
