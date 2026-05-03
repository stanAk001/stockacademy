-- ============================================
-- StockAcademy — Visual lesson upgrade (sample)
-- This is the prototype: enhances the "Reading Candlestick Charts"
-- lesson with hand-drawn diagrams and a YouTube video slot.
-- Run after migration_03_stocks.sql.
-- ============================================

UPDATE lessons
SET content = $LESSON$# Reading Candlestick Charts

A candlestick is the most informative chart format in trading. **One candle tells you four prices** — open, high, low, close — and the story of who won between buyers and sellers during that period.

Once you can read candlesticks fluently, you can read any chart.

## Bull vs Bear: the bigger picture first

Before zooming into individual candles, you need to recognise the two states a market can be in:

[[visual:bull-vs-bear]]

A **bull market** trends up over weeks or months. A **bear market** trends down. Candlesticks just zoom in on what's happening day by day inside that bigger trend.

## Anatomy of a single candle

[[visual:candle-anatomy]]

Each candle has two parts:

- **Body** — the thick rectangle, drawn between the **open** price (where the period started) and the **close** price (where it ended)
- **Wick** (also called *shadow*) — the thin line, showing the **highest** and **lowest** prices touched during the period

The colour tells you the direction:

- **Green / hollow body** → close was *above* open → buyers won → **bullish**
- **Red / filled body** → close was *below* open → sellers won → **bearish**

The trick most beginners miss: on a green candle, **open is at the bottom and close is at the top**. On a red candle, it flips — **open is at the top, close is at the bottom**. That's why both candles "look the same" but mean opposite things.

## Why candlesticks beat line charts

A line chart only connects closing prices. A candlestick chart shows you whether buyers were in control all session or whether the price *almost* fell apart before recovering. That extra information is everything in trading.

## Watch this if you're still confused

[[youtube:PLACEHOLDER|Reading candlestick charts — visual walkthrough]]

## Four classic patterns to memorise

These four patterns are how candles start to "talk" to you. None of them are foolproof predictors, but seeing them at the right place on a chart (e.g. at support or resistance) gives you context.

[[visual:candle-patterns]]

- **Hammer** — a small body with a long *lower* wick. Sellers pushed price down hard, but buyers fought back to close near the top. Often a reversal signal *if* it appears after a downtrend.
- **Shooting Star** — opposite of a hammer. Small body with a long *upper* wick. Buyers tried to push higher, sellers slammed it back down. Bearish reversal *if* after an uptrend.
- **Doji** — open and close are almost identical. The body is a thin line. Buyers and sellers fought to a draw — pure indecision. Often appears at turning points.
- **Bullish Engulfing** — a small red candle followed by a big green candle whose body completely engulfs the previous one. Strong shift in momentum from sellers to buyers.

## How to actually use this

1. **Don't trade single candles in isolation.** Context matters more than any one pattern.
2. **Look for confluence.** A hammer at strong support is meaningful. A hammer floating in the middle of a chart is noise.
3. **Practice in the simulator.** Open a chart in the StockAcademy simulator, identify candle patterns yourself, then watch what happens next. That feedback loop is how this skill is actually built.

You'll start seeing these patterns everywhere once you've read 100 charts. Get reading.
$LESSON$
WHERE slug = 'candlesticks';
