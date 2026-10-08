// ============================================================
// usStocks.js — the US half of the stock catalogue.
//
// Two jobs:
//   1. importUsUniverse() — put the curated universe (data/us-universe.json:
//      S&P 500 + Nasdaq-100 + S&P MidCap 400) into the stocks table, so the
//      Scout, Radar and Rankings have a real market to work with instead of 25
//      hand-picked names. Liquid enough to swing-trade, established enough to
//      hold — the platform's two use cases.
//   2. normalizeExchange() / sectorFromIndustry() — clean what Finnhub sends
//      when a member opens a stock we don't carry yet. Finnhub's exchange string
//      ("NEW YORK STOCK EXCHANGE, INC.") is longer than the column allows, which
//      used to make every on-demand insert fail and the stock show "not found".
//
// Same rules as the NGX importer: upsert only, never overwrite a good value with
// a blank one, never flip is_active (deactivating is an admin decision).
// ============================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/db.js';

const UNIVERSE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'us-universe.json');

// stocks.exchange is VARCHAR(20).
export function normalizeExchange(raw) {
  const s = String(raw || '').toUpperCase();
  if (s.includes('NASDAQ')) return 'NASDAQ';
  if (s.includes('ARCA')) return 'NYSE Arca';
  if (s.includes('AMERICAN') || s === 'AMEX') return 'NYSE American';
  if (s.includes('NEW YORK') || s.startsWith('NYSE')) return 'NYSE';
  if (s.includes('CBOE') || s.includes('BATS')) return 'Cboe';
  return 'US';
}

// Finnhub's industry labels → the sector vocabulary the rest of the platform
// uses. The investing profile builds its sector chips from stocks.sector, so an
// unmapped label would appear there as a stray extra choice.
const INDUSTRY_TO_SECTOR = [
  [/semiconductor|software|technology|it services|electronic|computer|internet/, 'Technology'],
  [/bank|financ|insurance|capital markets|consumer finance|thrift|mortgage/, 'Financial'],
  [/pharma|biotech|health|medical|life sciences/, 'Healthcare'],
  [/media|telecom|communication|entertainment|interactive/, 'Communication'],
  [/oil|gas|energy|coal/, 'Energy'],
  [/utilit/, 'Utilities'],
  [/real estate|reit/, 'Real Estate'],
  [/chemical|metal|mining|steel|paper|forest|packaging|construction materials/, 'Materials'],
  [/beverage|food|tobacco|household|personal products|staples/, 'Consumer Staples'],
  [/retail|automobile|auto |hotel|restaurant|leisure|apparel|textile|luxury|consumer products|diversified consumer|distributor/, 'Consumer Discretionary'],
  [/aerospace|defense|airline|machinery|industrial|electrical|building|construction|logistic|transport|road|rail|marine|commercial services|professional services|trading companies/, 'Industrial'],
];

export function sectorFromIndustry(industry) {
  const s = String(industry || '').toLowerCase();
  if (!s) return null;
  for (const [re, sector] of INDUSTRY_TO_SECTOR) if (re.test(s)) return sector;
  return null;
}

export function loadUniverse(file = UNIVERSE_FILE) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(data) ? data : data.stocks || [];
}

const clip = (v, max) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
};

/**
 * Import the curated US universe. No external calls — prices, fundamentals and
 * technicals are filled by the scheduled jobs (new rows are processed first).
 * @param {object} [opts]
 * @param {boolean} [opts.dryRun=false]
 * @param {Array}   [opts.universe]  override the list (tests)
 */
export async function importUsUniverse({ dryRun = false, universe } = {}) {
  const list = universe || loadUniverse();
  if (!list.length) return { ok: false, reason: 'empty_universe', added: 0, updated: 0, skipped: 0, total: 0 };

  const { rows } = await db.query(`SELECT symbol FROM stocks WHERE country = 'US'`);
  const existing = new Set(rows.map((r) => String(r.symbol).toUpperCase()));

  let added = 0;
  let updated = 0;
  let skipped = 0;
  const samples = [];

  for (const u of list) {
    const symbol = String(u.symbol || '').trim().toUpperCase();
    // A ticker is never truncated to fit: a shortened ticker is a different stock.
    if (!symbol || symbol.length > 20 || !/^[A-Z][A-Z0-9.\-]*$/.test(symbol)) { skipped++; continue; }
    const isNew = !existing.has(symbol);

    if (dryRun) {
      if (isNew) { added++; if (samples.length < 15) samples.push(symbol); } else updated++;
      continue;
    }

    try {
      await db.query(
        `INSERT INTO stocks (symbol, display_symbol, name, exchange, country, currency, sector, industry, is_active)
         VALUES ($1, $1, $2, $3, 'US', 'USD', $4, $5, TRUE)
         ON CONFLICT (symbol) DO UPDATE
           SET sector   = COALESCE(stocks.sector, EXCLUDED.sector),
               industry = COALESCE(stocks.industry, EXCLUDED.industry)`,
        [
          symbol,
          clip(u.name, 200) || symbol,
          clip(normalizeExchange(u.exchange), 20),
          clip(u.sector, 100),
          clip(u.industry, 100),
        ]
      );
      if (isNew) { added++; if (samples.length < 15) samples.push(symbol); } else updated++;
    } catch (e) {
      skipped++;
      console.warn(`[usImport] ${symbol} skipped: ${e.message}`);
    }
  }

  return { ok: true, added, updated, skipped, total: list.length, samples };
}
