// Import every listed NGX equity into the stocks table.
//
//   node scripts/import-ngx.js --dry-run    see what would change
//   node scripts/import-ngx.js              write it
//
// Safe to re-run: it upserts, never deletes, and never deactivates a stock.
import 'dotenv/config';
import { importNgxListings } from '../services/ngxImporter.js';

const dryRun = process.argv.includes('--dry-run');

const r = await importNgxListings({ dryRun });

if (!r.ok) {
  console.error(`NGX import failed: ${r.reason}`);
  console.error('Check NGX_PULSE_API_KEY is set and the feed is reachable.');
  process.exit(1);
}

console.log(dryRun ? '— dry run, nothing written —' : '— import complete —');
console.log(`on the board : ${r.total}`);
console.log(`new stocks   : ${r.added}`);
console.log(`already had  : ${r.updated}`);
console.log(`skipped      : ${r.skipped}`);
if (r.samples?.length) console.log(`new tickers  : ${r.samples.join(', ')}${r.added > r.samples.length ? ' …' : ''}`);
process.exit(0);
