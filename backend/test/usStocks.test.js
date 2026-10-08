// The curated US universe and the on-demand add path.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeDb, mockDb } from './helpers.js';

const db = createFakeDb();
mockDb(db);

const { normalizeExchange, sectorFromIndustry, importUsUniverse, loadUniverse } = await import('../services/usStocks.js');

// The sectors the platform already uses — the profile's chips are built from them.
const VOCAB = new Set([
  'Technology', 'Healthcare', 'Financial', 'Communication', 'Industrial',
  'Consumer Discretionary', 'Consumer Staples', 'Energy', 'Utilities', 'Real Estate', 'Materials',
]);

// ---- the bug that made every on-demand US stock "not found" -------------------

test('normalizeExchange: Finnhub exchange strings fit the 20-char column', () => {
  assert.equal(normalizeExchange('NASDAQ NMS - GLOBAL MARKET'), 'NASDAQ');
  assert.equal(normalizeExchange('NEW YORK STOCK EXCHANGE, INC.'), 'NYSE');
  assert.equal(normalizeExchange('NYSE MKT LLC'), 'NYSE');
  assert.equal(normalizeExchange('NYSE ARCA'), 'NYSE Arca');
  assert.equal(normalizeExchange('NYSE American'), 'NYSE American');
  assert.equal(normalizeExchange('CBOE BZX'), 'Cboe');
  assert.equal(normalizeExchange(''), 'US');
  for (const raw of ['NASDAQ NMS - GLOBAL MARKET', 'NEW YORK STOCK EXCHANGE, INC.', 'something unheard of']) {
    assert.ok(normalizeExchange(raw).length <= 20);
  }
});

test('sectorFromIndustry: Finnhub industries land in the platform vocabulary', () => {
  assert.equal(sectorFromIndustry('Semiconductors'), 'Technology');
  assert.equal(sectorFromIndustry('Banking'), 'Financial');
  assert.equal(sectorFromIndustry('Pharmaceuticals'), 'Healthcare');
  assert.equal(sectorFromIndustry('Hotels, Restaurants & Leisure'), 'Consumer Discretionary');
  assert.equal(sectorFromIndustry('Beverages'), 'Consumer Staples');
  assert.equal(sectorFromIndustry('Aerospace & Defense'), 'Industrial');
  assert.equal(sectorFromIndustry('Oil & Gas'), 'Energy');
  // Unknown stays empty rather than inventing a new chip.
  assert.equal(sectorFromIndustry('N/A'), null);
  assert.equal(sectorFromIndustry(null), null);
});

// ---- the universe file itself ---------------------------------------------------

test('universe file: large, unique, complete, in vocabulary', () => {
  const u = loadUniverse();
  assert.ok(u.length >= 900, `expected ≥900 stocks, got ${u.length}`);
  const syms = u.map((s) => s.symbol);
  assert.equal(new Set(syms).size, syms.length, 'duplicate tickers');
  for (const s of u) {
    assert.match(s.symbol, /^[A-Z][A-Z0-9.]*$/, `bad ticker ${s.symbol}`);
    assert.ok(s.name, `${s.symbol} has no name`);
    assert.ok(VOCAB.has(s.sector), `${s.symbol} sector "${s.sector}" not in vocabulary`);
    assert.ok(s.exchange && s.exchange.length <= 20, `${s.symbol} exchange "${s.exchange}"`);
  }
  // The names people search for are actually there.
  for (const must of ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'TSLA', 'META', 'GOOGL', 'BRK.B', 'JPM', 'KO']) {
    assert.ok(syms.includes(must), `${must} missing`);
  }
});

// ---- the importer ---------------------------------------------------------------

const withExisting = (symbols) => db.onQuery((sql) => {
  if (/SELECT symbol FROM stocks WHERE country = 'US'/.test(sql)) return { rows: symbols.map((symbol) => ({ symbol })) };
  return { rows: [] };
});

test('importUsUniverse: adds new stocks, leaves existing ones alone', async () => {
  withExisting(['AAPL']);
  const r = await importUsUniverse({
    universe: [
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', exchange: 'NASDAQ' },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financial', exchange: 'NYSE' },
    ],
  });
  assert.equal(r.ok, true);
  assert.equal(r.added, 1);
  assert.equal(r.updated, 1);

  const inserts = db.find('INSERT INTO stocks');
  assert.equal(inserts.length, 2);
  const brk = inserts.find((c) => c.params[0] === 'BRK.B');
  assert.deepEqual(brk.params, ['BRK.B', 'Berkshire Hathaway', 'NYSE', 'Financial', null]);
  // Existing rows keep their own sector — the import only fills blanks.
  assert.match(inserts[0].text, /COALESCE\(stocks\.sector, EXCLUDED\.sector\)/);
  // ...and never touch is_active on conflict.
  assert.doesNotMatch(inserts[0].text.split('DO UPDATE')[1], /is_active/);
});

test('importUsUniverse: rejects bad tickers instead of truncating them', async () => {
  withExisting([]);
  const r = await importUsUniverse({
    universe: [
      { symbol: 'OK', name: 'Fine Co', sector: 'Industrial', exchange: 'NYSE' },
      { symbol: '', name: 'blank' },
      { symbol: 'THIS-TICKER-IS-FAR-TOO-LONG', name: 'long' },
      { symbol: '$$$', name: 'junk' },
    ],
  });
  assert.equal(r.added, 1);
  assert.equal(r.skipped, 3);
});

test('importUsUniverse: dry run writes nothing', async () => {
  withExisting([]);
  const r = await importUsUniverse({ dryRun: true, universe: [{ symbol: 'MSFT', name: 'Microsoft', sector: 'Technology', exchange: 'NASDAQ' }] });
  assert.equal(r.added, 1);
  assert.equal(db.find('INSERT INTO stocks').length, 0);
});

test('importUsUniverse: an empty universe is reported, not thrown', async () => {
  const r = await importUsUniverse({ universe: [] });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'empty_universe');
});
