import YahooFinance from 'yahoo-finance2';
import db from '../config/db.js';

// Instantiate the new v3+ class
const yahooFinance = new YahooFinance();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch fundamentals for a single US stock from Yahoo Finance.
 */
async function fetchFundamentals(symbol) {
  try {
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: [
        'summaryDetail',
        'defaultKeyStatistics',
        'financialData',
        'price',
      ],
    });

    const summary = result.summaryDetail || {};
    const stats = result.defaultKeyStatistics || {};
    const financial = result.financialData || {};
    const price = result.price || {};

    const data = {
      price: price.regularMarketPrice || null,
      change_pct: price.regularMarketChangePercent
        ? parseFloat(price.regularMarketChangePercent) * 100
        : null,
      volume: price.regularMarketVolume || null,
      high_52w: summary.fiftyTwoWeekHigh || null,
      low_52w: summary.fiftyTwoWeekLow || null,

      // Valuation
      pe_ratio: summary.trailingPE || null,
      pb_ratio: stats.priceToBook || null,
      ps_ratio: summary.priceToSalesTrailing12Months || null,
      ev_ebitda: stats.enterpriseToEbitda || null,
      peg_ratio: stats.pegRatio || null,
      dividend_yield: summary.dividendYield || 0,
      eps: stats.trailingEps || null,
      market_cap_millions: price.marketCap ? price.marketCap / 1_000_000 : null,

      // Profitability (decimals)
      roe: financial.returnOnEquity || null,
      roa: financial.returnOnAssets || null,
      gross_margin: financial.grossMargins || null,
      net_margin: financial.profitMargins || null,

      // Balance sheet
      debt_to_equity: financial.debtToEquity ? financial.debtToEquity / 100 : null,
      current_ratio: financial.currentRatio || null,

      // Growth (decimals)
      revenue_growth_yoy: financial.revenueGrowth || null,
      earnings_growth_yoy: financial.earningsGrowth || null,

      // Risk
      beta: stats.beta || null,
    };

    return data;
  } catch (err) {
    console.error(`[fundamentals] ${symbol} fetch failed:`, err.message);
    return null;
  }
}

/**
 * Compute price returns and volatility from historical data.
 */
async function fetchHistoricalMetrics(symbol) {
  try {
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const history = await yahooFinance.historical(symbol, {
      period1: oneYearAgo,
      period2: now,
      interval: '1d',
    });

    if (!history || history.length < 30) return {};

    const prices = history.map((h) => h.close).filter((p) => p);
    if (prices.length < 30) return {};

    const latest = prices[prices.length - 1];

    const returnAt = (daysBack) => {
      const idx = prices.length - 1 - daysBack;
      if (idx < 0) return null;
      const old = prices[idx];
      return old ? (latest - old) / old : null;
    };

    const dailyReturns = [];
    for (let i = 1; i < prices.length; i++) {
      dailyReturns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      dailyReturns.length;
    const dailyVol = Math.sqrt(variance);
    const annualizedVol = dailyVol * Math.sqrt(252);

    const last30 = dailyReturns.slice(-30);
    const mean30 = last30.reduce((a, b) => a + b, 0) / last30.length;
    const var30 =
      last30.reduce((a, b) => a + Math.pow(b - mean30, 2), 0) / last30.length;
    const vol30 = Math.sqrt(var30) * Math.sqrt(252);

    let peak = prices[0];
    let maxDrawdown = 0;
    for (const p of prices) {
      if (p > peak) peak = p;
      const drawdown = (p - peak) / peak;
      if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    }

    return {
      return_1m: returnAt(21),
      return_3m: returnAt(63),
      return_6m: returnAt(126),
      return_1y: returnAt(252),
      volatility_30d: vol30,
      volatility_1y: annualizedVol,
      max_drawdown_1y: maxDrawdown,
    };
  } catch (err) {
    console.error(`[fundamentals] ${symbol} history failed:`, err.message);
    return {};
  }
}

/**
 * Update one stock's fundamentals in the database.
 */
async function updateOneStock(symbol) {
  const fundamentals = await fetchFundamentals(symbol);
  if (!fundamentals) {
    return { symbol, success: false, reason: 'fetch_failed' };
  }

  const historical = await fetchHistoricalMetrics(symbol);
  const data = { ...fundamentals, ...historical };

  const fields = Object.keys(data).filter((k) => data[k] !== null && data[k] !== undefined);
  if (fields.length === 0) {
    return { symbol, success: false, reason: 'no_data' };
  }

  const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = fields.map((f) => data[f]);
  values.push(symbol);

  try {
    const result = await db.query(
      `UPDATE stocks SET ${setClauses}, data_updated_at = NOW()
       WHERE symbol = $${fields.length + 1}`,
      values
    );

    if (result.rowCount === 0) {
      return { symbol, success: false, reason: 'not_in_db' };
    }
    return { symbol, success: true, fields_updated: fields.length };
  } catch (err) {
    console.error(`[fundamentals] ${symbol} DB update failed:`, err.message);
    return { symbol, success: false, reason: 'db_error' };
  }
}

/**
 * Main entry: update all US stocks in the database.
 */
export async function updateAllUSStocks() {
  console.log('[fundamentals] Starting US stocks update...');
  const startTime = Date.now();

  try {
    const { rows } = await db.query(
      `SELECT symbol FROM stocks WHERE country = 'US' ORDER BY symbol ASC`
    );

    const results = [];
    for (const row of rows) {
      const result = await updateOneStock(row.symbol);
      results.push(result);
      console.log(
        `[fundamentals] ${result.symbol}: ${result.success ? '✓' : '✗ ' + result.reason}`
      );
      await sleep(1500);
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(
      `[fundamentals] Complete: ${succeeded} succeeded, ${failed} failed in ${duration}s`
    );

    return {
      success: true,
      total: results.length,
      succeeded,
      failed,
      duration_seconds: parseFloat(duration),
      results,
    };
  } catch (err) {
    console.error('[fundamentals] Job error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateSingleStock(symbol) {
  return await updateOneStock(symbol.toUpperCase());
}