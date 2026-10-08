import YahooFinance from 'yahoo-finance2';
import db from '../config/db.js';
import { toYahooSymbol } from './yahooQuotes.js';

// Instantiate the new v3+ class
const yahooFinance = new YahooFinance();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch fundamentals for a single US stock from Yahoo Finance.
 */
async function fetchFundamentals(symbol) {
  try {
    const result = await yahooFinance.quoteSummary(toYahooSymbol(symbol), {
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

    // Every key here must be a real stocks column: Postgres rejects the whole
    // UPDATE if one isn't. This used to include price / change_pct / volume,
    // none of which exist, so every fundamentals write silently failed. Prices
    // are owned by the snapshot + technicals jobs, not this one.
    const data = {
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
 * Exported so the on-demand Finnhub refresh can borrow it (Finnhub's free tier
 * doesn't expose volatility/drawdown, and Yahoo's chart endpoint is reliable).
 */
export async function fetchHistoricalMetrics(symbol) {
  try {
    // Ask for ~400 calendar days, not one year. A calendar year holds only ~251
    // trading sessions, so a 252-session lookback for the 1-year return always
    // fell off the start and came back null — for every stock.
    const now = new Date();
    const from = new Date(now.getTime() - 400 * 86_400_000);

    // Yahoo uses a dash for class shares (BRK-B), while our DB / Finnhub use a
    // dot (BRK.B). chart() is the current API; historical() just proxies to it.
    const chart = await yahooFinance.chart(toYahooSymbol(symbol), {
      period1: from,
      period2: now,
      interval: '1d',
    });
    const history = chart?.quotes || [];

    if (history.length < 30) return {};

    const allPrices = history.map((h) => h.close).filter((p) => p);
    if (allPrices.length < 30) return {};

    const latest = allPrices[allPrices.length - 1];

    const returnAt = (daysBack) => {
      const idx = allPrices.length - 1 - daysBack;
      if (idx < 0) return null;
      const old = allPrices[idx];
      return old ? (latest - old) / old : null;
    };

    // The "1y" risk figures cover exactly the last year of sessions (253 closes
    // → 252 daily moves), not the extra history fetched for the return lookback.
    const prices = allPrices.slice(-253);
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
 * Main entry: refresh US fundamentals.
 *
 * Fundamentals move quarterly, so with ~1,000 stocks we don't redo all of them
 * every day (that's ~40 minutes of Yahoo calls). Each run takes:
 *   • every stock that has no fundamentals yet (new listings) — up to maxMissing
 *   • a fixed 1/rotateDays slice of the rest, chosen by a stable hash of the
 *     symbol, so every stock is refreshed once every rotateDays days.
 * Pass { all: true } to refresh everything (slow; run it in the background), or
 * { onlyMissing: true } to backfill stocks that have never had fundamentals.
 */
let fundamentalsRunning = false;

const MISSING_FUNDAMENTALS = `country = 'US' AND is_active = TRUE
             AND pe_ratio IS NULL AND roe IS NULL AND net_margin IS NULL`;

export async function updateAllUSStocks({ all = false, onlyMissing = false, rotateDays = 5, maxMissing = 300 } = {}) {
  if (fundamentalsRunning) return { success: false, error: 'already_running' };
  fundamentalsRunning = true;
  const mode = all ? 'all' : onlyMissing ? 'missing only' : `1/${rotateDays} rotation + missing`;
  console.log(`[fundamentals] Starting US stocks update (${mode})...`);
  const startTime = Date.now();

  try {
    const day = Math.floor(Date.now() / 86_400_000);
    const { rows } = all
      ? await db.query(`SELECT symbol FROM stocks WHERE country = 'US' AND is_active = TRUE ORDER BY symbol ASC`)
      : onlyMissing
      ? await db.query(`SELECT symbol FROM stocks WHERE ${MISSING_FUNDAMENTALS} ORDER BY symbol`)
      : await db.query(
        `(SELECT symbol FROM stocks
           WHERE ${MISSING_FUNDAMENTALS}
           ORDER BY symbol LIMIT $1)
         UNION
         (SELECT symbol FROM stocks
           WHERE country = 'US' AND is_active = TRUE
             AND MOD(ABS(hashtext(symbol)), $2) = $3)
         ORDER BY symbol`,
        [maxMissing, rotateDays, day % rotateDays]
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
  } finally {
    fundamentalsRunning = false;
  }
}

export const fundamentalsUpdateRunning = () => fundamentalsRunning;

export async function updateSingleStock(symbol) {
  return await updateOneStock(symbol.toUpperCase());
}