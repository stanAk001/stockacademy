// ============================================================
// insightsController.js — SEO content engine.
//   • generateDailyRecap()  — AI writes a daily NGX+US market recap (cron/admin)
//   • GET /api/insights, /api/insights/:slug  — JSON for the in-app pages
//   • GET /insights, /insights/:slug          — server-rendered crawlable HTML
//   • GET /sitemap.xml, /robots.txt           — help Google find the recaps
//
// The HTML pages are real (no JS needed), with title/meta/OG/JSON-LD + a
// "Start learning free" CTA, so search traffic funnels into signups.
// ============================================================
import db from '../config/db.js';
import { analyzeWithAI, parseJsonFromAI } from '../services/aiProvider.js';

const SITE = 'StockAcademia';
const DISCLAIMER = 'Educational analysis only — not financial advice. Investment decisions are yours to make.';

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Top daily movers for a market (reused from the digest logic).
async function topMovers(country) {
  const { rows } = await db.query(
    `SELECT display_symbol, name, day_change_pct
     FROM stocks
     WHERE country = $1 AND is_active = TRUE AND day_change_pct IS NOT NULL
     ORDER BY day_change_pct DESC NULLS LAST`,
    [country]
  );
  const n = (v) => (v == null ? null : +parseFloat(v).toFixed(2));
  const map = (r) => ({ symbol: r.display_symbol, name: r.name, change_pct: n(r.day_change_pct) });
  return { gainers: rows.slice(0, 5).map(map), losers: rows.slice(-5).reverse().map(map) };
}

async function logRecapUsage(result) {
  try {
    await db.query(
      `INSERT INTO ai_usage_log (user_id, feature, input_tokens, output_tokens, estimated_cost_usd)
       VALUES (NULL, 'market_recap', $1, $2, $3)`,
      [result.usage?.input_tokens || 0, result.usage?.output_tokens || 0, result.costUsd || 0]
    );
  } catch (e) { console.error('recap usage log failed:', e.message); }
}

// Build the article body HTML from the AI's structured fields (we control the
// markup, so no injection from model output beyond escaped text).
function renderRecapBody(a) {
  const bullets = (arr) => (Array.isArray(arr) ? arr : [])
    .map((b) => `<li>${escapeHtml(b)}</li>`).join('');
  return `
    <p class="lead">${escapeHtml(a.intro || '')}</p>
    <h2>🇳🇬 Nigerian market (NGX)</h2>
    <ul>${bullets(a.nigeria)}</ul>
    <h2>🇺🇸 US market</h2>
    <ul>${bullets(a.us)}</ul>
    ${a.takeaway ? `<p class="takeaway"><strong>The takeaway:</strong> ${escapeHtml(a.takeaway)}</p>` : ''}
  `;
}

/* ---- daily generation (cron + admin) ---- */
export async function generateDailyRecap({ force = false } = {}) {
  const today = new Date().toISOString().split('T')[0];
  const slug = `market-recap-${today}`;

  const existing = await db.query('SELECT id FROM market_recaps WHERE slug = $1', [slug]);
  if (existing.rows.length && !force) return { ok: true, skipped: true, slug };

  const data = { date: today, nigeria: await topMovers('NG'), united_states: await topMovers('US') };
  const system =
    `You are a financial journalist writing a SHORT daily market recap for BEGINNER investors ` +
    `(Nigerian NGX + US markets) on ${SITE}, an educational platform. Use ONLY the movers data given. ` +
    `Plain English, neutral and educational — no hype, no "guaranteed", no buy/sell calls, no price targets. ` +
    `Teach a small lesson where natural. Respond with ONLY valid JSON (no markdown fences): ` +
    `{"title": string (SEO-friendly headline including the date and 1-2 notable names), ` +
    `"meta_description": string (<=155 chars, compelling), "intro": string (1-2 sentences), ` +
    `"nigeria": string[] (2-4 short bullets), "us": string[] (2-4 short bullets), ` +
    `"takeaway": string (one-sentence lesson for a beginner)}.`;

  let result;
  try {
    result = await analyzeWithAI(system, JSON.stringify(data), { maxTokens: 1200, timeoutMs: 45000 });
  } catch (e) {
    console.error('recap AI error:', e.message);
    return { ok: false, error: e.code === 'AI_NOT_CONFIGURED' ? 'ai_not_configured' : 'ai_error' };
  }

  let a;
  try { a = parseJsonFromAI(result.text); } catch { return { ok: false, error: 'parse' }; }

  const title = a.title || `${SITE} Market Recap — ${today}`;
  const summary = (a.meta_description || a.intro || '').slice(0, 160);
  const bodyHtml = renderRecapBody(a);

  await db.query(
    `INSERT INTO market_recaps (slug, title, summary, body_html)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, body_html = EXCLUDED.body_html`,
    [slug, title, summary, bodyHtml]
  );
  await logRecapUsage(result);
  return { ok: true, slug, title };
}

/* ---- JSON API (for the in-app React pages) ---- */
export const listInsights = async (req, res) => {
  const { rows } = await db.query(
    `SELECT slug, title, summary, published_at FROM market_recaps ORDER BY published_at DESC LIMIT 50`
  );
  res.json({ success: true, insights: rows });
};

export const getInsight = async (req, res) => {
  const { rows } = await db.query(
    `SELECT slug, title, summary, body_html, published_at FROM market_recaps WHERE slug = $1`,
    [req.params.slug]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, insight: rows[0] });
};

/* ---- admin: generate now (for testing) ---- */
export const adminGenerateRecap = async (req, res) => {
  if (!req.user?.is_admin) return res.status(403).json({ success: false, message: 'Admins only' });
  const r = await generateDailyRecap({ force: true });
  if (!r.ok) return res.status(502).json({ success: false, message: `Could not generate (${r.error}). Check ANTHROPIC_API_KEY + credit.` });
  res.json({ success: true, ...r });
};

/* ============================================================
 *  SERVER-RENDERED HTML (crawlable) — the actual SEO surface
 * ============================================================ */
const APP_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const baseUrl = (req) => `${req.protocol}://${req.get('host')}`;

function htmlShell({ title, description, canonical, jsonLd, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description || '')}" />
<link rel="canonical" href="${escapeHtml(canonical)}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description || '')}" />
<meta property="og:site_name" content="${SITE}" />
<meta name="twitter:card" content="summary_large_image" />
${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
<style>
  :root { color-scheme: light; }
  body { margin:0; background:#FDF8F0; color:#0F1419; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height:1.65; }
  .wrap { max-width: 720px; margin: 0 auto; padding: 24px 20px 64px; }
  header.site { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 0; border-bottom:1px solid rgba(15,20,25,.08); }
  .brand { font-weight:800; letter-spacing:.04em; }
  .brand b { color:#F43F5E; }
  a { color:#047857; }
  h1 { font-size: 2rem; line-height:1.15; font-weight:800; letter-spacing:-.01em; margin:.6em 0 .2em; }
  h2 { font-size: 1.2rem; margin:1.4em 0 .4em; }
  .date { color: rgba(15,20,25,.5); font-size:.85rem; text-transform:uppercase; letter-spacing:.1em; font-weight:700; }
  .lead { font-size:1.1rem; }
  .takeaway { background:#FAF1E1; border-radius:14px; padding:14px 16px; }
  ul { padding-left: 1.1em; } li { margin:.35em 0; }
  .cta { margin:32px 0; padding:24px; background:#0F1419; color:#FDF8F0; border-radius:20px; text-align:center; }
  .cta a { display:inline-block; margin-top:12px; background:#FCD34D; color:#0F1419; font-weight:800; padding:12px 22px; border-radius:999px; text-decoration:none; }
  .card { display:block; padding:18px; border:1px solid rgba(15,20,25,.08); border-radius:18px; background:#fff; margin:12px 0; text-decoration:none; color:inherit; }
  .card h3 { margin:0 0 4px; font-size:1.1rem; }
  .card p { margin:0; color:rgba(15,20,25,.6); font-size:.95rem; }
  .disclaimer { color: rgba(15,20,25,.45); font-size:.8rem; margin-top:32px; }
  footer { border-top:1px solid rgba(15,20,25,.08); padding:20px 0; color:rgba(15,20,25,.5); font-size:.85rem; }
</style>
</head>
<body>
  <div class="wrap">
    <header class="site">
      <span class="brand">★ Stock<b>Academia</b></span>
      <a href="${APP_URL}/signup" style="font-weight:700;text-decoration:none;background:#0F1419;color:#FDF8F0;padding:8px 16px;border-radius:999px;">Start free</a>
    </header>
    ${body}
    <div class="cta">
      <strong style="font-size:1.15rem;">Want to actually understand the market?</strong>
      <div style="opacity:.7;font-size:.95rem;margin-top:6px;">Free courses, paper trading, and AI that even explains in Pidgin, Yorùbá, Hausa &amp; Igbo.</div>
      <a href="${APP_URL}/signup">Start learning free →</a>
    </div>
    <p class="disclaimer">${DISCLAIMER}</p>
    <footer>© ${new Date().getFullYear()} ${SITE} · <a href="${APP_URL}">Home</a> · <a href="/insights">All recaps</a></footer>
  </div>
</body>
</html>`;
}

export const insightsIndexHtml = async (req, res) => {
  const { rows } = await db.query(
    `SELECT slug, title, summary, published_at FROM market_recaps ORDER BY published_at DESC LIMIT 50`
  );
  const items = rows.map((r) => `
    <a class="card" href="/insights/${encodeURIComponent(r.slug)}">
      <div class="date">${new Date(r.published_at).toDateString()}</div>
      <h3>${escapeHtml(r.title)}</h3>
      <p>${escapeHtml(r.summary || '')}</p>
    </a>`).join('') || '<p>No recaps published yet — check back soon.</p>';

  const body = `
    <p class="date">Daily insights</p>
    <h1>NGX &amp; US market recaps</h1>
    <p class="lead">A short, beginner-friendly look at what moved each day — and what you can learn from it.</p>
    ${items}`;

  res.set('Content-Type', 'text/html; charset=utf-8').send(
    htmlShell({
      title: `Market Recaps — NGX & US daily insights | ${SITE}`,
      description: 'Daily beginner-friendly recaps of the Nigerian (NGX) and US stock markets — what moved and what it means.',
      canonical: `${baseUrl(req)}/insights`,
      body,
    })
  );
};

export const insightHtml = async (req, res) => {
  const { rows } = await db.query(
    `SELECT slug, title, summary, body_html, published_at FROM market_recaps WHERE slug = $1`,
    [req.params.slug]
  );
  if (!rows.length) {
    return res.status(404).set('Content-Type', 'text/html; charset=utf-8').send(
      htmlShell({ title: `Not found | ${SITE}`, description: '', canonical: `${baseUrl(req)}/insights`,
        body: '<h1>Recap not found</h1><p><a href="/insights">See all recaps →</a></p>' })
    );
  }
  const r = rows[0];
  const url = `${baseUrl(req)}/insights/${encodeURIComponent(r.slug)}`;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    headline: r.title, description: r.summary,
    datePublished: new Date(r.published_at).toISOString(),
    author: { '@type': 'Organization', name: SITE },
    publisher: { '@type': 'Organization', name: SITE },
    mainEntityOfPage: url,
  });
  const body = `
    <p class="date">${new Date(r.published_at).toDateString()}</p>
    <h1>${escapeHtml(r.title)}</h1>
    <article>${r.body_html || ''}</article>`;

  res.set('Content-Type', 'text/html; charset=utf-8').send(
    htmlShell({ title: `${r.title} | ${SITE}`, description: r.summary, canonical: url, jsonLd, body })
  );
};

export const sitemapXml = async (req, res) => {
  const { rows } = await db.query('SELECT slug, published_at FROM market_recaps ORDER BY published_at DESC LIMIT 1000');
  const b = baseUrl(req);
  const urls = [
    `<url><loc>${b}/insights</loc></url>`,
    ...rows.map((r) => `<url><loc>${b}/insights/${encodeURIComponent(r.slug)}</loc><lastmod>${new Date(r.published_at).toISOString()}</lastmod></url>`),
  ].join('');
  res.set('Content-Type', 'application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
  );
};

export const robotsTxt = (req, res) => {
  res.set('Content-Type', 'text/plain').send(
    `User-agent: *\nAllow: /\nSitemap: ${baseUrl(req)}/sitemap.xml\n`
  );
};
