// US fundamentals updater: every column it writes must exist, or Postgres
// rejects the whole UPDATE (which is how this job failed silently for months).
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeDb, mockDb } from './helpers.js';

const db = createFakeDb();
mockDb(db);

// Yahoo stand-in: a plausible quoteSummary + a year of daily candles.
class FakeYahoo {
  async quoteSummary() {
    return {
      summaryDetail: { trailingPE: 29.5, fiftyTwoWeekHigh: 555, fiftyTwoWeekLow: 344, dividendYield: 0.007, priceToSalesTrailing12Months: 12 },
      defaultKeyStatistics: { priceToBook: 9.1, enterpriseToEbitda: 21, pegRatio: 1.8, trailingEps: 14.2, beta: 0.9 },
      financialData: { returnOnEquity: 0.34, returnOnAssets: 0.15, grossMargins: 0.69, profitMargins: 0.4, debtToEquity: 29, currentRatio: 1.3, revenueGrowth: 0.18, earningsGrowth: 0.2 },
      price: { regularMarketPrice: 420, regularMarketChangePercent: 0.012, regularMarketVolume: 1e7, marketCap: 3.1e12 },
    };
  }
  // Like a real exchange calendar: ~251 trading sessions per 365 days. (A fixed
  // bar count is how the "1-year return is always null" bug went unnoticed.)
  async chart(_sym, { period1, period2 }) {
    const days = (new Date(period2) - new Date(period1)) / 864e5;
    const n = Math.floor((days * 251) / 365);
    const quotes = Array.from({ length: n }, (_, i) => ({ date: new Date(Date.now() - (n - i) * 864e5), close: 300 + i * 0.5 }));
    return { quotes };
  }
}
mock.module('yahoo-finance2', { defaultExport: FakeYahoo });

const { updateSingleStock, updateAllUSStocks } = await import('../services/stockFundamentalsUpdater.js');

// Real columns of the stocks table that this job is allowed to touch.
const STOCK_COLUMNS = new Set([
  'high_52w', 'low_52w', 'pe_ratio', 'pb_ratio', 'ps_ratio', 'ev_ebitda', 'peg_ratio', 'dividend_yield', 'eps',
  'market_cap_millions', 'roe', 'roa', 'gross_margin', 'net_margin', 'debt_to_equity', 'current_ratio',
  'revenue_growth_yoy', 'earnings_growth_yoy', 'beta',
  'return_1m', 'return_3m', 'return_6m', 'return_1y', 'volatility_30d', 'volatility_1y', 'max_drawdown_1y',
  'avg_daily_volume_millions', 'data_updated_at',
]);

test('every column the fundamentals UPDATE writes is a real stocks column', async () => {
  db.onQuery(() => ({ rows: [], rowCount: 1 }));
  const r = await updateSingleStock('MSFT');
  assert.equal(r.success, true);

  const [update] = db.find('UPDATE stocks SET');
  assert.ok(update, 'no UPDATE issued');
  const setClause = update.text.split(/\bSET\b/)[1].split(/\bWHERE\b/)[0];
  const cols = [...setClause.matchAll(/(\w+)\s*=\s*(?:\$\d+|NOW\(\))/g)].map((m) => m[1]);
  const unknown = cols.filter((c) => !STOCK_COLUMNS.has(c));
  assert.deepEqual(unknown, [], `writes columns that don't exist: ${unknown.join(', ')}`);
  // the three that broke it
  for (const bad of ['price', 'change_pct', 'volume']) assert.ok(!cols.includes(bad), `still writes ${bad}`);
  // and the 1-year figures the long-term screen ranks on are actually written
  for (const need of ['return_1y', 'volatility_1y', 'max_drawdown_1y', 'roe']) {
    assert.ok(cols.includes(need), `does not write ${need}`);
  }
});

test('default run = rotating slice + stocks with no fundamentals, not everything', async () => {
  db.onQuery(() => ({ rows: [] }));
  await updateAllUSStocks();
  const [select] = db.calls;
  assert.match(select.text, /UNION/);
  assert.match(select.text, /hashtext\(symbol\)/);
  assert.equal(select.params[1], 5);           // every stock refreshed every 5 days
});

test('a second run while one is in progress is refused', async () => {
  let release;
  db.onQuery(() => new Promise((r) => { release = () => r({ rows: [] }); }));
  const first = updateAllUSStocks();
  const second = await updateAllUSStocks();
  assert.equal(second.success, false);
  assert.equal(second.error, 'already_running');
  release();
  await first;
});
