// Pure decision logic: no I/O. The monitors import db + notificationEngine at
// module level, so both are mocked even though these functions never touch them.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeDb, mockDb, modUrl } from './helpers.js';

mockDb(createFakeDb());
mock.module(modUrl('services/notificationEngine.js'), { exports: { dispatch: async () => {} } });

const { isPremiumUser, freeLimitFor } = await import('../config/entitlements.js');
const { parseJsonFromAI } = await import('../services/aiProvider.js');
const { advanceSetupStatus } = await import('../services/setupMonitor.js');
const { deriveThesisState } = await import('../services/positionMonitor.js');
const { diffFundamentals } = await import('../services/thesisMonitor.js');
const {
  marketRegime, watchlistInsight, vwap, sessionVwap, aggregateCandles, frameRead, multiTimeframe,
} = await import('../services/indicators.js');
const { isUsRegularSession, filterUsRegularSession } = await import('../services/marketHours.js');
const { describeMissedSetup } = await import('../services/missedSetups.js');
const { normalizeRisk, cleanProfile, longtermWeights, swingAtrCap, sizeFloor } = await import('../services/investorProfile.js');
const { classifyHeadline } = await import('../services/newsClassifier.js');
const { shouldNotifyWatchlist } = await import('../services/watchlistMonitor.js');
const { briefingMessage, lagosDate } = await import('../services/briefingDigest.js');

const DAY = 86400000;

// ---- entitlements -----------------------------------------------------------

test('isPremiumUser: plan and date windows', () => {
  assert.equal(isPremiumUser({ plan: 'premium' }), true);
  assert.equal(isPremiumUser({ plan: 'free' }), false);
  assert.equal(isPremiumUser(null), false);
  assert.equal(isPremiumUser({ plan: 'premium', plan_renews_at: new Date(Date.now() + DAY) }), true);
  assert.equal(isPremiumUser({ plan: 'premium', plan_renews_at: new Date(Date.now() - DAY) }), true, 'inside the 2-day grace period');
  assert.equal(isPremiumUser({ plan: 'premium', plan_renews_at: new Date(Date.now() - 3 * DAY) }), false, 'grace period over');
  assert.equal(isPremiumUser({ plan: 'premium', plan_expires_at: new Date(Date.now() - 3 * DAY) }), false, 'legacy plan_expires_at is enforced too');
  assert.equal(isPremiumUser({ plan: 'premium', trial_ends_at: new Date(Date.now() - DAY) }), false, 'expired trial');
});

test('freeLimitFor: configured limits, unknown feature is null', () => {
  assert.deepEqual({ ...freeLimitFor('ai_scout'), label: undefined }, { limit: 2, period: 'month', label: undefined });
  assert.equal(freeLimitFor('tracked_setup').period, 'total');
  assert.equal(freeLimitFor('no_such_feature'), null);
});

// ---- AI JSON parsing ----------------------------------------------------------

test('parseJsonFromAI: clean, fenced, and with stray prose', () => {
  assert.deepEqual(parseJsonFromAI('{"a":1}'), { a: 1 });
  assert.deepEqual(parseJsonFromAI('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonFromAI('{"a":1}\n\nHope this helps!'), { a: 1 }, 'trailing sentence');
  assert.deepEqual(parseJsonFromAI('Here you go: {"a":[1,2]}'), { a: [1, 2] }, 'leading sentence');
});

test('parseJsonFromAI: genuinely truncated JSON still throws', () => {
  assert.throws(() => parseJsonFromAI('{"summary": "cut off mid-sent'));
});

// ---- swing setup lifecycle ----------------------------------------------------

const LV = { entry_low: 100, entry_high: 105, invalidation: 95, targets: [{ level: 120 }] };

test('advanceSetupStatus: moves forward through the stages', () => {
  assert.equal(advanceSetupStatus('watching', LV, 97), 'approaching'); // within the buffer below entry
  assert.equal(advanceSetupStatus('watching', LV, 103), 'triggered');
  assert.equal(advanceSetupStatus('watching', LV, 106), 'active');
  assert.equal(advanceSetupStatus('active', LV, 121), 'target');
});

test('advanceSetupStatus: never demotes, invalidation always wins', () => {
  assert.equal(advanceSetupStatus('active', LV, 101), 'active', 'a dip does not demote');
  assert.equal(advanceSetupStatus('active', LV, 94), 'invalidated');
  assert.equal(advanceSetupStatus('target', LV, 50), 'target', 'terminal stays terminal');
  assert.equal(advanceSetupStatus('watching', LV, 121), 'active', 'target needs the setup engaged first');
});

// ---- position thesis state ------------------------------------------------------

test('deriveThesisState: price against entry / stop / target', () => {
  assert.equal(deriveThesisState(100, 95, 120, 94), 'invalidated');
  assert.equal(deriveThesisState(100, 95, 120, 121), 'strengthening');
  assert.equal(deriveThesisState(100, 95, 120, 103), 'strengthening');
  assert.equal(deriveThesisState(100, 95, 120, 97), 'weakening');
  assert.equal(deriveThesisState(100, 95, 120, 101), 'intact');
  assert.equal(deriveThesisState(100, null, null, 50), 'weakening', 'no stop set → never invalidated');
});

// ---- "Why did this change?" -------------------------------------------------------

test('diffFundamentals: records material moves and flags invalidation', () => {
  const d = diffFundamentals(
    { earnings_growth_yoy: 20, net_margin: 15, debt_to_equity: 0.5 },
    { earnings_growth_yoy: -25, net_margin: 16, debt_to_equity: 1.0 },
  );
  const fields = d.changed_fields.map((c) => c.field).sort();
  assert.deepEqual(fields, ['debt_to_equity', 'earnings_growth_yoy'], 'a 1pt margin move is not material');
  assert.ok(d.changed_fields.every((c) => c.direction === 'deteriorated'));
  assert.equal(d.score, -2);
  assert.equal(d.invalidated, true, 'earnings growth collapsed below -20');
});

test('diffFundamentals: improvements score up; missing data is skipped', () => {
  const up = diffFundamentals({ revenue_growth_yoy: 5 }, { revenue_growth_yoy: 15 });
  assert.equal(up.score, 1);
  assert.equal(up.changed_fields[0].direction, 'improved');
  const none = diffFundamentals({ roe: null }, { roe: 30 });
  assert.equal(none.changed_fields.length, 0, 'no baseline → nothing to compare');
});

// ---- market regime + watchlist insight ----------------------------------------------

test('marketRegime: needs a sample, then reads breadth', () => {
  assert.equal(marketRegime([{ trend: 'bullish' }]).label, 'unknown');
  const bull = Array.from({ length: 6 }, () => ({ trend: 'bullish', rsi14: 60, setup: 'none' }));
  assert.equal(marketRegime(bull).label, 'bullish');
  const bear = Array.from({ length: 6 }, () => ({ trend: 'bearish', rsi14: 35, setup: 'none' }));
  assert.equal(marketRegime(bear).label, 'bearish');
});

// ---- VWAP + multi-timeframe ---------------------------------------------------------

test('vwap: volume-weighted typical price; null without volume', () => {
  const c = [
    { high: 11, low: 9, close: 10, volume: 100 },   // typical price 10
    { high: 21, low: 19, close: 20, volume: 300 },  // typical price 20
  ];
  assert.equal(vwap(c, 2), 17.5);
  assert.equal(vwap([{ close: 10 }, { close: 11 }], 2), null, 'close-only data (NGX) → no VWAP');
});

test('sessionVwap: only counts the latest trading day', () => {
  const c = [
    { date: '2026-09-08T19:30:00Z', high: 100, low: 100, close: 100, volume: 1000 },
    { date: '2026-09-09T13:30:00Z', high: 10, low: 10, close: 10, volume: 1 },
    { date: '2026-09-09T14:30:00Z', high: 20, low: 20, close: 20, volume: 1 },
  ];
  assert.equal(sessionVwap(c), 15);
});

test('aggregateCandles: 1H → 4H, never across two days', () => {
  const bar = (date, o, h, l, c, v) => ({ date, open: o, high: h, low: l, close: c, volume: v });
  const out = aggregateCandles([
    bar('2026-09-08T13:30Z', 10, 12, 9, 11, 1), bar('2026-09-08T14:30Z', 11, 13, 10, 12, 1),
    bar('2026-09-08T15:30Z', 12, 15, 11, 14, 1), bar('2026-09-08T16:30Z', 14, 14, 8, 9, 1),
    bar('2026-09-08T17:30Z', 9, 10, 9, 10, 1),
    bar('2026-09-09T13:30Z', 20, 21, 19, 20, 2), bar('2026-09-09T14:30Z', 20, 22, 20, 21, 2),
  ], 4);
  assert.equal(out.length, 3, '4 + 1 bars on day one, 2 on day two');
  assert.deepEqual(out[0], { date: '2026-09-08T13:30Z', open: 10, high: 15, low: 8, close: 9, volume: 4 });
  assert.equal(out[2].date.slice(0, 10), '2026-09-09');
});

test('frameRead: trend, momentum and VWAP position', () => {
  assert.deepEqual(frameRead({ ok: false }), { available: false });
  const f = frameRead({ ok: true, price: 10, trend: 'bullish', rsi14: 60, macd: { histogram: 0.5 } }, 9);
  assert.equal(f.bias, 1);
  assert.equal(f.momentum, 'rising');
  assert.equal(f.above_vwap, true);
});

test('multiTimeframe: reads alignment across weekly → 1H', () => {
  const fr = (bias, extra = {}) => ({ available: true, bias, momentum: 'rising', vwap: null, above_vwap: null, ...extra });
  assert.equal(multiTimeframe({ '1wk': fr(1), '1d': fr(1), '4h': fr(1), '1h': fr(1) }).alignment, 'aligned_bullish');
  assert.equal(multiTimeframe({ '1wk': fr(1), '1d': fr(1), '4h': fr(-1), '1h': fr(-1) }).alignment, 'pullback_in_uptrend');
  assert.equal(multiTimeframe({ '1wk': fr(-1), '1d': fr(-1), '4h': fr(-1), '1h': fr(1) }).alignment, 'counter_trend');
  assert.equal(multiTimeframe({ '1wk': fr(-1), '1d': fr(-1) }).alignment, 'aligned_bearish');
  assert.equal(multiTimeframe({ '1d': fr(1), '1wk': { available: false } }).alignment, 'insufficient', 'NGX: daily only');
});

test('multiTimeframe: lower-timeframe confirmation needs momentum AND VWAP', () => {
  const base = { '1wk': { available: true, bias: 1 }, '1d': { available: true, bias: 1 } };
  const met = multiTimeframe({ ...base, '1h': { available: true, bias: 1, momentum: 'rising', vwap: 184.2, above_vwap: true } });
  assert.equal(met.lower_confirmed, true);
  assert.match(met.confirmation, /1H price holding above its VWAP \(184\.20\)/);
  const belowVwap = multiTimeframe({ ...base, '1h': { available: true, bias: 1, momentum: 'rising', vwap: 184.2, above_vwap: false } });
  assert.equal(belowVwap.lower_confirmed, false);
  const falling = multiTimeframe({ ...base, '1h': { available: true, bias: 1, momentum: 'falling', vwap: null, above_vwap: null } });
  assert.equal(falling.lower_confirmed, false);
  const sidewaysNoVwap = multiTimeframe({ ...base, '1h': { available: true, bias: 0, momentum: 'rising', vwap: null, above_vwap: null } });
  assert.equal(sidewaysNoVwap.lower_confirmed, false, 'no VWAP → momentum alone is not enough');
  const upNoVwap = multiTimeframe({ ...base, '1h': { available: true, bias: 1, momentum: 'rising', vwap: null, above_vwap: null } });
  assert.equal(upNoVwap.lower_confirmed, true);
});

test('sessionVwap: falls back to the last session that traded', () => {
  const c = [
    { date: '2026-09-08T14:30:00Z', high: 50, low: 50, close: 50, volume: 10 },
    { date: '2026-09-09T13:30:00Z', high: 60, low: 60, close: 60, volume: 0 }, // pre-open / no volume yet
  ];
  assert.equal(sessionVwap(c), 50);
  assert.equal(sessionVwap([{ date: '2026-09-09T13:30:00Z', high: 60, low: 60, close: 60, volume: 5 }]), 60, 'one traded bar is enough');
});

test('isUsRegularSession: 09:30–16:00 New York, daylight saving handled', () => {
  // September = EDT (UTC-4): the open is 13:30 UTC.
  assert.equal(isUsRegularSession('2026-09-09T13:00:00Z'), false, 'pre-market');
  assert.equal(isUsRegularSession('2026-09-09T13:30:00Z'), true, 'opening bar');
  assert.equal(isUsRegularSession('2026-09-09T19:30:00Z'), true, 'last regular bar');
  assert.equal(isUsRegularSession('2026-09-09T20:00:00Z'), false, 'bar starting at the close');
  // January = EST (UTC-5): the open is 14:30 UTC.
  assert.equal(isUsRegularSession('2026-01-14T14:00:00Z'), false);
  assert.equal(isUsRegularSession('2026-01-14T14:30:00Z'), true);
});

test('filterUsRegularSession: keeps the 7 session bars of a 17-bar Yahoo day', () => {
  const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '13:30', '14:30', '15:30',
    '16:30', '17:30', '18:30', '19:30', '20:00', '21:00', '22:00', '23:00'];
  const day = times.map((t) => ({ date: `2026-09-09T${t}:00Z`, close: 1 }));
  const kept = filterUsRegularSession(day).map((c) => c.date.slice(11, 16));
  assert.deepEqual(kept, ['13:30', '14:30', '15:30', '16:30', '17:30', '18:30', '19:30']);
});

// ---- missed setups (§14) -------------------------------------------------------------

const MS = { entry_low: 100, entry_high: 104, invalidation: 95, targets: [{ level: 118 }], setup: 'pullback', reasons: ['Held the 50-day average'] };
const reachedEntry = [{ to_status: 'watching' }, { to_status: 'triggered', price_at: '101', created_at: '2026-09-01' }];

test('describeMissedSetup: reached target', () => {
  const d = describeMissedSetup({ ...MS, status: 'target' }, 120, [...reachedEntry, { to_status: 'active' }, { to_status: 'target' }]);
  assert.equal(d.outcome, 'target');
  assert.match(d.what_happened, /\$118 target, about 15\.7% from the middle/); // mid 102
  assert.match(d.lesson, /Pullbacks/);
  assert.equal(d.trigger.price, 101);
  assert.deepEqual(d.factors, ['Held the 50-day average']);
});

test('describeMissedSetup: invalidated → shows the loss that was avoided', () => {
  const d = describeMissedSetup({ ...MS, status: 'invalidated' }, 92, [...reachedEntry, { to_status: 'invalidated' }]);
  assert.equal(d.outcome, 'invalidated');
  assert.match(d.what_happened, /loss of about 6\.9%/); // (95-102)/102
  assert.match(d.lesson, /avoided that loss/);
});

test('describeMissedSetup: still running, and never phrased as "missed out"', () => {
  const d = describeMissedSetup({ ...MS, status: 'active' }, 110, [...reachedEntry, { to_status: 'active' }]);
  assert.equal(d.outcome, 'running');
  assert.match(d.what_happened, /7\.8% above the middle/);
  assert.doesNotMatch(`${d.what_happened} ${d.lesson}`.toLowerCase(), /missed out/);
});

test('describeMissedSetup: never reached the entry zone → nothing was missed', () => {
  assert.equal(describeMissedSetup({ ...MS, status: 'invalidated' }, 90, [{ to_status: 'watching' }, { to_status: 'invalidated' }]), null);
});

// ---- investment profile (§3) ------------------------------------------------------------

test('normalizeRisk: spec names, legacy aliases, junk → null', () => {
  assert.equal(normalizeRisk('conservative'), 'conservative');
  assert.equal(normalizeRisk('low'), 'conservative');
  assert.equal(normalizeRisk('HIGH'), 'aggressive');
  assert.equal(normalizeRisk('yolo'), null);
  assert.equal(normalizeRisk(null), null);
});

test('cleanProfile: keeps known keys and values only', () => {
  const p = cleanProfile({
    styles: ['growth', 'growth', 'crypto'], sectors: ['Banking', ' Banking ', '', 42],
    holding_period: 'forever', company_size: 'large', admin: true,
  });
  assert.deepEqual(p, { styles: ['growth'], sectors: ['Banking'], company_size: 'large' });
  assert.deepEqual(cleanProfile('nope'), {});
  assert.equal(cleanProfile({ sectors: Array.from({ length: 20 }, (_, i) => `S${i}`) }).sectors.length, 12);
});

test('longtermWeights: styles and risk shift the ranking', () => {
  const base = longtermWeights();
  assert.equal(base.cheap, 0);
  assert.equal(base.low_vol, 0);
  const div = longtermWeights({ styles: ['dividend'] });
  assert.ok(div.dividend > base.dividend, 'dividend style weights yield up');
  const value = longtermWeights({ styles: ['value'] });
  assert.ok(value.cheap > 0, 'value style rewards a low P/E');
  const safe = longtermWeights({}, 'conservative');
  assert.ok(safe.low_vol > 0 && safe.low_debt > base.low_debt, 'conservative favours low volatility and debt');
  const bold = longtermWeights({}, 'aggressive');
  assert.ok(bold.low_debt < base.low_debt);
});

test('longtermWeights: a chosen style becomes the heaviest factor', () => {
  const heaviest = (w) => Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(heaviest(longtermWeights({ styles: ['dividend'] })), 'dividend');
  assert.equal(heaviest(longtermWeights({ styles: ['value'] })), 'cheap');
  assert.equal(heaviest(longtermWeights({ styles: ['growth'] })), 'revenue_growth');
  assert.equal(heaviest(longtermWeights({ styles: ['momentum'] })), 'momentum');
});

test('swingAtrCap and sizeFloor', () => {
  assert.equal(swingAtrCap('conservative'), 3);
  assert.equal(swingAtrCap('moderate'), 5);
  assert.equal(swingAtrCap('aggressive'), null);
  assert.equal(swingAtrCap(null), null, 'no profile → no cap');
  assert.equal(sizeFloor('large'), 0.7);
  assert.equal(sizeFloor('mid_and_up'), 0.4);
  assert.equal(sizeFloor(undefined), 0);
});

// ---- background jobs: news, watchlist, briefing (§29) ------------------------------------

test('classifyHeadline: material events vs noise', () => {
  assert.equal(classifyHeadline('GTCO H1 results: profit up 30%').kind, 'earnings');
  assert.equal(classifyHeadline('Zenith Bank declares interim dividend').kind, 'dividend');
  assert.equal(classifyHeadline('Microsoft to acquire gaming studio').kind, 'm&a');
  assert.equal(classifyHeadline('Company sued over data breach').kind, 'legal');
  assert.equal(classifyHeadline('CEO of MTN Nigeria steps down').kind, 'leadership');
  assert.equal(classifyHeadline('Analysts cut outlook after profit warning').material, true);
  assert.equal(classifyHeadline('Dangote Cement announces rights issue').kind, 'capital');
  for (const noise of ['Apple stock rises 1% on Tuesday', 'Is this the best stock to own right now?', 'Second chance to buy?']) {
    assert.equal(classifyHeadline(noise).material, false, noise);
  }
});

test('shouldNotifyWatchlist: only meaningful moves, never the first sighting, with a cooldown', () => {
  const now = Date.parse('2026-09-10T12:00:00Z');
  assert.equal(shouldNotifyWatchlist(null, 'ready'), false, 'first reading is stored silently');
  assert.equal(shouldNotifyWatchlist('developing', 'ready'), true);
  assert.equal(shouldNotifyWatchlist('ready', 'ready'), false);
  assert.equal(shouldNotifyWatchlist('ready', 'neutral'), false, 'drifting to neutral is not alert-worthy');
  const recent = { last_alert_status: 'ready', last_alert_at: '2026-09-10T11:00:00Z' };
  assert.equal(shouldNotifyWatchlist('developing', 'ready', recent, now), false, 'same alert within 72h');
  const old = { last_alert_status: 'ready', last_alert_at: '2026-09-06T11:00:00Z' };
  assert.equal(shouldNotifyWatchlist('developing', 'ready', old, now), true);
});

test('briefingMessage: summarises only what changed', () => {
  assert.equal(briefingMessage({}), null);
  assert.equal(
    briefingMessage({ approaching: 2, theses: 1, news: 1 }),
    'Since your last visit: 2 setups approaching entry, 1 thesis change, 1 news item on your stocks.'
  );
  assert.match(lagosDate(new Date('2026-09-09T23:30:00Z')), /^2026-09-10$/, 'Lagos is UTC+1');
});

test('watchlistInsight: technicals → status', () => {
  assert.equal(watchlistInsight(null).status, 'no_data');
  assert.equal(watchlistInsight({ trend: 'bullish', setup: 'breakout', quality_score: 75 }).status, 'strong_setup');
  assert.equal(watchlistInsight({ trend: 'bearish', setup: 'none' }).status, 'weakening');
});
