// Full NGX listings import: every board symbol becomes a usable stock row.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeDb, mockDb, modUrl } from './helpers.js';

const db = createFakeDb();
mockDb(db);

let board = null;
const persisted = [];
mock.module(modUrl('services/marketPrice.js'), {
  exports: {
    ngxBoard: async () => board,
    persistQuote: async (symbol, q) => { persisted.push([symbol, q.price]); },
    recomputeRatios: async () => {},
  },
});

const { importNgxListings } = await import('../services/ngxImporter.js');

const makeBoard = (entries) => new Map(entries.map((e) => [e.symbol, e]));

// Answer the "which NG stocks do we already have" query, swallow the writes.
const withExisting = (existing) => db.onQuery((sql) => {
  if (/SELECT display_symbol/i.test(sql)) return { rows: existing.map((s) => ({ display_symbol: s })) };
  return { rows: [] };
});

test('adds every board symbol we do not already store', async () => {
  board = makeBoard([
    { symbol: 'DANGCEM', name: 'Dangote Cement PLC', sector: 'INDUSTRIAL GOODS', price: 510 },
    { symbol: 'ARADEL', name: 'Aradel Holdings PLC', sector: 'OIL AND GAS', price: 620 },
    { symbol: 'GTCO', name: 'Guaranty Trust PLC', sector: 'FINANCIAL SERVICES', price: 48 },
  ]);
  persisted.length = 0;
  withExisting(['GTCO']);

  const r = await importNgxListings();

  assert.equal(r.ok, true);
  assert.equal(r.added, 2);      // DANGCEM + ARADEL
  assert.equal(r.updated, 1);    // GTCO already there
  assert.equal(r.total, 3);

  const inserts = db.find('INSERT INTO stocks');
  assert.equal(inserts.length, 3);
  // stored under the NGX: convention, with the bare ticker as display_symbol
  assert.deepEqual(inserts[0].params.slice(0, 2), ['NGX:DANGCEM', 'DANGCEM']);
  // the quote that came with the feed is stored too, so the stock works at once
  assert.equal(persisted.length, 3);
});

test('a nameless row still gets a name, because the column is NOT NULL', async () => {
  board = makeBoard([{ symbol: 'NEWCO', name: '', sector: null, price: 5 }]);
  withExisting([]);

  await importNgxListings();

  const [insert] = db.find('INSERT INTO stocks');
  assert.equal(insert.params[2], 'NEWCO');   // falls back to the ticker
  assert.equal(insert.params[3], null);      // sector stays null, not ''
});

test('skips anything that cannot be a ticker', async () => {
  board = makeBoard([
    { symbol: '', name: 'blank', price: 1 },
    { symbol: 'WAY-TOO-LONG-FOR-THE-COLUMN', name: 'long', price: 1 },
    { symbol: '***', name: 'junk', price: 1 },
    { symbol: 'OKAY', name: 'Fine PLC', price: 1 },
  ]);
  withExisting([]);

  const r = await importNgxListings();

  assert.equal(r.added, 1);
  assert.equal(r.skipped, 3);
});

test('dry run reports without writing', async () => {
  board = makeBoard([{ symbol: 'DANGCEM', name: 'Dangote Cement PLC', price: 510 }]);
  persisted.length = 0;
  withExisting([]);

  const r = await importNgxListings({ dryRun: true });

  assert.equal(r.added, 1);
  assert.equal(db.find('INSERT INTO stocks').length, 0);
  assert.equal(persisted.length, 0);
});

test('an unreachable feed is reported, not thrown', async () => {
  board = null;
  const r = await importNgxListings();
  assert.deepEqual(r, { ok: false, reason: 'ngx_feed_unavailable', added: 0, updated: 0, skipped: 0, total: 0 });
});
