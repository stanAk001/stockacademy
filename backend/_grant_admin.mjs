// One-off: make a user an admin + lifetime premium. Run with DATABASE_URL
// pointed at the target database (e.g. Render External URL), then delete me.
import db from './config/db.js';

const email = 'akeemgbolahan58@gmail.com';

try {
  const { rowCount } = await db.query(
    `UPDATE users
       SET is_admin = TRUE,
           plan = 'premium',
           plan_expires_at = NOW() + INTERVAL '100 years'
     WHERE email = $1`,
    [email]
  );
  console.log(
    rowCount
      ? `✅ ${email} is now admin + premium. Reload the site (and log out/in if needed).`
      : `⚠️  No user found with email ${email}. Sign up on the live site first, then re-run.`
  );
} catch (e) {
  console.error('❌ failed:', e.message);
  process.exitCode = 1;
} finally {
  await db.pool.end();
}
