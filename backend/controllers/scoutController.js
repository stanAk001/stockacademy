// ============================================================
// scoutController.js — AI Stock Scout (discovery).
//
//   GET /api/ai/scout?objective=&market=&language=   (premium)
//
// The intelligence funnel end to end: deterministic quant work has already run
// (stock_technicals, filled by technicalsUpdater) — here we FILTER + RANK it into
// a short candidate list, then hand ONLY that list to the AI to interpret. The AI
// never scans the market and never invents a number; it explains verified data.
//
// Objective-aware:
//   swing    → ranked by transparent Setup Quality (technicals must show a setup)
//   longterm → ranked by factual fundamentals (quality + growth + low leverage)
//   explore  → a blend of the strongest of each
// Market-aware: US and NGX are filtered independently; missing data degrades to
// "not available", never a guess.
// ============================================================
import db from '../config/db.js';
import crypto from 'crypto';
import { analyzeWithAI, parseJsonFromAI } from '../services/aiProvider.js';
import {
  readCache, writeCache, langKey, logUsage, langDirective, MENTOR_VOICE, DISCLAIMER,
} from './aiController.js';
import { consumeEntitlement } from '../middleware/entitlement.js';
import { cleanProfile, normalizeRisk, longtermWeights, swingAtrCap, sizeFloor } from '../services/investorProfile.js';
import { logEvent } from '../services/analytics.js';

const CANDIDATE_LIMIT = 8;     // how many reach the AI — the cost cap
const CACHE_TTL_HOURS = 6;

const OBJECTIVES = new Set(['swing', 'longterm', 'explore']);
const num = (v) => (v === null || v === undefined ? null : parseFloat(v));

// ---- quant ranking (no AI) -------------------------------------------------

// Swing: prefer stocks with a live technical setup and rank by the transparent
// quality score. But fall back to live movers so a market WITHOUT full technical
// history (e.g. NGX on the free data tier, which only allows 7 sessions) still
// returns real, explainable candidates instead of nothing.
// Profile (§3): risk tolerance caps how volatile a candidate may be (ATR% of
// price); preferred sectors get a small boost, never a hard filter.
// Exported for verification scripts/tests; routes only use stockScout.
export async function swingCandidates(marketFilter, params, prof = {}) {
  const p = [...params];
  let riskFilter = '';
  const cap = swingAtrCap(prof.risk);
  if (cap != null) {
    p.push(cap);
    riskFilter = `AND ((t.technicals->>'atr_pct') IS NULL OR (t.technicals->>'atr_pct')::numeric <= $${p.length})`;
  }
  let sectorBoost = '0';
  if (prof.sectors?.length) {
    p.push(prof.sectors);
    sectorBoost = `CASE WHEN s.sector = ANY($${p.length}::text[]) THEN 5 ELSE 0 END`;
  }
  const { rows } = await db.query(
    `SELECT s.symbol, s.display_symbol, s.name, s.sector, s.country, s.currency,
            s.last_price, s.day_change_pct, s.pe_ratio, s.dividend_yield, s.return_1y,
            t.setup, t.setup_reason, t.quality_score, t.trend, t.rsi14,
            t.technicals, t.factors
       FROM stocks s
       LEFT JOIN stock_technicals t ON t.symbol = s.symbol
      WHERE s.is_active = TRUE AND s.last_price IS NOT NULL
        ${marketFilter}
        ${riskFilter}
      ORDER BY (CASE WHEN t.setup IS NOT NULL AND t.setup <> 'none' THEN 1 ELSE 0 END) DESC,
               (t.quality_score + ${sectorBoost}) DESC NULLS LAST,
               ABS(COALESCE(s.day_change_pct, 0)) DESC,
               s.return_1y DESC NULLS LAST
      LIMIT ${CANDIDATE_LIMIT}`,
    p
  );
  return rows;
}

// Long-term: factual fundamental screen — profitable, growing, not over-levered.
// Each metric is turned into a 0–1 percentile, then weighted by the user's
// profile (styles + risk). Missing data ranks lowest, never as a fake zero.
// Company size is a percentile within each market (₦ and $ never compared).
export async function longtermCandidates(marketFilter, params, prof = {}) {
  const p = [...params];
  p.push(sizeFloor(prof.company_size));
  const sizeParam = `$${p.length}`;
  const w = longtermWeights({ styles: prof.styles }, prof.risk);
  const weightTerms = [
    ['roe', 'r_roe'], ['earnings_growth', 'r_eg'], ['revenue_growth', 'r_rg'], ['low_debt', 'r_low_debt'],
    ['dividend', 'r_div'], ['cheap', 'r_cheap'], ['momentum', 'r_mom'], ['low_vol', 'r_low_vol'],
  ].map(([k, col]) => { p.push(w[k]); return `$${p.length}::float * ${col}`; });
  let sectorBoost = '0';
  if (prof.sectors?.length) {
    p.push(prof.sectors);
    sectorBoost = `CASE WHEN sector = ANY($${p.length}::text[]) THEN 0.15 ELSE 0 END`;
  }

  const { rows } = await db.query(
    `WITH base AS (
       SELECT s.symbol, s.display_symbol, s.name, s.sector, s.country, s.currency,
              s.last_price, s.pe_ratio, s.pb_ratio, s.roe, s.net_margin,
              s.revenue_growth_yoy, s.earnings_growth_yoy, s.debt_to_equity,
              s.dividend_yield, s.return_1y, s.market_cap_millions, s.volatility_1y,
              t.trend, t.quality_score, t.setup,
              PERCENT_RANK() OVER (PARTITION BY s.country ORDER BY s.market_cap_millions NULLS FIRST) AS size_pct
         FROM stocks s
         LEFT JOIN stock_technicals t ON t.symbol = s.symbol
        WHERE s.is_active = TRUE AND s.last_price IS NOT NULL
          ${marketFilter}
     ), ranked AS (
       SELECT *,
              PERCENT_RANK() OVER (ORDER BY roe NULLS FIRST) AS r_roe,
              PERCENT_RANK() OVER (ORDER BY earnings_growth_yoy NULLS FIRST) AS r_eg,
              PERCENT_RANK() OVER (ORDER BY revenue_growth_yoy NULLS FIRST) AS r_rg,
              PERCENT_RANK() OVER (ORDER BY debt_to_equity DESC NULLS FIRST) AS r_low_debt,
              PERCENT_RANK() OVER (ORDER BY dividend_yield NULLS FIRST) AS r_div,
              PERCENT_RANK() OVER (ORDER BY CASE WHEN pe_ratio > 0 THEN pe_ratio END DESC NULLS FIRST) AS r_cheap,
              PERCENT_RANK() OVER (ORDER BY return_1y NULLS FIRST) AS r_mom,
              PERCENT_RANK() OVER (ORDER BY volatility_1y DESC NULLS FIRST) AS r_low_vol
         FROM base
        WHERE size_pct >= ${sizeParam}
     )
     SELECT * FROM ranked
      ORDER BY (${weightTerms.join(' + ')} + ${sectorBoost}) DESC,
               market_cap_millions DESC NULLS LAST
      LIMIT ${CANDIDATE_LIMIT}`,
    p
  );
  return rows;
}

// The user's saved profile, normalised. Missing columns / no row → empty profile.
async function loadProfile(userId) {
  if (!userId) return {};
  try {
    const { rows } = await db.query(
      `SELECT risk_tolerance, investor_profile FROM users WHERE id = $1`,
      [userId]
    );
    const r = rows[0] || {};
    return { risk: normalizeRisk(r.risk_tolerance), ...cleanProfile(r.investor_profile || {}) };
  } catch {
    return {};
  }
}

// Compact, verified payload for the model — only fields we actually hold.
function compact(row, objective) {
  const tech = row.technicals || {};
  const base = {
    symbol: row.display_symbol || row.symbol,
    name: row.name,
    sector: row.sector,
    market: row.country === 'NG' ? 'NGX' : 'US',
    currency: row.currency,
    price: num(row.last_price),
  };
  if (objective === 'longterm') {
    return {
      ...base,
      pe: num(row.pe_ratio), pb: num(row.pb_ratio), roe: num(row.roe),
      net_margin: num(row.net_margin), revenue_growth: num(row.revenue_growth_yoy),
      earnings_growth: num(row.earnings_growth_yoy), debt_to_equity: num(row.debt_to_equity),
      dividend_yield: num(row.dividend_yield), return_1y: num(row.return_1y),
      trend: row.trend || 'unknown',
    };
  }
  return {
    ...base,
    setup: row.setup,
    setup_reason: row.setup_reason,
    setup_quality: row.quality_score,
    factors: Array.isArray(row.factors) ? row.factors : [], // the transparent "why 82?" breakdown
    trend: row.trend,
    rsi: num(row.rsi14),
    macd: tech.macd || null,
    atr_pct: tech.atr_pct ?? null,
    relative_volume: tech.relative_volume ?? null,
    range_position: tech.range_position ?? null,
    support: tech.support ?? null,
    resistance: tech.resistance ?? null,
  };
}

// Signature of the ranked set, so the cache regenerates when the ranking shifts
// but serves a hit while it's stable.
function signature(rows) {
  const s = rows.map((r) => `${r.symbol}:${r.quality_score ?? ''}`).join('|');
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
}

// ---- controller ------------------------------------------------------------

export const stockScout = async (req, res) => {
  try {
    const objective = OBJECTIVES.has(req.query.objective) ? req.query.objective : 'swing';
    const marketIn = String(req.query.market || '').toUpperCase();
    const market = marketIn === 'US' ? 'US' : marketIn === 'NG' || marketIn === 'NGX' ? 'NG' : 'ALL';
    const lang = req.query.language;

    // Market filter as a parameterised fragment.
    const params = [];
    let marketFilter = '';
    if (market !== 'ALL') { params.push(market); marketFilter = `AND s.country = $${params.length}`; }

    const prof = await loadProfile(req.user?.id);
    const rows = objective === 'longterm'
      ? await longtermCandidates(marketFilter, params, prof)
      : await swingCandidates(marketFilter, params, prof);

    if (!rows.length) {
      return res.json({
        success: true, cached: false, objective, market,
        candidates: [], market_note: '',
        empty_reason: objective === 'swing'
          ? 'No actionable setups right now. This is normal — quality setups are not always available. Check back after the next scan.'
          : 'No stocks currently pass the screen for this market.',
        disclaimer: DISCLAIMER,
      });
    }

    const scope = `${market}:${objective}`;
    // The AI text is tailored to the profile, so users with different profiles
    // must never share a cached answer.
    const profSig = crypto.createHash('sha1').update(JSON.stringify(prof)).digest('hex').slice(0, 8);
    const key = `scout:v2:${scope}:${langKey(lang)}:${signature(rows)}:${profSig}`;
    const cached = await readCache(key);
    if (cached) {
      res.setHeader('X-AI-Cache', 'hit');
      return res.json({ success: true, cached: true, ...cached });
    }

    const candidates = rows.map((r) => compact(r, objective));

    const schema = objective === 'longterm'
      ? `{"market_note": string, "picks": [{"symbol": string, "headline": string, ` +
        `"why": string[], "watch": string[], "risks": string[], "quality_tier": "strong"|"solid"|"speculative", ` +
        `"suits": string}]}`
      : `{"market_note": string, "picks": [{"symbol": string, "headline": string, ` +
        `"why": string[], "watch": string[], "risks": string[], "confidence": number, "suits": string}]}`;

    const system =
      MENTOR_VOICE +
      `You are the AI Stock Scout for a ${objective === 'longterm' ? 'long-term investor' : 'swing trader'}. ` +
      `You are given a SHORT list of candidates that a quant screen already ranked from real market data. ` +
      `Your job: for EACH candidate, explain in plain words why it surfaced, what to watch, and what could go wrong. ` +
      `HARD RULES: (a) Use ONLY the numbers provided — never invent a price, level, or metric; if a field is ` +
      `null say the data isn't available. (b) This is analysis, NOT advice — no "buy"/"sell", no guarantees, no ` +
      `price targets, no "risk-free"/"guaranteed"/"perfect entry". Speak of a POTENTIAL setup/scenario/signal. ` +
      `(c) Keep each list item to one tight sentence. (d) "market_note" is one or two sentences on what this set ` +
      `says about current conditions. Respond with ONLY valid JSON (no markdown fences) in exactly this shape: ${schema}`;

    const profileLine = [
      prof.risk && `risk tolerance ${prof.risk}`,
      prof.styles?.length && `prefers ${prof.styles.join('/')} stocks`,
      prof.holding_period && `usually holds for ${prof.holding_period}`,
      prof.sectors?.length && `interested in ${prof.sectors.join(', ')}`,
    ].filter(Boolean).join('; ');
    const userMsg =
      `Objective: ${objective}. Market: ${market}. ` +
      (profileLine
        ? `Investor profile: ${profileLine}. Use it when judging who each pick "suits", and say plainly if a pick is a poor fit for this profile. Do not change the ranking or invent data. `
        : '') +
      `Candidates (already ranked, real data):\n${JSON.stringify(candidates, null, 0)}`;

    let result;
    try {
      result = await analyzeWithAI(system + langDirective(lang), userMsg, { maxTokens: 5000, timeoutMs: 60000 });
    } catch (e) {
      if (e.code === 'AI_NOT_CONFIGURED') {
        return res.status(503).json({ success: false, message: 'AI Scout is not configured yet.' });
      }
      console.error('scout AI error:', e.message);
      return res.status(502).json({ success: false, message: 'Could not build the scout right now. Please try again.' });
    }

    let parsed;
    try {
      parsed = parseJsonFromAI(result.text);
    } catch {
      await logUsage(req.user?.id, 'ai_scout', result);
      return res.status(502).json({ success: false, message: 'The AI returned an unexpected format. Please try again.' });
    }
    await logUsage(req.user?.id, 'ai_scout', result);

    // Merge the AI interpretation back onto the verified quant candidate by symbol.
    const bySym = new Map(candidates.map((c) => [c.symbol.toUpperCase(), c]));
    const picks = Array.isArray(parsed?.picks) ? parsed.picks : [];
    const merged = picks
      .map((p) => {
        const q = bySym.get(String(p.symbol || '').toUpperCase());
        if (!q) return null;
        return {
          ...q,
          headline: p.headline || '',
          why: Array.isArray(p.why) ? p.why : [],
          watch: Array.isArray(p.watch) ? p.watch : [],
          risks: Array.isArray(p.risks) ? p.risks : [],
          confidence: typeof p.confidence === 'number' ? p.confidence : null,
          quality_tier: p.quality_tier || null,
          suits: p.suits || '',
        };
      })
      .filter(Boolean);

    // Persist to the Opportunity Radar cache (best-effort; never blocks the response).
    persistOpportunities(scope, merged).catch((e) => console.warn('opps persist:', e.message));

    const payload = {
      objective, market,
      market_note: parsed?.market_note || '',
      candidates: merged.length ? merged : candidates, // fall back to raw quant if merge empties
      generated_at: new Date().toISOString(),
      disclaimer: DISCLAIMER,
    };
    await writeCache(key, payload, CACHE_TTL_HOURS);
    await consumeEntitlement(req); // billed scan → count it against the Free allowance
    logEvent(req.user?.id, 'scout_used', { objective, market, count: merged.length });
    res.json({ success: true, cached: false, ...payload });
  } catch (err) {
    console.error('stockScout error:', err);
    res.status(500).json({ success: false, message: 'Scout failed' });
  }
};

async function persistOpportunities(scope, picks) {
  if (!picks.length) return;
  // Fresh batch replaces the last one for this scope.
  await db.query('DELETE FROM ai_opportunities WHERE scope = $1', [scope]);
  let rank = 1;
  for (const p of picks) {
    // p.symbol here is the display symbol; resolve back to the internal symbol.
    const { rows } = await db.query(
      `SELECT symbol FROM stocks WHERE UPPER(display_symbol) = $1 OR UPPER(symbol) = $1 LIMIT 1`,
      [String(p.symbol).toUpperCase()]
    );
    if (!rows[0]) continue;
    await db.query(
      `INSERT INTO ai_opportunities (scope, symbol, rank, quality_score, setup, category, summary, generated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())`,
      [
        scope, rows[0].symbol, rank++, p.setup_quality ?? null, p.setup ?? null,
        p.quality_tier || (p.setup ? 'setup' : null),
        JSON.stringify({ headline: p.headline, why: p.why, watch: p.watch, risks: p.risks }),
      ]
    );
  }
}
