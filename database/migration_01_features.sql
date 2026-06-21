-- ============================================
-- StockAcademia — Feature Expansion Migration
-- Run after schema.sql in pgAdmin
-- ============================================

-- Add plan column to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP;

-- Price alerts (Premium feature)
CREATE TABLE IF NOT EXISTS price_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    company_name VARCHAR(200),
    target_price DECIMAL(15, 2) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- 'above' or 'below'
    triggered BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMP,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON price_alerts(symbol);

-- Broker affiliate links (editable from DB)
CREATE TABLE IF NOT EXISTS brokers (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    logo VARCHAR(20),              -- emoji / icon
    color VARCHAR(30),
    asset_types TEXT[],            -- ['us_equity', 'crypto', 'forex']
    affiliate_url TEXT NOT NULL,   -- replace {symbol} placeholder
    description TEXT,
    priority INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE
);

-- Affiliate click tracking (for analytics)
CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    broker_id INTEGER REFERENCES brokers(id) ON DELETE SET NULL,
    symbol VARCHAR(10),
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default brokers (REPLACE URLS with your real affiliate links)
INSERT INTO brokers (key, name, logo, color, asset_types, affiliate_url, description, priority) VALUES
('binance', 'Binance', '🟡', 'from-sun-400 to-sun-600', ARRAY['crypto'],
 'https://accounts.binance.com/register?ref=YOUR_REF_CODE', 'World''s largest crypto exchange', 1),
('etoro', 'eToro', '🟢', 'from-bull-400 to-bull-600', ARRAY['us_equity', 'crypto', 'forex'],
 'https://etoro.tw/YOUR_ETORO_CODE', 'Social trading, stocks & crypto', 2),
('deriv', 'Deriv', '🔴', 'from-coral-400 to-coral-500', ARRAY['forex', 'synthetic'],
 'https://deriv.com/?t=YOUR_DERIV_TOKEN', 'Forex & synthetic indices', 3),
('ibkr', 'Interactive Brokers', '⚪', 'from-ink to-ink-soft', ARRAY['us_equity', 'international'],
 'https://ibkr.com/referral/YOUR_IBKR_CODE', 'Pro-grade global broker', 4),
('exness', 'Exness', '🔵', 'from-blue-400 to-blue-600', ARRAY['forex', 'crypto'],
 'https://one.exness-track.com/a/YOUR_EXNESS_CODE', 'Forex and crypto broker', 5)
ON CONFLICT (key) DO NOTHING;

-- Add is_crypto flag on portfolios (to map to right broker)
-- (Simulator currently only covers equities — can be extended later)

-- Extend watchlist table with a target price (so we can reuse)
ALTER TABLE watchlist
  ADD COLUMN IF NOT EXISTS note TEXT;
