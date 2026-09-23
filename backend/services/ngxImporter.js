// ============================================================
// ngxImporter.js — put EVERY listed NGX equity in the stocks table.
//
// One NGX Pulse call returns the entire board, so full coverage costs nothing
// extra: we were already fetching all of it and using only the handful of rows
// we happened to store. This upserts the rest, so a member searching any
// Nigerian ticker finds a real stock page instead of a dead end.
//
// Rules it follows:
//   • never overwrite a good value with a blank one (the feed omits fields)
//   • never flip is_active on an existing row — deactivating is an admin call
//   • skip anything that can't be a ticker, and anything too long for the column
// Safe to run repeatedly; it is a pure upsert.
// ============================================================
import db from '../config/db.js';
import { ngxBoard, recomputeRatios, persistQuote } from './marketPrice.js';

// symbol VARCHAR(20) holds 'NGX:' + ticker, so the ticker itself gets 16.
const MAX_TICKER = 16;
const TICKER_RE = /^[A-Z0-9][A-Z0-9.\-]*$/;

// Names and sectors may be trimmed to fit their column. A TICKER may not —
// a truncated ticker is a different, wrong stock — so that is validated below.
const clean = (v, max) => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
};

/**
 * Import every symbol on the NGX board.
 * @param {object} [opts]
 * @param {boolean} [opts.dryRun=false]  report what would change, write nothing
 * @param {boolean} [opts.withPrices=true] also persist the price that came with the feed
 * @returns {Promise<{ok:boolean, added:number, updated:number, skipped:number, total:number, reason?:string, samples?:string[]}>}
 */
export async function importNgxListings({ dryRun = false, withPrices = true } = {}) {
  const board = await ngxBoard();
  if (!board || board.size === 0) {
    return { ok: false, reason: 'ngx_feed_unavailable', added: 0, updated: 0, skipped: 0, total: 0 };
  }

  const { rows: existingRows } = await db.query(
    `SELECT display_symbol FROM stocks WHERE country = 'NG'`
  );
  const existing = new Set(existingRows.map((r) => String(r.display_symbol || '').toUpperCase()));

  let added = 0;
  let updated = 0;
  let skipped = 0;
  const samples = [];

  for (const [rawSym, q] of board) {
    const ticker = String(rawSym ?? '').trim().toUpperCase();
    if (!ticker || ticker.length > MAX_TICKER || !TICKER_RE.test(ticker)) { skipped++; continue; }

    const symbol = `NGX:${ticker}`;
    const name = clean(q.name, 200) || ticker;   // name is NOT NULL
    const sector = clean(q.sector, 100);
    const isNew = !existing.has(ticker);

    if (dryRun) {
      if (isNew) { added++; if (samples.length < 12) samples.push(ticker); } else { updated++; }
      continue;
    }

    try {
      // COALESCE on update: the feed dropping a field must not wipe what we have.
      await db.query(
        `INSERT INTO stocks (symbol, display_symbol, name, exchange, country, currency, sector, is_active)
         VALUES ($1, $2, $3, 'NGX', 'NG', 'NGN', $4, TRUE)
         ON CONFLICT (symbol) DO UPDATE
           SET name   = COALESCE(NULLIF(EXCLUDED.name, ''), stocks.name),
               sector = COALESCE(EXCLUDED.sector, stocks.sector)`,
        [symbol, ticker, name, sector]
      );
      if (isNew) { added++; if (samples.length < 12) samples.push(ticker); } else { updated++; }

      // The quote is already in hand — store it so the stock is usable at once.
      if (withPrices && q.price) {
        await persistQuote(symbol, q).catch(() => {});
      }
    } catch (e) {
      skipped++;
      console.warn(`[ngxImport] ${ticker} skipped: ${e.message}`);
    }
  }

  if (!dryRun && (added || updated)) {
    await recomputeRatios().catch(() => {});
  }

  return { ok: true, added, updated, skipped, total: board.size, samples };
}
