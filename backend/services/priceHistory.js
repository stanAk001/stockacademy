// ============================================================
// priceHistory.js — one call for a stock's daily candle series, either market.
//
//   US → Yahoo chart() : full OHLCV (open/high/low/close/volume)
//   NGX → NGX Pulse    : close-only (the free /prices tier has no intraday H/L/vol)
//
// Both come back normalized and ascending as { date, open?, high?, low?, close,
// volume? } so services/indicators.js can consume either — it already degrades
// gracefully when high/low/volume are absent. We ask for ~400 calendar days so
// there's enough history for a 200-day moving average.
// ============================================================
import YahooFinance from 'yahoo-finance2';
import { fetchNgxHistory } from './marketPrice.js';
import { aggregateCandles } from './indicators.js';
import { filterUsRegularSession } from './marketHours.js';

const yf = new YahooFinance();

async function fetchUsCandles(symbol, days = 400) {
  const period2 = new Date();
  const period1 = new Date();
  period1.setDate(period1.getDate() - days);
  try {
    const chart = await yf.chart(symbol, { period1, period2, interval: '1d' });
    const rows = (chart?.quotes || []).filter(
      (h) => h.close != null && h.high != null && h.low != null
    );
    return rows
      .map((h) => ({
        date: new Date(h.date).toISOString().slice(0, 10),
        open: h.open != null ? +h.open : null,
        high: +h.high,
        low: +h.low,
        close: +h.close,
        volume: h.volume || null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (e) {
    console.warn(`[history] US candles failed for ${symbol}:`, e.message);
    return null;
  }
}

/**
 * Daily candles for any tracked stock.
 * @param {string} symbol         internal symbol (e.g. 'AAPL', 'NGX:DANGCEM')
 * @param {string} country        'US' | 'NG'
 * @param {string} displaySymbol  ticker NGX Pulse expects (e.g. 'DANGCEM')
 * @returns {Promise<Array|null>} ascending candle series, or null on failure
 */
export async function fetchDailyCandles(symbol, country, displaySymbol) {
  if (country === 'NG') {
    const hist = await fetchNgxHistory(displaySymbol || symbol);
    // NGX history is already { date, close } ascending.
    return hist && hist.length ? hist : null;
  }
  // Default to the US/Yahoo path for everything else.
  return fetchUsCandles(symbol);
}

// ---- intraday + weekly (multi-timeframe, US only) ---------------------------

const TF_TIMEOUT_MS = 8000;
const TF_CACHE_MS = 15 * 60 * 1000;
const tfCache = new Map(); // symbol → { at, data }

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);
}

// Yahoo candles at any interval. Intraday dates keep the full timestamp so the
// series sorts correctly and 4H grouping can tell trading days apart.
async function fetchUsInterval(symbol, interval, days) {
  const period2 = new Date();
  const period1 = new Date();
  period1.setDate(period1.getDate() - days);
  try {
    const chart = await yf.chart(symbol, { period1, period2, interval });
    const rows = (chart?.quotes || [])
      .filter((h) => h.close != null && h.high != null && h.low != null)
      .map((h) => ({
        date: new Date(h.date).toISOString(),
        open: h.open != null ? +h.open : null,
        high: +h.high,
        low: +h.low,
        close: +h.close,
        volume: h.volume || null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    // Intraday: drop pre-market / after-hours bars (see marketHours.js).
    return /[mh]$/.test(interval) ? filterUsRegularSession(rows) : rows;
  } catch (e) {
    console.warn(`[history] ${interval} candles failed for ${symbol}:`, e.message);
    return null;
  }
}

/**
 * Weekly, 4H and 1H candles for the multi-timeframe read.
 * NGX only publishes daily closes, so it gets nulls plus an honest reason.
 * Each fetch is capped at 8s and results are cached 15 min per symbol, so the
 * Swing Radar stays responsive and Yahoo isn't hammered.
 * @returns {Promise<{ '1wk': Array|null, '4h': Array|null, '1h': Array|null, reason?: string }>}
 */
export async function fetchTimeframes(symbol, country) {
  if (country === 'NG') {
    return {
      '1wk': null, '4h': null, '1h': null,
      reason: 'NGX data is daily closing prices only, so weekly and intraday timeframes (and VWAP) aren’t available for this stock.',
    };
  }
  const hit = tfCache.get(symbol);
  if (hit && Date.now() - hit.at < TF_CACHE_MS) return hit.data;

  const [hourly, weekly] = await Promise.all([
    withTimeout(fetchUsInterval(symbol, '1h', 59), TF_TIMEOUT_MS),   // Yahoo keeps ~2y of 1h; 59d is plenty
    withTimeout(fetchUsInterval(symbol, '1wk', 5 * 365), TF_TIMEOUT_MS),
  ]);
  const data = {
    '1h': hourly && hourly.length ? hourly : null,
    '4h': hourly && hourly.length ? aggregateCandles(hourly, 4) : null,
    '1wk': weekly && weekly.length ? weekly : null,
  };
  if (!data['1h'] && !data['1wk']) data.reason = 'Weekly and intraday data couldn’t be loaded right now.';
  else tfCache.set(symbol, { at: Date.now(), data });
  return data;
}
