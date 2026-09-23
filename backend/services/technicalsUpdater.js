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

async function refreshOne(row) {
  const candles = await fetchDailyCandles(row.symbol, row.country, row.display_symbol);
  if (!candles || candles.length < 30) return { symbol: row.symbol, ok: false, reason: 'no_history' };
  const analysis = analyzeCandles(candles);
  if (!analysis.technicals.ok) return { symbol: row.symbol, ok: false, reason: analysis.technicals.reason };
  await upsertTechnicals(row.symbol, analysis);
  return { symbol: row.symbol, ok: true, setup: analysis.setup, score: analysis.quality.score };
}

/**
 * Refresh technicals for tracked stocks.
 * @param {object}  opts
 * @param {string=} opts.country  'US' | 'NG' — omit for both
 * @param {number=} opts.limit    cap symbols processed (default all active)
 * @param {number=} opts.usDelay  ms between US fetches (default 300)
 * @param {number=} opts.ngDelay  ms between NGX fetches (default 6500 — free tier)
 */
export async function refreshTechnicals({ country, limit, usDelay = 300, ngDelay = 6500 } = {}) {
  const params = [];
  let where = 'WHERE is_active = TRUE';
  if (country) { params.push(country); where += ` AND country = $${params.length}`; }
  let sql = `SELECT symbol, display_symbol, country FROM stocks ${where} ORDER BY country, symbol`;
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
}
