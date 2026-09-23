// ============================================================
// researchController.js — AI Long-Term Research Report + Opportunity Radar.
//
//   GET /api/ai/research/:symbol   — sectioned long-term research (premium, cached)
//   GET /api/ai/opportunities      — the latest Scout batches, grouped (no AI call)
//
// The research report reasons over the FACTUAL fundamentals already stored on the
// stocks row. The AI interprets and structures them; it must not invent a metric.
// "Quality" is a transparent tier + named reasons — never an opaque score (see the
// 2.0 plan, Decision 1). The Opportunity Radar just serves the ai_opportunities
// cache the Scout already wrote, so it's instant and free.
// ============================================================
import db from '../config/db.js';
import { analyzeWithAI, parseJsonFromAI } from '../services/aiProvider.js';
import { readCache, writeCache, langKey, logUsage, langDirective, MENTOR_VOICE, DISCLAIMER } from './aiController.js';
import { marketRegime } from '../services/indicators.js';
import { consumeEntitlement } from '../middleware/entitlement.js';
import { logEvent } from '../services/analytics.js';

const num = (v) => (v === null || v === undefined ? null : parseFloat(v));

async function findStock(ticker) {
  const t = String(ticker || '').trim().toUpperCase();
  if (!t) return null;
  const { rows } = await db.query(
    `SELECT * FROM stocks WHERE UPPER(symbol) = $1 OR UPPER(display_symbol) = $1 LIMIT 1`,
    [t]
  );
  return rows[0] || null;
}

// Factual fundamentals for the AI — only what we actually hold; nulls stay null.
function fundamentals(s) {
  return {
    valuation: {
      pe: num(s.pe_ratio), pb: num(s.pb_ratio), ps: num(s.ps_ratio),
      ev_ebitda: num(s.ev_ebitda), peg: num(s.peg_ratio),
      market_cap_millions: num(s.market_cap_millions), eps: num(s.eps),
    },
    profitability: {
      roe: num(s.roe), roa: num(s.roa),
      gross_margin: num(s.gross_margin), net_margin: num(s.net_margin),
    },
    growth: {
      revenue_growth_yoy: num(s.revenue_growth_yoy),
      earnings_growth_yoy: num(s.earnings_growth_yoy),
    },
    balance_sheet: { debt_to_equity: num(s.debt_to_equity), current_ratio: num(s.current_ratio) },
    dividend: { dividend_yield: num(s.dividend_yield) },
    risk: {
      beta: num(s.beta), volatility_1y: num(s.volatility_1y), max_drawdown_1y: num(s.max_drawdown_1y),
    },
    returns: { return_1y: num(s.return_1y), return_6m: num(s.return_6m) },
  };
}

export const longTermResearch = async (req, res) => {
  try {
    const stock = await findStock(req.params.symbol);
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found.' });

    const label = stock.display_symbol || stock.symbol;
    const market = stock.country === 'NG' ? 'NGX' : 'US';
    const lang = req.query?.language;

    const key = `research:v1:${stock.symbol}:${langKey(lang)}`;
    const cached = await readCache(key);
    if (cached) {
      res.setHeader('X-AI-Cache', 'hit');
      return res.json({ success: true, cached: true, ...cached });
    }

    const facts = fundamentals(stock);

    const system =
      MENTOR_VOICE +
      `You are writing a LONG-TERM research report for a buy-and-hold investor. Reason ONLY over the factual ` +
      `figures provided — never invent a number; where a figure is null, say the data isn't available rather ` +
      `than guessing. Note honestly when something (e.g. detailed cash-flow) isn't in the data. This is ` +
      `educational analysis, NOT advice — no "buy"/"sell", no guarantees, no price targets. Give a genuine, ` +
      `decisive read: a real bear case AND bull case, not fence-sitting. "quality_tier" is your honest overall ` +
      `read (strong / solid / speculative) and "quality_reasons" MUST list the specific factual metrics behind ` +
      `it, so the reader can see exactly why. Respond with ONLY valid JSON (no fences) in exactly this shape: ` +
      `{"summary": string, "business_quality": string, "growth": string, "profitability": string, ` +
      `"balance_sheet": string, "valuation": string, "dividend": string, "risks": string[], ` +
      `"catalysts": string[], "bear_case": string, "base_case": string, "bull_case": string, ` +
      `"quality_tier": "strong"|"solid"|"speculative", "quality_reasons": string[]}.`;

    const userMsg = JSON.stringify({
      symbol: label, name: stock.name, market, sector: stock.sector,
      industry: stock.industry, currency: stock.currency,
      last_price: num(stock.last_price), fundamentals: facts,
    });

    let result;
    try {
      result = await analyzeWithAI(system + langDirective(lang), userMsg, { maxTokens: 4000, timeoutMs: 55000 });
    } catch (e) {
      if (e.code === 'AI_NOT_CONFIGURED') return res.status(503).json({ success: false, message: 'AI research is not configured yet.' });
      console.error('research AI error:', e.message);
      return res.status(502).json({ success: false, message: 'Could not build the research report right now. Please try again.' });
    }

    let report;
    try { report = parseJsonFromAI(result.text); }
    catch {
      await logUsage(req.user?.id, 'ai_research', result);
      return res.status(502).json({ success: false, message: 'The AI returned an unexpected format. Please try again.' });
    }
    await logUsage(req.user?.id, 'ai_research', result);

    const payload = {
      symbol: label, name: stock.name, market, sector: stock.sector,
      currency: stock.currency, last_price: num(stock.last_price),
      fundamentals: facts, report, generated_at: new Date().toISOString(),
      disclaimer: DISCLAIMER,
    };
    await writeCache(key, payload, 24 * 7); // fundamentals are stable week-to-week
    await consumeEntitlement(req);
    logEvent(req.user?.id, 'research_used', { symbol: stock.symbol, market });
    res.json({ success: true, cached: false, ...payload });
  } catch (err) {
    console.error('longTermResearch error:', err);
    res.status(500).json({ success: false, message: 'Research failed' });
  }
};

// GET /api/ai/opportunities — serve the freshest Scout batch per scope, grouped.
// No AI call. A LIVE board read straight from the computed technicals (US) with a
// resilient fallback to live movers (NGX, where full history isn't available), so
// it always shows something the moment technicals exist — no prior Scout scan
// needed. Any AI headline the Scout has already written is layered on top.
export const opportunityRadar = async (req, res) => {
  try {
    const marketIn = String(req.query.market || '').toUpperCase();
    const market = marketIn === 'US' ? 'US' : (marketIn === 'NG' || marketIn === 'NGX') ? 'NG' : null;

    const params = [];
    let mf = '';
    if (market) { params.push(market); mf = `AND s.country = $${params.length}`; }

    const { rows } = await db.query(
      `SELECT s.display_symbol, s.name, s.sector, s.country, s.currency, s.last_price, s.day_change_pct,
              t.trend, t.rsi14, t.setup, t.quality_score, t.setup_reason, t.computed_at,
              o.summary AS ai_summary
         FROM stocks s
         LEFT JOIN stock_technicals t ON t.symbol = s.symbol
         LEFT JOIN LATERAL (
           SELECT summary FROM ai_opportunities ao WHERE ao.symbol = s.symbol
           ORDER BY generated_at DESC LIMIT 1
         ) o ON TRUE
        WHERE s.is_active = TRUE AND s.last_price IS NOT NULL
          ${mf}
        ORDER BY (CASE WHEN t.setup IS NOT NULL AND t.setup <> 'none' THEN 1 ELSE 0 END) DESC,
                 t.quality_score DESC NULLS LAST,
                 ABS(COALESCE(s.day_change_pct, 0)) DESC
        LIMIT 40`,
      params
    );

    const items = rows.map((r) => {
      const dc = num(r.day_change_pct);
      const headline = (r.ai_summary && r.ai_summary.headline)
        || r.setup_reason
        || (dc != null ? `${dc >= 0 ? 'Up' : 'Down'} ${Math.abs(dc).toFixed(1)}% today` : '');
      return {
        symbol: r.display_symbol,
        name: r.name,
        sector: r.sector,
        market: r.country === 'NG' ? 'NGX' : 'US',
        currency: r.currency,
        currency_symbol: r.currency === 'NGN' ? '₦' : '$',
        last_price: num(r.last_price),
        day_change_pct: dc,
        trend: r.trend,
        rsi14: num(r.rsi14),
        setup: r.setup,
        quality_score: r.quality_score,
        category: (r.quality_score ?? 0) >= 75 ? 'strong' : (r.quality_score ?? 0) >= 55 ? 'developing' : 'watch',
        scope: r.country,
        summary: { ...(r.ai_summary || {}), headline },
        generated_at: r.computed_at,
      };
    });

    const freshest = items.reduce((a, b) => (!a || (b.generated_at && new Date(b.generated_at) > new Date(a)) ? b.generated_at : a), null);

    // Free preview (§23): the top 3, with the headline but not the quality score
    // or the AI's reasoning. The rest of the board is counted and left locked.
    if (!req.isPremium) {
      const PREVIEW = 3;
      const preview = items.slice(0, PREVIEW).map((o) => ({
        symbol: o.symbol, name: o.name, market: o.market, currency_symbol: o.currency_symbol,
        last_price: o.last_price, day_change_pct: o.day_change_pct, trend: o.trend, setup: o.setup,
        scope: o.scope, summary: { headline: o.summary?.headline || '' },
      }));
      logEvent(req.user?.id, 'premium_preview_viewed', { surface: 'radar' });
      return res.json({
        success: true, preview: true, count: preview.length,
        locked_count: Math.max(0, items.length - PREVIEW),
        generated_at: freshest, opportunities: preview,
      });
    }

    res.json({ success: true, count: items.length, generated_at: freshest, opportunities: items });
  } catch (err) {
    console.error('opportunityRadar error:', err);
    res.status(500).json({ success: false, message: 'Failed to load opportunities' });
  }
};

// GET /api/ai/desk-stats?market= — real counters for the Trading Desk (no AI call).
// Market-aware: pass US or NG to scope the counts to that exchange.
export const deskStats = async (req, res) => {
  const marketIn = String(req.query.market || '').toUpperCase();
  const market = marketIn === 'US' ? 'US' : (marketIn === 'NG' || marketIn === 'NGX') ? 'NG' : null;
  const cf = market ? 'AND s.country = $1' : '';   // filter for the JOIN queries
  const p = market ? [market] : [];
  try {
    const [setups, strong, scanned, tracked] = await Promise.all([
      db.query(`SELECT COUNT(*)::int n FROM stock_technicals t JOIN stocks s ON s.symbol = t.symbol WHERE t.setup <> 'none' ${cf}`, p),
      db.query(`SELECT COUNT(*)::int n FROM stock_technicals t JOIN stocks s ON s.symbol = t.symbol WHERE t.quality_score >= 65 ${cf}`, p),
      db.query(`SELECT COUNT(*)::int n FROM stocks s WHERE s.is_active = TRUE AND s.last_price IS NOT NULL ${cf}`, p),
      market
        ? db.query(`SELECT COUNT(*)::int n FROM ai_setups a JOIN stocks s ON s.symbol = a.symbol WHERE a.user_id = $1 AND s.country = $2 AND a.status NOT IN ('target','invalidated','expired')`, [req.user.id, market])
        : db.query(`SELECT COUNT(*)::int n FROM ai_setups WHERE user_id = $1 AND status NOT IN ('target','invalidated','expired')`, [req.user.id]),
    ]);
    res.json({
      success: true, market: market || 'ALL',
      setups: setups.rows[0].n, strong: strong.rows[0].n,
      scanned: scanned.rows[0].n, tracked: tracked.rows[0].n,
    });
  } catch (err) {
    res.json({ success: true, market: market || 'ALL', setups: 0, strong: 0, scanned: 0, tracked: 0 });
  }
};

// GET /api/ai/market-regime?market= — deterministic breadth read (no AI call).
// Tells the swing trader whether conditions favour trend-following or caution.
export const getMarketRegime = async (req, res) => {
  try {
    const marketIn = String(req.query.market || '').toUpperCase();
    const market = marketIn === 'US' ? 'US' : (marketIn === 'NG' || marketIn === 'NGX') ? 'NG' : null;
    const params = [];
    let where = 'WHERE TRUE';
    if (market) { params.push(market); where += ` AND s.country = $${params.length}`; }

    const { rows } = await db.query(
      `SELECT t.trend, t.rsi14, t.setup
         FROM stock_technicals t
         JOIN stocks s ON s.symbol = t.symbol
        ${where}`,
      params
    );
    const regime = marketRegime(rows.map((r) => ({ trend: r.trend, rsi14: num(r.rsi14), setup: r.setup })));
    res.json({ success: true, market: market || 'ALL', regime });
  } catch (err) {
    console.error('getMarketRegime error:', err);
    res.status(500).json({ success: false, message: 'Failed to read market regime' });
  }
};
