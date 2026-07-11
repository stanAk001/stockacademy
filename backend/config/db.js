import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Remote databases (Render, Supabase, etc.) require SSL; a local Postgres
  // doesn't. Key it on the host so a one-off migration run from your laptop
  // against the Render database also connects (it isn't localhost → SSL on).
  ssl: /@(localhost|127\.0\.0\.1|::1)/.test(process.env.DATABASE_URL || "")
    ? false
    : { rejectUnauthorized: false },

  // Pool sizing is env-tunable so you can lift it with your DB plan. Keep it at
  // or below your Postgres connection limit (Render's free tier is small).
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // remote DBs (Render) over SSL can be slow to connect
  keepAlive: true,                 // avoid idle-connection resets under load
  statement_timeout: 20000,        // kill a runaway query instead of letting it hog a connection
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// A dropped idle connection must NOT take the whole server down — that's how one
// blip becomes an outage for every user. Log it; the pool replaces the client.
pool.on('error', (err) => {
  console.error('⚠️ Idle Postgres client error (recovering):', err.message);
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();

export { pool };

export default { query, getClient, pool };