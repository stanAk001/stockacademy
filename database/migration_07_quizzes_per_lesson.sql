-- ============================================
-- StockAcademy — Quiz for every lesson
-- Adds a 3-question quiz to every lesson that doesn't have one yet.
-- Run after migration_06_admin_moderation.sql
-- ============================================

-- For every lesson without a quiz, insert one
INSERT INTO quizzes (lesson_id, title, passing_score)
SELECT l.id,
       'Knowledge check: ' || l.title,
       70
FROM lessons l
WHERE NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.lesson_id = l.id);

-- Now insert 3 generic-but-relevant questions per quiz that has none
-- We tailor questions per slug so they make sense

-- COURSE 1: Stock Market Basics
INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'What does owning a share of stock fundamentally represent?',
  '["A loan to the company","A small ownership stake in the company","A guaranteed dividend","A government-backed certificate"]'::jsonb,
  1,
  'A share represents a fractional ownership claim on a company''s assets and earnings.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'what-is-a-stock'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_id = q.id);

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'When you own stock, you have a claim on:',
  '["The company''s products only","The company''s assets and future earnings","Government tax revenue","Other shareholders'' shares"]'::jsonb,
  1,
  'Shareholders have a residual claim on assets after debts and a proportional claim on earnings.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'what-is-a-stock'
  AND (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) < 2;

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'Which of these is NOT a right of common shareholders?',
  '["Voting on major company decisions","Receiving dividends if declared","Guaranteed return of investment","Selling their shares"]'::jsonb,
  2,
  'Stocks carry no guarantee of return — that''s the trade-off for higher potential gains.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'what-is-a-stock'
  AND (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) < 3;

-- How Stock Markets Work
INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'What is the primary role of a stock exchange?',
  '["To set stock prices","To match buyers and sellers of shares","To guarantee profits","To prevent companies from failing"]'::jsonb,
  1,
  'Exchanges match buyers and sellers — prices emerge from this matching process.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'how-markets-work'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_id = q.id);

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'What does the bid-ask spread represent?',
  '["A government tax","The difference between highest buy price and lowest sell price","Trading commissions","The stock''s daily volatility"]'::jsonb,
  1,
  'Bid is the highest price buyers will pay; ask is the lowest sellers will accept. The gap is the spread.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'how-markets-work'
  AND (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) < 2;

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'Which is a major Nigerian stock exchange?',
  '["NASDAQ","NYSE","NGX (Nigerian Exchange)","FTSE"]'::jsonb,
  2,
  'NGX (formerly NSE) is Nigeria''s primary stock exchange, headquartered in Lagos.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'how-markets-work'
  AND (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) < 3;

-- Bull and Bear markets
INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'A bull market is characterised by:',
  '["Sustained falling prices","Sustained rising prices","Sideways trading only","Government intervention"]'::jsonb,
  1,
  'Bull markets feature sustained price increases over weeks, months, or years.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'bull-bear-markets'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_id = q.id);

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'A bear market is typically defined as a decline of:',
  '["5% or more","10% or more","20% or more from recent highs","50% or more"]'::jsonb,
  2,
  'A 20% decline from recent highs is the conventional definition of a bear market.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'bull-bear-markets'
  AND (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) < 2;

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'What is the most reliable strategy during market downturns?',
  '["Sell everything immediately","Stay disciplined and stick to your plan","Borrow money to buy more","Try to time the bottom precisely"]'::jsonb,
  1,
  'Discipline beats panic. Most investors who survive bear markets do so by sticking to their plan.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'bull-bear-markets'
  AND (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) < 3;

-- COURSE 2: Earning from Stocks
INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'What is a dividend?',
  '["A stock''s daily price movement","A portion of company profits paid to shareholders","A trading fee","Insurance against losses"]'::jsonb,
  1,
  'Dividends are cash distributions companies make to shareholders from profits.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'dividends-explained'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_id = q.id);

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'A "capital gain" is realised when:',
  '["You receive a dividend","You sell a stock for more than you paid","The market opens","You attend a shareholder meeting"]'::jsonb,
  1,
  'Capital gain = sale price - purchase price. Only realised when you actually sell.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'capital-gains'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_id = q.id);

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'Compounding is most powerful when:',
  '["You start late and invest a lot","You start early and stay invested","You panic-sell during downturns","You only invest during bull markets"]'::jsonb,
  1,
  'Time is the single biggest variable in compounding. Starting earlier matters more than investing more later.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'capital-gains'
  AND (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) < 2;

-- COURSE 3: Fundamental Analysis
INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'What does the income statement show?',
  '["Assets and liabilities","Revenue, expenses, and profit over a period","Cash flow","Stock price history"]'::jsonb,
  1,
  'The income statement summarises performance over time — revenue minus expenses equals profit.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'reading-financial-statements'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_id = q.id);

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'A low P/E ratio relative to peers might indicate:',
  '["The stock is overvalued","The stock is undervalued OR has problems","The company is bankrupt","Guaranteed profits"]'::jsonb,
  1,
  'Low P/E can mean undervalued or that the market sees real risk. Always investigate why.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'key-ratios'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_id = q.id);

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'A healthy ROE (Return on Equity) is typically:',
  '["Below 5%","Above 15%","Exactly 10%","Negative"]'::jsonb,
  1,
  'ROE above 15% generally indicates a company efficiently generating profit from shareholder capital.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'key-ratios'
  AND (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) < 2;

-- COURSE 4: Technical Analysis
INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'On a green candlestick, the close price is:',
  '["Below the open","Above the open","Equal to the open","Always the daily low"]'::jsonb,
  1,
  'Green candles signal closing higher than opening — buyers won.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'candlesticks'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_id = q.id);

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'A "support" level on a chart is:',
  '["A price ceiling","A price floor where buyers tend to step in","A trading commission","A government regulation"]'::jsonb,
  1,
  'Support is a price level where buying interest historically prevents further decline.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'support-resistance'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_id = q.id);

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'An RSI reading above 70 typically suggests:',
  '["The stock is undervalued","The stock may be overbought","Trading should stop","Strong dividend coming"]'::jsonb,
  1,
  'RSI > 70 is the classic "overbought" zone — momentum has been strong, and a pullback often follows.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'ma-rsi'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_id = q.id);

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'A "golden cross" occurs when:',
  '["A stock pays a special dividend","The 50-day MA crosses above the 200-day MA","The market closes early","Volume spikes"]'::jsonb,
  1,
  'A golden cross is a long-term bullish signal — short-term momentum has overtaken long-term.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug = 'ma-rsi'
  AND (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) < 2;

-- COURSE 5: Risk Management
INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'Position sizing is primarily about:',
  '["Buying as much as possible","Limiting how much capital you risk on any single trade","Maximising leverage","Following insider tips"]'::jsonb,
  1,
  'Position sizing controls risk — most professionals risk 1-2% of total capital per trade.'
FROM quizzes q JOIN lessons l ON l.id = q.lesson_id
WHERE l.slug LIKE '%position%' OR l.slug LIKE '%sizing%'
  AND NOT EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_id = q.id);

-- Generic fallback: any quiz still empty after the above gets a generic question
INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'Which approach generally produces the best long-term investment results?',
  '["Trying to time market tops and bottoms","A disciplined, diversified, long-term approach","Following social media tips","Concentrating all money in one hot stock"]'::jsonb,
  1,
  'Decades of evidence: discipline, diversification, and patience consistently outperform speculation.'
FROM quizzes q
WHERE NOT EXISTS (SELECT 1 FROM quiz_questions WHERE quiz_id = q.id);

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'What is the most important rule of investing?',
  '["Always buy at the bottom","Don''t lose money — manage risk first","Borrow to amplify gains","Trade as often as possible"]'::jsonb,
  1,
  'Warren Buffett''s rule #1: don''t lose money. Capital preservation is the foundation of long-term success.'
FROM quizzes q
WHERE (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) < 2;

INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation)
SELECT q.id,
  'Diversification helps you because:',
  '["It guarantees profits","It reduces the risk of any single stock destroying your portfolio","It eliminates all risk","It''s required by law"]'::jsonb,
  1,
  'Diversification doesn''t eliminate risk but reduces the impact of any single bad outcome.'
FROM quizzes q
WHERE (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) < 3;