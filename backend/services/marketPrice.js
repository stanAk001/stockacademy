// ============================================================
// marketPrice.js — THE single source of truth for "what is this worth now?"
//
// Before this, several endpoints fetched prices independently and one fell back
// to a hardcoded mockPrices table with random jitter. That's why the simulator
// showed AAPL at ~$178 while the chart and key-facts showed ~$333: users were
// paper-trading against invented numbers.
//
// Rules this module enforces:
//   1. ONE fetch path per market. Everything quotes through getQuote().
//   2. NEVER invent a price. If we can't get one, return null and let the UI say
//      so. A wrong price next to a "Buy for real" button is unacceptable.
//   3. Every quote carries `source` and `asOf` so the UI can show its age.
//   4. Fresh quotes are written back to stocks.last_price / day_change_pct, so
//      rankings, analysis and compare (which read the table) show the SAME
//      number as the live pages. That's what makes prices tally everywhere.
//
//   US  → Finnhub /quote, cached 60s per symbol.
//   NGX → NGX Pulse /stocks, ONE call returns 150+ equities, cached 15 min.
//         (Free tier = 100 calls/day, so ~30/day at this cadence.)
// ============================================================
import axios from 'axios';
import db from '../config/db.js';

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || '';
const NGX_KEY = process.env.NGX_PULSE_API_KEY || '';
const NGX_BASE = process.env.NGX_PULSE_BASE || 'https://ngxpulse.ng/api/ngxdata';

const US_TTL_MS = 60_000;          // a minute is plenty for a learning platform
const NGX_TTL_MS = 15 * 60_000;    // 15 min keeps us well inside the free tier

const usCache = new Map();         // symbol -> { quote, at }
let ngxCache = { bySymbol: null, at: 0, failedAt: 0 };

const num = (v) => {
  const n = typeof v === 'string' ? parseFloat(v.replace(/,/g, '')) : Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ---------------- US: Finnhub ---------------- */
async function fetchUsQuote(symbol) {
  if (!FINNHUB_KEY) return null;
  try {
    const { data } = await axios.get('https://finnhub.io/api/v1/quote', {
      params: { symbol, token: FINNHUB_KEY },
      timeout: 8000,
    });
    // Finnhub returns c=0 for unknown tickers — that's "no data", not a price.
    const price = num(data?.c);
    if (!price) return null;
    return {
      symbol,
      price,
      change: num(data.d),
      changePercent: num(data.dp),
      high: num(data.h),
      low: num(data.l),
      open: num(data.o),
      prevClose: num(data.pc),
      currency: 'USD',
      source: 'finnhub',
      asOf: new Date().toISOString(),
    };
  } catch (e) {
    // Loud on purpose. The old code swallowed this and served a fake price.
    console.warn(`[price] Finnhub failed for ${symbol}:`, e.response?.status || e.message);
    return null;
  }
}

/* ---------------- NGX: NGX Pulse ---------------- */
// One call returns every listed equity, so we cache the whole map.
async function loadNgxAll() {
  const fresh = ngxCache.bySymbol && Date.now() - ngxCache.at < NGX_TTL_MS;
  if (fresh) return ngxCache.bySymbol;
  if (!NGX_KEY) return null;
  // After a failure, wait a minute before hammering the API again.
  if (Date.now() - ngxCache.failedAt < 60_000) return ngxCache.bySymbol;

  try {
    const { data } = await axios.get(`${NGX_BASE}/stocks`, {
      headers: { 'X-API-Key': NGX_KEY },
      timeout: 12000,
    });

    // Be tolerant about the envelope: [...] | {data:[...]} | {stocks:[...]}
    const rows = Array.isArray(data) ? data
      : Array.isArray(data?.data) ? data.data
      : Array.isArray(data?.stocks) ? data.stocks
      : Array.isArray(data?.results) ? data.results : null;

    if (!rows) {
      console.warn('[price] NGX Pulse: unexpected shape, keys =', Object.keys(data || {}));
      ngxCache.failedAt = Date.now();
      return ngxCache.bySymbol;
    }

    // Confirmed NGX Pulse schema (verified against the live endpoint):
    //   symbol, name, current_price, previous_close, change_percent,
    //   official_change_percent, pct_change_7d, volume, market_cap,
    //   shares_outstanding, sector, market, trade_date
    // Aliases kept as a cushion in case they rename fields later.
    const bySymbol = new Map();
    for (const r of rows) {
      const sym = String(r.symbol ?? r.ticker ?? r.code ?? '').trim().toUpperCase();
      const price = num(r.current_price ?? r.price ?? r.last ?? r.close);
      if (!sym || !price) continue;
      const prevClose = num(r.previous_close ?? r.previousClose ?? r.prevClose);
      // market_cap comes through in raw naira; we store millions.
      const capRaw = num(r.market_cap ?? r.marketCap);
      bySymbol.set(sym, {
        symbol: sym,
        name: r.name || null,
        price,
        change: prevClose != null ? +(price - prevClose).toFixed(2) : null,
        changePercent: num(r.official_change_percent ?? r.change_percent ?? r.percentChange),
        prevClose,
        marketCapMillions: capRaw != null ? +(capRaw / 1_000_000).toFixed(2) : null,
        sharesOutstanding: num(r.shares_outstanding),
        sector: r.sector || null,
        volume: num(r.volume),
        tradeDate: r.trade_date || null,
        currency: 'NGN',
        source: 'ngxpulse',
        asOf: new Date().toISOString(),
      });
    }

    if (bySymbol.size === 0) {
      console.warn('[price] NGX Pulse returned rows but none parsed; sample =', JSON.stringify(rows[0] || {}).slice(0, 300));
      ngxCache.failedAt = Date.now();
      return ngxCache.bySymbol;
    }

    ngxCache = { bySymbol, at: Date.now(), failedAt: 0 };
    console.log(`[price] NGX Pulse: cached ${bySymbol.size} equities`);
    return bySymbol;
  } catch (e) {
    console.warn('[price] NGX Pulse failed:', e.response?.status || e.message);
    ngxCache.failedAt = Date.now();
    return ngxCache.bySymbol; // serve the last good map rather than nothing
  }
}

/* ---------------- public API ---------------- */
/**
 * Live quote for one stock. Returns null when we genuinely don't know —
 * callers should fall back to the stored price AND show how old it is.
 * @param {string} symbol   internal symbol ('AAPL' or 'NGX:DANGCEM')
 * @param {string} [country] 'US' | 'NG' (inferred from the symbol if omitted)
 */
export async function getQuote(symbol, country) {
  const raw = String(symbol || '').trim().toUpperCase();
  if (!raw) return null;

  const isNg = country === 'NG' || raw.startsWith('NGX:');
  const bare = raw.replace(/^NGX:/, '');

  if (isNg) {
    const all = await loadNgxAll();
    const q = all?.get(bare);
    return q ? { ...q, symbol: raw } : null;
  }

  const hit = usCache.get(raw);
  if (hit && Date.now() - hit.at < US_TTL_MS) return hit.quote;

  const quote = await fetchUsQuote(raw);
  if (quote) usCache.set(raw, { quote, at: Date.now() });
  return quote;
}

/**
 * Persist a fresh quote so the pages that read the stocks table (rankings,
 * analysis, compare) agree with the live pages. Best-effort: never throws.
 */
export async function persistQuote(symbol, quote) {
  if (!quote?.price) return;
  try {
    // COALESCE keeps existing values when the feed doesn't carry that field.
    // NGX Pulse gives real market cap + sector, which overwrite the earlier
    // AI estimates (those had Dangote's cap ~20x too low).
    await db.query(
      `UPDATE stocks
       SET last_price = $1,
           day_change_pct = COALESCE($2, day_change_pct),
           prev_close = COALESCE($3, prev_close),
           market_cap_millions = COALESCE($4, market_cap_millions),
           sector = COALESCE($5, sector),
           data_updated_at = NOW()
       WHERE UPPER(symbol) = $6 OR UPPER(display_symbol) = $6`,
      [
        quote.price,
        quote.changePercent,
        quote.prevClose,
        quote.marketCapMillions ?? null,
        quote.sector ?? null,
        String(symbol).toUpperCase(),
      ]
    );
  } catch (e) {
    console.warn('[price] persist failed for', symbol, e.message);
  }
}

/**
 * Recompute P/E and dividend yield from the CURRENT price.
 *
 * These are arithmetic, not facts to be stored:
 *     P/E   = last_price / eps
 *     yield = dividend_per_share / last_price
 *
 * EPS and dividend-per-share come from published company results (entered once
 * or twice a year in the admin). The price changes daily, so deriving the ratio
 * on every price update keeps it correct forever — a stored ratio is wrong the
 * moment the price moves.
 *
 * NGX: always derived (no other source exists).
 * US:  only fills gaps — Finnhub's own ratios stay authoritative.
 *
 * @param {string} [symbol] limit to one stock; omit to do all.
 */
export async function recomputeRatios(symbol) {
  const params = [];
  let scope = '';
  if (symbol) {
    params.push(String(symbol).toUpperCase());
    scope = ` AND (UPPER(symbol) = $1 OR UPPER(display_symbol) = $1)`;
  }
  try {
    const { rowCount } = await db.query(
      `UPDATE stocks SET
         pe_ratio = CASE
           WHEN eps IS NOT NULL AND eps > 0 AND last_price IS NOT NULL
                AND (country = 'NG' OR pe_ratio IS NULL)
           THEN ROUND((last_price / eps)::numeric, 2)
           ELSE pe_ratio END,
         dividend_yield = CASE
           WHEN dividend_per_share IS NOT NULL AND last_price IS NOT NULL AND last_price > 0
                AND (country = 'NG' OR dividend_yield IS NULL)
           THEN ROUND((dividend_per_share / last_price)::numeric, 4)
           ELSE dividend_yield END
       WHERE is_active = TRUE${scope}`,
      params
    );
    return { ok: true, rows: rowCount };
  } catch (e) {
    console.warn('[price] recomputeRatios failed:', e.message);
    return { ok: false, error: e.message };
  }
}

/** Quote + write-back in one step — what the API endpoints should call. */
export async function getQuoteAndPersist(symbol, country) {
  const quote = await getQuote(symbol, country);
  if (quote) {
    // Price moved → the derived ratios must move with it.
    persistQuote(symbol, quote)
      .then(() => recomputeRatios(symbol))
      .catch(() => {});
  }
  return quote;
}

/* ---------------- NGX history → real returns & risk ----------------
 * /prices/:symbol IS on the free tier (unlike /fundamentals, which needs the
 * paid Starter plan). It returns daily closes back to 2017, so returns,
 * volatility and drawdown can be COMPUTED from real trades instead of guessed.
 * ------------------------------------------------------------------ */
export async function fetchNgxHistory(displaySymbol, days = 400) {
  if (!NGX_KEY) return null;
  try {
    const { data } = await axios.get(`${NGX_BASE}/prices/${encodeURIComponent(displaySymbol)}`, {
      headers: { 'X-API-Key': NGX_KEY },
      params: { days },
      timeout: 15000,
    });
    const rows = Array.isArray(data) ? data : data?.prices || data?.data || [];
    return rows
      .map((r) => ({ date: r.trade_date, close: num(r.close_price ?? r.close) }))
      .filter((r) => r.date && r.close)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  } catch (e) {
    console.warn(`[price] NGX history failed for ${displaySymbol}:`, e.response?.status || e.message);
    return null;
  }
}

/** Returns / volatility / drawdown from a daily close series. */
export function metricsFromCloses(series) {
  const closes = series.map((s) => s.close);
  if (closes.length < 30) return {};
  const last = closes[closes.length - 1];

  // NGX trades ~250 days/year; index back by trading days, not calendar days.
  const at = (back) => {
    const i = closes.length - 1 - back;
    return i >= 0 ? (last - closes[i]) / closes[i] : null;
  };

  const rets = [];
  for (let i = 1; i < closes.length; i++) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  const vol1y = Math.sqrt(variance) * Math.sqrt(252);

  const last30 = rets.slice(-30);
  let vol30 = null;
  if (last30.length >= 20) {
    const m30 = last30.reduce((a, b) => a + b, 0) / last30.length;
    const v30 = last30.reduce((a, b) => a + (b - m30) ** 2, 0) / last30.length;
    vol30 = Math.sqrt(v30) * Math.sqrt(252);
  }

  let peak = closes[0];
  let drawdown = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    drawdown = Math.min(drawdown, (c - peak) / peak);
  }

  return {
    return_1m: at(21),
    return_3m: at(63),
    return_6m: at(126),
    return_1y: at(252),
    volatility_1y: vol1y,
    volatility_30d: vol30,
    max_drawdown_1y: drawdown,
    high_52w: Math.max(...closes.slice(-252)),
    low_52w: Math.min(...closes.slice(-252)),
  };
}

/**
 * Compute real returns/risk for every NGX stock from price history.
 * One call per stock, so this is a daily job — not a per-request path.
 */
export async function refreshNgxHistoryMetrics({ limit = 40 } = {}) {
  if (!NGX_KEY) return { ok: false, reason: 'no_api_key', updated: 0 };

  const { rows } = await db.query(
    `SELECT symbol, display_symbol FROM stocks
     WHERE country = 'NG' AND is_active = TRUE ORDER BY display_symbol LIMIT $1`,
    [limit]
  );

  let updated = 0;
  const failed = [];
  for (const r of rows) {
    const hist = await fetchNgxHistory(r.display_symbol);
    if (!hist || hist.length < 30) { failed.push(r.display_symbol); continue; }

    const m = metricsFromCloses(hist);
    const cols = Object.entries(m).filter(([, v]) => v !== null && v !== undefined && Number.isFinite(v));
    if (!cols.length) { failed.push(r.display_symbol); continue; }

    const setSql = cols.map(([k], i) => `${k} = $${i + 1}`).join(', ');
    await db.query(
      `UPDATE stocks SET ${setSql}, data_updated_at = NOW() WHERE symbol = $${cols.length + 1}`,
      [...cols.map(([, v]) => v), r.symbol]
    );
    updated++;
    await new Promise((res) => setTimeout(res, 7000)); // free tier: 10 req/min
  }
  return { ok: true, updated, total: rows.length, failed };
}

/**
 * Refresh every tracked US price from Finnhub.
 *
 * Nearly every page (rankings, compare, watchlist, ticker, market lists, sector
 * peers) reads stocks.last_price rather than calling an API itself. So keeping
 * THIS column fresh is what makes the whole platform current at once — far
 * cheaper than making each page fetch on its own.
 *
 * Finnhub's free tier allows ~60 calls/min; ~25 symbols at 250ms apart is ~4
 * calls/sec worst case, comfortably inside it.
 */
export async function refreshAllUsPrices() {
  if (!FINNHUB_KEY) return { ok: false, reason: 'no_api_key', updated: 0 };

  const { rows } = await db.query(
    `SELECT symbol FROM stocks WHERE country = 'US' AND is_active = TRUE ORDER BY symbol`
  );

  let updated = 0;
  for (const { symbol } of rows) {
    const q = await fetchUsQuote(symbol);
    if (q) { await persistQuote(symbol, q); updated++; }
    await new Promise((r) => setTimeout(r, 250));
  }
  await recomputeRatios();
  return { ok: true, updated, total: rows.length };
}

/** Refresh every NGX price we track from one API call. */
export async function refreshAllNgxPrices() {
  const all = await loadNgxAll();
  if (!all) return { ok: false, reason: NGX_KEY ? 'fetch_failed' : 'no_api_key', updated: 0 };

  const { rows } = await db.query(
    `SELECT symbol, display_symbol FROM stocks WHERE country = 'NG' AND is_active = TRUE`
  );
  let updated = 0;
  for (const r of rows) {
    const q = all.get(String(r.display_symbol || '').toUpperCase());
    if (!q) continue;
    await persistQuote(r.symbol, q);
    updated++;
  }
  // Prices changed, so P/E and yield are recomputed for everything at once.
  await recomputeRatios();
  return { ok: true, updated, total: rows.length, available: all.size };
}

export const isNgxConfigured = () => Boolean(NGX_KEY);

/**
 * The whole NGX board as a Map(SYMBOL → quote), straight from the cached feed.
 * Exposed so the listings importer can read every symbol the exchange returns,
 * not just the ones we already store. Null when NGX isn't configured/reachable.
 */
export const ngxBoard = () => loadNgxAll();
