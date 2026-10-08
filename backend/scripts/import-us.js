// Add the curated US universe (S&P 500 + Nasdaq-100 + S&P MidCap 400) to the
// stocks table, and optionally fill in their data straight away.
//
//   node scripts/import-us.js --dry-run   see what would change, write nothing
//   node scripts/import-us.js             add the stocks (the daily jobs fill data)
//   node scripts/import-us.js --enrich    add them AND fill prices, technicals and
//                                         fundamentals now (~45 min, safe to stop
//                                         and re-run — it resumes where it left off)
//
// Safe to re-run: upsert only, never deletes or deactivates a stock.
// NOTE: backend/.env points at the LIVE database.
import 'dotenv/config';
import { importUsUniverse } from '../services/usStocks.js';
import { refreshTechnicals } from '../services/technicalsUpdater.js';
import { updateAllUSStocks } from '../services/stockFundamentalsUpdater.js';
import { recomputeRatios } from '../services/marketPrice.js';

const dryRun = process.argv.includes('--dry-run');
const enrich = process.argv.includes('--enrich');

const r = await importUsUniverse({ dryRun });
if (!r.ok) { console.error(`US import failed: ${r.reason}`); process.exit(1); }

console.log(dryRun ? '— dry run, nothing written —' : '— stocks added —');
console.log(`in the universe : ${r.total}`);
console.log(`new stocks      : ${r.added}`);
console.log(`already had     : ${r.updated}`);
console.log(`skipped         : ${r.skipped}`);
if (r.samples?.length) console.log(`new tickers     : ${r.samples.join(', ')}${r.added > r.samples.length ? ' …' : ''}`);

if (enrich && !dryRun) {
  console.log('\n— prices + technicals (stocks with none yet) —');
  const t = await refreshTechnicals({ country: 'US', onlyMissing: true });
  console.log(`technicals: ${t.updated}/${t.total}${t.failed?.length ? `, ${t.failed.length} failed: ${t.failed.slice(0, 8).join(', ')}` : ''}`);

  console.log('\n— fundamentals (stocks with none yet) —');
  const f = await updateAllUSStocks({ onlyMissing: true });
  console.log(`fundamentals: ${f.succeeded ?? 0}/${f.total ?? 0}${f.failed ? `, ${f.failed} failed` : ''}`);

  await recomputeRatios().catch(() => {});
}
process.exit(0);
