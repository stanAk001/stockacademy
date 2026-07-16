// ============================================================
// appUrl.js — the ONE canonical front-end URL used to BUILD links.
//
// Why this exists: CLIENT_URL doubles as the CORS allowlist, where a
// comma-separated list is legitimate. But the same variable is interpolated into
// links we hand to third parties:
//
//   callback_url: `${CLIENT_URL}/upgrade/verify?reference=...`   → Paystack
//   redirect_url: `${CLIENT_URL}/certificate/verify?...`         → Flutterwave
//   `${CLIENT_URL}/reset-password?token=...`                     → email
//
// If CLIENT_URL ever holds a list, those become
// "https://a,https://b/upgrade/verify?..." and payments break silently. Taking
// the first entry (and trimming any trailing slash) makes that impossible.
//
// Rule: CORS reads CLIENT_URL + CORS_ORIGINS. Everything that builds a link
// imports CANONICAL_URL from here.
// ============================================================
export const CANONICAL_URL = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')[0]
  .trim()
  .replace(/\/+$/, '');

/** Build an absolute app URL: appUrl('/upgrade/verify') */
export const appUrl = (path = '') => `${CANONICAL_URL}${path}`;
