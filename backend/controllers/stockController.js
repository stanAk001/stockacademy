import axios from 'axios';
import db from '../config/db.js';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || '';
const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const CACHE_SECONDS = 60;

const hasFinnhub = () => !!FINNHUB_KEY;

// Helper: safely convert a value to a number, returns null if invalid.
// Accepts an optional fallback so callers can use num(value, null).
const num = (v, fallback = null) => {
  if (v === null || v === undefined || v === '') return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const numOrNull = (v) => num(v, null);

/* ============================================
 *  SEARCH — unified search across US (Finnhub) + NG (our DB)
 * ============================================ */
export const searchStocks = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 1) return res.json({ success: true, results: [] });

    const dbRes = await db.query(
      `SELECT symbol, display_symbol, name, exchange, country, currency, sector
       FROM stocks
       WHERE is_active = TRUE
         AND (display_symbol ILIKE $1 OR name ILIKE $1)
       ORDER BY
         CASE WHEN display_symbol ILIKE $2 THEN 0 ELSE 1 END,
         CASE WHEN display_symbol ILIKE $1 THEN 0 ELSE 1 END
       LIMIT 15`,
      [`%${q}%`, `${q}%`]
    );
    let results = dbRes.rows;

    if (hasFinnhub() && q.length >= 2 && results.length < 10) {
      try {
        const { data } = await axios.get(`${FINNHUB_BASE}/search`, {
          params: { q, token: FINNHUB_KEY },
          timeout: 4000,
        });
        const seen = new Set(results.map((r) => r.symbol));
        for (const item of data.result || []) {
          if (!item.symbol || item.symbol.includes('.') || seen.has(item.symbol)) continue;
          if (item.type !== 'Common Stock') continue;
          results.push({
            symbol: item.symbol,
            display_symbol: item.displaySymbol || item.symbol,
            name: item.description,
            exchange: 'US',
            country: 'US',
            currency: 'USD',
            sector: null,
            remote: true,
          });
          if (results.length >= 15) break;
        }
      } catch { /* silent */ }
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Search failed' });
  }
};

/* ============================================
 *  GET QUOTE
 * ============================================ */
export const getQuote = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();

    const stock = await upsertStockIfMissing(symbol);
    if (!stock) {
      return res.status(404).json({ success: false, message: 'Stock not found' });
    }

    const cacheRes = await db.query(
      `SELECT * FROM stock_quotes_cache
       WHERE symbol = $1 AND cached_at > NOW() - INTERVAL '${CACHE_SECONDS} seconds'`,
      [symbol]
    );
    if (cacheRes.rows.length > 0) {
      return res.json({ success: true, ...enrichQuote(stock, cacheRes.rows[0]), cached: true });
    }

    if (hasFinnhub() && stock.country === 'US') {
      try {
        const { data } = await axios.get(`${FINNHUB_BASE}/quote`, {
          params: { symbol, token: FINNHUB_KEY },
          timeout: 4000,
        });
        if (data && data.c > 0) {
          const quote = {
            symbol,
            price: data.c,
            change_pct: data.dp,
            high: data.h,
            low: data.l,
            open: data.o,
            prev_close: data.pc,
            volume: null,
          };
          await db.query(
            `INSERT INTO stock_quotes_cache (symbol, price, change_pct, high, low, open, prev_close, volume, cached_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (symbol) DO UPDATE SET
               price=EXCLUDED.price, change_pct=EXCLUDED.change_pct, high=EXCLUDED.high,
               low=EXCLUDED.low, open=EXCLUDED.open, prev_close=EXCLUDED.prev_close,
               volume=EXCLUDED.volume, cached_at=NOW()`,
            [symbol, quote.price, quote.change_pct, quote.high, quote.low, quote.open, quote.prev_close, quote.volume]
          );
          return res.json({ success: true, ...enrichQuote(stock, quote), live: true });
        }
      } catch (e) {
        console.warn('Finnhub quote failed for', symbol, e.message);
      }
    }

    const snapshot = {
      price: stock.last_price,
      change_pct: stock.day_change_pct,
      prev_close: stock.prev_close,
      high: null,
      low: null,
      open: null,
      volume: null,
    };
    res.json({ success: true, ...enrichQuote(stock, snapshot), snapshot: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch quote' });
  }
};

function enrichQuote(stock, q) {
  return {
    symbol: stock.symbol,
    display_symbol: stock.display_symbol,
    name: stock.name,
    exchange: stock.exchange,
    country: stock.country,
    currency: stock.currency,
    sector: stock.sector,
    price: numOrNull(q.price),
    change_pct: numOrNull(q.change_pct),
    high: numOrNull(q.high),
    low: numOrNull(q.low),
    open: numOrNull(q.open),
    prev_close: numOrNull(q.prev_close),
    volume: q.volume ?? null,
  };
}

/* ============================================
 *  Auto-add a US stock from Finnhub
 * ============================================ */
async function upsertStockIfMissing(symbol) {
  const existing = await db.query('SELECT * FROM stocks WHERE symbol = $1', [symbol]);
  if (existing.rows.length > 0) return existing.rows[0];

  if (!hasFinnhub()) return null;

  try {
    const { data } = await axios.get(`${FINNHUB_BASE}/stock/profile2`, {
      params: { symbol, token: FINNHUB_KEY },
      timeout: 4000,
    });
    if (!data || !data.name) return null;

    const inserted = await db.query(
      `INSERT INTO stocks (symbol, display_symbol, name, exchange, country, currency, sector, industry, logo_url)
       VALUES ($1, $2, $3, $4, 'US', $5, $6, $7, $8)
       ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [
        symbol,
        data.ticker || symbol,
        data.name,
        data.exchange || 'US',
        data.currency || 'USD',
        data.finnhubIndustry || null,
        data.finnhubIndustry || null,
        data.logo || null,
      ]
    );
    return inserted.rows[0];
  } catch {
    return null;
  }
}

/* ============================================
 *  Refresh real fundamentals from Finnhub for a US stock
 * ============================================ */
const FUNDAMENTALS_TTL_HOURS = 24;

export async function refreshFundamentals(symbol, force = false) {
  if (!hasFinnhub()) return null;

  const sRes = await db.query('SELECT * FROM stocks WHERE symbol = $1', [symbol]);
  if (sRes.rows.length === 0) return null;
  const stock = sRes.rows[0];
  if (stock.country !== 'US') return stock;

  if (!force && stock.data_updated_at) {
    const ageHours = (Date.now() - new Date(stock.data_updated_at).getTime()) / 3_600_000;
    if (ageHours < FUNDAMENTALS_TTL_HOURS) return stock;
  }

  try {
    const { data } = await axios.get(`${FINNHUB_BASE}/stock/metric`, {
      params: { symbol, metric: 'all', token: FINNHUB_KEY },
      timeout: 6000,
    });
    const m = data?.metric;
    if (!m) return stock;

    // Helper: turn a Finnhub percentage (e.g. 28.5 = 28.5%) into a decimal (0.285)
    const pct = (v) => {
      const n = num(v);
      return n === null ? null : n / 100;
    };

    const updates = {
      pe_ratio:               num(m.peNormalizedAnnual ?? m.peTTM ?? m.peExclExtraTTM),
      pb_ratio:               num(m.pbAnnual ?? m.pbQuarterly),
      ps_ratio:               num(m.psAnnual ?? m.psTTM),
      ev_ebitda:              num(m['enterpriseValue/ebitdaTTM'] ?? m.currentEv_freeCashFlowAnnual),
      peg_ratio:              num(m.pegRatioTTM),
      dividend_yield:         pct(m.dividendYieldIndicatedAnnual),
      eps:                    num(m.epsBasicExclExtraItemsAnnual ?? m.epsTTM),
      market_cap_millions:    num(m.marketCapitalization),
      roe:                    pct(m.roeTTM ?? m.roeRfy),
      roa:                    pct(m.roaTTM ?? m.roaRfy),
      gross_margin:           pct(m.grossMarginTTM),
      net_margin:             pct(m.netProfitMarginTTM),
      debt_to_equity:         num(m.totalDebt_totalEquityAnnual),
      current_ratio:          num(m.currentRatioAnnual ?? m.currentRatioQuarterly),
      revenue_growth_yoy:     pct(m.revenueGrowthTTMYoy),
      earnings_growth_yoy:    pct(m.epsGrowthTTMYoy),
      beta:                   num(m.beta),
      volatility_1y:          pct(m['52WeekVolatility']),
      avg_daily_volume_millions: num(m['10DayAverageTradingVolume']),
      return_1m:              pct(m.monthToDatePriceReturnDaily),
      return_3m:              pct(m['3MonthAdjustedPriceReturnDaily']),
      return_6m:              pct(m['6MonthPriceReturnDaily']),
      return_1y:              pct(m['52WeekPriceReturnDaily']),
      high_52w:               num(m['52WeekHigh']),
      low_52w:                num(m['52WeekLow']),
    };

    const setClauses = [];
    const values = [];
    let i = 1;
    for (const [col, val] of Object.entries(updates)) {
      if (val !== null && val !== undefined && Number.isFinite(val)) {
        setClauses.push(`${col} = $${i++}`);
        values.push(val);
      }
    }
    setClauses.push(`data_updated_at = NOW()`);
    values.push(symbol);

    if (setClauses.length > 1) {
      await db.query(
        `UPDATE stocks SET ${setClauses.join(', ')} WHERE symbol = $${i}`,
        values
      );
    }

    const refreshed = await db.query('SELECT * FROM stocks WHERE symbol = $1', [symbol]);
    return refreshed.rows[0];
  } catch (e) {
    console.warn('refreshFundamentals failed for', symbol, e.message);
    return stock;
  }
}

export { upsertStockIfMissing };

/* ============================================
 *  Candles for chart
 * ============================================ */
export const getCandles = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const days = parseInt(req.query.days) || 90;

    const stock = await upsertStockIfMissing(symbol);
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found' });

    if (hasFinnhub() && stock.country === 'US') {
      try {
        const to = Math.floor(Date.now() / 1000);
        const from = to - days * 86400;
        const { data } = await axios.get(`${FINNHUB_BASE}/stock/candle`, {
          params: { symbol, resolution: 'D', from, to, token: FINNHUB_KEY },
          timeout: 5000,
        });
        if (data?.s === 'ok' && data.c) {
          const candles = data.t.map((t, i) => ({
            date: new Date(t * 1000).toISOString().split('T')[0],
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
            volume: data.v[i],
          }));
          return res.json({ success: true, symbol, candles, source: 'finnhub' });
        }
      } catch {}
    }

    res.json({
      success: true,
      symbol,
      candles: generateSynthetic(parseFloat(stock.last_price) || 100, days),
      source: 'synthetic',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch candles' });
  }
};

function generateSynthetic(basePrice, days) {
  const candles = [];
  let price = basePrice * 0.94;
  for (let i = days; i >= 0; i--) {
    const open = price;
    const drift = 0.0002;
    const vol = 0.018;
    const close = +(open * (1 + drift + (Math.random() - 0.5) * vol * 2)).toFixed(4);
    const high = +(Math.max(open, close) * (1 + Math.random() * 0.008)).toFixed(4);
    const low = +(Math.min(open, close) * (1 - Math.random() * 0.008)).toFixed(4);
    const date = new Date();
    date.setDate(date.getDate() - i);
    candles.push({
      date: date.toISOString().split('T')[0],
      open, high, low, close,
      volume: Math.floor(Math.random() * 5_000_000 + 500_000),
    });
    price = close;
  }
  return candles;
}

/* ============================================
 *  Market overview
 * ============================================ */
export const marketOverview = async (req, res) => {
  try {
    const { country } = req.query;
    const params = [];
    let where = 'WHERE is_active = TRUE';
    if (country) {
      params.push(country.toUpperCase());
      where += ` AND country = $1`;
    }
    const { rows } = await db.query(
      `SELECT symbol, display_symbol, name, country, currency, sector, last_price, day_change_pct
       FROM stocks ${where}
       ORDER BY market_cap_millions DESC NULLS LAST
       LIMIT 25`,
      params
    );
    res.json({ success: true, stocks: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed' });
  }
};