-- ============================================
-- StockAcademia Database Schema
-- Run this in pgAdmin Query Tool
-- ============================================

-- Create database (run this separately in pgAdmin before selecting the DB)
-- CREATE DATABASE stockacademy;

-- Connect to stockacademy database, then run the rest:

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- Supports both local signup and Google OAuth
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for Google-only users
    google_id VARCHAR(255) UNIQUE, -- NULL for local-only users
    avatar_url TEXT,
    full_name VARCHAR(150),
    auth_provider VARCHAR(20) DEFAULT 'local', -- 'local' or 'google'
    is_verified BOOLEAN DEFAULT FALSE,
    bio TEXT,
    experience_level VARCHAR(20) DEFAULT 'beginner', -- beginner / intermediate / advanced
    virtual_balance DECIMAL(15, 2) DEFAULT 100000.00, -- Paper-trading starting balance
    total_xp INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);

-- ============================================
-- COURSES / MODULES / LESSONS
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50), -- basics / fundamental / technical / strategies / risk
    difficulty VARCHAR(20),
    icon VARCHAR(50),
    cover_color VARCHAR(30),
    estimated_minutes INTEGER,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    content TEXT, -- markdown / HTML content
    video_url TEXT,
    order_index INTEGER DEFAULT 0,
    xp_reward INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- USER PROGRESS TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- ============================================
-- QUIZZES
-- ============================================
CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(200),
    passing_score INTEGER DEFAULT 60
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- ["A","B","C","D"]
    correct_answer INTEGER NOT NULL, -- index 0-3
    explanation TEXT
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    score INTEGER,
    passed BOOLEAN DEFAULT FALSE,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PAPER TRADING (Stock Simulator)
-- ============================================
CREATE TABLE IF NOT EXISTS portfolios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    company_name VARCHAR(200),
    shares DECIMAL(15, 4) NOT NULL,
    avg_buy_price DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, symbol)
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    company_name VARCHAR(200),
    transaction_type VARCHAR(10) NOT NULL, -- BUY / SELL
    shares DECIMAL(15, 4) NOT NULL,
    price_per_share DECIMAL(15, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    company_name VARCHAR(200),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, symbol)
);

-- ============================================
-- COMMUNITY / FORUM
-- ============================================
CREATE TABLE IF NOT EXISTS forum_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50), -- general / analysis / news / help
    tags TEXT[],
    upvotes INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forum_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_votes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES forum_posts(id) ON DELETE CASCADE,
    vote_type INTEGER, -- 1 for upvote, -1 for downvote
    UNIQUE(user_id, post_id)
);

-- ============================================
-- ACHIEVEMENTS / BADGES
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    xp_reward INTEGER DEFAULT 50,
    criteria VARCHAR(100) -- e.g., 'complete_5_lessons'
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- ============================================
-- SEED DATA
-- ============================================

-- Courses
INSERT INTO courses (title, slug, description, category, difficulty, icon, cover_color, estimated_minutes, order_index) VALUES
('Stock Market Basics', 'stock-basics', 'Learn what stocks are, how markets work, and core terminology every investor must know.', 'basics', 'Beginner', '📈', 'from-emerald-400 to-teal-500', 60, 1),
('How to Earn from Stocks', 'earning-from-stocks', 'Dividends, capital gains, compounding — discover the realistic ways money is made in the market.', 'basics', 'Beginner', '💰', 'from-amber-400 to-orange-500', 45, 2),
('Fundamental Analysis', 'fundamental-analysis', 'Read financial statements, ratios and valuation models to pick great companies.', 'fundamental', 'Intermediate', '📊', 'from-blue-400 to-indigo-500', 90, 3),
('Technical Analysis', 'technical-analysis', 'Master charts, candlesticks, indicators, and trading patterns.', 'technical', 'Intermediate', '📉', 'from-pink-400 to-rose-500', 120, 4),
('Risk Management', 'risk-management', 'Position sizing, stop-loss, diversification — how professionals protect their capital.', 'risk', 'Intermediate', '🛡️', 'from-purple-400 to-fuchsia-500', 50, 5),
('Trading Strategies', 'trading-strategies', 'Day trading, swing trading, long-term investing — strategies explained.', 'strategies', 'Advanced', '🎯', 'from-cyan-400 to-sky-500', 75, 6)
ON CONFLICT (slug) DO NOTHING;

-- Lessons for Course 1: Stock Market Basics
INSERT INTO lessons (course_id, title, slug, content, order_index, xp_reward) VALUES
(1, 'What is a Stock?', 'what-is-a-stock',
'# What is a Stock?

A **stock** (also called equity or share) represents partial ownership in a company. When you buy a stock, you become a **shareholder** — you literally own a tiny slice of that business.

## Why do companies issue stocks?
Companies sell shares to raise money (capital) to grow. Instead of borrowing from a bank, they raise funds from the public.

## What do you get as a shareholder?
- **Price appreciation** — if the company grows, your share becomes more valuable.
- **Dividends** — a portion of the company''s profit, paid to shareholders.
- **Voting rights** — on major company decisions.

## Real example
Apple Inc. has around 15 billion shares outstanding. If you buy 1 share, you own one fifteen-billionth of Apple — including its factories, cash, brands, and future profits.', 1, 10),

(1, 'How the Stock Market Works', 'how-market-works',
'# How the Stock Market Works

The stock market is a giant marketplace where buyers and sellers trade shares. Think of it like an online auction running every weekday.

## Key players
- **Investors** (you)
- **Brokers** — middlemen that execute trades
- **Exchanges** — NYSE, NASDAQ, LSE, NSE, JSE
- **Market makers** — provide liquidity
- **Regulators** — SEC, SEBI, FCA

## How a trade happens
1. You place an order through your broker.
2. The order reaches the exchange.
3. A matching seller is found.
4. The trade executes in milliseconds.
5. Shares land in your account (T+1 / T+2 settlement).', 2, 10),

(1, 'Bull vs Bear Market', 'bull-vs-bear',
'# Bull vs Bear Markets

## 🐂 Bull Market
Prices are rising. Optimism is high. Economy is strong. Investors are buying aggressively. A bull market usually means the market is up 20%+ from recent lows.

## 🐻 Bear Market
Prices are falling. Pessimism dominates. Economy may be weakening. A bear market is a drop of 20%+ from recent highs.

## The lesson
Both are normal. The S&P 500 has survived every bear market in history and hit new highs. Long-term investors win by staying patient.', 3, 10);

-- Lessons for Course 2: Earning From Stocks
INSERT INTO lessons (course_id, title, slug, content, order_index, xp_reward) VALUES
(2, 'Capital Gains Explained', 'capital-gains',
'# Capital Gains

A **capital gain** is the profit you make when you sell a stock for more than you paid.

**Formula:** `Capital Gain = Selling Price - Purchase Price`

## Example
You buy 10 shares of Tesla at $200 = $2,000 total.
You sell them later at $280 = $2,800.
Your capital gain = **$800**.

## Short-term vs Long-term
- Short-term (held < 1 year) — usually taxed higher.
- Long-term (held > 1 year) — usually taxed lower. Be patient.', 1, 15),

(2, 'Dividends: Passive Income from Stocks', 'dividends',
'# Dividends

A dividend is a cash payment a company gives its shareholders from its profits. It''s passive income — you get paid just for holding the stock.

## Key dates
- **Declaration date** — company announces dividend
- **Ex-dividend date** — buy before this to qualify
- **Record date** — company confirms who holds shares
- **Payment date** — money hits your account

## Dividend Yield formula
`Yield = Annual Dividend / Stock Price × 100`

A $50 stock paying $2/yr has a 4% yield — better than most savings accounts.', 2, 15),

(2, 'The Power of Compounding', 'compounding',
'# The Power of Compounding

Albert Einstein reportedly called compound interest "the eighth wonder of the world." It''s how small money becomes huge money — over time.

## The magic
When you reinvest your dividends and gains, those reinvestments also earn returns. Growth accelerates.

## Real numbers
$10,000 invested at 10% annual return:
- After 10 years: **$25,937**
- After 20 years: **$67,275**
- After 30 years: **$174,494**
- After 40 years: **$452,593**

Time in the market beats timing the market.', 3, 20);

-- Lessons for Course 3: Fundamental Analysis
INSERT INTO lessons (course_id, title, slug, content, order_index, xp_reward) VALUES
(3, 'Reading an Income Statement', 'income-statement',
'# The Income Statement

An income statement shows a company''s **revenue, expenses, and profit** over a period.

## Key lines to know
- **Revenue** — total sales
- **Cost of Goods Sold (COGS)** — direct costs
- **Gross Profit** = Revenue − COGS
- **Operating Expenses** — salaries, rent, marketing
- **Operating Income** — core business profit
- **Net Income** — bottom-line profit after tax

## What to look for
- Revenue growing year-over-year ✅
- Net income growing faster than revenue ✅
- Consistent profit margins ✅', 1, 20),

(3, 'Key Financial Ratios', 'financial-ratios',
'# Key Financial Ratios

Ratios help you compare companies quickly.

## Valuation
- **P/E Ratio** — Price ÷ Earnings per share. Lower can mean undervalued.
- **P/B Ratio** — Price ÷ Book value.
- **PEG Ratio** — P/E ÷ Growth rate. PEG < 1 is attractive.

## Profitability
- **ROE (Return on Equity)** — Net income ÷ Equity. Want > 15%.
- **Gross Margin** — Gross profit ÷ Revenue.

## Health
- **Debt-to-Equity** — Lower is safer.
- **Current Ratio** — Current assets ÷ Current liabilities. Want > 1.', 2, 20);

-- Lessons for Course 4: Technical Analysis
INSERT INTO lessons (course_id, title, slug, content, order_index, xp_reward) VALUES
(4, 'Reading Candlestick Charts', 'candlesticks',
'# Candlestick Charts

Candlesticks show open, high, low, and close prices for a period in one visual.

## Anatomy
- **Body** — between open and close
- **Wick / Shadow** — highest and lowest price touched
- **Green candle** — close higher than open (bullish)
- **Red candle** — close lower than open (bearish)

## Classic patterns
- **Hammer** — potential reversal up
- **Shooting Star** — potential reversal down
- **Doji** — indecision
- **Engulfing** — strong reversal signal', 1, 20),

(4, 'Support & Resistance', 'support-resistance',
'# Support & Resistance

These are price levels where the market tends to pause or reverse.

## Support
A floor where buyers step in. Price bounces up from it.

## Resistance
A ceiling where sellers appear. Price gets rejected here.

## Key insight
When resistance is broken, it often becomes new support — and vice versa.

## How to trade it
- Buy near support, place stop just below it.
- Sell or take profit near resistance.', 2, 20),

(4, 'Moving Averages & RSI', 'ma-rsi',
'# Moving Averages & RSI

## Moving Averages (MA)
A MA smooths out price by averaging it over N days.
- **50-day MA** — medium-term trend
- **200-day MA** — long-term trend
- **Golden Cross** — 50-MA crosses above 200-MA (bullish)
- **Death Cross** — 50-MA crosses below 200-MA (bearish)

## RSI (Relative Strength Index)
Measures momentum 0–100.
- Above 70 = overbought (may fall)
- Below 30 = oversold (may rise)

Combine indicators — never rely on just one.', 3, 25);

-- Sample quizzes
INSERT INTO quizzes (lesson_id, title, passing_score) VALUES
(1, 'What is a Stock? — Quick Quiz', 60),
(4, 'Capital Gains Quiz', 60),
(7, 'Income Statement Quiz', 60);

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation) VALUES
(1, 'What does buying a stock represent?',
 '["A loan to the company","Partial ownership of the company","A tax payment","A subscription service"]'::jsonb, 1,
 'A stock represents partial ownership (equity) in a company.'),
(1, 'Which of these is NOT a benefit of owning stock?',
 '["Dividends","Capital appreciation","Guaranteed returns","Voting rights"]'::jsonb, 2,
 'Stocks never guarantee returns — their value can go down.'),
(1, 'Where do stocks get traded?',
 '["Banks only","Stock exchanges","Post offices","Supermarkets"]'::jsonb, 1,
 'Stocks are traded on exchanges like NYSE or NASDAQ.'),
(2, 'If you buy a stock at $100 and sell at $150, your capital gain is:',
 '["$50","$150","$250","$100"]'::jsonb, 0,
 'Capital gain = Selling price − Purchase price = 150 − 100 = $50.'),
(2, 'Long-term capital gains are typically:',
 '["Taxed higher than short-term","Taxed lower than short-term","Not taxed at all","Taxed the same"]'::jsonb, 1,
 'Long-term gains (held > 1 year) are typically taxed at lower rates.'),
(3, 'Net income appears at the ___ of the income statement:',
 '["Top","Middle","Bottom","Side"]'::jsonb, 2,
 'Net income is called the "bottom line" because it sits at the bottom.');

-- Achievements
INSERT INTO achievements (name, description, icon, xp_reward, criteria) VALUES
('First Steps', 'Complete your first lesson', '🎓', 20, 'complete_1_lesson'),
('Knowledge Seeker', 'Complete 5 lessons', '📚', 50, 'complete_5_lessons'),
('Quiz Master', 'Pass 3 quizzes', '🧠', 75, 'pass_3_quizzes'),
('First Trade', 'Execute your first paper trade', '💹', 30, 'first_trade'),
('Community Starter', 'Post your first forum discussion', '💬', 25, 'first_post'),
('Streak Champion', 'Log in 7 days in a row', '🔥', 100, 'streak_7');
