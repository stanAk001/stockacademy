// Premium membership lifecycle: reminders, grace period, automatic downgrade.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeDb, mockDb, modUrl } from './helpers.js';

const db = createFakeDb();
mockDb(db);
const sent = [];
mock.module(modUrl('services/notificationEngine.js'), { exports: { dispatch: async (n) => { sent.push(n); } } });

const { membershipState, keepingLine, membershipMessage, runMembershipLifecycle } = await import('../services/membership.js');

const DAY = 86400000;
const NOW = Date.parse('2026-09-10T12:00:00Z');
const at = (days) => new Date(NOW + days * DAY);

// ---- pure ---------------------------------------------------------------------

test('membershipState: active → ending_soon → grace → lapsed', () => {
  assert.equal(membershipState({ plan: 'premium', plan_renews_at: at(10) }, NOW).state, 'active');
  const soon = membershipState({ plan: 'premium', plan_renews_at: at(2.5) }, NOW);
  assert.equal(soon.state, 'ending_soon');
  assert.equal(soon.days_left, 3);
  assert.equal(membershipState({ plan: 'premium', plan_renews_at: at(-1) }, NOW).state, 'grace');
  assert.equal(membershipState({ plan: 'premium', plan_renews_at: at(-3) }, NOW).state, 'lapsed');
  assert.equal(membershipState({ plan: 'free' }, NOW).state, 'free');
});

test('membershipState: legacy column read, lifetime grants left alone', () => {
  assert.equal(membershipState({ plan: 'premium', plan_expires_at: at(-3) }, NOW).state, 'lapsed');
  const life = membershipState({ plan: 'premium', plan_expires_at: new Date('2126-06-21') }, NOW);
  assert.equal(life.lifetime, true);
});

test('keepingLine: says what Premium is doing for this user', () => {
  assert.equal(keepingLine({}), null);
  assert.equal(
    keepingLine({ setups: 3, positions: 2, theses: 1, watchlist: 4 }),
    'Premium is watching 3 setups, 2 positions, 1 investment thesis and 4 watched stocks for you.'
  );
  assert.equal(keepingLine({ theses: 2 }), 'Premium is watching 2 investment theses for you.');
});

test('membershipMessage: reminder, auto-renew, ended, moved to Free', () => {
  const r = membershipMessage('reminder', { endsAt: at(3), keeping: 'Premium is watching 2 setups for you.' }, NOW);
  assert.equal(r.title, 'Your Premium ends in 3 days');
  assert.match(r.message, /renewing early loses nothing/);
  assert.match(r.message, /watching 2 setups/);

  const a = membershipMessage('reminder', { endsAt: at(3), autoRenew: true, cardLast4: '4242' }, NOW);
  assert.match(a.message, /renews automatically on .* \(card ending 4242\)/);

  const e = membershipMessage('expired', { endsAt: at(-1), graceEndsAt: at(1) }, NOW);
  assert.match(e.message, /You keep full access until 11 Sept?\.? 2026/);

  const d = membershipMessage('downgraded', { keeping: 'Premium is watching 3 setups and 1 position for you.' }, NOW);
  assert.match(d.message, /Your 3 setups and 1 position are saved/);
  for (const m of [r, a, e, d]) assert.doesNotMatch(m.message, /guarantee|risk-free/i);
});

// ---- the job ------------------------------------------------------------------

// A fake DB for the lifecycle job. `firstTime` controls whether a notice is new.
const lifecycleDb = ({ users, firstTime = true, noticed = false }) => (text) => {
  if (text.includes('FROM users WHERE plan = \'premium\'')) return { rows: users };
  if (text.includes('INSERT INTO membership_events')) return { rows: firstTime ? [{ id: 1 }] : [] };
  if (text.includes('FROM membership_events e JOIN users u')) return { rows: noticed ? [{ '?column?': 1 }] : [] };
  if (text.includes("UPDATE users SET plan = 'free'")) return { rows: [{ id: users[0].id }] };
  if (text.includes('SELECT COUNT(*) FROM ai_setups')) return { rows: [{ setups: 3, positions: 2, theses: 0, watchlist: 0 }] };
  return { rows: [] };
};

test('job: a reminder goes out once, a few days before the end, on every channel', async () => {
  sent.length = 0;
  db.onQuery(lifecycleDb({ users: [{ id: 42, plan: 'premium', plan_renews_at: at(2) }] }));
  const r = await runMembershipLifecycle(NOW);
  assert.equal(r.reminders, 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'membership_reminder');
  assert.equal(sent[0].deepLink, '/pricing');
  assert.deepEqual(sent[0].channels, ['in_app', 'push', 'telegram', 'email']);
  assert.match(sent[0].message, /watching 3 setups and 2 positions/);

  sent.length = 0;
  db.onQuery(lifecycleDb({ users: [{ id: 42, plan: 'premium', plan_renews_at: at(2) }], firstTime: false }));
  assert.equal((await runMembershipLifecycle(NOW)).reminders, 0, 'already reminded for this period');
  assert.equal(sent.length, 0);
});

test('job: the day it ends, an "ended" notice; Premium keeps working', async () => {
  sent.length = 0;
  db.onQuery(lifecycleDb({ users: [{ id: 7, plan: 'premium', plan_renews_at: at(-0.5) }] }));
  const r = await runMembershipLifecycle(NOW);
  assert.equal(r.expired, 1);
  assert.equal(r.downgraded, 0);
  assert.equal(sent[0].type, 'membership_expired');
  assert.equal(db.find("UPDATE users SET plan = 'free'").length, 0, 'not downgraded during grace');
});

test('job: after the grace period (having been warned) → moved to Free', async () => {
  sent.length = 0;
  db.onQuery(lifecycleDb({ users: [{ id: 7, plan: 'premium', plan_renews_at: at(-3) }], noticed: true }));
  const r = await runMembershipLifecycle(NOW);
  assert.equal(r.downgraded, 1);
  assert.equal(db.find("UPDATE users SET plan = 'free'").length, 1);
  assert.equal(sent[0].type, 'membership_downgraded');
  assert.match(sent[0].message, /are saved/);
});

test('job: never warned (expired before this existed) → warned now, fair 2-day window, NOT cut off', async () => {
  sent.length = 0;
  db.onQuery(lifecycleDb({ users: [{ id: 1, plan: 'premium', plan_expires_at: new Date('2026-06-06') }], noticed: false }));
  const r = await runMembershipLifecycle(NOW);
  assert.equal(r.fair_notice, 1);
  assert.equal(r.downgraded, 0);
  assert.equal(db.find('SET plan_renews_at = NOW()').length, 1, 'grace window restarts today');
  assert.equal(sent[0].type, 'membership_expired');
  assert.match(sent[0].message, /ended on 6 Jun 2026\. You keep full access until 12 Sept?\.? 2026/);
});

test('job: lifetime grants and active members are left alone', async () => {
  sent.length = 0;
  db.onQuery(lifecycleDb({ users: [
    { id: 3, plan: 'premium', plan_expires_at: new Date('2126-06-21') },
    { id: 44, plan: 'premium', plan_renews_at: at(19) },
  ] }));
  const r = await runMembershipLifecycle(NOW);
  assert.equal(r.checked, 2);
  assert.equal(sent.length, 0);
});
