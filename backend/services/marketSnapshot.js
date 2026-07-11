// ============================================================
// marketSnapshot.js — refresh live price + day change into the stocks table.
//
// refreshFundamentals() (Finnhub /stock/metric) fills ratios but NOT the daily
// price/percent move. The daily recap's "top movers", the Compare price cards,
// and the Stock Detail header all read stocks.last_price / day_change_pct — so
// we top those up here from Finnhub /quote for US tickers.
// ============================================================
import axios from 'axios';
import db from '../config/db.js';

const KEY = process.env.FINNHUB_API_KEY || '';
const BASE = 'https://finnhub.io/api/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function refreshUsSnapshots() {
  if (!KEY) return { ok: false, reason: 'no_finnhub', updated: 0 };

  const { rows } = await db.query(
    `SELECT symbol FROM stocks WHERE country = 'US' AND is_active = TRUE ORDER BY symbol`
  );

  let updated = 0;
  for (const { symbol } of rows) {
    try {
      const { data } = await axios.get(`${BASE}/quote`, {
        params: { symbol, token: KEY }, timeout: 6000,
      });
      // Finnhub /quote: c=current, dp=percent change, pc=prev close.
      if (data && Number(data.c) > 0) {
        await db.query(
          `UPDATE stocks
           SET last_price = $1, day_change_pct = $2, prev_close = $3, data_updated_at = NOW()
           WHERE symbol = $4`,
          [data.c, data.dp ?? null, data.pc ?? null, symbol]
        );
        updated++;
      }
    } catch (e) {
      console.warn(`[snapshot] ${symbol} quote failed:`, e.message);
    }
    await sleep(250); // stay under Finnhub's free 60/min
  }

  console.log(`[snapshot] Updated ${updated}/${rows.length} US price snapshots`);
  return { ok: true, updated, total: rows.length };
}
