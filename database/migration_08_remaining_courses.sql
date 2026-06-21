-- ============================================
-- StockAcademia — Lessons & quizzes for Risk Management
-- and Trading Strategies courses
-- Run in pgAdmin Query Tool. Idempotent — safe to re-run.
-- ============================================

-- ============================================
-- COURSE 5: RISK MANAGEMENT (course_id = 5)
-- ============================================
INSERT INTO lessons (course_id, title, slug, content, order_index, xp_reward) VALUES
(5, 'Why Risk Management Matters Most', 'risk-fundamentals',
'# Why Risk Management Matters Most

Most people think investing is about picking winners. The pros know it''s about **not losing**.

Warren Buffett''s two rules:
1. Never lose money.
2. Never forget rule #1.

## The asymmetry of losses

If you lose **50%** of your portfolio, you don''t need a 50% gain to break even. You need **100%**.

| Loss | Gain needed to recover |
|------|------------------------|
| -10% | +11% |
| -25% | +33% |
| -50% | +100% |
| -75% | +300% |
| -90% | +900% |

A single catastrophic loss wipes out years of compounding.

## The three risks every investor faces

**1. Position risk** — losing too much on a single trade. Solution: position sizing.
**2. Concentration risk** — losing too much in one sector. Solution: diversification.
**3. Drawdown risk** — losing too much during a market downturn. Solution: asset allocation and discipline.

## The professional mindset

Pros don''t think *"how much can I make?"*. They think *"how much can I lose if I''m wrong?"*

That single shift in thinking is the difference between people who survive 30 years in markets and people who blow up in 3.', 1, 15),

(5, 'Position Sizing — How Much to Risk', 'position-sizing',
'# Position Sizing — How Much to Risk

The biggest decision in any trade isn''t **what** to buy. It''s **how much**.

## The 1-2% rule

Professional traders risk **no more than 1-2% of total capital** on any single trade.

If your portfolio is ₦500,000:
- 1% risk = ₦5,000 max loss per trade
- 2% risk = ₦10,000 max loss per trade

Even if you''re wrong 5 trades in a row, you''ve only lost 5-10% — recoverable.

## Calculating position size