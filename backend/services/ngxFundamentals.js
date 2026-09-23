// ============================================================
// ngxFundamentals.js — reference fundamentals for NGX stocks via the AI.
//
// The NGX has no free live fundamentals feed (Finnhub/Yahoo don't cover it), so
// the discovery rankings for Nigeria come up empty. This asks the AI for the
// STABLE, published per-share figures (shares outstanding, EPS, dividend/share,
// sector) and then computes market cap / P/E / dividend yield against OUR real
// stored price — so the ratios lean on a real number, not a guess. A rough
// 1-year price return is included too (the AI's weakest field; the UI labels all
// NGX values as reference estimates). Re-runnable from the admin panel.
// ============================================================
import db from '../config/db.js';
import { analyzeWithAI, parseJsonFromAI } from './aiProvider.js';

const num = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v));

export async function populateNgxFundamentals() {
  const { rows } = await db.query(
    `SELECT symbol, display_symbol, name, sector, last_price
     FROM stocks WHERE country = 'NG' AND is_active = TRUE ORDER BY display_symbol`
  );
  if (rows.length === 0) return { ok: true, updated: 0, note: 'no NGX stocks' };

  const list = rows
    .map((r) => `${r.display_symbol} — ${r.name}${r.last_price != null ? ` (price ₦${r.last_price})` : ''}`)
    .join('\n');

  const system =
    `You are a Nigerian equities (NGX) data assistant. For each listed company given, return your best ` +
    `estimate of its fundamentals from your knowledge of its most recent full-year financial statements. ` +
    `All monetary figures in NAIRA. Respond with ONLY a JSON array (no markdown fences), one object per ` +
    `company, EXACTLY this shape: [{"symbol": string (the ticker exactly as given), "sector": string, ` +
    `"shares_out_millions": number|null, "eps_naira": number|null, "dps_naira": number|null, ` +
    `"return_1y_pct": number|null}]. Definitions: shares_out_millions = total shares outstanding in ` +
    `millions; eps_naira = most recent full-year earnings per share; dps_naira = most recent annual ` +
    `dividend per share (0 if the company pays none); return_1y_pct = approximate share-price change over ` +
    `the last ~12 months, in percent. If you are not reasonably confident about a field, use null rather ` +
    `than guessing wildly. Only use the tickers provided; never invent companies.`;

  const result = await analyzeWithAI(system, `NGX companies:\n${list}`, { maxTokens: 3500, timeoutMs: 60000 });

  let arr;
  try { arr = parseJsonFromAI(result.text); } catch { return { ok: false, error: 'parse' }; }
  if (!Array.isArray(arr)) return { ok: false, error: 'not_array' };

  const bySym = new Map(arr.map((o) => [String(o.symbol || '').toUpperCase(), o]));
  let updated = 0;
  const failures = [];

  for (const r of rows) {
    const o = bySym.get(r.display_symbol.toUpperCase()) || bySym.get(r.symbol.toUpperCase());
    if (!o) { failures.push(r.display_symbol); continue; }

    const price = num(r.last_price);
    const shares = num(o.shares_out_millions);
    const eps = num(o.eps_naira);
    const dps = num(o.dps_naira);
    const ret = num(o.return_1y_pct);

    // Column names are a fixed allow-list, never user input.
    const set = {};
    if (o.sector && !r.sector) set.sector = String(o.sector).slice(0, 80);
    if (shares && price) set.market_cap_millions = +(shares * price).toFixed(2);
    if (eps && eps > 0 && price) set.pe_ratio = +(price / eps).toFixed(2);
    if (dps != null && price) set.dividend_yield = +(dps / price).toFixed(4);
    if (eps != null) set.eps = eps;
    if (ret != null) set.return_1y = +(ret / 100).toFixed(4);

    const keys = Object.keys(set);
    if (keys.length === 0) { failures.push(r.display_symbol); continue; }

    const clauses = keys.map((k, i) => `${k} = $${i + 1}`);
    const values = keys.map((k) => set[k]);
    values.push(r.symbol);
    await db.query(
      `UPDATE stocks SET ${clauses.join(', ')}, data_updated_at = NOW() WHERE symbol = $${values.length}`,
      values
    );
    updated++;
  }

  return { ok: true, updated, total: rows.length, unmatched: failures };
}
