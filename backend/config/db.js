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

  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000, // generous: remote DBs (Render) over SSL can be slow to connect
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();

export { pool };

export default { query, getClient, pool };