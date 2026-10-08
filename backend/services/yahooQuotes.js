// ============================================================
// yahooQuotes.js — bulk US prices from Yahoo, 100 symbols per request.
//
// Finnhub's free plan allows 60 calls/minute, one symbol per call. With ~1,000
// US stocks a per-symbol refresh can never keep up, and it would burn the
// budget the stock pages and search depend on. Yahoo's quote endpoint takes a
// list, so the whole universe costs ~10 requests and a few seconds.
//
// Deliberately dependency-free (only yahoo-finance2) so any price service can
// import it without creating an import cycle.
// ============================================================
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const BATCH = 100;

// We store share classes the way Finnhub and users write them (BRK.B); Yahoo
// only knows the dash form (BRK-B). Every Yahoo call goes through this.
export const toYahooSymbol = (symbol) => String(symbol || '').replace(/\./g, '-');

/**
 * Latest quotes for many US symbols.
 * @param {string[]} symbols  stored symbols (e.g. 'AAPL', 'BRK.B')
 * @returns {Promise<Map<string, {price:number, changePercent:number|null, prevClose:number|null}>>}
 *          keyed by the stored symbol; symbols Yahoo didn't price are absent.
 */
export async function yahooBatchQuotes(symbols) {
  const out = new Map();
  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH);
    const back = new Map(batch.map((s) => [toYahooSymbol(s), s]));
    try {
      const res = await yf.quote(
        [...back.keys()],
        { fields: ['symbol', 'regularMarketPrice', 'regularMarketChangePercent', 'regularMarketPreviousClose'] },
        { validateResult: false }
      );
      for (const q of Array.isArray(res) ? res : Object.values(res || {})) {
        const ours = back.get(q?.symbol);
        const price = Number(q?.regularMarketPrice);
        if (!ours || !(price > 0)) continue;
        out.set(ours, {
          price,
          // Already in percent units (-0.14 means -0.14%), same as Finnhub's dp.
          changePercent: Number.isFinite(q.regularMarketChangePercent) ? q.regularMarketChangePercent : null,
          prevClose: Number(q.regularMarketPreviousClose) > 0 ? q.regularMarketPreviousClose : null,
        });
      }
    } catch (e) {
      console.warn(`[yahoo] quote batch ${i / BATCH + 1} failed:`, e.message);
    }
  }
  return out;
}
