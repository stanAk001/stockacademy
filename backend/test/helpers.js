import { mock } from 'node:test';

// Absolute URL of a backend module, for mock.module().
export const modUrl = (p) => new URL(`../${p}`, import.meta.url).href;

// An in-memory stand-in for config/db.js. Every query is recorded in `calls`;
// onQuery(fn) sets how queries are answered (and clears the log). fn receives
// (sqlText, params) and returns { rows } — or throws to simulate a DB error.
export function createFakeDb() {
  const state = { handler: () => ({ rows: [], rowCount: 0 }) };
  const calls = [];
  const query = async (text, params) => {
    calls.push({ text, params });
    const r = await state.handler(text, params);
    return r || { rows: [], rowCount: 0 };
  };
  const client = { query, release() {} };
  return {
    query,
    getClient: async () => client,
    pool: {},
    calls,
    onQuery(fn) { state.handler = fn; calls.length = 0; },
    // Find recorded queries whose SQL contains `fragment`.
    find(fragment) { return calls.filter((c) => c.text.includes(fragment)); },
  };
}

// Replace config/db.js for every module this test file imports afterwards.
export function mockDb(fake) {
  mock.module(modUrl('config/db.js'), {
    exports: { default: fake, query: fake.query, getClient: fake.getClient, pool: fake.pool },
  });
}

// Minimal Express response double.
export function fakeRes() {
  const res = { statusCode: 200, body: undefined, headers: {} };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.getHeader = (k) => res.headers[k];
  // For HTML routes (seoController): res.status(x).set(header).send(html).
  res.set = (k, v) => { res.headers[k] = v; return res; };
  res.send = (body) => { res.body = body; return res; };
  return res;
}

// Run a middleware; report the response and whether next() was called.
export async function runMiddleware(fn, req) {
  const res = fakeRes();
  let nexted = false;
  await fn(req, res, () => { nexted = true; });
  return { res, nexted };
}
