// ============================================================
// aiController.js — Premium AI features (OpenAI)
//   • POST /api/ai/compare-stocks    — side-by-side analysis of two tickers
//   • POST /api/ai/analyze-portfolio — review of the user's simulator holdings
//   • POST /api/ai/scan-news         — filter 30 days of news down to what matters
//
// All premium-gated (see routes). Results are cached in ai_cache and every
// real model call is logged to ai_usage_log for cost tracking. All AI text
// carries an educational-only disclaimer.
// ============================================================
import crypto from 'crypto';
import axios from 'axios';
import db from '../config/db.js';
import { analyzeWithAI, parseJsonFromAI } from '../services/aiProvider.js';
import { broadcastToPremium } from '../services/telegramService.js';
import { refreshFundamentals } from './stockController.js';
import { consumeEntitlement } from '../middleware/entitlement.js';
import { logEvent } from '../services/analytics.js';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';

export const DISCLAIMER =
  'This is educational analysis, not financial advice. Not a buy/sell recommendation.';

// Shared "how to talk" rules for every premium AI tool. This is the platform's
// whole promise made concrete: plain language a total beginner understands, a
// decisive steer (not fence-sitting), and honest confidence. It deliberately
// stops short of financial advice — it FRAMES the decision so the reader can make
// it, instead of issuing a buy/sell instruction.
export const MENTOR_VOICE =
  `You are a sharp, warm mentor talking to a smart beginner who has money to invest but knows NONE of the ` +
  `finance jargon. HOW YOU MUST WRITE (this matters as much as what you say): ` +
  `(1) Plain, everyday words a 12-year-old could follow. The FIRST time you use any finance term (P/E, ` +
  `margin, volatility, dividend, market cap, beta, revenue, debt), put a 4-8 word plain meaning in brackets ` +
  `right after it, e.g. "P/E (how pricey the stock is vs its profit)". If a sentence reads like a textbook, ` +
  `rewrite it like you're talking to a friend. ` +
  `(2) Use tiny real-life pictures (a shop, rent, a salary, a savings account) so the numbers click. ` +
  `(3) Be DECISIVE and genuinely useful — no "it depends" with no direction. Say clearly what the picture ` +
  `shows, what is truly strong, what to watch out for, and who this actually suits. ` +
  `(4) Leave the reader feeling they UNDERSTAND what they're looking at, so they can act calmly instead of ` +
  `guessing or chasing hype. That understanding IS the confidence. ` +
  `(5) You are NOT a financial adviser: never issue the bare command "buy" or "sell", never promise returns, ` +
  `never give price targets. Instead give a strong, clear STEER — the case for, the case against, and the ` +
  `one question that settles it — then hand the final call to the reader. `;

// ---------- Nigerian-language AI output ----------
// Append a directive so the AI answers in the user's chosen language, and a
// short code for the cache key (so each language caches separately).
const LANG_NAME = { pcm: 'Nigerian Pidgin English', yo: 'Yorùbá', ha: 'Hausa', ig: 'Igbo' };

// Anchor words per language. Low-resource languages (Yorùbá/Hausa/Igbo) make the
// model drift back to English or Pidgin after the first line, so we seed it with
// everyday words to hold it in-language.
const LANG_ANCHORS = {
  yo: 'owó (money), èrè (profit), ọjà (market), ilé-iṣẹ́ (company), ìdókòwò (investment), kí ni (what is), fún àpẹẹrẹ (for example), nítorí (because)',
  ha: 'kuɗi (money), riba (profit), kasuwa (market), kamfani (company), zuba jari (investment), mene ne (what is), misali (for example), saboda (because)',
  ig: "ego (money), uru (profit), ahịa (market), ụlọ ọrụ (company), itinye ego (investment), gịnị bụ (what is), dịka (for example), n'ihi na (because)",
};

export function langDirective(lang) {
  if (lang === 'pcm') {
    // Push for REAL Naija Pidgin, not anglicised English with a few pidgin words.
    return ` CRITICAL LANGUAGE RULE: Write your ENTIRE response in real, natural Nigerian Pidgin (Naija) — ` +
      `the way people actually talk, NOT anglicised English with a few pidgin words sprinkled in. Use proper ` +
      `Pidgin grammar and rhythm ("e dey", "don", "go", "wan", "make", "wetin", "sabi", "no be", "e get", ` +
      `"abeg", "small small", "wahala") wherever it fits. EVERY heading, sentence and bullet — first word to ` +
      `last — must be Pidgin; do not switch to plain English at any point. Keep stock tickers, company names ` +
      `and finance terms (P/E, ROE) recognisable, but break down wetin dem mean for Pidgin. Before you ` +
      `finish, read your whole answer again and rewrite any line wey slip into plain English.`;
  }
  const name = LANG_NAME[lang];
  if (!name) return ''; // English / unknown → default, no change
  const anchors = LANG_ANCHORS[lang];
  return ` CRITICAL LANGUAGE RULE: Write your ENTIRE response in ${name}, from the very first word to the ` +
    `very last — every heading, every sentence, every bullet, every list item. Do NOT switch to English or ` +
    `Pidgin at ANY point, not even for one sentence or one heading. Mixing languages breaks the user's ` +
    `trust, so this matters more than anything else. ` +
    (anchors ? `Write like a real, everyday ${name} speaker (for example: ${anchors}). ` : '') +
    `Keep ONLY stock tickers, company names and finance abbreviations (P/E, ROE, EPS) recognisable, but ` +
    `explain what they mean in ${name}. If a concept has no common ${name} word, describe it using simple ` +
    `${name} words — never fall back to English. When you have finished, re-read your entire answer and ` +
    `rewrite any word or line that slipped into English or another language, so it is 100% ${name}. Stay ` +
    `warm and beginner-friendly.`;
}
export const langKey = (lang) => (LANG_NAME[lang] ? lang : 'en');

// ---------- cache + usage helpers ----------
export async function readCache(key) {
  const { rows } = await db.query(
    `SELECT response FROM ai_cache WHERE cache_key = $1 AND expires_at > NOW()`,
    [key]
  );
  return rows[0]?.response || null;
}

export async function writeCache(key, response, ttlHours) {
  await db.query(
    `INSERT INTO ai_cache (cache_key, response, created_at, expires_at)
     VALUES ($1, $2, NOW(), NOW() + ($3 || ' hours')::interval)
     ON CONFLICT (cache_key)
     DO UPDATE SET response = EXCLUDED.response, created_at = NOW(), expires_at = EXCLUDED.expires_at`,
    [key, response, String(ttlHours)]
  );
}

export async function logUsage(userId, feature, result) {
  try {
    await db.query(
      `INSERT INTO ai_usage_log (user_id, feature, input_tokens, output_tokens, estimated_cost_usd)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId || null,
        feature,
        result.usage?.input_tokens || 0,
        result.usage?.output_tokens || 0,
        result.costUsd || 0,
      ]
    );
  } catch (e) {
    console.error('ai_usage_log insert failed:', e.message);
  }
}

const num = (v) => (v === null || v === undefined ? null : parseFloat(v));

/* ============================================================
 *  GET /api/admin/ai-usage  (admin only)
 *  AI spend summary from ai_usage_log — protects against runaway cost.
 * ============================================================ */
export const getAiUsageStats = async (req, res) => {
  if (!req.user?.is_admin) return res.status(403).json({ success: false, message: 'Admins only' });
  try {
    const [month, total, byFeature, recent, byDay] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(estimated_cost_usd),0) cost, COUNT(*) calls
                FROM ai_usage_log WHERE created_at >= date_trunc('month', NOW())`),
      db.query(`SELECT COALESCE(SUM(estimated_cost_usd),0) cost, COUNT(*) calls FROM ai_usage_log`),
      db.query(`SELECT feature, COUNT(*) calls, COALESCE(SUM(estimated_cost_usd),0) cost
                FROM ai_usage_log WHERE created_at >= date_trunc('month', NOW())
                GROUP BY feature ORDER BY cost DESC`),
      db.query(`SELECT user_id, feature, input_tokens, output_tokens, estimated_cost_usd, created_at
                FROM ai_usage_log ORDER BY created_at DESC LIMIT 10`),
      db.query(`SELECT to_char(date_trunc('day', created_at), 'Mon DD') AS "day",
                       COALESCE(SUM(estimated_cost_usd),0) cost, COUNT(*) calls
                FROM ai_usage_log WHERE created_at >= NOW() - INTERVAL '14 days'
                GROUP BY date_trunc('day', created_at) ORDER BY date_trunc('day', created_at)`),
    ]);
    const f = (n) => Number(n);
    res.json({
      success: true,
      month: { cost: f(month.rows[0].cost), calls: Number(month.rows[0].calls) },
      total: { cost: f(total.rows[0].cost), calls: Number(total.rows[0].calls) },
      by_feature: byFeature.rows.map((r) => ({ feature: r.feature, calls: Number(r.calls), cost: f(r.cost) })),
      by_day: byDay.rows.map((r) => ({ day: r.day, cost: f(r.cost), calls: Number(r.calls) })),
      recent: recent.rows.map((r) => ({ ...r, estimated_cost_usd: f(r.estimated_cost_usd) })),
    });
  } catch (err) {
    console.error('getAiUsageStats error:', err);
    res.status(500).json({ success: false, message: 'Failed to load AI usage' });
  }
};

function compactStock(s) {
  return {
    symbol: s.symbol,
    name: s.name,
    sector: s.sector,
    country: s.country,
    currency: s.currency,
    last_price: num(s.last_price),
    valuation: {
      pe_ratio: num(s.pe_ratio), pb_ratio: num(s.pb_ratio), ps_ratio: num(s.ps_ratio),
      ev_ebitda: num(s.ev_ebitda), peg_ratio: num(s.peg_ratio),
      dividend_yield: num(s.dividend_yield), market_cap_millions: num(s.market_cap_millions),
    },
    profitability: {
      roe: num(s.roe), roa: num(s.roa), gross_margin: num(s.gross_margin), net_margin: num(s.net_margin),
    },
    growth: {
      revenue_growth_yoy: num(s.revenue_growth_yoy), earnings_growth_yoy: num(s.earnings_growth_yoy),
    },
    balance_sheet: { debt_to_equity: num(s.debt_to_equity), current_ratio: num(s.current_ratio) },
    risk: {
      beta: num(s.beta), volatility_1y: num(s.volatility_1y), max_drawdown_1y: num(s.max_drawdown_1y),
    },
    returns: {
      return_1m: num(s.return_1m), return_6m: num(s.return_6m), return_1y: num(s.return_1y),
    },
  };
}

async function findStock(ticker) {
  const t = String(ticker || '').trim().toUpperCase();
  if (!t) return null;
  const { rows } = await db.query(
    `SELECT * FROM stocks WHERE UPPER(symbol) = $1 OR UPPER(display_symbol) = $1 LIMIT 1`,
    [t]
  );
  return rows[0] || null;
}

/* ============================================================
 *  POST /api/ai/compare-stocks   { symbol_a, symbol_b }
 * ============================================================ */
export const compareStocks = async (req, res) => {
  try {
    const aIn = req.body?.symbol_a || req.body?.ticker1;
    const bIn = req.body?.symbol_b || req.body?.ticker2;
    const lang = req.body?.language;
    if (!aIn || !bIn) {
      return res.status(400).json({ success: false, message: 'Provide two ticker symbols.' });
    }

    const [stockA, stockB] = await Promise.all([findStock(aIn), findStock(bIn)]);
    if (!stockA || !stockB) {
      const missing = [!stockA && aIn, !stockB && bIn].filter(Boolean).join(', ');
      return res.status(404).json({ success: false, message: `Stock not found: ${missing}` });
    }
    if (stockA.symbol === stockB.symbol) {
      return res.status(400).json({ success: false, message: 'Pick two different stocks.' });
    }

    // Cache key: order-independent so AAPL:MSFT and MSFT:AAPL share a result.
    // ':v3' bump busts older answers cached before live-metrics + decision sections.
    const key = 'compare:v5:' + [stockA.symbol, stockB.symbol].sort().join(':') + ':' + langKey(lang);
    const cached = await readCache(key);
    if (cached) return res.json({ success: true, cached: true, ...cached });

    // Pull LIVE fundamentals first — same path the analysis/screener page uses.
    // US tickers refresh from Finnhub (cached 24h in-DB); NGX/others fall back to
    // the stored row. Whatever's still missing, the AI fills from company knowledge.
    const [freshA, freshB] = await Promise.all([
      refreshFundamentals(stockA.symbol).catch(() => null),
      refreshFundamentals(stockB.symbol).catch(() => null),
    ]);
    const richA = freshA || stockA;
    const richB = freshB || stockB;

    const dataA = compactStock(richA);
    const dataB = compactStock(richB);

    const system =
      MENTOR_VOICE +
      `\n\nYour task: put two stocks side by side for this beginner and help them decide which one fits ` +
      `THEM. You handle both US and Nigerian (NGX) stocks. ` +
      `Use the structured data provided as your first source. When specific fields are null or missing, ` +
      `do NOT just say "unavailable" — draw on your well-established general knowledge of these companies ` +
      `(their business model, scale, how they make money, typical profitability and growth profile, ` +
      `competitive position and moat, and general risk character) to give a genuinely useful comparison. ` +
      `Be honest about the source: when a point comes from general knowledge rather than the live data, ` +
      `signal it lightly ("broadly", "historically", "as a rule") and prefer relative, plain language ` +
      `("higher-margin", "faster-growing", "more expensive for what you get") or clearly-approximate ranges ` +
      `over precise figures. Never present a made-up number as if it were a live, current figure. ` +
      `Respond with ONLY valid JSON (no markdown fences) matching exactly this shape: ` +
      `{"summary": string, "key_differences": string[], "fundamentals_comparison": string, ` +
      `"risk_comparison": string, "valuation_comparison": string, "which_for_what": string, ` +
      `"bottom_line": string, "disclaimer": string}. ` +
      `Make every section substantive and specific to these two companies — never a bare "unavailable". ` +
      `"key_differences" = 3-5 short, punchy head-to-head contrasts a beginner can scan in seconds ` +
      `(e.g. "Amazon is diversified across retail + cloud; Meta lives almost entirely on ad revenue"). ` +
      `"which_for_what" should guide which stock better suits an income investor, a growth seeker, and a ` +
      `cautious beginner, and why. "bottom_line" = a clear decision framework that puts the LEARNER in ` +
      `the driver's seat: spell out when each stock makes more sense, name the single question that ` +
      `settles it for them, and remind them it's their call — do NOT tell them which one to buy. ` +
      `Always set "disclaimer" to: "${DISCLAIMER}".`;

    const user =
      `Compare these two stocks. Some numeric fields may be null when live data isn't on file — use ` +
      `your knowledge to fill those gaps as instructed.\n\n` +
      `STOCK A:\n${JSON.stringify(dataA, null, 2)}\n\n` +
      `STOCK B:\n${JSON.stringify(dataB, null, 2)}`;

    let result;
    try {
      result = await analyzeWithAI(system + langDirective(lang), user, { maxTokens: 2600, timeoutMs: 40000 });
    } catch (e) {
      if (e.code === 'AI_NOT_CONFIGURED') {
        return res.status(503).json({ success: false, message: 'AI features are not configured yet.' });
      }
      console.error('compare AI error:', e.message);
      return res.status(502).json({ success: false, message: 'The AI could not complete this comparison. Please try again.' });
    }

    let analysis;
    try {
      analysis = parseJsonFromAI(result.text);
    } catch {
      // Don't cache or bill the user's cache slot on a malformed response.
      await logUsage(req.user.id, 'compare_stocks', result);
      return res.status(502).json({ success: false, message: 'The AI returned an unexpected format. Please try again.' });
    }
    if (!analysis.disclaimer) analysis.disclaimer = DISCLAIMER;
    if (!Array.isArray(analysis.key_differences)) analysis.key_differences = [];

    const payload = {
      stock_a: { symbol: richA.symbol, name: richA.name, currency: richA.currency, last_price: num(richA.last_price) },
      stock_b: { symbol: richB.symbol, name: richB.name, currency: richB.currency, last_price: num(richB.last_price) },
      // The raw, factual numbers behind the AI's read — rendered as a side-by-side table.
      metrics_a: dataA,
      metrics_b: dataB,
      analysis,
      generated_at: new Date().toISOString(),
    };

    await logUsage(req.user.id, 'compare_stocks', result);
    await writeCache(key, payload, 24);
    await consumeEntitlement(req);
    logEvent(req.user.id, 'comparison_used', { a: richA.symbol, b: richB.symbol });

    res.json({ success: true, cached: false, ...payload });
  } catch (err) {
    console.error('compareStocks error:', err);
    res.status(500).json({ success: false, message: 'Comparison failed' });
  }
};

/* ============================================================
 *  GET /api/ai/explain-stock/:symbol?language=xx
 *  Turns one stock's raw numbers into a plain-English (or
 *  Pidgin/Yorùbá/Hausa/Igbo) verdict for a beginner. This is the
 *  interpretation layer — what the free data tools never give:
 *  "what do these numbers actually MEAN for someone like me".
 * ============================================================ */
export const explainStock = async (req, res) => {
  try {
    const lang = req.query?.language;
    const found = await findStock(req.params.symbol);
    if (!found) {
      return res.status(404).json({ success: false, message: 'Stock not found.' });
    }
    // Pull LIVE fundamentals first (US → Finnhub, cached 24h in-DB) — the same path
    // the analysis page uses, so the explanation reads current numbers, not a stale row.
    const stock = (await refreshFundamentals(found.symbol).catch(() => null)) || found;

    // 24h cache, busted when the stock's data is refreshed. 'v2' busts old
    // answers that stalled with "not available" before the knowledge fallback.
    const stamp = stock.data_updated_at ? new Date(stock.data_updated_at).toISOString().slice(0, 13) : 'na';
    const key = `explain:v4:${stock.symbol}:${langKey(lang)}:${stamp}`;
    const cached = await readCache(key);
    if (cached) return res.json({ success: true, cached: true, ...cached });

    const data = compactStock(stock);

    const system =
      MENTOR_VOICE +
      `\n\nYour task: explain ONE company to this beginner and give them a clear, confident read on it. ` +
      `You handle both US and Nigerian (NGX) stocks. Use the given numbers as your first source. When ` +
      `fields are null or missing, don't stall — draw on your well-established general knowledge of this ` +
      `company (what it does, how it makes money, its rough profitability, growth and risk character) so ` +
      `the beginner still gets a real, useful picture. Signal general knowledge lightly ("broadly", ` +
      `"historically") and never present a made-up number as if it were a live figure. ` +
      `Respond with ONLY valid JSON (no markdown fences) matching exactly this shape: ` +
      `{"headline": string, "plain_english": string, "strengths": string[], "watch_outs": string[], ` +
      `"for_beginners": string, "bottom_line": string, "disclaimer": string}. ` +
      `"headline" = one honest, human sentence summing the company up (what it does + the one thing that ` +
      `stands out). ` +
      `"plain_english" = 2-3 sentences: what kind of business this really is, and what the numbers say ` +
      `overall, in everyday words. ` +
      `"strengths" and "watch_outs" = 2-3 short, concrete bullets each (green flags / red flags), each in ` +
      `plain words. ` +
      `"for_beginners" = 1-2 sentences on what a new investor should understand before considering it. ` +
      `"bottom_line" = the decisive part: in 2-3 sentences, who this stock genuinely suits and who it does ` +
      `NOT, the single most important question the reader should answer for themselves before deciding, and ` +
      `a confident reminder that the choice is theirs. Do NOT say "buy" or "sell" — steer, don't command. ` +
      `Always set "disclaimer" to: "${DISCLAIMER}".`;

    const user =
      `Explain this company to a beginner.\n\n${JSON.stringify(data, null, 2)}`;

    let result;
    try {
      result = await analyzeWithAI(system + langDirective(lang), user, { maxTokens: 900, timeoutMs: 30000 });
    } catch (e) {
      if (e.code === 'AI_NOT_CONFIGURED') {
        return res.status(503).json({ success: false, message: 'AI features are not configured yet.' });
      }
      console.error('explain AI error:', e.message);
      return res.status(502).json({ success: false, message: 'The AI could not explain this stock right now. Please try again.' });
    }

    let analysis;
    try {
      analysis = parseJsonFromAI(result.text);
    } catch {
      await logUsage(req.user.id, 'explain_stock', result);
      return res.status(502).json({ success: false, message: 'The AI returned an unexpected format. Please try again.' });
    }
    if (!analysis.disclaimer) analysis.disclaimer = DISCLAIMER;
    if (!analysis.bottom_line) analysis.bottom_line = '';

    const payload = {
      stock: { symbol: stock.symbol, display_symbol: stock.display_symbol, name: stock.name },
      analysis,
      generated_at: new Date().toISOString(),
    };

    await logUsage(req.user.id, 'explain_stock', result);
    await writeCache(key, payload, 24);
    await consumeEntitlement(req);
    logEvent(req.user.id, 'analysis_used', { symbol: stock.symbol });

    res.json({ success: true, cached: false, ...payload });
  } catch (err) {
    console.error('explainStock error:', err);
    res.status(500).json({ success: false, message: 'Explanation failed' });
  }
};

/* ============================================================
 *  POST /api/ai/analyze-portfolio
 * ============================================================ */
export const analyzePortfolio = async (req, res) => {
  try {
    const lang = req.body?.language;
    // Pull the user's simulator holdings and enrich sector from the stocks table.
    const { rows } = await db.query(
      `SELECT p.symbol, p.company_name, p.shares, p.avg_buy_price, s.sector
       FROM portfolios p
       LEFT JOIN stocks s ON UPPER(s.symbol) = UPPER(p.symbol) OR UPPER(s.display_symbol) = UPPER(p.symbol)
       WHERE p.user_id = $1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.json({
        success: true,
        empty: true,
        message: 'Your simulator portfolio is empty. Buy a few stocks in the Simulator first, then run the analysis.',
      });
    }

    const holdings = rows.map((r) => {
      const shares = parseFloat(r.shares);
      const cost = parseFloat(r.avg_buy_price);
      return {
        symbol: r.symbol,
        name: r.company_name || r.symbol,
        sector: r.sector || 'Unknown',
        shares,
        position_value: +(shares * cost).toFixed(2),
      };
    });
    const total = holdings.reduce((s, h) => s + h.position_value, 0) || 1;
    holdings.forEach((h) => { h.weight_pct = +((h.position_value / total) * 100).toFixed(1); });

    // 6-hour cache per user; a signature of the holdings busts it when they trade.
    const sig = crypto
      .createHash('sha1')
      .update(holdings.map((h) => `${h.symbol}:${h.shares}`).sort().join('|'))
      .digest('hex')
      .slice(0, 10);
    const key = `portfolio:v2:${req.user.id}:${sig}:${langKey(lang)}`;
    const cached = await readCache(key);
    if (cached) return res.json({ success: true, cached: true, ...cached });

    const system =
      MENTOR_VOICE +
      `\n\nYour task: review this learner's paper-trading portfolio and tell them, in plain words, how ` +
      `well-built it is and exactly what to fix. Base everything ONLY on the holdings given. Cover: ` +
      `concentration risk (too much in one stock — over ~10% of the whole), sector exposure (too much in ` +
      `one industry), diversification gaps (big industries they're missing), and the overall risk profile ` +
      `(is this an aggressive or a safe-and-steady mix). Give 2-4 specific, doable suggestions in everyday ` +
      `words (e.g. "You've got 35% in one stock — that's a lot riding on one company; easing it under 20% ` +
      `spreads the risk"). Respond with ONLY valid JSON (no markdown fences) matching exactly: ` +
      `{"summary": string, "concentration_risk": string, "sector_exposure": string, ` +
      `"diversification_gaps": string, "risk_profile": string, "suggestions": string[], ` +
      `"bottom_line": string, "disclaimer": string}. "bottom_line" = a decisive, encouraging 2-3 sentence ` +
      `wrap-up: the single most important move to make this portfolio stronger, and honest reassurance ` +
      `about what they're already doing right. Steer, don't command. Always set "disclaimer" to: "${DISCLAIMER}".`;

    const user = `Holdings (value-weighted):\n${JSON.stringify(holdings, null, 2)}`;

    let result;
    try {
      result = await analyzeWithAI(system + langDirective(lang), user, { maxTokens: 2048, timeoutMs: 60000 });
    } catch (e) {
      if (e.code === 'AI_NOT_CONFIGURED') {
        return res.status(503).json({ success: false, message: 'AI features are not configured yet.' });
      }
      console.error('portfolio AI error:', e.message);
      return res.status(502).json({ success: false, message: 'The AI could not analyze your portfolio. Please try again.' });
    }

    let analysis;
    try {
      analysis = parseJsonFromAI(result.text);
    } catch {
      await logUsage(req.user.id, 'analyze_portfolio', result);
      return res.status(502).json({ success: false, message: 'The AI returned an unexpected format. Please try again.' });
    }
    if (!analysis.disclaimer) analysis.disclaimer = DISCLAIMER;
    if (!analysis.bottom_line) analysis.bottom_line = '';
    if (!Array.isArray(analysis.suggestions)) analysis.suggestions = [];

    const payload = {
      holdings,
      analysis,
      generated_at: new Date().toISOString(),
    };

    await logUsage(req.user.id, 'analyze_portfolio', result);
    await writeCache(key, payload, 6);

    res.json({ success: true, cached: false, ...payload });
  } catch (err) {
    console.error('analyzePortfolio error:', err);
    res.status(500).json({ success: false, message: 'Analysis failed' });
  }
};

/* ============================================================
 *  POST /api/ai/scan-news   { symbol }
 *  Pulls ~30 days of company news from Finnhub, then asks the AI to keep
 *  only material events and count the noise. Cached 12h per ticker.
 *  Note: Finnhub company-news covers US tickers well; NGX / other markets
 *  may return nothing on the free tier (handled gracefully as "no news").
 *
 *  Source routing: US tickers → Finnhub (clean, company-tagged). NGX / other
 *  markets → Google News RSS (free, no key, indexes Nigerian outlets). Google
 *  is also the fallback when Finnhub returns nothing for a US ticker.
 * ============================================================ */

function decodeEntities(s = '') {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

// Minimal RSS <item> parser (Google News feed).
function parseRssItems(xml) {
  const out = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) && out.length < 60) {
    const block = m[1];
    const pick = (re) => { const x = re.exec(block); return x ? x[1] : ''; };
    const title = decodeEntities(pick(/<title>([\s\S]*?)<\/title>/)).trim();
    const link = decodeEntities(pick(/<link>([\s\S]*?)<\/link>/)).trim();
    const pub = pick(/<pubDate>([\s\S]*?)<\/pubDate>/).trim();
    const source = decodeEntities(pick(/<source[^>]*>([\s\S]*?)<\/source>/)).trim();
    const ts = pub ? Date.parse(pub) : 0;
    if (title) out.push({ title, link, source, ts: Number.isFinite(ts) ? ts : 0 });
  }
  return out;
}

// US company news from Finnhub → normalized items.
// Exported: the background news monitor reuses these fetchers.
export async function fetchFinnhubNews(symbol, fromTs) {
  const from = new Date(fromTs).toISOString().split('T')[0];
  const to = new Date().toISOString().split('T')[0];
  const { data } = await axios.get('https://finnhub.io/api/v1/company-news', {
    params: { symbol, from, to, token: FINNHUB_API_KEY },
    timeout: 12000,
  });
  const arr = Array.isArray(data) ? data : [];
  return arr.map((a) => ({
    date: a.datetime ? new Date(a.datetime * 1000).toISOString().split('T')[0] : '',
    headline: a.headline,
    snippet: String(a.summary || '').slice(0, 500),
    url: a.url,
    source: a.source || null,
  }));
}

// Free Google News RSS → normalized items. region 'NG' localises to Nigeria.
export async function fetchGoogleNews(companyName, region, fromTs) {
  const ngx = region === 'NG';
  const q = `${companyName} ${ngx ? 'NGX stock' : 'stock'}`;
  const loc = ngx ? 'hl=en-NG&gl=NG&ceid=NG:en' : 'hl=en-US&gl=US&ceid=US:en';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${loc}`;
  const { data } = await axios.get(url, { timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0' } });
  return parseRssItems(String(data))
    .filter((it) => !it.ts || it.ts >= fromTs) // last ~30 days
    .map((it) => {
      // Google titles are "Headline - Source"; trim the trailing source.
      const headline = it.source && it.title.endsWith(` - ${it.source}`)
        ? it.title.slice(0, -(` - ${it.source}`).length) : it.title;
      return {
        date: it.ts ? new Date(it.ts).toISOString().split('T')[0] : '',
        headline,
        snippet: '', // RSS description is just a link; the headline carries the signal
        url: it.link,
        source: it.source || null,
      };
    });
}

export const scanNews = async (req, res) => {
  try {
    const tickerIn = req.body?.symbol || req.body?.ticker;
    const lang = req.body?.language;
    if (!tickerIn) return res.status(400).json({ success: false, message: 'Provide a ticker symbol.' });

    // Resolve against our stock registry for a good news query; still allow
    // tickers we don't track (scan by raw symbol).
    const stock = await findStock(tickerIn);
    const symbol = (stock?.symbol || String(tickerIn).trim().toUpperCase());
    const displaySym = stock?.display_symbol || symbol.replace(/^NGX:/, '');
    const companyName = stock?.name || displaySym;

    const key = 'news:v4:' + symbol + ':' + langKey(lang);
    const cached = await readCache(key);
    if (cached) return res.json({ success: true, cached: true, ...cached });

    // --- pick a source by market and fetch normalized news items ---
    const country = stock?.country || (symbol.startsWith('NGX:') ? 'NG' : 'US');
    const fromTs = Date.now() - 30 * 24 * 60 * 60 * 1000;

    let items = [];
    try {
      if (country === 'US') {
        if (!FINNHUB_API_KEY) {
          return res.status(503).json({
            success: false,
            message: 'News scanning is not configured yet (missing FINNHUB_API_KEY).',
          });
        }
        items = await fetchFinnhubNews(displaySym, fromTs);
        // Finnhub sometimes has no coverage for a US ticker — fall back to Google.
        if (items.length === 0) items = await fetchGoogleNews(companyName, 'US', fromTs);
      } else {
        // NGX / other markets — free Google News (covers Nigerian outlets).
        items = await fetchGoogleNews(companyName, 'NG', fromTs);
      }
    } catch (e) {
      console.error('news fetch error:', e.response?.data || e.message);
      return res.status(502).json({ success: false, message: 'Could not fetch news right now. Please try again.' });
    }

    items = items.filter((it) => it.headline).slice(0, 40).map((it, i) => ({ id: i, ...it }));

    // No news → cache a clean empty result so we don't re-hit the source.
    if (items.length === 0) {
      const payload = {
        symbol, name: companyName, articles_scanned: 0,
        analysis: {
          summary: `No notable news found for ${displaySym} in the last 30 days.`,
          material_events: [], noise_filtered_out: 0, risk_flags: [], disclaimer: DISCLAIMER,
        },
        generated_at: new Date().toISOString(),
      };
      await writeCache(key, payload, 12);
      return res.json({ success: true, cached: false, ...payload });
    }

    const system =
      MENTOR_VOICE +
      `\n\nYour task: read 30 days of news on ONE stock and tell the beginner, in plain words, what actually ` +
      `matters and whether the recent news should make them feel MORE or LESS comfortable about the company. ` +
      `You handle both US and Nigerian (NGX) stocks. Classify each item as MATERIAL — earnings/results, ` +
      `guidance, lawsuits or legal action, regulatory action, management changes, M&A, major contracts or ` +
      `products, dividends/capital actions — or NOISE — day-to-day price chatter, generic analyst ratings, ` +
      `listicles, social noise, or items not really about this company. Use ONLY the items given; NEVER ` +
      `invent an event. For each kept item, write "why_it_matters" as one plain sentence that a beginner ` +
      `instantly gets — what it means for the company, not just that it happened. ` +
      `Preserve each kept item's original date and url exactly. Respond with ONLY valid JSON (no markdown ` +
      `fences) in exactly this shape: {"summary": string, "material_events": [{"date": string, ` +
      `"headline": string, "why_it_matters": string, "url": string}], "noise_filtered_out": number, ` +
      `"risk_flags": string[], "bottom_line": string, "disclaimer": string}. ` +
      `"summary" = 2-3 everyday-language sentences telling the STORY the news shows: is this a busy, quiet, ` +
      `pressured or momentum patch, and what that means for someone weighing the stock. ` +
      `"risk_flags" = plain-word warnings of concerning patterns (repeated legal trouble, leadership churn, ` +
      `falling sales), or empty. ` +
      `"bottom_line" = the decisive read: in 2-3 sentences, does the recent news lean reassuring, worrying, ` +
      `or mixed, WHY in plain words, and the one thing the reader should keep watching. Steer clearly but ` +
      `never say "buy" or "sell" — leave the decision with them. ` +
      `Always set "disclaimer" to: "${DISCLAIMER}".`;

    const user =
      `Stock: ${companyName} (${displaySym}). Here are ${items.length} news items from the last 30 days:\n` +
      JSON.stringify(items, null, 2);

    let result;
    try {
      result = await analyzeWithAI(system + langDirective(lang), user, { maxTokens: 2048, timeoutMs: 45000 });
    } catch (e) {
      if (e.code === 'AI_NOT_CONFIGURED') {
        return res.status(503).json({ success: false, message: 'AI features are not configured yet.' });
      }
      console.error('scan-news AI error:', e.message);
      return res.status(502).json({ success: false, message: 'The AI could not scan this news. Please try again.' });
    }

    let analysis;
    try {
      analysis = parseJsonFromAI(result.text);
    } catch {
      await logUsage(req.user.id, 'scan_news', result);
      return res.status(502).json({ success: false, message: 'The AI returned an unexpected format. Please try again.' });
    }
    if (!analysis.disclaimer) analysis.disclaimer = DISCLAIMER;
    if (!analysis.bottom_line) analysis.bottom_line = '';
    if (!Array.isArray(analysis.material_events)) analysis.material_events = [];
    if (!Array.isArray(analysis.risk_flags)) analysis.risk_flags = [];
    if (typeof analysis.noise_filtered_out !== 'number') {
      analysis.noise_filtered_out = Math.max(0, items.length - analysis.material_events.length);
    }

    const payload = {
      symbol, name: companyName, articles_scanned: items.length,
      analysis, generated_at: new Date().toISOString(),
    };

    await logUsage(req.user.id, 'scan_news', result);
    await writeCache(key, payload, 12);
    await consumeEntitlement(req);
    logEvent(req.user.id, 'news_scan_used', { symbol });

    res.json({ success: true, cached: false, ...payload });
  } catch (err) {
    console.error('scanNews error:', err);
    res.status(500).json({ success: false, message: 'News scan failed' });
  }
};

/* ============================================================
 *  POST /api/ai/tutor   { lesson_id?, question }
 *  A beginner-friendly AI tutor, grounded in the current lesson's content.
 *  Premium-gated. Cached 24h per (lesson, question) — beginners ask the same
 *  things, so the cache doubles as a free FAQ and keeps cost low.
 * ============================================================ */
export const tutorChat = async (req, res) => {
  try {
    const lessonId = req.body?.lesson_id || null;
    const lang = req.body?.language;
    const question = (req.body?.question || '').trim();
    if (!question) return res.status(400).json({ success: false, message: 'Ask a question first.' });
    if (question.length > 500) {
      return res.status(400).json({ success: false, message: 'Please keep your question short.' });
    }

    // Free users get a real taste of the tutor, then a nudge to upgrade. We count
    // only billed calls (ai_usage_log), so cached re-reads never burn a free slot.
    const FREE_TUTOR_LIMIT = 2;
    const isPremium = req.user?.plan === 'premium';
    let freeUsed = 0;
    if (!isPremium) {
      const { rows } = await db.query(
        `SELECT COUNT(*)::int AS n FROM ai_usage_log WHERE user_id = $1 AND feature = 'tutor'`,
        [req.user.id]
      );
      freeUsed = rows[0].n;
      if (freeUsed >= FREE_TUTOR_LIMIT) {
        return res.status(402).json({
          success: false,
          upgrade: true,
          message: "That's your 2 free tutor questions used up. Upgrade to Premium for unlimited tutoring — in English, Pidgin, Yorùbá, Hausa and Igbo — plus stock comparisons, news scans and more.",
        });
      }
    }
    const freeRemaining = isPremium ? null : Math.max(0, FREE_TUTOR_LIMIT - freeUsed);

    // Ground in the lesson content when we have it.
    let lesson = null;
    if (lessonId) {
      const { rows } = await db.query('SELECT id, title, content FROM lessons WHERE id = $1', [lessonId]);
      lesson = rows[0] || null;
    }

    const norm = question.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 200);
    const key = 'tutor:v3:' + (lessonId || 'gen') + ':' + langKey(lang) + ':' + crypto.createHash('sha1').update(norm).digest('hex').slice(0, 12);
    const cached = await readCache(key);
    if (cached) {
      // Flag cache hits so the rate limiter doesn't count them (no model call,
      // no token spend — re-reading the same answer shouldn't cost a quota slot).
      res.setHeader('X-AI-Cache', 'hit');
      // A cache hit isn't billed, so it doesn't consume a free slot.
      return res.json({ success: true, cached: true, free_remaining: freeRemaining, ...cached });
    }

    const lessonContext = lesson
      ? `Lesson title: "${lesson.title}"\n\nLesson content:\n${String(lesson.content || '').slice(0, 6000)}`
      : 'No specific lesson is open — answer as a general beginner-investing tutor.';

    const system =
      MENTOR_VOICE +
      `\n\nYou are StockAcademia's AI tutor for beginner investors (many are Nigerian, trading NGX and US ` +
      `stocks). Ground your answer in the lesson context below when relevant; if the question goes beyond it, ` +
      `answer briefly and tie it back to the fundamentals. You teach concepts — never give financial advice or ` +
      `specific buy/sell/price-target calls, and never promise returns. If a question is off-topic (not about ` +
      `investing, markets, or this lesson), gently steer back. Keep answers under ~180 words. ` +
      `FORMATTING: write like a mentor talking, not a formatted document. Prefer short paragraphs. You may use ` +
      `**bold** for a couple of key terms and a short bullet list when it genuinely helps, but do NOT stack ` +
      `several markdown headings — at most one short heading, only if it truly clarifies. ` +
      `ALWAYS finish with one short, bold takeaway line — "**Takeaway:** …" (translated into the answer's ` +
      `language) — that captures the single most useful thing to remember. It should leave the learner feeling ` +
      `clear and confident, not lectured.\n\n` +
      `=== LESSON CONTEXT ===\n${lessonContext}`;

    let result;
    try {
      result = await analyzeWithAI(system + langDirective(lang), question, { maxTokens: 700, timeoutMs: 30000 });
    } catch (e) {
      if (e.code === 'AI_NOT_CONFIGURED') {
        return res.status(503).json({ success: false, message: 'The AI tutor is not configured yet.' });
      }
      console.error('tutor AI error:', e.message);
      return res.status(502).json({ success: false, message: 'The tutor could not answer right now. Please try again.' });
    }

    const payload = {
      answer: result.text.trim(),
      disclaimer: 'Educational only — not financial advice.',
      generated_at: new Date().toISOString(),
    };
    await logUsage(req.user.id, 'tutor', result);
    await writeCache(key, payload, 24);

    // This billed call consumed one slot, so remaining drops by one for free users.
    const remainingAfter = isPremium ? null : Math.max(0, freeRemaining - 1);
    res.json({ success: true, cached: false, free_remaining: remainingAfter, ...payload });
  } catch (err) {
    console.error('tutorChat error:', err);
    res.status(500).json({ success: false, message: 'Tutor failed' });
  }
};

/* ============================================================
 *  WEEKLY MARKET DIGEST (auto → premium Telegram channel)
 *  generateAndBroadcastDigest() is called by a weekly cron and by the
 *  admin "send now" endpoint. Generated once/week (cached), then broadcast
 *  to premium users with a linked Telegram.
 * ============================================================ */
function escapeHtml(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `digest:${date.getUTCFullYear()}-W${week}`;
}

async function topMovers(country) {
  const { rows } = await db.query(
    `SELECT display_symbol, name, day_change_pct, last_price, currency
     FROM stocks
     WHERE country = $1 AND is_active = TRUE AND day_change_pct IS NOT NULL
     ORDER BY day_change_pct DESC NULLS LAST`,
    [country]
  );
  const num = (v) => (v == null ? null : +parseFloat(v).toFixed(2));
  const map = (r) => ({ symbol: r.display_symbol, name: r.name, change_pct: num(r.day_change_pct), price: num(r.last_price) });
  return { gainers: rows.slice(0, 5).map(map), losers: rows.slice(-5).reverse().map(map) };
}

export async function generateAndBroadcastDigest({ force = false } = {}) {
  const weekKey = isoWeekKey();
  let digestText;
  const cached = await readCache(weekKey);

  if (cached?.text && !force) {
    digestText = cached.text;
  } else {
    const data = { nigeria: await topMovers('NG'), united_states: await topMovers('US') };
    const system =
      `You are StockAcademia's market educator writing a short WEEKLY digest for beginner investors (Nigerian + ` +
      `US markets). Use ONLY the movers data provided. Write ~150 words: a one-line friendly intro, then a few ` +
      `bullet highlights for Nigeria (NGX) and the US, in plain English a beginner understands. Explain *why a ` +
      `mover might matter* in learning terms. No hype, no "guaranteed", no buy/sell calls, no price targets. ` +
      `End with one short encouragement to keep learning. Plain text only (no markdown headers).`;
    const user = JSON.stringify(data, null, 2);

    let result;
    try {
      result = await analyzeWithAI(system, user, { maxTokens: 700, timeoutMs: 45000 });
    } catch (e) {
      console.error('weekly digest AI error:', e.message);
      return { ok: false, error: e.code === 'AI_NOT_CONFIGURED' ? 'ai_not_configured' : 'ai_error', sent: 0 };
    }
    digestText = result.text.trim();
    await logUsage(null, 'weekly_digest', result);
    await writeCache(weekKey, { text: digestText }, 24 * 7);
  }

  const html =
    `📈 <b>StockAcademia — Weekly Market Digest</b>\n\n${escapeHtml(digestText)}\n\n` +
    `<i>Educational only — not financial advice.</i>`;
  const broadcast = await broadcastToPremium(html);
  return { ok: true, preview: digestText, ...broadcast };
}

/* POST /api/admin/send-digest  (admin-only) — generate + send now (for testing) */
export const sendDigestNow = async (req, res) => {
  if (!req.user?.is_admin) return res.status(403).json({ success: false, message: 'Admins only' });
  try {
    const r = await generateAndBroadcastDigest({ force: true });
    if (!r.ok) {
      return res.status(502).json({ success: false, message: 'Could not generate the digest (check OPENAI_API_KEY).' });
    }
    res.json({ success: true, ...r });
  } catch (err) {
    console.error('sendDigestNow error:', err);
    res.status(500).json({ success: false, message: 'Digest failed' });
  }
};
