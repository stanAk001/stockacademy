-- ============================================
-- StockAcademia — Stock Universe & Analysis Migration
-- Run after migration_02_bookings.sql
-- ============================================

-- Unified stock registry (US + Nigerian + any future exchange)
CREATE TABLE IF NOT EXISTS stocks (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,         -- e.g. 'AAPL', 'NGX:DANGCEM'
    display_symbol VARCHAR(20) NOT NULL,        -- e.g. 'AAPL', 'DANGCEM'
    name VARCHAR(200) NOT NULL,
    exchange VARCHAR(20) NOT NULL,              -- 'NASDAQ', 'NYSE', 'NGX'
    country VARCHAR(2) NOT NULL,                -- 'US', 'NG'
    currency VARCHAR(3) NOT NULL,               -- 'USD', 'NGN'
    sector VARCHAR(100),
    industry VARCHAR(100),
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,

    -- Cached manually-updated snapshot (used when live feed unavailable)
    -- Admins can update these fields in pgAdmin or an admin UI.
    last_price DECIMAL(18, 4),
    prev_close DECIMAL(18, 4),
    day_change_pct DECIMAL(8, 4),
    market_cap_millions DECIMAL(18, 2),
    shares_outstanding_millions DECIMAL(18, 2),
    pe_ratio DECIMAL(10, 2),
    pb_ratio DECIMAL(10, 2),
    ps_ratio DECIMAL(10, 2),
    ev_ebitda DECIMAL(10, 2),
    peg_ratio DECIMAL(10, 2),
    dividend_yield DECIMAL(6, 4),               -- e.g. 0.0245 = 2.45%
    eps DECIMAL(10, 2),

    -- Quality metrics
    roe DECIMAL(8, 4),                          -- return on equity (fraction)
    roa DECIMAL(8, 4),
    gross_margin DECIMAL(8, 4),
    net_margin DECIMAL(8, 4),
    debt_to_equity DECIMAL(10, 2),
    current_ratio DECIMAL(8, 2),
    revenue_growth_yoy DECIMAL(8, 4),
    earnings_growth_yoy DECIMAL(8, 4),

    -- Risk metrics (rolling 1yr where applicable)
    beta DECIMAL(8, 3),
    volatility_30d DECIMAL(8, 4),
    volatility_1y DECIMAL(8, 4),
    max_drawdown_1y DECIMAL(8, 4),
    avg_daily_volume_millions DECIMAL(18, 2),

    -- Returns
    return_1m DECIMAL(8, 4),
    return_3m DECIMAL(8, 4),
    return_6m DECIMAL(8, 4),
    return_1y DECIMAL(8, 4),
    high_52w DECIMAL(18, 4),
    low_52w DECIMAL(18, 4),

    data_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stocks_symbol ON stocks(symbol);
CREATE INDEX IF NOT EXISTS idx_stocks_country ON stocks(country);
CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks(sector);
-- Search by ticker OR name
CREATE INDEX IF NOT EXISTS idx_stocks_search ON stocks
  USING gin (to_tsvector('simple', display_symbol || ' ' || name));

-- Live quote cache (from Finnhub, refreshed frequently)
CREATE TABLE IF NOT EXISTS stock_quotes_cache (
    symbol VARCHAR(20) PRIMARY KEY REFERENCES stocks(symbol) ON DELETE CASCADE,
    price DECIMAL(18, 4),
    change_pct DECIMAL(8, 4),
    high DECIMAL(18, 4),
    low DECIMAL(18, 4),
    open DECIMAL(18, 4),
    prev_close DECIMAL(18, 4),
    volume BIGINT,
    cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track stock views (for trending + daily-lookup-limit for free users)
CREATE TABLE IF NOT EXISTS stock_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    symbol VARCHAR(20),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_stock_views_user_date ON stock_views(user_id, viewed_at);

-- ============================================
-- SEED: Nigerian stocks (top 30 by market cap)
-- Prices are initial approximations — EDIT in pgAdmin to keep updated.
-- ============================================
INSERT INTO stocks (
  symbol, display_symbol, name, exchange, country, currency, sector, industry,
  last_price, prev_close, market_cap_millions, pe_ratio, dividend_yield
) VALUES
('NGX:DANGCEM',    'DANGCEM',    'Dangote Cement PLC',             'NGX', 'NG', 'NGN', 'Materials',           'Cement',            480.50, 475.00, 8180000, 9.2,  0.0350),
('NGX:MTNN',       'MTNN',       'MTN Nigeria Communications PLC', 'NGX', 'NG', 'NGN', 'Communication',       'Telecom',           245.00, 240.00, 4990000, 15.8, 0.0420),
('NGX:AIRTELAFRI', 'AIRTELAFRI', 'Airtel Africa PLC',              'NGX', 'NG', 'NGN', 'Communication',       'Telecom',          2150.00, 2120.00, 8070000, 21.5, 0.0280),
('NGX:GTCO',       'GTCO',       'Guaranty Trust Holding Co PLC',  'NGX', 'NG', 'NGN', 'Financial',           'Banking',            42.50, 41.90,  1250000,  3.8, 0.0940),
('NGX:ZENITHBANK', 'ZENITHBANK', 'Zenith Bank PLC',                'NGX', 'NG', 'NGN', 'Financial',           'Banking',            36.20, 35.80,  1137000,  3.2, 0.1020),
('NGX:UBA',        'UBA',        'United Bank for Africa PLC',     'NGX', 'NG', 'NGN', 'Financial',           'Banking',            25.40, 25.10,   869000,  2.8, 0.1120),
('NGX:ACCESSCORP', 'ACCESSCORP', 'Access Holdings PLC',            'NGX', 'NG', 'NGN', 'Financial',           'Banking',            18.80, 18.50,   669000,  2.5, 0.1280),
('NGX:FBNH',       'FBNH',       'FBN Holdings PLC',               'NGX', 'NG', 'NGN', 'Financial',           'Banking',            29.50, 29.20,   1058000, 3.4, 0.0880),
('NGX:SEPLAT',     'SEPLAT',     'Seplat Energy PLC',              'NGX', 'NG', 'NGN', 'Energy',              'Oil & Gas',        3850.00, 3800.00, 2265000, 6.5, 0.0650),
('NGX:NESTLE',     'NESTLE',     'Nestle Nigeria PLC',             'NGX', 'NG', 'NGN', 'Consumer Staples',    'Food',             1180.00, 1170.00,  935000, 24.2, 0.0180),
('NGX:BUACEMENT',  'BUACEMENT',  'BUA Cement PLC',                 'NGX', 'NG', 'NGN', 'Materials',           'Cement',             98.50, 97.20, 3336000, 11.4, 0.0395),
('NGX:BUAFOODS',   'BUAFOODS',   'BUA Foods PLC',                  'NGX', 'NG', 'NGN', 'Consumer Staples',    'Food',              385.00, 380.00, 6930000, 18.5, 0.0210),
('NGX:TRANSCORP',  'TRANSCORP',  'Transnational Corporation PLC',  'NGX', 'NG', 'NGN', 'Industrial',          'Conglomerate',       48.20, 47.60,   490000, 12.8, 0.0310),
('NGX:TRANSCOHOT', 'TRANSCOHOT', 'Transcorp Hotels PLC',           'NGX', 'NG', 'NGN', 'Consumer Discretionary','Hotels',          125.00, 123.00,   1283000, 22.1, 0.0150),
('NGX:OANDO',      'OANDO',      'Oando PLC',                      'NGX', 'NG', 'NGN', 'Energy',              'Oil & Gas',          58.40, 57.80,   725000, 8.2, 0.0000),
('NGX:STANBIC',    'STANBIC',    'Stanbic IBTC Holdings PLC',      'NGX', 'NG', 'NGN', 'Financial',           'Banking',            72.50, 71.90,   939000, 4.1, 0.0740),
('NGX:FIDELITYBK', 'FIDELITYBK', 'Fidelity Bank PLC',              'NGX', 'NG', 'NGN', 'Financial',           'Banking',            17.80, 17.60,   569000, 2.9, 0.1050),
('NGX:NB',         'NB',         'Nigerian Breweries PLC',         'NGX', 'NG', 'NGN', 'Consumer Staples',    'Beverages',          38.50, 38.00,   1038000, 30.5, 0.0000),
('NGX:GUINNESS',   'GUINNESS',   'Guinness Nigeria PLC',           'NGX', 'NG', 'NGN', 'Consumer Staples',    'Beverages',          62.80, 62.00,    137000, 45.2, 0.0000),
('NGX:FLOURMILL',  'FLOURMILL',  'Flour Mills of Nigeria PLC',     'NGX', 'NG', 'NGN', 'Consumer Staples',    'Food',               73.00, 72.20,   299000, 12.6, 0.0420),
('NGX:DANGSUGAR',  'DANGSUGAR',  'Dangote Sugar Refinery PLC',     'NGX', 'NG', 'NGN', 'Consumer Staples',    'Food',               36.40, 36.00,   442000, 9.8, 0.0580),
('NGX:PRESCO',     'PRESCO',     'Presco PLC',                     'NGX', 'NG', 'NGN', 'Consumer Staples',    'Agriculture',       485.00, 480.00,   485000, 10.2, 0.0350),
('NGX:OKOMUOIL',   'OKOMUOIL',   'Okomu Oil Palm PLC',             'NGX', 'NG', 'NGN', 'Consumer Staples',    'Agriculture',       395.00, 390.00,   377000, 9.5, 0.0410),
('NGX:LAFARGE',    'WAPCO',      'Lafarge Africa PLC',             'NGX', 'NG', 'NGN', 'Materials',           'Cement',             42.80, 42.50,   689000, 8.5, 0.0485),
('NGX:NESTLEFO',   'NESTLEFO',   'Nestle Foods Nigeria',           'NGX', 'NG', 'NGN', 'Consumer Staples',    'Food',              1180.00, 1170.00, 935000, 24.2, 0.0180),
('NGX:FCMB',       'FCMB',       'FCMB Group PLC',                 'NGX', 'NG', 'NGN', 'Financial',           'Banking',             8.50, 8.40,   167000, 2.4, 0.1170),
('NGX:WEMA',       'WEMA',       'Wema Bank PLC',                  'NGX', 'NG', 'NGN', 'Financial',           'Banking',             9.20, 9.10,   123000, 3.1, 0.0890),
('NGX:STERLING',   'STERLING',   'Sterling Financial Holdings',    'NGX', 'NG', 'NGN', 'Financial',           'Banking',             4.80, 4.75,   139000, 2.6, 0.0960),
('NGX:CUSTODIAN',  'CUSTODIAN',  'Custodian Investment PLC',       'NGX', 'NG', 'NGN', 'Financial',           'Insurance',          15.40, 15.20,    91000, 5.8, 0.0780),
('NGX:AIICO',      'AIICO',      'AIICO Insurance PLC',            'NGX', 'NG', 'NGN', 'Financial',           'Insurance',           1.35, 1.33,    18900, 4.2, 0.0550)
ON CONFLICT (symbol) DO NOTHING;

-- ============================================
-- SEED: Top US stocks (populated with representative values that
-- will be replaced by Finnhub when FINNHUB_API_KEY is configured)
-- ============================================
INSERT INTO stocks (
  symbol, display_symbol, name, exchange, country, currency, sector, industry
) VALUES
('AAPL',  'AAPL',  'Apple Inc.',                       'NASDAQ', 'US', 'USD', 'Technology',           'Consumer Electronics'),
('MSFT',  'MSFT',  'Microsoft Corporation',            'NASDAQ', 'US', 'USD', 'Technology',           'Software'),
('GOOGL', 'GOOGL', 'Alphabet Inc.',                    'NASDAQ', 'US', 'USD', 'Communication',        'Internet'),
('AMZN',  'AMZN',  'Amazon.com Inc.',                  'NASDAQ', 'US', 'USD', 'Consumer Discretionary','E-commerce'),
('NVDA',  'NVDA',  'NVIDIA Corporation',               'NASDAQ', 'US', 'USD', 'Technology',           'Semiconductors'),
('META',  'META',  'Meta Platforms Inc.',              'NASDAQ', 'US', 'USD', 'Communication',        'Social Media'),
('TSLA',  'TSLA',  'Tesla Inc.',                       'NASDAQ', 'US', 'USD', 'Consumer Discretionary','Automotive'),
('NFLX',  'NFLX',  'Netflix Inc.',                     'NASDAQ', 'US', 'USD', 'Communication',        'Streaming'),
('BRK.B', 'BRK.B', 'Berkshire Hathaway',               'NYSE',   'US', 'USD', 'Financial',            'Diversified'),
('JPM',   'JPM',   'JPMorgan Chase & Co.',             'NYSE',   'US', 'USD', 'Financial',            'Banking'),
('V',     'V',     'Visa Inc.',                        'NYSE',   'US', 'USD', 'Financial',            'Payments'),
('MA',    'MA',    'Mastercard Incorporated',          'NYSE',   'US', 'USD', 'Financial',            'Payments'),
('JNJ',   'JNJ',   'Johnson & Johnson',                'NYSE',   'US', 'USD', 'Healthcare',           'Pharmaceuticals'),
('UNH',   'UNH',   'UnitedHealth Group',               'NYSE',   'US', 'USD', 'Healthcare',           'Insurance'),
('LLY',   'LLY',   'Eli Lilly and Company',            'NYSE',   'US', 'USD', 'Healthcare',           'Pharmaceuticals'),
('PG',    'PG',    'Procter & Gamble',                 'NYSE',   'US', 'USD', 'Consumer Staples',     'Household'),
('KO',    'KO',    'The Coca-Cola Company',            'NYSE',   'US', 'USD', 'Consumer Staples',     'Beverages'),
('PEP',   'PEP',   'PepsiCo Inc.',                     'NASDAQ', 'US', 'USD', 'Consumer Staples',     'Beverages'),
('WMT',   'WMT',   'Walmart Inc.',                     'NYSE',   'US', 'USD', 'Consumer Staples',     'Retail'),
('DIS',   'DIS',   'The Walt Disney Company',          'NYSE',   'US', 'USD', 'Communication',        'Media'),
('XOM',   'XOM',   'Exxon Mobil Corporation',          'NYSE',   'US', 'USD', 'Energy',               'Oil & Gas'),
('CVX',   'CVX',   'Chevron Corporation',              'NYSE',   'US', 'USD', 'Energy',               'Oil & Gas'),
('BA',    'BA',    'The Boeing Company',               'NYSE',   'US', 'USD', 'Industrial',           'Aerospace'),
('CAT',   'CAT',   'Caterpillar Inc.',                 'NYSE',   'US', 'USD', 'Industrial',           'Machinery'),
('HD',    'HD',    'The Home Depot',                   'NYSE',   'US', 'USD', 'Consumer Discretionary','Retail')
ON CONFLICT (symbol) DO NOTHING;
