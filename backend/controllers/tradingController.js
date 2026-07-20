import axios from 'axios';
import YahooFinance from 'yahoo-finance2';
import db from '../config/db.js';
import { getQuote, getQuoteAndPersist } from '../services/marketPrice.js';

const yahooFinanceClient = new YahooFinance();

const mockPrices = {
  AAPL: { name: 'Apple Inc.', price: 178.23 },
  MSFT: { name: 'Microsoft Corp.', price: 412.65 },
  GOOGL: { name: 'Alphabet Inc.', price: 167.8 },
  AMZN: { name: 'Amazon.com Inc.', price: 185.9 },
  TSLA: { name: 'Tesla Inc.', price: 245.12 },
  META: { name: 'Meta Platforms Inc.', price: 498.7 },
  NVDA: { name: 'NVIDIA Corp.', price: 891.4 },
  NFLX: { name: 'Netflix Inc.', price: 615.25 },
  DIS: { name: 'Walt Disney Co.', price: 108.55 },
  KO: { name: 'Coca-Cola Co.', price: 62.3 },
  JPM: { name: 'JPMorgan Chase', price: 198.15 },
  V: { name: 'Visa Inc.', price: 274.1 },
};

// Trades must fill at the REAL market price. This used to fill from a hardcoded
// mockPrices table (AAPL at $178 while the market said $333), so every position
// and P&L in the simulator was wrong. Returns { price, name } or null.
async function resolveTradePrice(sym) {
  const { rows } = await db.query(
    `SELECT symbol, name, country FROM stocks
     WHERE UPPER(symbol) = $1 OR UPPER(display_symbol) = $1 LIMIT 1`,
    [sym]
  );
  const stock = rows[0];
  const quote = await getQuote(stock?.symbol || sym, stock?.country);
  if (!quote?.price) return null;
  return { price: quote.price, name: stock?.name || sym };
}

const jitter = (base) => {
  const pct = (Math.random() - 0.5) * 0.04;
  return +(base * (1 + pct)).toFixed(2);
};

function generateSyntheticCandles(basePrice, days, intradayInterval) {
  const candles = [];
  let price = basePrice * 0.92;

  // Intraday demo: minute-stepped bars across a few ~6.5h trading days.
  if (intradayInterval) {
    const stepMin = intradayInterval === '5m' ? 5 : 30;
    const barsPerDay = Math.floor((6.5 * 60) / stepMin);
    const total = barsPerDay * Math.max(1, days);
    let t = Date.now() - total * stepMin * 60 * 1000;
    for (let i = 0; i < total; i++) {
      const open = price;
      const close = +(open * (1 + (Math.random() - 0.49) * 0.006)).toFixed(2);
      const high = +(Math.max(open, close) * (1 + Math.random() * 0.003)).toFixed(2);
      const low = +(Math.min(open, close) * (1 - Math.random() * 0.003)).toFixed(2);
      candles.push({
        time: Math.floor(t / 1000),
        date: new Date(t).toISOString().split('T')[0],
        open, high, low, close,
        volume: Math.floor(Math.random() * 200000 + 50000),
      });
      price = close;
      t += stepMin * 60 * 1000;
    }
    return candles;
  }

  for (let i = days; i >= 0; i--) {
    const open = price;
    const close = +(open * (1 + (Math.random() - 0.48) * 0.03)).toFixed(2);
    const high = +(Math.max(open, close) * (1 + Math.random() * 0.01)).toFixed(2);
    const low = +(Math.min(open, close) * (1 - Math.random() * 0.01)).toFixed(2);
    const date = new Date();
    date.setDate(date.getDate() - i);
    candles.push({
      time: Math.floor(date.getTime() / 1000),
      date: date.toISOString().split('T')[0],
      open, high, low, close,
      volume: Math.floor(Math.random() * 1000000 + 500000),
    });
    price = close;
  }
  return candles;
}

export const getStockQuote = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    // Everything quotes through the shared price service, so the simulator, the
    // stock page, rankings and compare all show the SAME number. It also writes
    // the fresh price back to the stocks table to keep those pages in step.
    const { rows } = await db.query(
      `SELECT symbol, display_symbol, name, country, currency, last_price, day_change_pct,
              prev_close, data_updated_at
       FROM stocks WHERE UPPER(symbol) = $1 OR UPPER(display_symbol) = $1 LIMIT 1`,
      [symbol]
    );
    const stock = rows[0] || null;

    const quote = await getQuoteAndPersist(stock?.symbol || symbol, stock?.country);
    if (quote) {
      return res.json({
        success: true,
        symbol,
        name: stock?.name || symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        high: quote.high,
        low: quote.low,
        open: quote.open,
        prevClose: quote.prevClose,
        currency: quote.currency || stock?.currency || 'USD',
        source: quote.source,
        as_of: quote.asOf,
        live: true,
      });
    }

    // No live quote. Serve the last stored price and say how old it is — we do
    // NOT invent one. (This path used to return a random mock price, which is
    // why the simulator disagreed with the rest of the app.)
    if (stock?.last_price != null) {
      return res.json({
        success: true,
        symbol,
        name: stock.name || symbol,
        price: Number(stock.last_price),
        change: null,
        changePercent: stock.day_change_pct != null ? Number(stock.day_change_pct) : null,
        high: null,
        low: null,
        open: null,
        prevClose: stock.prev_close != null ? Number(stock.prev_close) : null,
        currency: stock.currency || 'USD',
        source: 'stored',
        as_of: stock.data_updated_at,
        live: false,
        stale: true,
      });
    }

    return res.status(503).json({
      success: false,
      message: 'Live price is unavailable for this stock right now.',
    });
  } catch (err) {
    console.error('getStockQuote error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch quote' });
  }
};

export const getMarketOverview = async (req, res) => {
  try {
    // The market list reads the stocks table, which the price service keeps
    // fresh — so these rows match what the stock pages show. No mock jitter.
    const { rows } = await db.query(
      `SELECT symbol, display_symbol, name, currency, last_price, day_change_pct
       FROM stocks
       WHERE is_active = TRUE AND last_price IS NOT NULL
       ORDER BY market_cap_millions DESC NULLS LAST, display_symbol
       LIMIT 40`
    );

    const stocks = rows.map((r) => ({
      symbol: r.display_symbol || r.symbol,
      name: r.name,
      price: Number(r.last_price),
      change: null, // absolute change isn't stored; percent is the useful one
      changePercent: r.day_change_pct != null ? Number(r.day_change_pct) : null,
      currency: r.currency || 'USD',
    }));

    res.json({ success: true, stocks });
  } catch (err) {
    console.error('getMarketOverview error:', err);
    res.status(500).json({ success: false, message: 'Failed to load market overview' });
  }
};

export const getCandles = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const range = req.query.range || '6M';

    // Intraday ranges use finer Yahoo intervals; everything else is daily.
    const INTRADAY = {
      '1D': { interval: '5m', days: 1 },
      '5D': { interval: '30m', days: 6 },
    };
    const rangeToDays = {
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
      '5Y': 1825,
      'MAX': 3650, // ~10 years
    };
    const intra = INTRADAY[range];
    let days;
    if (intra) {
      days = intra.days;
    } else if (range === 'YTD') {
      days = Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000) + 1;
    } else {
      days = rangeToDays[range] || 180;
    }

    // Try Yahoo Finance for US-listed stocks
    const isLikelyUS = !symbol.includes('.NG') && !symbol.includes('.LG');

    if (isLikelyUS) {
      try {
        const period2 = new Date();
        const period1 = new Date();
        period1.setDate(period1.getDate() - days - (intra ? 1 : 10));

        // chart() replaces the deprecated historical(); it returns
        // { meta, quotes, events }. quotes can include gap rows with null OHLC
        // values (holidays / the in-progress candle), so filter those out.
        const chart = await yahooFinanceClient.chart(symbol, {
          period1,
          period2,
          interval: intra?.interval || '1d',
        });
        const history = (chart?.quotes || []).filter(
          (h) => h.open != null && h.high != null && h.low != null && h.close != null
        );

        if (history.length > 0) {
          // Unix seconds for every range so the chart series uses one time type.
          // Dedupe/keep ascending — lightweight-charts requires strictly increasing time.
          const seen = new Set();
          const candles = [];
          for (const h of history) {
            const time = Math.floor(new Date(h.date).getTime() / 1000);
            if (seen.has(time)) continue;
            seen.add(time);
            candles.push({
              time,
              date: new Date(h.date).toISOString().split('T')[0],
              open: +h.open.toFixed(2),
              high: +h.high.toFixed(2),
              low: +h.low.toFixed(2),
              close: +h.close.toFixed(2),
              volume: h.volume || 0,
            });
          }
          candles.sort((a, b) => a.time - b.time);
          return res.json({ success: true, symbol, candles, source: 'yahoo', intraday: Boolean(intra) });
        }
      } catch (err) {
        console.warn(`Yahoo candles failed for ${symbol}:`, err.message);
      }
    }

    // Fallback: synthetic candles
    const base = mockPrices[symbol]?.price || 100;
    const candles = generateSyntheticCandles(base, Math.min(days, 400), intra?.interval);
    res.json({ success: true, symbol, candles, source: 'synthetic', intraday: Boolean(intra) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch candles' });
  }
};

export const buy = async (req, res) => {
  const client = await db.getClient();
  try {
    const { symbol, shares } = req.body;
    if (!symbol || !shares || shares <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid trade parameters.' });
    }

    const s = symbol.toUpperCase();
    // Fetch before BEGIN — never hold a transaction open across a network call.
    const fill = await resolveTradePrice(s);
    if (!fill) {
      return res.status(503).json({
        success: false,
        message: "We couldn't get a live price for that stock right now. Please try again in a moment.",
      });
    }
    const mock = { name: fill.name };
    const price = fill.price;
    const total = +(price * shares).toFixed(2);

    await client.query('BEGIN');

    const userRes = await client.query('SELECT virtual_balance FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const balance = parseFloat(userRes.rows[0].virtual_balance);
    if (balance < total) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Insufficient virtual balance.' });
    }

    await client.query('UPDATE users SET virtual_balance = virtual_balance - $1 WHERE id = $2', [total, req.user.id]);

    const existing = await client.query(
      'SELECT shares, avg_buy_price FROM portfolios WHERE user_id = $1 AND symbol = $2',
      [req.user.id, s]
    );

    if (existing.rows.length > 0) {
      const curShares = parseFloat(existing.rows[0].shares);
      const curAvg = parseFloat(existing.rows[0].avg_buy_price);
      const newShares = curShares + parseFloat(shares);
      const newAvg = (curAvg * curShares + price * shares) / newShares;
      await client.query(
        'UPDATE portfolios SET shares = $1, avg_buy_price = $2, updated_at = NOW() WHERE user_id = $3 AND symbol = $4',
        [newShares, newAvg, req.user.id, s]
      );
    } else {
      await client.query(
        'INSERT INTO portfolios (user_id, symbol, company_name, shares, avg_buy_price) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, s, mock.name, shares, price]
      );
    }

    await client.query(
      'INSERT INTO transactions (user_id, symbol, company_name, transaction_type, shares, price_per_share, total_amount) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.id, s, mock.name, 'BUY', shares, price, total]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: `Bought ${shares} shares of ${s} at $${price}`, price, total });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Trade failed.' });
  } finally {
    client.release();
  }
};

export const sell = async (req, res) => {
  const client = await db.getClient();
  try {
    const { symbol, shares } = req.body;
    const s = symbol.toUpperCase();
    // Fetch before BEGIN — never hold a transaction open across a network call.
    const fill = await resolveTradePrice(s);
    if (!fill) {
      return res.status(503).json({
        success: false,
        message: "We couldn't get a live price for that stock right now. Please try again in a moment.",
      });
    }
    const mock = { name: fill.name };
    const price = fill.price;
    const total = +(price * shares).toFixed(2);

    await client.query('BEGIN');

    const posRes = await client.query(
      'SELECT shares FROM portfolios WHERE user_id = $1 AND symbol = $2 FOR UPDATE',
      [req.user.id, s]
    );
    if (posRes.rows.length === 0 || parseFloat(posRes.rows[0].shares) < shares) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Not enough shares to sell.' });
    }

    const remaining = parseFloat(posRes.rows[0].shares) - parseFloat(shares);
    if (remaining === 0) {
      await client.query('DELETE FROM portfolios WHERE user_id = $1 AND symbol = $2', [req.user.id, s]);
    } else {
      await client.query(
        'UPDATE portfolios SET shares = $1, updated_at = NOW() WHERE user_id = $2 AND symbol = $3',
        [remaining, req.user.id, s]
      );
    }

    await client.query('UPDATE users SET virtual_balance = virtual_balance + $1 WHERE id = $2', [total, req.user.id]);

    await client.query(
      'INSERT INTO transactions (user_id, symbol, company_name, transaction_type, shares, price_per_share, total_amount) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [req.user.id, s, mock.name, 'SELL', shares, price, total]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: `Sold ${shares} shares of ${s} at $${price}`, price, total });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Trade failed.' });
  } finally {
    client.release();
  }
};

export const getPortfolio = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM portfolios WHERE user_id = $1', [req.user.id]);

    // Value holdings at the REAL current price (cached, so this is cheap). It
    // used to use a jittered mock, which made P&L drift randomly on refresh.
    // If a price genuinely isn't available, fall back to cost basis so the row
    // shows 0 P&L rather than an invented gain or loss.
    const prices = await Promise.all(
      rows.map((p) => getQuote(p.symbol).catch(() => null))
    );

    const enriched = rows.map((p, i) => {
      const currentPrice = prices[i]?.price ?? parseFloat(p.avg_buy_price);
      const marketValue = +(currentPrice * parseFloat(p.shares)).toFixed(2);
      const costBasis = +(parseFloat(p.avg_buy_price) * parseFloat(p.shares)).toFixed(2);
      const pl = +(marketValue - costBasis).toFixed(2);
      const plPct = +((pl / costBasis) * 100).toFixed(2);
      return { ...p, current_price: currentPrice, market_value: marketValue, cost_basis: costBasis, pl, pl_pct: plPct };
    });

    const balanceRes = await db.query('SELECT virtual_balance FROM users WHERE id = $1', [req.user.id]);
    const balance = parseFloat(balanceRes.rows[0].virtual_balance);
    const equityValue = enriched.reduce((sum, p) => sum + p.market_value, 0);
    const totalValue = balance + equityValue;
    const totalPL = enriched.reduce((sum, p) => sum + p.pl, 0);

    res.json({
      success: true,
      portfolio: enriched,
      summary: {
        balance,
        equity_value: equityValue,
        total_value: totalValue,
        total_pl: totalPL,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch portfolio' });
  }
};

export const getTransactions = async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json({ success: true, transactions: rows });
};