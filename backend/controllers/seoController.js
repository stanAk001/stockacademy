// ============================================================
// seoController.js — public, crawlable, server-rendered HTML for SEO.
//
// Same proven pattern as insightsController: the API host renders real HTML (not
// the SPA), with per-page metadata, JSON-LD, internal links and REAL product
// data. Every figure comes from our own tables and is shown with its source and
// freshness — never fabricated. Point the canonical domain's /stocks, /*-screener
// and /*-analysis paths at these routes (see the deploy note) so they rank on the
// main domain.
// ============================================================
import db from '../config/db.js';
import { CANONICAL_URL } from '../config/appUrl.js';
import { GUIDES, getGuide } from '../content/guides.js';

const SITE = 'StockAcademia';
const APP = CANONICAL_URL;
const DISCLAIMER =
  'Data is shown for education and research only — not investment advice, and not a buy/sell recommendation. ' +
  'Figures are sourced from our market data providers and may be delayed.';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const n = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const pct = (v) => (n(v) == null ? '—' : `${(n(v) * 100).toFixed(2)}%`);
const dec = (v, d = 2) => (n(v) == null ? '—' : n(v).toFixed(d));
const money = (v, cur) => (n(v) == null ? '—' : `${cur === 'NGN' ? '₦' : '$'}${n(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
const cap = (m) => {
  const v = n(m);
  if (v == null) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}T`;
  if (v >= 1000) return `${(v / 1000).toFixed(2)}B`;
  return `${v.toFixed(0)}M`;
};
const marketOf = (country) => (country === 'NG' ? 'ngx' : 'us');
const marketLabel = (country) => (country === 'NG' ? 'NGX' : 'US');

// ---- shared HTML shell -----------------------------------------------------
function shell({ title, description, canonical, jsonLd, breadcrumb, body }) {
  const ld = [];
  if (jsonLd) ld.push(jsonLd);
  if (breadcrumb) ld.push(JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: breadcrumb.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: b.url })),
  }));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(canonical)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:site_name" content="${SITE}" />
<meta name="twitter:card" content="summary_large_image" />
${ld.map((j) => `<script type="application/ld+json">${j}</script>`).join('\n')}
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin:0; background:#FDF8F0; color:#0F1419; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height:1.6; }
  .wrap { max-width: 860px; margin:0 auto; padding: 20px 20px 72px; }
  header.site { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 0; border-bottom:1px solid rgba(15,20,25,.08); }
  .brand { font-weight:800; letter-spacing:.03em; } .brand b { color:#F43F5E; }
  .cta-top { font-weight:700; text-decoration:none; background:#0F1419; color:#FDF8F0; padding:8px 16px; border-radius:999px; }
  nav.crumbs { font-size:.8rem; color:rgba(15,20,25,.5); margin:16px 0 4px; }
  nav.crumbs a { color:#047857; text-decoration:none; }
  a { color:#047857; }
  h1 { font-size: clamp(1.7rem, 4vw, 2.3rem); line-height:1.12; font-weight:800; letter-spacing:-.015em; margin:.4em 0 .25em; }
  h2 { font-size:1.25rem; margin:1.6em 0 .5em; }
  .sub { color:rgba(15,20,25,.6); font-size:1.05rem; }
  .pill { display:inline-block; font-size:.72rem; font-weight:800; text-transform:uppercase; letter-spacing:.08em; padding:3px 9px; border-radius:999px; background:#EAF6EF; color:#047857; }
  .pricebar { display:flex; flex-wrap:wrap; align-items:baseline; gap:12px; margin:10px 0; }
  .price { font-size:2rem; font-weight:800; }
  .muted { color:rgba(15,20,25,.5); font-size:.85rem; }
  table { border-collapse:collapse; width:100%; margin:10px 0; font-size:.94rem; }
  th, td { text-align:left; padding:9px 12px; border-bottom:1px solid rgba(15,20,25,.08); }
  th { font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; color:rgba(15,20,25,.5); }
  td.num, th.num { text-align:right; font-variant-numeric: tabular-nums; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin:12px 0; }
  .stat { border:1px solid rgba(15,20,25,.08); border-radius:14px; padding:12px 14px; background:#fff; }
  .stat .k { font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; color:rgba(15,20,25,.45); }
  .stat .v { font-size:1.15rem; font-weight:800; margin-top:2px; }
  .chips a { display:inline-block; margin:4px 6px 0 0; padding:6px 12px; border-radius:999px; background:#fff; border:1px solid rgba(15,20,25,.1); text-decoration:none; color:#0F1419; font-size:.85rem; font-weight:600; }
  .cta { margin:34px 0; padding:24px; background:#0F1419; color:#FDF8F0; border-radius:20px; text-align:center; }
  .cta a { display:inline-block; margin-top:12px; background:#FCD34D; color:#0F1419; font-weight:800; padding:12px 22px; border-radius:999px; text-decoration:none; }
  .faq { margin:8px 0; } .faq h3 { font-size:1rem; margin:14px 0 2px; }
  .disclaimer { color:rgba(15,20,25,.45); font-size:.8rem; margin-top:28px; }
  footer { border-top:1px solid rgba(15,20,25,.08); padding:18px 0; color:rgba(15,20,25,.5); font-size:.85rem; }
  footer a { color:rgba(15,20,25,.6); }
</style>
</head>
<body>
  <div class="wrap">
    <header class="site">
      <a href="${APP}" class="brand" style="text-decoration:none;color:inherit;">★ Stock<b>Academia</b></a>
      <a class="cta-top" href="${APP}/signup">Start free</a>
    </header>
    ${breadcrumb ? `<nav class="crumbs">${breadcrumb.map((b, i) => (i < breadcrumb.length - 1 ? `<a href="${esc(b.url)}">${esc(b.name)}</a> › ` : `<span>${esc(b.name)}</span>`)).join('')}</nav>` : ''}
    ${body}
    <div class="cta">
      <strong style="font-size:1.15rem;">Research any stock with AI</strong>
      <div style="opacity:.75;font-size:.95rem;margin-top:6px;">Fundamentals, technicals, plain-English analysis — plus paper trading to practise. Free to start.</div>
      <a href="${APP}/signup">Create a free account →</a>
    </div>
    <p class="disclaimer">${esc(DISCLAIMER)}</p>
    <footer>© ${new Date().getFullYear()} ${SITE} ·
      <a href="${APP}">Home</a> ·
      <a href="/ngx-stock-screener">NGX screener</a> ·
      <a href="/swing-trading-screener">Swing screener</a> ·
      <a href="/learn">Investing guides</a> ·
      <a href="/insights">Market recaps</a>
    </footer>
  </div>
</body>
</html>`;
}

const send = (res, html, status = 200) =>
  res.status(status).set('Content-Type', 'text/html; charset=utf-8').send(html);

// ---- individual stock page: /stocks/:market/:symbol ------------------------
export const stockPageHtml = async (req, res) => {
  try {
    const raw = String(req.params.symbol || '').trim().toUpperCase();
    const { rows } = await db.query(
      `SELECT s.*, t.trend, t.rsi14, t.setup, t.quality_score, t.setup_reason, t.computed_at AS tech_at
         FROM stocks s LEFT JOIN stock_technicals t ON t.symbol = s.symbol
        WHERE UPPER(s.symbol) = $1 OR UPPER(s.display_symbol) = $1 LIMIT 1`,
      [raw]
    );
    if (!rows.length) {
      return send(res, shell({
        title: `Stock not found | ${SITE}`, description: '', canonical: `${APP}/stocks`,
        body: `<h1>We couldn't find “${esc(raw)}”</h1><p>Try the <a href="/ngx-stock-screener">NGX screener</a> or the <a href="/swing-trading-screener">swing screener</a>.</p>`,
      }), 404);
    }
    const s = rows[0];
    const cur = s.currency;
    const label = s.display_symbol || s.symbol;
    const mkt = marketLabel(s.country);
    const url = `${APP}/stocks/${marketOf(s.country)}/${encodeURIComponent(label.toLowerCase())}`;
    const updated = s.data_updated_at ? new Date(s.data_updated_at) : null;

    // Sector peers for internal linking.
    const peers = (await db.query(
      `SELECT display_symbol, name, country FROM stocks
        WHERE sector = $1 AND symbol <> $2 AND is_active = TRUE
        ORDER BY market_cap_millions DESC NULLS LAST LIMIT 6`,
      [s.sector, s.symbol]
    )).rows;

    const fundamentals = [
      ['Market cap', cap(s.market_cap_millions)],
      ['P/E ratio', dec(s.pe_ratio)],
      ['P/B ratio', dec(s.pb_ratio)],
      ['EPS', dec(s.eps)],
      ['Dividend yield', pct(s.dividend_yield)],
      ['ROE', pct(s.roe)],
      ['Net margin', pct(s.net_margin)],
      ['Revenue growth (YoY)', pct(s.revenue_growth_yoy)],
      ['Debt / equity', dec(s.debt_to_equity)],
      ['Beta', dec(s.beta)],
      ['1-year return', pct(s.return_1y)],
      ['52-week range', `${money(s.low_52w, cur)} – ${money(s.high_52w, cur)}`],
    ];

    const techRows = s.trend ? `
      <h2>Technical read</h2>
      <p class="muted">Computed from daily closing prices${s.tech_at ? ` · updated ${new Date(s.tech_at).toDateString()}` : ''}.</p>
      <div class="grid">
        <div class="stat"><div class="k">Trend</div><div class="v">${esc(s.trend)}</div></div>
        <div class="stat"><div class="k">RSI (14)</div><div class="v">${dec(s.rsi14, 1)}</div></div>
        <div class="stat"><div class="k">Setup</div><div class="v">${esc((s.setup && s.setup !== 'none' ? s.setup.replace('_', ' ') : 'none'))}</div></div>
        ${s.quality_score != null ? `<div class="stat"><div class="k">Setup quality</div><div class="v">${s.quality_score}/100</div></div>` : ''}
      </div>
      ${s.setup_reason ? `<p>${esc(s.setup_reason)}</p>` : ''}` : '';

    // FAQ (mirrors visible content — safe for FAQPage structured data).
    const faqs = [
      [`What does ${esc(s.name)} do?`, `${esc(s.name)} (${esc(label)}) is a ${esc(s.sector || 'listed')} company on the ${mkt} market${s.industry ? `, in the ${esc(s.industry)} industry` : ''}.`],
      [`What is ${esc(label)}'s P/E ratio?`, `${esc(label)}'s price-to-earnings ratio is ${dec(s.pe_ratio)}${n(s.pe_ratio) == null ? ' (not available in our data)' : ''}. P/E compares the share price to earnings per share.`],
      [`Does ${esc(label)} pay a dividend?`, n(s.dividend_yield) ? `Yes — its dividend yield is ${pct(s.dividend_yield)}.` : `We don't currently show a dividend yield for ${esc(label)}.`],
    ];
    const faqLd = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q.replace(/<[^>]+>/g, ''), acceptedAnswer: { '@type': 'Answer', text: a.replace(/<[^>]+>/g, '') } })),
    });

    const body = `
      <span class="pill">${mkt} · ${esc(s.sector || 'Equity')}</span>
      <h1>${esc(s.name)} (${esc(label)}) Stock Analysis</h1>
      <div class="pricebar">
        <span class="price">${money(s.last_price, cur)}</span>
        ${n(s.day_change_pct) != null ? `<span class="muted">${n(s.day_change_pct) >= 0 ? '+' : ''}${dec(s.day_change_pct)}% today</span>` : ''}
        ${updated ? `<span class="muted">· as of ${updated.toDateString()}</span>` : ''}
      </div>
      <p class="sub">Fundamentals, technicals and plain-English analysis for ${esc(s.name)} on the ${mkt} market.</p>

      <h2>Key fundamentals</h2>
      <table>
        <tbody>
          ${fundamentals.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td class="num">${v}</td></tr>`).join('')}
        </tbody>
      </table>

      ${techRows}

      <h2>Frequently asked</h2>
      <div class="faq">${faqs.map(([q, a]) => `<h3>${q}</h3><p>${a}</p>`).join('')}</div>

      ${peers.length ? `<h2>Related ${mkt} ${esc(s.sector || '')} stocks</h2>
      <div class="chips">${peers.map((p) => `<a href="/stocks/${marketOf(p.country)}/${encodeURIComponent(p.display_symbol.toLowerCase())}">${esc(p.display_symbol)}</a>`).join('')}</div>` : ''}

      <div class="chips" style="margin-top:16px">
        <a href="/${s.country === 'NG' ? 'ngx' : 'us'}-stock-screener">Screen more ${mkt} stocks →</a>
        <a href="${APP}/compare-stocks">Compare ${esc(label)} vs another stock →</a>
      </div>
      <h2>Learn to read these numbers</h2>
      <div class="chips">
        <a href="/learn/how-to-evaluate-pe-ratio">How to evaluate P/E</a>
        <a href="/learn/how-to-evaluate-roe">How to evaluate ROE</a>
        <a href="/learn/${s.country === 'NG' ? 'how-to-analyze-ngx-stocks' : 'how-to-analyze-us-stocks'}">How to analyze ${mkt} stocks</a>
      </div>`;

    const orgLd = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Corporation',
      name: s.name, tickerSymbol: label,
      url,
    });

    send(res, shell({
      title: `${s.name} (${label}) Stock Analysis | ${mkt}: ${label} | ${SITE}`,
      description: `${s.name} (${label}) share price, fundamentals (P/E ${dec(s.pe_ratio)}, dividend ${pct(s.dividend_yield)}) and technical analysis on the ${mkt} market.`,
      canonical: url,
      jsonLd: `${orgLd}</script><script type="application/ld+json">${faqLd}`,
      breadcrumb: [
        { name: 'Home', url: APP },
        { name: `${mkt} stocks`, url: `${APP}/${s.country === 'NG' ? 'ngx' : 'us'}-stock-screener` },
        { name: label, url },
      ],
      body,
    }));
  } catch (err) {
    console.error('stockPageHtml error:', err);
    send(res, shell({ title: `${SITE}`, description: '', canonical: `${APP}/stocks`, body: '<h1>Something went wrong</h1><p><a href="/ngx-stock-screener">Browse stocks →</a></p>' }), 500);
  }
};

// ---- screener / analysis landing pages -------------------------------------
// Each landing page is backed by a REAL query so it's never a thin page.
const LANDINGS = {
  'ngx-stock-screener': {
    aliases: ['nigerian-stock-screener', 'ngx-stocks', 'ngx-stock-analysis', 'nigerian-stock-analysis'],
    title: 'NGX Stock Screener — Screen Nigerian Stocks',
    h1: 'NGX Stock Screener',
    intro: 'Screen and compare stocks on the Nigerian Exchange (NGX) by valuation, dividend yield and market cap — then open any ticker for full fundamental and technical analysis.',
    where: `country = 'NG'`, order: 'market_cap_millions DESC NULLS LAST',
    faqs: [
      ['What is a stock screener?', 'A stock screener filters listed companies by criteria — like P/E ratio, dividend yield or market cap — so you can quickly find stocks that match what you\'re looking for.'],
      ['How do I analyse NGX stocks?', 'Start with the fundamentals (valuation, profitability, growth, balance sheet), then check the technical trend and momentum. Every stock page here shows both, with plain-English notes.'],
    ],
  },
  'us-stock-screener': {
    aliases: ['us-stock-analysis'],
    title: 'US Stock Screener — Screen US Stocks',
    h1: 'US Stock Screener',
    intro: 'Screen US-listed stocks by valuation, growth and dividend yield, and open any ticker for full fundamental and technical analysis.',
    where: `country = 'US'`, order: 'market_cap_millions DESC NULLS LAST',
    faqs: [
      ['What makes a good stock screen?', 'Combine a few complementary filters — e.g. reasonable valuation, solid profitability (ROE) and manageable debt — rather than optimising a single number.'],
    ],
  },
  'swing-trading-screener': {
    aliases: ['technical-stock-screener', 'breakout-stock-screener', 'momentum-stock-screener'],
    title: 'Swing Trading Screener — Find Stock Setups',
    h1: 'Swing Trading Screener',
    intro: 'Find swing-trading setups across US and NGX stocks — breakouts, pullbacks and trend continuations — ranked by a transparent setup-quality score you can inspect.',
    join: true, where: `t.setup IS NOT NULL AND t.setup <> 'none'`, order: 't.quality_score DESC NULLS LAST',
    faqs: [
      ['What is swing trading?', 'Swing trading aims to capture moves that play out over several days to a few weeks, using technical setups like breakouts and pullbacks with defined risk.'],
      ['How is the setup-quality score calculated?', 'It sums named factors — trend, momentum, volume and structure, minus a risk penalty — each traceable to a real metric, so you always see why a setup scored what it did.'],
    ],
  },
  'fundamental-stock-screener': {
    aliases: [],
    title: 'Fundamental Stock Screener — Value & Quality',
    h1: 'Fundamental Stock Screener',
    intro: 'Screen US and NGX stocks on fundamentals — valuation, profitability, growth and balance-sheet strength — to find quality businesses for the long term.',
    where: `roe IS NOT NULL`, order: 'roe DESC NULLS LAST',
    faqs: [['Which fundamentals matter most?', 'For long-term quality: durable profitability (ROE, margins), real growth, and a healthy balance sheet (low debt). Valuation then tells you what you\'re paying for it.']],
  },
  'ngx-dividend-stocks': {
    aliases: [],
    title: 'NGX Dividend Stocks — Highest Yields on the NGX',
    h1: 'NGX Dividend Stocks',
    intro: 'Nigerian (NGX) stocks ranked by dividend yield — a starting point for income-focused research. Always check whether a high yield is sustainable.',
    where: `country = 'NG' AND dividend_yield IS NOT NULL AND dividend_yield > 0`, order: 'dividend_yield DESC',
    faqs: [['Is a higher dividend yield always better?', 'Not necessarily — a very high yield can signal a falling share price or a payout that may be cut. Check earnings, payout ratio and consistency alongside the yield.']],
  },
};

function landingHandler(key) {
  const cfg = LANDINGS[key];
  return async (req, res) => {
    try {
      const sql = cfg.join
        ? `SELECT s.display_symbol, s.name, s.country, s.currency, s.last_price, s.pe_ratio, s.dividend_yield,
                  s.market_cap_millions, t.trend, t.setup, t.quality_score
             FROM stocks s JOIN stock_technicals t ON t.symbol = s.symbol
            WHERE s.is_active = TRUE AND ${cfg.where} ORDER BY ${cfg.order} LIMIT 40`
        : `SELECT display_symbol, name, country, currency, last_price, pe_ratio, dividend_yield, market_cap_millions
             FROM stocks WHERE is_active = TRUE AND ${cfg.where} ORDER BY ${cfg.order} LIMIT 40`;
      const { rows } = await db.query(sql);

      const showSetup = Boolean(cfg.join);
      const head = showSetup
        ? `<tr><th>Stock</th><th class="num">Price</th><th>Setup</th><th class="num">Quality</th></tr>`
        : `<tr><th>Stock</th><th class="num">Price</th><th class="num">P/E</th><th class="num">Div yield</th><th class="num">Mkt cap</th></tr>`;
      const trs = rows.map((r) => {
        const link = `/stocks/${marketOf(r.country)}/${encodeURIComponent(r.display_symbol.toLowerCase())}`;
        return showSetup
          ? `<tr><td><a href="${link}">${esc(r.display_symbol)}</a> <span class="muted">${esc(r.name)}</span></td><td class="num">${money(r.last_price, r.currency)}</td><td>${esc((r.setup || '').replace('_', ' '))}</td><td class="num">${r.quality_score ?? '—'}</td></tr>`
          : `<tr><td><a href="${link}">${esc(r.display_symbol)}</a> <span class="muted">${esc(r.name)}</span></td><td class="num">${money(r.last_price, r.currency)}</td><td class="num">${dec(r.pe_ratio)}</td><td class="num">${pct(r.dividend_yield)}</td><td class="num">${cap(r.market_cap_millions)}</td></tr>`;
      }).join('');

      const table = rows.length
        ? `<table><thead>${head}</thead><tbody>${trs}</tbody></table>`
        : `<p class="muted">Live results are being prepared — check back shortly, or <a href="${APP}/signup">create a free account</a> to use the full screener now.</p>`;

      const faqLd = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: cfg.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      });
      const appLd = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'WebApplication',
        name: `${SITE} — ${cfg.h1}`, applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      });

      const body = `
        <span class="pill">Free tool</span>
        <h1>${esc(cfg.h1)}</h1>
        <p class="sub">${esc(cfg.intro)}</p>
        ${table}
        <p class="muted">${rows.length ? `Showing ${rows.length} stocks. Open any ticker for full analysis.` : ''}</p>
        <h2>Frequently asked</h2>
        <div class="faq">${cfg.faqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</div>
        <div class="chips">
          <a href="/ngx-stock-screener">NGX screener</a>
          <a href="/us-stock-screener">US screener</a>
          <a href="/swing-trading-screener">Swing setups</a>
          <a href="/fundamental-stock-screener">Fundamentals</a>
          <a href="/ngx-dividend-stocks">NGX dividends</a>
          <a href="/learn">Investing guides</a>
        </div>`;

      send(res, shell({
        title: `${cfg.title} | ${SITE}`,
        description: cfg.intro,
        canonical: `${APP}/${key}`,
        jsonLd: `${appLd}</script><script type="application/ld+json">${faqLd}`,
        breadcrumb: [{ name: 'Home', url: APP }, { name: cfg.h1, url: `${APP}/${key}` }],
        body,
      }));
    } catch (err) {
      console.error(`landing ${key} error:`, err);
      send(res, shell({ title: `${cfg.title} | ${SITE}`, description: cfg.intro, canonical: `${APP}/${key}`, body: `<h1>${esc(cfg.h1)}</h1><p>${esc(cfg.intro)}</p>` }), 500);
    }
  };
}

// ---- educational guides: /learn and /learn/:slug (§40) ----------------------
// Hand-written evergreen content from content/guides.js. No DB reads, so these
// pages are fast and always render.

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const withApp = (html) => String(html).replaceAll('{{APP}}', APP);
const guideUrl = (slug) => `${APP}/learn/${slug}`;
const LEARN_CSS = `<style>
  .toc { background:#fff; border:1px solid rgba(15,20,25,.08); border-radius:14px; padding:12px 18px; margin:18px 0; }
  .toc p { margin:0 0 4px; font-size:.72rem; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:rgba(15,20,25,.45); }
  .toc ol { margin:0; padding-left:20px; } .toc li { margin:3px 0; }
  article ul, article ol { padding-left:22px; } article li { margin:4px 0; }
  .guide-list { list-style:none; padding:0; } .guide-list li { margin:0 0 14px; padding:14px 16px; background:#fff; border:1px solid rgba(15,20,25,.08); border-radius:14px; }
  .guide-list a { font-weight:800; text-decoration:none; font-size:1.05rem; }
  .guide-list p { margin:4px 0 0; color:rgba(15,20,25,.6); font-size:.92rem; }
</style>`;

export const guideIndexHtml = (req, res) => {
  const items = GUIDES.map((g) => `<li><a href="/learn/${g.slug}">${esc(g.title)}</a><p>${esc(g.description)}</p><span class="muted">${g.readMins} min read</span></li>`).join('');
  const listLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'ItemList',
    itemListElement: GUIDES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: guideUrl(g.slug), name: g.title })),
  });
  send(res, shell({
    title: `Investing Guides: Stock Analysis for US & NGX | ${SITE}`,
    description: 'Free, plain-English guides to stock analysis: how to analyze a stock, evaluate P/E and ROE, find undervalued stocks, and screen for swing trading on US and NGX markets.',
    canonical: `${APP}/learn`,
    jsonLd: listLd,
    breadcrumb: [{ name: 'Home', url: APP }, { name: 'Investing guides', url: `${APP}/learn` }],
    body: `${LEARN_CSS}
      <span class="pill">Free guides</span>
      <h1>Investing guides</h1>
      <p class="sub">Plain-English guides to researching stocks on the US market and the Nigerian Exchange (NGX). Each one is a practical process you can use straight away.</p>
      <ul class="guide-list">${items}</ul>
      <div class="chips">
        <a href="/ngx-stock-screener">NGX screener</a>
        <a href="/us-stock-screener">US screener</a>
        <a href="/swing-trading-screener">Swing setups</a>
        <a href="/fundamental-stock-screener">Fundamentals</a>
      </div>`,
  }));
};

export const guideHtml = (req, res) => {
  const g = getGuide(String(req.params.slug || '').toLowerCase());
  if (!g) {
    return send(res, shell({
      title: `Guide not found | ${SITE}`, description: '', canonical: `${APP}/learn`,
      body: `<h1>We couldn't find that guide</h1><p>Browse all <a href="/learn">investing guides</a>.</p>`,
    }), 404);
  }
  const url = guideUrl(g.slug);
  const toc = `<nav class="toc" aria-label="On this page"><p>On this page</p><ol>${g.sections.map((s) => `<li><a href="#${slugify(s.h2)}">${esc(s.h2)}</a></li>`).join('')}</ol></nav>`;
  const sections = g.sections.map((s) => `<h2 id="${slugify(s.h2)}">${esc(s.h2)}</h2>${withApp(s.html)}`).join('\n');
  const related = g.related.map(getGuide).filter(Boolean);

  const articleLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Article',
    headline: g.title, description: g.description,
    dateModified: g.updated, datePublished: g.published || g.updated,
    author: { '@type': 'Organization', name: SITE, url: APP },
    publisher: { '@type': 'Organization', name: SITE, url: APP },
    mainEntityOfPage: url,
  });
  const faqLd = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: g.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  });

  send(res, shell({
    title: `${g.title} | ${SITE}`,
    description: g.description,
    canonical: url,
    jsonLd: `${articleLd}</script><script type="application/ld+json">${faqLd}`,
    breadcrumb: [
      { name: 'Home', url: APP },
      { name: 'Investing guides', url: `${APP}/learn` },
      { name: g.title, url },
    ],
    body: `${LEARN_CSS}
      <article>
        <span class="pill">Guide · ${g.readMins} min read</span>
        <h1>${esc(g.title)}</h1>
        <p class="sub">${esc(g.intro)}</p>
        <p class="muted">Updated ${new Date(`${g.updated}T00:00:00Z`).toDateString()}</p>
        ${toc}
        ${sections}
        <h2 id="faq">Frequently asked</h2>
        <div class="faq">${g.faqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</div>
      </article>
      ${related.length ? `<h2>Related guides</h2><div class="chips">${related.map((r) => `<a href="/learn/${r.slug}">${esc(r.title)}</a>`).join('')}</div>` : ''}
      <div class="chips" style="margin-top:12px"><a href="/learn">All investing guides →</a></div>`,
  }));
};

// Register every landing page + its aliases (aliases canonicalise to the primary).
export function registerSeoRoutes(app) {
  app.get('/stocks/:market/:symbol', stockPageHtml);
  app.get('/learn', guideIndexHtml);
  app.get('/learn/:slug', guideHtml);
  for (const [key, cfg] of Object.entries(LANDINGS)) {
    app.get(`/${key}`, landingHandler(key));
    for (const alias of cfg.aliases) app.get(`/${alias}`, landingHandler(key));
  }
  app.get('/seo-sitemap.xml', seoSitemap);
}

// ---- comprehensive sitemap -------------------------------------------------
export const seoSitemap = async (req, res) => {
  try {
    const stocks = (await db.query(
      `SELECT display_symbol, country, data_updated_at FROM stocks WHERE is_active = TRUE`
    )).rows;
    const recaps = (await db.query('SELECT slug, published_at FROM market_recaps ORDER BY published_at DESC LIMIT 1000')).rows;

    const staticPages = [
      '', '/pricing', '/about', '/insights', '/learn',
      ...GUIDES.map((g) => `/learn/${g.slug}`),
      ...Object.keys(LANDINGS).map((k) => `/${k}`),
      ...Object.values(LANDINGS).flatMap((c) => c.aliases.map((a) => `/${a}`)),
    ];
    const urls = [
      ...staticPages.map((p) => `<url><loc>${APP}${p}</loc></url>`),
      ...stocks.map((s) => `<url><loc>${APP}/stocks/${marketOf(s.country)}/${encodeURIComponent(s.display_symbol.toLowerCase())}</loc>${s.data_updated_at ? `<lastmod>${new Date(s.data_updated_at).toISOString()}</lastmod>` : ''}</url>`),
      ...recaps.map((r) => `<url><loc>${APP}/insights/${encodeURIComponent(r.slug)}</loc><lastmod>${new Date(r.published_at).toISOString()}</lastmod></url>`),
    ].join('');

    res.set('Content-Type', 'application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
    );
  } catch (err) {
    console.error('seoSitemap error:', err);
    res.status(500).set('Content-Type', 'application/xml').send('<?xml version="1.0"?><urlset/>');
  }
};
