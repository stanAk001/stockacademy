// Build backend/data/us-universe.json — the curated US stocks StockAcademia
// analyses in depth (S&P 500 + Nasdaq-100 + S&P MidCap 400).
//
//   node scripts/build-us-universe.js <path/to/universe.json>
//
// Input is the merged constituent list (symbol, name, sector, industry, indexes).
// This step checks every ticker against Finnhub's live US listing, so a renamed
// or delisted company can't slip in, and records which exchange it trades on.
// Re-run it when the index memberships change (a few times a year).
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const src = process.argv[2];
if (!src) { console.error('usage: node scripts/build-us-universe.js <universe.json>'); process.exit(1); }
if (!process.env.FINNHUB_API_KEY) { console.error('FINNHUB_API_KEY is not set'); process.exit(1); }

const raw = JSON.parse(fs.readFileSync(src, 'utf8'));

// Nasdaq's API leaves these blank; classified to match their GICS sector.
const FILL = {
  ALAB: { sector: 'Technology' }, ALNY: { sector: 'Healthcare' }, ARM: { sector: 'Technology' },
  ASML: { sector: 'Technology', name: 'ASML Holding N.V.' }, CCEP: { sector: 'Consumer Staples' },
  CRWV: { sector: 'Technology' }, FER: { sector: 'Industrial' }, MELI: { sector: 'Consumer Discretionary' },
  MSTR: { sector: 'Technology' }, NBIS: { sector: 'Technology' }, PDD: { sector: 'Consumer Discretionary' },
  RKLB: { sector: 'Industrial' }, SHOP: { sector: 'Technology', name: 'Shopify Inc.' },
  SPCX: { sector: 'Industrial' }, TRI: { sector: 'Industrial' },
};

// Finnhub venue codes → the short names the stocks.exchange column (VARCHAR 20) uses.
const VENUE = { XNAS: 'NASDAQ', XNYS: 'NYSE', XASE: 'NYSE American', ARCX: 'NYSE Arca', BATS: 'Cboe' };

const { data } = await axios.get('https://finnhub.io/api/v1/stock/symbol', {
  params: { exchange: 'US', token: process.env.FINNHUB_API_KEY }, timeout: 60000,
});
const listed = new Map();
for (const d of data) {
  if (!VENUE[d.mic]) continue;           // ignore OTC/pink sheets
  listed.set(d.symbol.toUpperCase(), d);
}

const kept = [];
const dropped = [];
for (const r of raw) {
  const fix = FILL[r.symbol] || {};
  // Share classes: the index lists write BRK-B (Yahoo style); Finnhub lists
  // BRK.B. We store Finnhub's form — it's what users type — and the Yahoo
  // fetchers translate the dot back to a dash.
  const hit = listed.get(r.symbol) || listed.get(r.symbol.replace(/-/g, '.'));
  if (!hit) { dropped.push(r.symbol); continue; }
  kept.push({
    symbol: hit.symbol.toUpperCase(),
    name: fix.name || r.name,
    sector: fix.sector || r.sector || null,
    industry: r.industry || null,
    exchange: VENUE[hit.mic],
    indexes: r.indexes,
  });
}

const out = {
  description: 'Curated US universe: S&P 500 + Nasdaq-100 + S&P MidCap 400, verified against the live Finnhub US listing.',
  built_at: new Date().toISOString().slice(0, 10),
  count: kept.length,
  stocks: kept,
};
const dest = path.resolve('data/us-universe.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out, null, 1) + '\n');

const byEx = {}; for (const k of kept) byEx[k.exchange] = (byEx[k.exchange] || 0) + 1;
console.log(`kept ${kept.length}, dropped ${dropped.length}`);
console.log('by exchange:', JSON.stringify(byEx));
if (dropped.length) console.log('dropped (not on a US exchange today):', dropped.join(', '));
console.log('missing sector:', kept.filter((k) => !k.sector).map((k) => k.symbol).join(', ') || 'none');
console.log('wrote', dest);
