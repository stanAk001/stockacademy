import axios from 'axios';
import db from '../config/db.js';

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

const jitter = (base) => {
  const pct = (Math.random() - 0.5) * 0.04;
  return +(base * (1 + pct)).toFixed(2);
};

export const getStockQuote = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    if (process.env.FINNHUB_API_KEY) {
      try {
        const { data } = await axios.get(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`
        );
        return res.json({
          success: true,
          symbol,
          name: mockPrices[symbol]?.name || symbol,
          price: data.c,
          change: data.d,
          changePercent: data.dp,
          high: data.h,
          low: data.l,
          open: data.o,
          prevClose: data.pc,
        });
      } catch (e) {
        // fall through to mock
      }
    }

    const mock = mockPrices[symbol];
    if (!mock) {
      return res.json({
        success: true,
        symbol,
        name: symbol,
        price: jitter(100),
        change: 0,
        changePercent: 0,
        mocked: true,
      });
    }
    const price = jitter(mock.price);
    const change = +(price - mock.price).toFixed(2);
    const changePercent = +((change / mock.price) * 100).toFixed(2);
    res.json({
      success: true,
      symbol,
      name: mock.name,
      price,
      change,
      changePercent,
      high: +(price * 1.02).toFixed(2),
      low: +(price * 0.98).toFixed(2),
      open: +(mock.price).toFixed(2),
      prevClose: +(mock.price).toFixed(2),
      mocked: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch quote' });
  }
};

export const getMarketOverview = async (req, res) => {
  const overview = Object.entries(mockPrices).map(([symbol, v]) => {
    const price = jitter(v.price);
    const change = +(price - v.price).toFixed(2);
    return {
      symbol,
      name: v.name,
      price,
      change,
      changePercent: +((change / v.price) * 100).toFixed(2),
    };
  });
  res.json({ success: true, stocks: overview });
};

export const getCandles = async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const base = mockPrices[symbol]?.price || 100;
  const days = 60;
  const candles = [];
  let price = base * 0.92;
  for (let i = days; i >= 0; i--) {
    const open = price;
    const close = +(open * (1 + (Math.random() - 0.48) * 0.03)).toFixed(2);
    const high = +(Math.max(open, close) * (1 + Math.random() * 0.01)).toFixed(2);
    const low = +(Math.min(open, close) * (1 - Math.random() * 0.01)).toFixed(2);
    const date = new Date();
    date.setDate(date.getDate() - i);
    candles.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 1000000 + 500000),
    });
    price = close;
  }
  res.json({ success: true, symbol, candles });
};

export const buy = async (req, res) => {
  const client = await db.getClient();
  try {
    const { symbol, shares } = req.body;
    if (!symbol || !shares || shares <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid trade parameters.' });
    }

    const s = symbol.toUpperCase();
    const mock = mockPrices[s] || { name: s, price: 100 };
    const price = mock.price;
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
    const mock = mockPrices[s] || { name: s, price: 100 };
    const price = mock.price;
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
    const enriched = rows.map((p) => {
      const currentPrice = mockPrices[p.symbol]?.price
        ? jitter(mockPrices[p.symbol].price)
        : parseFloat(p.avg_buy_price);
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
