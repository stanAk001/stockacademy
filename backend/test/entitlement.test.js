// Free → Premium metering: the part a user could try to bypass, so it's tested
// against the server code directly (no frontend involved).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeDb, mockDb, runMiddleware } from './helpers.js';

const db = createFakeDb();
mockDb(db);

const svc = await import('../services/entitlementService.js');
const { meterFeature, consumeEntitlement, attachPlan } = await import('../middleware/entitlement.js');
const { requirePremium } = await import('../middleware/requirePremium.js');

const FREE = { id: 7, plan: 'free' };
const PREM = { id: 8, plan: 'premium' };

// Answer the plan lookup and the usage count.
const answer = ({ plan = 'free', used = 0 } = {}) => (text) => {
  if (text.includes('FROM users')) return { rows: [{ id: 7, plan }] };
  if (text.includes('FROM feature_usage')) return { rows: used == null ? [] : [{ used }] };
  return { rows: [] };
};

// ---- entitlementService --------------------------------------------------------

test('checkAccess: premium is unlimited and never counted', async () => {
  db.onQuery(answer({ used: 999 }));
  const a = await svc.checkAccess(PREM, 'ai_scout');
  assert.equal(a.allowed, true);
  assert.equal(a.premium, true);
  assert.equal(db.find('feature_usage').length, 0);
});

test('checkAccess: free user inside and at the limit', async () => {
  db.onQuery(answer({ used: 1 }));
  const inside = await svc.checkAccess(FREE, 'ai_scout');
  assert.equal(inside.allowed, true);
  assert.equal(inside.remaining, 1);

  db.onQuery(answer({ used: 2 }));
  const out = await svc.checkAccess(FREE, 'ai_scout');
  assert.equal(out.allowed, false);
  assert.equal(out.remaining, 0);
});

test('checkAccess: a feature with no free limit is premium-only', async () => {
  db.onQuery(answer());
  const a = await svc.checkAccess(FREE, 'ai_swing_plans');
  assert.equal(a.allowed, false);
  assert.equal(a.premiumOnly, true);
});

test('checkAccess: usage table missing (migration not applied) → treated as 0 used', async () => {
  db.onQuery((text) => { if (text.includes('feature_usage')) throw new Error('relation "feature_usage" does not exist'); return { rows: [] }; });
  const a = await svc.checkAccess(FREE, 'ai_scout');
  assert.equal(a.allowed, true);
});

test('consume: counts free use in the right window, skips premium', async () => {
  db.onQuery(answer());
  await svc.consume(PREM, 'ai_scout');
  assert.equal(db.find('INSERT INTO feature_usage').length, 0);

  await svc.consume(FREE, 'ai_scout');
  const [ins] = db.find('INSERT INTO feature_usage');
  assert.deepEqual(ins.params.slice(0, 3), [7, 'ai_scout', 'month']);
  assert.match(ins.params[3], /^\d{4}-\d{2}-01$/, 'month window starts on the 1st');

  db.onQuery(answer());
  await svc.consume(FREE, 'tracked_setup');
  assert.equal(db.find('INSERT INTO feature_usage')[0].params[3], '1970-01-01', "'total' window never resets");
});

// ---- meterFeature / consumeEntitlement ---------------------------------------------

test('meterFeature: out of allowance → 402 upgrade, handler never runs', async () => {
  db.onQuery(answer({ used: 2 }));
  const { res, nexted } = await runMiddleware(meterFeature('ai_scout'), { user: { id: 7 } });
  assert.equal(nexted, false);
  assert.equal(res.statusCode, 402);
  assert.equal(res.body.upgrade, true);
  assert.equal(res.body.limit, 2);
  assert.equal(db.find('analytics_events')[0].params[1], 'limit_reached');
});

test('meterFeature: inside allowance → passes and does NOT consume yet', async () => {
  db.onQuery(answer({ used: 1 }));
  const req = { user: { id: 7 } };
  const { nexted } = await runMiddleware(meterFeature('ai_scout'), req);
  assert.equal(nexted, true);
  assert.equal(req.entitlement.remaining, 1);
  assert.equal(db.find('INSERT INTO feature_usage').length, 0, 'slot is only spent after success');

  await consumeEntitlement(req);
  assert.equal(db.find('INSERT INTO feature_usage').length, 1);
  assert.ok(db.find('analytics_events').some((c) => c.params[1] === 'ai_feature_used'));
});

test('meterFeature: premium passes regardless of usage', async () => {
  db.onQuery(answer({ plan: 'premium', used: 500 }));
  const { nexted } = await runMiddleware(meterFeature('ai_scout'), { user: { id: 7 } });
  assert.equal(nexted, true);
});

test('meterFeature: no user → 401', async () => {
  db.onQuery(answer());
  const { res, nexted } = await runMiddleware(meterFeature('ai_scout'), {});
  assert.equal(nexted, false);
  assert.equal(res.statusCode, 401);
});

// ---- attachPlan / requirePremium -------------------------------------------------------

test('attachPlan: lets everyone through and flags the plan', async () => {
  db.onQuery(answer({ plan: 'free' }));
  const free = { user: { id: 7 } };
  assert.equal((await runMiddleware(attachPlan, free)).nexted, true);
  assert.equal(free.isPremium, false);

  db.onQuery(answer({ plan: 'premium' }));
  const prem = { user: { id: 7 } };
  await runMiddleware(attachPlan, prem);
  assert.equal(prem.isPremium, true);
});

test('requirePremium: free → 403, premium → through', async () => {
  db.onQuery(() => ({ rows: [{ plan: 'free' }] }));
  const blocked = await runMiddleware(requirePremium, { user: { id: 7 } });
  assert.equal(blocked.nexted, false);
  assert.equal(blocked.res.statusCode, 403);

  db.onQuery(() => ({ rows: [{ plan: 'premium' }] }));
  assert.equal((await runMiddleware(requirePremium, { user: { id: 7 } })).nexted, true);

  db.onQuery(() => ({ rows: [{ plan: 'premium', plan_renews_at: new Date(Date.now() - 86400000) }] }));
  assert.equal((await runMiddleware(requirePremium, { user: { id: 7 } })).nexted, true, 'one day late: still inside the grace period');

  db.onQuery(() => ({ rows: [{ plan: 'premium', plan_renews_at: new Date(Date.now() - 3 * 86400000) }] }));
  assert.equal((await runMiddleware(requirePremium, { user: { id: 7 } })).res.statusCode, 403, 'grace over: blocked');

  db.onQuery(() => ({ rows: [{ plan: 'premium', plan_renews_at: null, plan_expires_at: new Date(Date.now() - 30 * 86400000) }] }));
  assert.equal((await runMiddleware(requirePremium, { user: { id: 7 } })).res.statusCode, 403, 'legacy plan_expires_at users no longer stay Premium forever');
});
