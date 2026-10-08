// ============================================================
// technicalsUpdater.js — recompute cached technicals for tracked stocks.
//
// The quant half of the intelligence funnel: pull each stock's daily candles,
// run the deterministic engine (services/indicators.js), and upsert the result
// into stock_technicals. The Scout/screener then filter on those rows and only
// the top candidates ever reach the AI. This is a SCHEDULED job, never a
// per-request path — it fetches external history one symbol at a time.
//
// Paced for the free tiers: NGX Pulse history is ~10 req/min, so NGX symbols are
// spaced out; US (Yahoo) is gentler but still throttled a little.
// ============================================================
import db from '../config/db.js';
import { fetchDailyCandles } from './priceHistory.js';
import { analyzeCandles } from './indicators.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function upsertTechnicals(symbol, a) {
  const t = a.technicals;
  await db.query(
    `INSERT INTO stock_technicals
       (symbol, trend, rsi14, quality_score, setup, has_ohlc, has_volume, bars,
        technicals, factors, setup_reason, computed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW())
     ON CONFLICT (symbol) DO UPDATE SET
        trend = EXCLUDED.trend, rsi14 = EXCLUDED.rsi14,
        quality_score = EXCLUDED.quality_score, setup = EXCLUDED.setup,
        has_ohlc = EXCLUDED.has_ohlc, has_volume = EXCLUDED.has_volume,
        bars = EXCLUDED.bars, technicals = EXCLUDED.technicals,
        factors = EXCLUDED.factors, setup_reason = EXCLUDED.setup_reason,
        computed_at = NOW()`,
    [
      symbol,
      t.trend ?? null,
      t.rsi14 ?? null,
      a.quality.score ?? null,
      a.setup,
      t.has_ohlc ?? false,
      t.has_volume ?? false,
      t.bars ?? null,
      JSON.stringify(t),
      JSON.stringify(a.quality.factors || []),
      a.setup_reason ?? null,
    ]
  );
}

// The candles we just fetched already carry the latest close. For US stocks we
// store it, so a newly added stock has a price — the Scout skips any stock
// without one — and the daily run never needs a separate quote call per stock.
// NGX prices are left alone: the NGX Pulse board is the better source there.
async function storeUsPriceFromCandles(symbol, candles) {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  if (!last?.close) return;
  const change = prev?.close ? +(((last.close - prev.close) / prev.close) * 100).toFixed(4) : null;
  await db.query(
    `UPDATE stocks SET last_price = $1, prev_close = $2, day_change_pct = $3, data_updated_at = NOW()
      WHERE symbol = $4`,
    [last.close, prev?.close ?? null, change, symbol]
  );
}

async function refreshOne(row) {
  const candles = await fetchDailyCandles(row.symbol, row.country, row.display_symbol);
  if (!candles || candles.length < 30) return { symbol: row.symbol, ok: false, reason: 'no_history' };
  if (row.country === 'US') await storeUsPriceFromCandles(row.symbol, candles);
  const analysis = analyzeCandles(candles);
  if (!analysis.technicals.ok) return { symbol: row.symbol, ok: false, reason: analysis.technicals.reason };
  await upsertTechnicals(row.symbol, analysis);
  return { symbol: row.symbol, ok: true, setup: analysis.setup, score: analysis.quality.score };
}

// Two schedules can trigger this (in-process cron + the external daily ping).
// A second concurrent run would just double the Yahoo traffic, so it's refused.
let running = false;
export const technicalsRunning = () => running;

/**
 * Refresh technicals for tracked stocks, stalest first.
 *
 * Stalest-first matters at this size (~1,000 stocks, ~15 min): newly added
 * stocks (never computed) go first, and a run cut short by a restart is simply
 * continued by the next one instead of redoing the top of the alphabet.
 *
 * @param {object}   opts
 * @param {string=}  opts.country      'US' | 'NG' — omit for both
 * @param {number=}  opts.limit        cap symbols processed (default all active)
 * @param {boolean=} opts.onlyMissing  only stocks with no technicals yet
 * @param {number=}  opts.usDelay      ms between US fetches (default 300)
 * @param {number=}  opts.ngDelay      ms between NGX fetches (default 6500 — free tier)
 */
export async function refreshTechnicals({ country, limit, onlyMissing = false, usDelay = 300, ngDelay = 6500 } = {}) {
  if (running) return { ok: false, reason: 'already_running', updated: 0, total: 0, failed: [] };
  running = true;
  try {
    const params = [];
    let where = 'WHERE s.is_active = TRUE';
    if (country) { params.push(country); where += ` AND s.country = $${params.length}`; }
    if (onlyMissing) where += ' AND t.symbol IS NULL';
    let sql = `SELECT s.symbol, s.display_symbol, s.country
                 FROM stocks s
                 LEFT JOIN stock_technicals t ON t.symbol = s.symbol
                 ${where}
                ORDER BY t.computed_at ASC NULLS FIRST, s.symbol`;
    if (limit) { params.push(limit); sql += ` LIMIT $${params.length}`; }

    const { rows } = await db.query(sql, params);
    let updated = 0;
    const failed = [];

    for (const row of rows) {
      try {
        const r = await refreshOne(row);
        if (r.ok) updated++; else failed.push(`${r.symbol}:${r.reason}`);
      } catch (e) {
        failed.push(`${row.symbol}:${e.message}`);
      }
      await sleep(row.country === 'NG' ? ngDelay : usDelay);
    }

    return { ok: true, updated, total: rows.length, failed };
  } finally {
    running = false;
  }
}
