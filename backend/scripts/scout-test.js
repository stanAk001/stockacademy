// Verify the Scout candidate screens return rows per market (esp. NGX fallback).
import 'dotenv/config';
import db from '../config/db.js';

const CANDIDATE_LIMIT = 8;
async function swing(market) {
  const params = []; let mf = '';
  if (market) { params.push(market); mf = `AND s.country = $${params.length}`; }
  const { rows } = await db.query(
    `SELECT s.display_symbol, s.country, s.last_price, s.day_change_pct, t.setup, t.quality_score
       FROM stocks s LEFT JOIN stock_technicals t ON t.symbol = s.symbol
      WHERE s.is_active = TRUE AND s.last_price IS NOT NULL ${mf}
      ORDER BY (CASE WHEN t.setup IS NOT NULL AND t.setup <> 'none' THEN 1 ELSE 0 END) DESC,
               t.quality_score DESC NULLS LAST, ABS(COALESCE(s.day_change_pct,0)) DESC, s.return_1y DESC NULLS LAST
      LIMIT ${CANDIDATE_LIMIT}`, params);
  return rows;
}

for (const [label, m] of [['ALL', null], ['US', 'US'], ['NG', 'NG']]) {
  const rows = await swing(m);
  console.log(`\nswing · market=${label}: ${rows.length} candidates`);
  for (const r of rows) console.log(`  ${r.display_symbol.padEnd(12)} ${r.country}  ${r.last_price}  Δ${r.day_change_pct ?? '—'}  setup=${r.setup ?? '—'} q=${r.quality_score ?? '—'}`);
}
process.exit(0);
