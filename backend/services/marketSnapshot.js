// ============================================================
// marketSnapshot.js — refresh live price + day change into the stocks table.
//
// refreshFundamentals() (Finnhub /stock/metric) fills ratios but NOT the daily
// price/percent move. The daily recap's "top movers", the Compare price cards,
// and the Stock Detail header all read stocks.last_price / day_change_pct — so
// we top those up here for every active US ticker.
//
// Source order, chosen for ~1,000 stocks:
//   1. Yahoo batch quotes (services/yahooQuotes.js) — the whole universe in
//      ~10 requests and a few seconds.
//   2. Finnhub /quote for anything Yahoo didn't return, one symbol at a time,
//      paced to stay inside the free plan's 60 calls/minute and capped.
// ============================================================
import axios from 'axios';
import db from '../config/db.js';
import { yahooBatchQuotes } from './yahooQuotes.js';

const KEY = process.env.FINNHUB_API_KEY || '';
const BASE = 'https://finnhub.io/api/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FINNHUB_PACE_MS = 1100;    // ≤ 55/min, under the free plan's 60
const FINNHUB_FALLBACK_MAX = 60; // a bad Yahoo day shouldn't become a 15-minute crawl

async function savePrice(symbol, price, changePct, prevClose) {
  await db.query(
    `UPDATE stocks
       SET last_price = $1, day_change_pct = $2, prev_close = $3, data_updated_at = NOW()
     WHERE symbol = $4`,
    [price, changePct ?? null, prevClose ?? null, symbol]
  );
}

export async function refreshUsSnapshots() {
  const { rows } = await db.query(
    `SELECT symbol FROM stocks WHERE country = 'US' AND is_active = TRUE ORDER BY symbol`
  );
  const symbols = rows.map((r) => r.symbol);

  let updated = 0;
  const yahoo = await yahooBatchQuotes(symbols);
  for (const [symbol, q] of yahoo) {
    await savePrice(symbol, q.price, q.changePercent, q.prevClose);
    updated++;
  }

  const missing = symbols.filter((s) => !yahoo.has(s));
  let viaFinnhub = 0;
  if (KEY && missing.length) {
    for (const symbol of missing.slice(0, FINNHUB_FALLBACK_MAX)) {
      try {
        const { data } = await axios.get(`${BASE}/quote`, { params: { symbol, token: KEY }, timeout: 6000 });
        // Finnhub /quote: c=current, dp=percent change, pc=prev close.
        if (data && Number(data.c) > 0) {
          await savePrice(symbol, data.c, data.dp, data.pc);
          updated++;
          viaFinnhub++;
        }
      } catch (e) {
        console.warn(`[snapshot] ${symbol} quote failed:`, e.message);
      }
      await sleep(FINNHUB_PACE_MS);
    }
  }

  console.log(`[snapshot] Updated ${updated}/${rows.length} US price snapshots (${viaFinnhub} via Finnhub)`);
  return { ok: true, updated, total: rows.length, via_finnhub: viaFinnhub, unpriced: missing.length - viaFinnhub };
}
