// ============================================================
// migrate.js — applies pending SQL migrations to whatever
// DATABASE_URL points to (set in backend/.env).
//
//   npm run migrate            → run any migrations not yet applied
//   npm run migrate:baseline   → mark ALL current files as applied
//                                WITHOUT running them (use once on a
//                                database that is already set up, e.g.
//                                your existing dev DB)
//
// Applied files are recorded in a `schema_migrations` table, so each
// migration runs exactly once per database. Each runs inside its own
// transaction — if one fails it rolls back and the run stops, so the
// database is never left half-migrated.
// ============================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.resolve(__dirname, '../../database');
const BACKEND_MIG_DIR = path.resolve(__dirname, '../migrations');

const numOf = (f) => {
  const m = f.match(/^migration_(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
};

// Ordered list: base schema first, then numbered migrations in order. The
// certificates migration (under backend/migrations) slots in right after
// migration_09 — the same order the original setup script used. New numbered
// migrations are picked up automatically; no need to edit this file.
function buildOrder() {
  const order = [];
  const schema = path.join(DB_DIR, 'schema.sql');
  if (fs.existsSync(schema)) order.push({ name: 'schema.sql', file: schema });

  const numbered = fs.readdirSync(DB_DIR)
    .filter((f) => /^migration_\d+.*\.sql$/i.test(f))
    .sort((a, b) => numOf(a) - numOf(b));

  for (const f of numbered) {
    order.push({ name: f, file: path.join(DB_DIR, f) });
    if (numOf(f) === 9) {
      const cert = path.join(BACKEND_MIG_DIR, 'add_certificates.sql');
      if (fs.existsSync(cert)) order.push({ name: 'add_certificates.sql', file: cert });
    }
  }
  return order;
}

async function main() {
  const baseline = process.argv.includes('--baseline');
  const order = buildOrder();
  const client = await db.getClient();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.filename));
    const pending = order.filter((o) => !applied.has(o.name));

    // --- baseline: record everything as applied, run nothing ---
    if (baseline) {
      for (const o of order) {
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
          [o.name]
        );
      }
      console.log(`✅ Baseline set — ${order.length} file(s) marked as already applied.`);
      console.log('   From now on, new migrations run with:  npm run migrate');
      return;
    }

    // --- normal: apply only what's pending ---
    if (pending.length === 0) {
      console.log('✅ Database is up to date — no pending migrations.');
      return;
    }

    console.log(`Applying ${pending.length} pending migration(s):\n`);
    for (const o of pending) {
      const sql = fs.readFileSync(o.file, 'utf8');
      process.stdout.write(`  → ${o.name} ... `);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [o.name]);
        await client.query('COMMIT');
        console.log('done');
      } catch (e) {
        await client.query('ROLLBACK');
        console.log('FAILED');
        console.error(`\n❌ ${o.name} failed and was rolled back:\n   ${e.message}\n`);
        console.error('   Nothing after this point was applied. Fix it, then re-run npm run migrate.');
        process.exitCode = 1;
        return;
      }
    }
    console.log(`\n✅ Done — applied ${pending.length} migration(s). Database is up to date.`);
  } finally {
    client.release();
    await db.pool.end();
  }
}

main().catch(async (e) => {
  console.error('❌ Migration runner error:', e.message);
  try { await db.pool.end(); } catch { /* already closed */ }
  process.exit(1);
});
