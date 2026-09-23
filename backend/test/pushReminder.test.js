// "Your alerts can't reach your phone" reminder.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createFakeDb, mockDb, modUrl } from './helpers.js';

const db = createFakeDb();
mockDb(db);
const sent = [];
mock.module(modUrl('services/notificationEngine.js'), { exports: { dispatch: async (n) => { sent.push(n); } } });

const { remindMissingPush } = await import('../services/pushReminder.js');

test('reminds each user the query returns, and says how much is being watched', async () => {
  sent.length = 0;
  db.onQuery(() => ({ rows: [{ user_id: 7, watching: 3 }, { user_id: 9, watching: 1 }] }));

  const r = await remindMissingPush();

  assert.equal(r.reminded, 2);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].userId, 7);
  assert.equal(sent[0].type, 'push_reminder');
  assert.match(sent[0].message, /3 stocks/);
  assert.equal(sent[0].deepLink, '/profile?notifications=1');
  // singular reads properly
  assert.match(sent[1].message, /1 stock\b/);
});

test('only picks users with no push device and no recent reminder', async () => {
  db.onQuery(() => ({ rows: [] }));
  await remindMissingPush();

  const [q] = db.calls;
  assert.match(q.text, /NOT EXISTS[\s\S]*push_subscriptions/);
  assert.match(q.text, /NOT EXISTS[\s\S]*notifications/);
  assert.equal(q.params[0], 'push_reminder');
});

test('a missing table never breaks the monitor run', async () => {
  sent.length = 0;
  db.onQuery(() => { throw new Error('relation "ai_setups" does not exist'); });

  const r = await remindMissingPush();

  assert.deepEqual(r, { reminded: 0 });
  assert.equal(sent.length, 0);
});
