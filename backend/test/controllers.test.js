// Controller behaviour against a fake DB. AI modules are mocked out: none of
// these paths call the model, and importing the real aiController would pull in
// Telegram, market-data services and more.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeDb, mockDb, modUrl, fakeRes } from './helpers.js';

const db = createFakeDb();
mockDb(db);
// Headlines the (mocked) news fetchers return; tests set this per case.
let newsFeed = [];
mock.module(modUrl('controllers/aiController.js'), {
  exports: {
    readCache: async () => null, writeCache: async () => {}, langKey: () => 'en',
    logUsage: async () => {}, langDirective: () => '', MENTOR_VOICE: '', DISCLAIMER: 'Educational only.',
    fetchFinnhubNews: async () => newsFeed, fetchGoogleNews: async () => newsFeed,
  },
});
mock.module(modUrl('services/aiProvider.js'), {
  exports: {
    analyzeWithAI: async () => { throw new Error('AI must not be called in these tests'); },
    parseJsonFromAI: (t) => JSON.parse(t),
  },
});

// Delivery and market data are side effects these tests must never trigger.
const dispatched = [];
mock.module(modUrl('services/notificationEngine.js'), { exports: { dispatch: async (n) => { dispatched.push(n); } } });
mock.module(modUrl('services/priceHistory.js'), {
  exports: { fetchDailyCandles: async () => null, fetchTimeframes: async () => ({ '1wk': null, '4h': null, '1h': null }) },
});

const broadcast = await import('../controllers/broadcastController.js');
const swing = await import('../controllers/swingController.js');
const watchlist = await import('../controllers/watchlistController.js');
const users = await import('../controllers/userController.js');
const scout = await import('../controllers/scoutController.js');
const newsMon = await import('../services/newsMonitor.js');
const wlMon = await import('../services/watchlistMonitor.js');
const cronCtl = await import('../controllers/cronController.js');
const research = await import('../controllers/researchController.js');
const analytics = await import('../controllers/analyticsController.js');
const journal = await import('../controllers/journalController.js');
const positions = await import('../controllers/positionsController.js');

// ---- watchlist intelligence ---------------------------------------------------------

test('watchlist: falls back to the basic read when the new tables are missing', async () => {
  db.onQuery((text) => {
    if (text.includes('investment_theses')) throw new Error('relation "investment_theses" does not exist');
    return { rows: [{ symbol: 'AAPL', trend: 'bullish', rsi14: '55', setup: 'none', last_price: '100' }] };
  });
  const res = fakeRes();
  await watchlist.list({ user: { id: 7 } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.watchlist[0].insight.status, 'healthy_uptrend');
  assert.equal(db.calls.length, 2, 'enriched query, then the fallback');
});

test('watchlist: thesis > tracked setup > fundamentals > technicals', async () => {
  db.onQuery(() => ({
    rows: [
      { symbol: 'A', trend: 'bullish', setup_status: 'approaching', thesis_state: 'weakening' },
      { symbol: 'B', trend: 'bullish', setup_status: 'active' },
      { symbol: 'C', trend: 'bearish', setup: 'none', roe: '20', earnings_growth_yoy: '5', debt_to_equity: '0.5' },
      { symbol: 'D' },
    ],
  }));
  const res = fakeRes();
  await watchlist.list({ user: { id: 7 } }, res);
  const s = Object.fromEntries(res.body.watchlist.map((w) => [w.symbol, w.insight?.status ?? null]));
  assert.deepEqual(s, { A: 'thesis_weakening', B: 'ready', C: 'fundamentally_attractive', D: null });
});

// ---- Opportunity Radar free preview --------------------------------------------------

const oppRows = Array.from({ length: 5 }, (_, i) => ({
  display_symbol: `S${i}`, name: `Stock ${i}`, sector: 'Tech', country: 'US', currency: 'USD',
  last_price: '10', day_change_pct: '1', trend: 'bullish', rsi14: '55', setup: 'breakout',
  quality_score: 80 - i, setup_reason: 'reason', computed_at: new Date(),
  ai_summary: { headline: `Headline ${i}`, why: ['premium-only reasoning'] },
}));

test('opportunityRadar: free users get 3, without score or AI reasoning', async () => {
  db.onQuery((text) => (text.includes('FROM stocks s') ? { rows: oppRows } : { rows: [] }));
  const res = fakeRes();
  await research.opportunityRadar({ query: {}, user: { id: 7 }, isPremium: false }, res);
  assert.equal(res.body.preview, true);
  assert.equal(res.body.opportunities.length, 3);
  assert.equal(res.body.locked_count, 2);
  for (const o of res.body.opportunities) {
    assert.equal('quality_score' in o, false);
    assert.deepEqual(Object.keys(o.summary), ['headline']);
  }
  assert.ok(db.find('analytics_events').some((c) => c.params[1] === 'premium_preview_viewed'));
});

test('opportunityRadar: premium gets the full board', async () => {
  db.onQuery((text) => (text.includes('FROM stocks s') ? { rows: oppRows } : { rows: [] }));
  const res = fakeRes();
  await research.opportunityRadar({ query: {}, user: { id: 8 }, isPremium: true }, res);
  assert.equal(res.body.preview, undefined);
  assert.equal(res.body.opportunities.length, 5);
  assert.equal(res.body.opportunities[0].quality_score, 80);
});

// ---- analytics -----------------------------------------------------------------------

test('trackEvent: rejects events outside the allowlist', async () => {
  db.onQuery(() => ({ rows: [] }));
  const res = fakeRes();
  analytics.trackEvent({ user: { id: 7 }, body: { event: 'subscription_started' } }, res);
  assert.equal(res.statusCode, 400, 'the browser cannot fake a conversion');
  assert.equal(db.find('analytics_events').length, 0);
});

test('trackEvent: stores allowed events with cleaned props', async () => {
  db.onQuery(() => ({ rows: [] }));
  const res = fakeRes();
  analytics.trackEvent({
    user: { id: 7 },
    body: { event: 'upgrade_clicked', props: { surface: 'radar', nested: { x: 1 }, long: 'a'.repeat(500) } },
  }, res);
  assert.equal(res.statusCode, 200);
  const [ins] = db.find('analytics_events');
  assert.equal(ins.params[1], 'upgrade_clicked');
  const props = JSON.parse(ins.params[2]);
  assert.equal(props.surface, 'radar');
  assert.equal('nested' in props, false, 'objects dropped');
  assert.equal(props.long.length, 120, 'strings capped');
});

test('getFunnel: admins only, and never 500s before the migration', async () => {
  const denied = fakeRes();
  await analytics.getFunnel({ user: { id: 7 }, query: {} }, denied);
  assert.equal(denied.statusCode, 403);

  db.onQuery(() => { throw new Error('relation "analytics_events" does not exist'); });
  const res = fakeRes();
  await analytics.getFunnel({ user: { id: 1, is_admin: true }, query: { days: '30' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.unavailable, true);
});

// ---- journal insights ------------------------------------------------------------------

test('personal insights: no conclusions from fewer than 5 trades', async () => {
  db.onQuery((text) => (text.includes('FROM journal_entries')
    ? { rows: [{ outcome: 'win', result_pct: 5 }, { outcome: 'loss', result_pct: -2 }, { outcome: 'win', result_pct: 3 }] }
    : { rows: [] }));
  const res = fakeRes();
  await journal.getPersonalInsights({ user: { id: 7 } }, res);
  assert.equal(res.body.ready, false);
  assert.equal(res.body.sample_size, 3);
  assert.equal(res.body.needed, 5);
});

test('personal insights: patterns trace to the numbers', async () => {
  const t = (setup, outcome, result_pct, holding_days) => ({ setup, outcome, result_pct, holding_days });
  db.onQuery((text) => (text.includes('FROM journal_entries') ? {
    rows: [
      t('pullback', 'win', 10, 5), t('pullback', 'win', 8, 4), t('pullback', 'win', 6, 3),
      t('pullback', 'loss', -4, 2), t('breakout', 'loss', -12, 20), t('breakout', 'loss', -10, 15),
    ],
  } : { rows: [] }));
  const res = fakeRes();
  await journal.getPersonalInsights({ user: { id: 7 } }, res);
  assert.equal(res.body.ready, true);
  assert.equal(res.body.stats.win_rate, 50);
  assert.equal(res.body.stats.by_setup.pullback.win_rate, 75);
  const text = res.body.insights.join(' | ');
  assert.match(text, /best with pullback setups — 75% wins over 4 trades/);
  assert.match(text, /hold losing trades/, 'losers held ~12d vs winners ~4d');
  assert.doesNotMatch(text, /breakout trades have struggled/, 'breakout has only 2 trades: too few to call');
  assert.equal(db.find('INSERT INTO personal_insights').length, 1);
});

// ---- positions ---------------------------------------------------------------------------

const openPos = {
  id: 5, user_id: 7, symbol: 'AAPL', market: 'US', objective: 'swing', setup_id: null,
  entry_price: '100', quantity: '2', entry_date: '2026-09-01', notes: null,
  thesis_state: 'intact', currency: 'USD', status: 'open',
};

test('closePosition: unknown / not-owned position → 404', async () => {
  db.onQuery(() => ({ rows: [] }));
  const res = fakeRes();
  await positions.closePosition({ params: { id: '5' }, user: { id: 99 }, body: { exit_price: 110 } }, res);
  assert.equal(res.statusCode, 404);
});

test('closePosition: bad exit price → 400', async () => {
  db.onQuery((text) => (text.startsWith('SELECT * FROM positions') ? { rows: [openPos] } : { rows: [] }));
  const res = fakeRes();
  await positions.closePosition({ params: { id: '5' }, user: { id: 7 }, body: { exit_price: 'abc' } }, res);
  assert.equal(res.statusCode, 400);
});

test('closePosition: computes P&L and auto-journals the trade', async () => {
  db.onQuery((text) => (text.startsWith('SELECT * FROM positions') ? { rows: [openPos] } : { rows: [] }));
  const res = fakeRes();
  await positions.closePosition({ params: { id: '5' }, user: { id: 7 }, body: { exit_price: 110 } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.realized_pnl, 20);
  const [upd] = db.find("UPDATE positions SET status='closed'");
  assert.equal(upd.params[3], 20);
  const [jr] = db.find('INSERT INTO journal_entries');
  assert.ok(jr, 'a journal entry was written');
  // params: … [10] result_pct, [11] realized_pnl, [12] outcome
  assert.equal(jr.params[10], 10, 'result_pct');
  assert.equal(jr.params[11], 20, 'realized_pnl');
  assert.equal(jr.params[12], 'win', 'outcome');
});

// ---- broadcast audiences (§19) -----------------------------------------------------------

test('broadcast: admins only', async () => {
  const res = fakeRes();
  await broadcast.sendBroadcast({ user: { id: 7 }, body: { audience: 'swing', body: 'Hi' } }, res);
  assert.equal(res.statusCode, 403);
});

test('broadcast: "swing" targets users whose objective is swing', async () => {
  db.onQuery((text) => (text.includes('FROM users WHERE objective') ? { rows: [{ id: 1 }, { id: 2 }] } : { rows: [] }));
  const res = fakeRes();
  await broadcast.sendBroadcast({
    user: { id: 9, is_admin: true },
    body: { audience: 'swing', body: 'Setups are live', channels: ['in_app'] },
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.audience, 'swing');
  assert.equal(res.body.recipients, 2);
  const [q] = db.find('FROM users WHERE objective');
  assert.deepEqual(q.params, ['swing']);
});

// ---- missed setups (§14) ---------------------------------------------------------------

test('missed setups: skips setups that never reached entry, explains the rest', async () => {
  const base = { entry_low: '100', entry_high: '104', invalidation: '95', targets: [{ level: 118 }], setup: 'pullback',
    reasons: [], display_symbol: 'AAPL', name: 'Apple', currency: 'USD', market: 'US', last_price: '120' };
  db.onQuery((text) => {
    if (text.includes('FROM ai_setups s')) return { rows: [{ ...base, id: 1, status: 'target' }, { ...base, id: 2, status: 'invalidated' }] };
    if (text.includes('FROM ai_setup_events')) {
      return { rows: [
        { setup_id: 1, to_status: 'triggered', price_at: '101', created_at: '2026-09-01' },
        { setup_id: 1, to_status: 'target', created_at: '2026-09-05' },
        { setup_id: 2, to_status: 'invalidated', created_at: '2026-09-02' }, // never triggered
      ] };
    }
    return { rows: [] };
  });
  const res = fakeRes();
  await swing.listMissedSetups({ user: { id: 7 } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.missed.length, 1);
  assert.equal(res.body.missed[0].id, 1);
  assert.equal(res.body.missed[0].outcome, 'target');
  assert.ok(db.find('NOT EXISTS (SELECT 1 FROM positions').length, 'excludes setups the user entered');
});

// ---- investment profile (§3) --------------------------------------------------------------

test('updateObjective: only updates the keys sent', async () => {
  db.onQuery(() => ({ rows: [{ objective: 'swing' }] }));
  const res = fakeRes();
  await users.updateObjective({ user: { id: 7 }, body: { objective: 'swing' } }, res);
  assert.equal(res.statusCode, 200);
  const [q] = db.find('UPDATE users SET');
  // Only the SET clause matters; RETURNING always lists every column.
  const setClause = q.text.slice(q.text.indexOf('SET'), q.text.indexOf('WHERE'));
  assert.match(setClause, /objective = \$1/);
  assert.doesNotMatch(setClause, /preferred_market|risk_tolerance|investor_profile/);
  assert.deepEqual(q.params, ['swing', 7]);
});

test('updateObjective: null clears the market ("Both" works)', async () => {
  db.onQuery(() => ({ rows: [{}] }));
  const res = fakeRes();
  await users.updateObjective({ user: { id: 7 }, body: { preferred_market: null } }, res);
  assert.equal(res.statusCode, 200);
  const [q] = db.find('UPDATE users SET');
  assert.match(q.text, /preferred_market = \$1/);
  assert.equal(q.params[0], null);
});

test('updateObjective: validates risk and market, sanitises the profile', async () => {
  db.onQuery(() => ({ rows: [{}] }));
  const bad = fakeRes();
  await users.updateObjective({ user: { id: 7 }, body: { risk_tolerance: 'yolo' } }, bad);
  assert.equal(bad.statusCode, 400);
  const badMarket = fakeRes();
  await users.updateObjective({ user: { id: 7 }, body: { preferred_market: 'JP' } }, badMarket);
  assert.equal(badMarket.statusCode, 400);
  assert.equal(db.find('UPDATE users SET').length, 0, 'nothing written on invalid input');

  const ok = fakeRes();
  await users.updateObjective({
    user: { id: 7 },
    body: { risk_tolerance: 'low', investor_profile: { styles: ['growth', 'x'], admin: true } },
  }, ok);
  const [q] = db.find('UPDATE users SET');
  assert.equal(q.params[0], 'conservative', 'legacy "low" normalised');
  assert.equal(q.params[1], '{"styles":["growth"]}');

  const empty = fakeRes();
  await users.updateObjective({ user: { id: 7 }, body: {} }, empty);
  assert.equal(empty.statusCode, 400);
});

test('getObjective: normalised profile plus sectors', async () => {
  db.onQuery((text) => {
    if (text.includes('FROM users')) return { rows: [{ objective: 'longterm', risk_tolerance: 'high', preferred_market: 'NG', investor_profile: { styles: ['dividend', 'junk'] } }] };
    if (text.includes('GROUP BY sector')) return { rows: [{ sector: 'Banking' }, { sector: 'Telecoms' }] };
    return { rows: [] };
  });
  const res = fakeRes();
  await users.getObjective({ user: { id: 7 } }, res);
  assert.equal(res.body.risk_tolerance, 'aggressive');
  assert.deepEqual(res.body.investor_profile, { styles: ['dividend'] });
  assert.deepEqual(res.body.sectors, ['Banking', 'Telecoms']);
});

test('scout: the saved profile reaches the long-term ranking query', async () => {
  db.onQuery((text) => {
    if (text.includes('FROM users WHERE id')) {
      return { rows: [{ risk_tolerance: 'conservative', investor_profile: { styles: ['dividend'], sectors: ['Banking'], company_size: 'large' } }] };
    }
    return { rows: [] }; // no candidates → returns before any AI call
  });
  const res = fakeRes();
  await scout.stockScout({ user: { id: 7 }, query: { objective: 'longterm', market: 'ALL' } }, res);
  assert.equal(res.statusCode, 200);
  const [q] = db.find('WITH base AS');
  assert.ok(q, 'long-term query ran');
  assert.equal(q.params[0], 0.7, 'company size "large" → 70th percentile floor');
  assert.ok(q.params.some((v) => typeof v === 'number' && Math.abs(v - 0.44) < 1e-9), 'dividend weight raised to 0.44 (0.15 × 0.6 + 0.35)');
  assert.deepEqual(q.params[q.params.length - 1], ['Banking'], 'preferred sectors boosted');
});

test('scout: a conservative swing profile caps volatility', async () => {
  db.onQuery((text) => (text.includes('FROM users WHERE id')
    ? { rows: [{ risk_tolerance: 'conservative', investor_profile: {} }] }
    : { rows: [] }));
  const res = fakeRes();
  await scout.stockScout({ user: { id: 7 }, query: { objective: 'swing', market: 'US' } }, res);
  const [q] = db.find('LEFT JOIN stock_technicals t ON t.symbol = s.symbol');
  assert.match(q.text, /atr_pct/);
  assert.deepEqual(q.params, ['US', 3]);
});

// ---- background jobs (§29) -------------------------------------------------------------

const today = new Date().toISOString().slice(0, 10);
const newsDb = ({ prior = 0, fresh = true } = {}) => (text) => {
  if (text.includes('WITH interest')) return { rows: [{ symbol: 'AAPL', display_symbol: 'AAPL', name: 'Apple', country: 'US', users: 1 }] };
  if (text.includes('COUNT(*)::int AS n FROM news_events')) return { rows: [{ n: prior }] };
  if (text.includes('INSERT INTO news_events')) return { rows: fresh ? [{ id: 1 }] : [] };
  if (text.includes('FROM users u') && text.includes('investment_theses th')) return { rows: [{ user_id: 7, thesis_id: 3, thesis_state: 'intact' }] };
  return { rows: [] };
};

test('news: the first run for a stock is stored silently (no alert flood)', async () => {
  dispatched.length = 0;
  newsFeed = [{ headline: 'Apple reports record quarterly results', url: 'u1', date: today }];
  db.onQuery(newsDb({ prior: 0 }));
  const r = await newsMon.monitorNews();
  assert.equal(r.seeded, 1);
  assert.equal(dispatched.length, 0);
});

test('news: a new material headline alerts followers and joins the thesis history; noise does not', async () => {
  dispatched.length = 0;
  newsFeed = [
    { headline: 'Apple reports record quarterly results', url: 'u1', date: today, source: 'Reuters' },
    { headline: 'Apple stock rises 1% on Tuesday', url: 'u2', date: today },
  ];
  db.onQuery(newsDb({ prior: 5 }));
  const r = await newsMon.monitorNews();
  assert.equal(r.new_items, 2);
  assert.equal(r.material, 1);
  assert.equal(dispatched.length, 1);
  assert.equal(dispatched[0].category, 'news');
  assert.match(dispatched[0].title, /AAPL · Results/);
  const [te] = db.find('INSERT INTO thesis_events');
  assert.ok(te, 'thesis history gets the headline');
  assert.equal(te.params[1], 'intact', 'news never changes the thesis state');
});

test('news: headlines already seen are skipped', async () => {
  dispatched.length = 0;
  newsFeed = [{ headline: 'Apple reports record quarterly results', url: 'u1', date: today }];
  db.onQuery(newsDb({ prior: 5, fresh: false }));
  const r = await newsMon.monitorNews();
  assert.equal(r.new_items, 0);
  assert.equal(dispatched.length, 0);
});

test('watchlist monitor: first sighting stored silently; a move into "ready" alerts', async () => {
  dispatched.length = 0;
  db.onQuery((text) => (text.includes('FROM watchlist w') ? { rows: [
    { user_id: 7, symbol: 'AAPL', display_symbol: 'AAPL', trend: 'bullish', setup_status: 'active', prev_status: null, prev_insight: null },
    { user_id: 7, symbol: 'MSFT', display_symbol: 'MSFT', trend: 'bullish', setup_status: 'active', prev_status: 'developing', prev_insight: {} },
  ] } : { rows: [] }));
  const alerts = await wlMon.monitorWatchlists();
  assert.equal(alerts, 1);
  assert.equal(dispatched.length, 1);
  assert.match(dispatched[0].message, /^MSFT: Setup active/);
  assert.equal(db.find('INSERT INTO ai_watchlist_insights').length, 2, 'both readings stored');
});

test('watchlist monitor: no repeat alert inside the cooldown', async () => {
  dispatched.length = 0;
  db.onQuery((text) => (text.includes('FROM watchlist w') ? { rows: [
    { user_id: 7, symbol: 'MSFT', display_symbol: 'MSFT', trend: 'bullish', setup_status: 'active', prev_status: 'developing',
      prev_insight: { last_alert_status: 'ready', last_alert_at: new Date(Date.now() - 3600 * 1000).toISOString() } },
  ] } : { rows: [] }));
  assert.equal(await wlMon.monitorWatchlists(), 0);
  assert.equal(dispatched.length, 0);
});

test('cron endpoints: CRON_SECRET required', async () => {
  process.env.CRON_SECRET = 's3cret';
  db.onQuery(() => ({ rows: [] }));
  const denied = fakeRes();
  await cronCtl.cronMonitor({ get: () => undefined, query: {} }, denied);
  assert.equal(denied.statusCode, 401);
  const wrong = fakeRes();
  await cronCtl.cronBriefing({ get: () => 'nope', query: {} }, wrong);
  assert.equal(wrong.statusCode, 401);

  const ok = fakeRes();
  await cronCtl.cronMonitor({ get: (h) => (h === 'x-cron-secret' ? 's3cret' : undefined), query: {} }, ok);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.success, true);

  const brief = fakeRes();
  await cronCtl.cronBriefing({ get: () => undefined, query: { token: 's3cret' } }, brief);
  assert.equal(brief.statusCode, 200);
  assert.deepEqual(brief.body.briefing, { users: 0, sent: 0 });
});

test('createPosition: rejects a zero quantity', async () => {
  db.onQuery((text) => (text.includes('FROM stocks') ? { rows: [{ symbol: 'AAPL', country: 'US' }] } : { rows: [] }));
  const res = fakeRes();
  await positions.createPosition({ user: { id: 7 }, body: { symbol: 'AAPL', entry_price: 100, quantity: 0 } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(db.find('INSERT INTO positions').length, 0);
});
