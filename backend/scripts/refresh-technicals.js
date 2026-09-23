// One-off: compute technical indicators + setup scores for tracked stocks and
// fill the stock_technicals table (what the AI Scout / Radar / Swing screen on).
//
// This is normally run by the daily cron (6am) or the secured cron endpoint.
// Run it manually to populate the table now:
//
//   node scripts/refresh-technicals.js            # all active stocks (slow)
//   node scripts/refresh-technicals.js US 8       # first 8 US stocks (quick test)
//   node scripts/refresh-technicals.js NG 6       # first 6 NGX stocks
//
// NOTE: backend/.env DATABASE_URL points at the LIVE DB — this writes there.
// It fetches daily candles per symbol (US via Yahoo, NGX via NGX Pulse), so a
// full run takes minutes; use the limit arg for a fast first pass.
import 'dotenv/config';
import { refreshTechnicals } from '../services/technicalsUpdater.js';

const country = process.argv[2] && process.argv[2].toUpperCase();
const limit = process.argv[3] ? Number(process.argv[3]) : undefined;

const opts = {};
if (country === 'US' || country === 'NG') opts.country = country;
if (limit) opts.limit = limit;

console.log('[technicals] refreshing…', opts);
try {
  const r = await refreshTechnicals(opts);
  console.log('[technicals] done:', JSON.stringify({ updated: r.updated, total: r.total }, null, 2));
  if (r.failed?.length) console.log('[technicals] skipped:', r.failed.slice(0, 20).join(', '), r.failed.length > 20 ? `… (+${r.failed.length - 20})` : '');
  console.log('\nNow open /scout (Swing or Explore) or /radar — candidates should appear.');
  process.exit(0);
} catch (e) {
  console.error('[technicals] failed:', e.message);
  process.exit(1);
}
