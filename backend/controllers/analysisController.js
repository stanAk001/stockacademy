import db from '../config/db.js';
import { refreshFundamentals } from './stockController.js';

/* ============================================================
 * STOCK ANALYSIS ENGINE
 *
 * Computes four factor scores (0-100) for any stock:
 *   - Quality:  profitability, margins, balance-sheet health, growth
 *   - Value:    valuation ratios (P/E, P/B, P/S, EV/EBITDA, PEG)
 *   - Momentum: price returns, 52-week position, trend
 *   - Risk:     volatility, beta, drawdown, liquidity, leverage
 *
 * Each score has educational interpretation. The output is a research
 * report, NOT a BUY/SELL recommendation.
 * ============================================================ */

const DEFAULTS = {
  // Fallback reasonable mid-values so scores compute even without full data
  pe_ratio: 22, pb_ratio: 3, ps_ratio: 3, ev_ebitda: 14, peg_ratio: 1.8, dividend_yield: 0.018,
  roe: 0.12, roa: 0.05, gross_margin: 0.35, net_margin: 0.08, debt_to_equity: 1.2,
  current_ratio: 1.8, revenue_growth_yoy: 0.05, earnings_growth_yoy: 0.05,
  beta: 1.0, volatility_30d: 0.025, volatility_1y: 0.30, max_drawdown_1y: -0.25,
  avg_daily_volume_millions: 5,
  return_1m: 0, return_3m: 0, return_6m: 0, return_1y: 0,
};

const num = (v, fallback) => {
  if (v === null || v === undefined) return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Linearly interpolate a metric into a 0-100 score between two anchors
const scoreLinear = (value, worst, best) => {
  if (worst === best) return 50;
  const t = (value - worst) / (best - worst);
  return Math.round(clamp(t * 100, 0, 100));
};

// Inverted version (lower is better — like P/E)
const scoreInverse = (value, best, worst) => scoreLinear(value, worst, best);

/* ============================================================
 * QUALITY SCORE
 * Rewards: high ROE/ROA, high margins, low leverage, healthy
 *          current ratio, consistent revenue & earnings growth.
 * ============================================================ */
function scoreQuality(s) {
  const roe = num(s.roe, DEFAULTS.roe);
  const roa = num(s.roa, DEFAULTS.roa);
  const gm = num(s.gross_margin, DEFAULTS.gross_margin);
  const nm = num(s.net_margin, DEFAULTS.net_margin);
  const de = num(s.debt_to_equity, DEFAULTS.debt_to_equity);
  const cr = num(s.current_ratio, DEFAULTS.current_ratio);
  const rg = num(s.revenue_growth_yoy, DEFAULTS.revenue_growth_yoy);
  const eg = num(s.earnings_growth_yoy, DEFAULTS.earnings_growth_yoy);

  const parts = [
    { name: 'ROE',             v: roe, score: scoreLinear(roe, 0.02, 0.25), weight: 2 },
    { name: 'ROA',             v: roa, score: scoreLinear(roa, 0.01, 0.15), weight: 1 },
    { name: 'Gross margin',    v: gm,  score: scoreLinear(gm, 0.15, 0.60),  weight: 1 },
    { name: 'Net margin',      v: nm,  score: scoreLinear(nm, 0.02, 0.25),  weight: 1.5 },
    { name: 'Debt/equity',     v: de,  score: scoreInverse(de, 0.5, 3.0),   weight: 1.5 },
    { name: 'Current ratio',   v: cr,  score: scoreLinear(cr, 1.0, 2.5),    weight: 0.5 },
    { name: 'Revenue growth',  v: rg,  score: scoreLinear(rg, -0.05, 0.20), weight: 1.25 },
    { name: 'Earnings growth', v: eg,  score: scoreLinear(eg, -0.10, 0.25), weight: 1.25 },
  ];
  return weighted(parts);
}

/* ============================================================
 * VALUE SCORE
 * Lower P/E, P/B, P/S, EV/EBITDA, PEG = cheaper = higher score.
 * Dividend yield is a small bonus.
 * ============================================================ */
function scoreValue(s) {
  const pe  = num(s.pe_ratio, DEFAULTS.pe_ratio);
  const pb  = num(s.pb_ratio, DEFAULTS.pb_ratio);
  const ps  = num(s.ps_ratio, DEFAULTS.ps_ratio);
  const ev  = num(s.ev_ebitda, DEFAULTS.ev_ebitda);
  const peg = num(s.peg_ratio, DEFAULTS.peg_ratio);
  const dy  = num(s.dividend_yield, DEFAULTS.dividend_yield);

  const parts = [
    { name: 'P/E',        v: pe,  score: scoreInverse(pe, 10, 40),   weight: 2 },
    { name: 'P/B',        v: pb,  score: scoreInverse(pb, 1, 6),     weight: 1 },
    { name: 'P/S',        v: ps,  score: scoreInverse(ps, 0.5, 8),   weight: 1 },
    { name: 'EV/EBITDA',  v: ev,  score: scoreInverse(ev, 6, 25),    weight: 1.5 },
    { name: 'PEG',        v: peg, score: scoreInverse(peg, 0.8, 3),  weight: 1.5 },
    { name: 'Div yield',  v: dy,  score: scoreLinear(dy, 0, 0.06),   weight: 0.75 },
  ];
  return weighted(parts);
}

/* ============================================================
 * MOMENTUM SCORE
 * Rewards positive 1m, 3m, 6m, 1y returns and being near 52-week high.
 * ============================================================ */
function scoreMomentum(s) {
  const r1m  = num(s.return_1m, DEFAULTS.return_1m);
  const r3m  = num(s.return_3m, DEFAULTS.return_3m);
  const r6m  = num(s.return_6m, DEFAULTS.return_6m);
  const r1y  = num(s.return_1y, DEFAULTS.return_1y);

  // Position in 52-week range: 0 = at low, 1 = at high
  let rangePos = 0.5;
  if (s.high_52w && s.low_52w && s.last_price) {
    const high = parseFloat(s.high_52w);
    const low = parseFloat(s.low_52w);
    const p = parseFloat(s.last_price);
    if (high > low) rangePos = clamp((p - low) / (high - low), 0, 1);
  }

  const parts = [
    { name: '1-month return',  v: r1m,      score: scoreLinear(r1m, -0.10, 0.15), weight: 1 },
    { name: '3-month return',  v: r3m,      score: scoreLinear(r3m, -0.15, 0.25), weight: 1.25 },
    { name: '6-month return',  v: r6m,      score: scoreLinear(r6m, -0.20, 0.35), weight: 1.5 },
    { name: '1-year return',   v: r1y,      score: scoreLinear(r1y, -0.25, 0.50), weight: 2 },
    { name: '52-week position',v: rangePos, score: Math.round(rangePos * 100),    weight: 0.75 },
  ];
  return weighted(parts);
}

/* ============================================================
 * RISK SCORE (higher = safer)
 * Penalizes high volatility, high beta, deep drawdowns,
 * high leverage, low liquidity.
 * ============================================================ */
function scoreRisk(s) {
  const vol30 = num(s.volatility_30d, DEFAULTS.volatility_30d);
  const vol1y = num(s.volatility_1y, DEFAULTS.volatility_1y);
  const beta  = num(s.beta, DEFAULTS.beta);
  const dd    = num(s.max_drawdown_1y, DEFAULTS.max_drawdown_1y);  // negative number
  const liq   = num(s.avg_daily_volume_millions, DEFAULTS.avg_daily_volume_millions);
  const de    = num(s.debt_to_equity, DEFAULTS.debt_to_equity);

  const parts = [
    { name: '30-day volatility', v: vol30, score: scoreInverse(vol30, 0.01, 0.05), weight: 1.5 },
    { name: '1-year volatility', v: vol1y, score: scoreInverse(vol1y, 0.15, 0.55), weight: 1 },
    { name: 'Beta',              v: beta,  score: scoreInverse(Math.abs(beta - 1), 0, 1.5), weight: 1 },
    { name: 'Max drawdown (1y)', v: dd,    score: scoreLinear(dd, -0.50, -0.05),  weight: 1.25 },
    { name: 'Liquidity',         v: liq,   score: scoreLinear(Math.log10(Math.max(liq, 0.01)), -1, 2), weight: 0.75 },
    { name: 'Leverage',          v: de,    score: scoreInverse(de, 0.5, 3.0),      weight: 1 },
  ];
  return weighted(parts);
}

function weighted(parts) {
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const weightedScore = parts.reduce((s, p) => s + p.score * p.weight, 0) / totalWeight;
  return { score: Math.round(weightedScore), breakdown: parts };
}

/* ============================================================
 * OVERALL RATING
 * A short, labeled summary (no BUY/SELL) that describes the stock
 * in educational terms. Focuses on factor strengths and weaknesses.
 * ============================================================ */
function overallRating(q, v, m, r) {
  const label = (s, names) => {
    if (s >= 75) return names[0];
    if (s >= 60) return names[1];
    if (s >= 40) return names[2];
    if (s >= 25) return names[3];
    return names[4];
  };

  const quality  = label(q, ['Exceptional quality', 'High quality', 'Average quality', 'Below-average quality', 'Weak fundamentals']);
  const value    = label(v, ['Very attractive valuation', 'Attractive valuation', 'Fairly valued', 'Elevated valuation', 'Richly priced']);
  const momentum = label(m, ['Strong uptrend', 'Positive momentum', 'Neutral momentum', 'Weak momentum', 'Downtrend']);
  const risk     = label(r, ['Low risk profile', 'Moderate-low risk', 'Moderate risk', 'Elevated risk', 'High risk']);

  const composite = Math.round((q + v + m + r) / 4);

  let thesis;
  if (q >= 65 && v >= 55) thesis = 'Quality business at a reasonable price — a classic "compounder" setup that long-term investors look for.';
  else if (q >= 70 && v < 45) thesis = 'High-quality business but priced at a premium — upside depends on continued growth living up to expectations.';
  else if (q < 45 && v >= 65) thesis = '"Deep value" pattern — cheap on paper but watch out for why it\'s cheap (declining business? industry headwinds?).';
  else if (m >= 70 && r < 45) thesis = 'Strong momentum with elevated risk — momentum names reverse hard. Position sizing matters here.';
  else if (r >= 70 && m < 45) thesis = 'Low-risk profile but little price movement — more suitable for capital preservation than growth.';
  else thesis = 'Mixed factor profile — each individual investor\'s priorities (growth vs income vs safety) will determine suitability.';

  return { composite, quality, value, momentum, risk, thesis };
}

/* ============================================================
 * PUBLIC: GET /api/analysis/:symbol
 * Free users get top-level scores + thesis.
 * Premium users get full breakdown + peer comparison.
 * ============================================================ */
export const getAnalysis = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    let { rows } = await db.query('SELECT * FROM stocks WHERE symbol = $1', [symbol]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Stock not found' });
    }
    let stock = rows[0];

    // For US stocks, try to refresh fundamentals from Finnhub (cached 24h)
    if (stock.country === 'US') {
      const refreshed = await refreshFundamentals(symbol);
      if (refreshed) stock = refreshed;
    }

    // Track view (for free-tier daily cap)
    try {
      if (req.user) {
        await db.query('INSERT INTO stock_views (user_id, symbol) VALUES ($1, $2)', [req.user.id, symbol]);
      }
    } catch {}

    const quality  = scoreQuality(stock);
    const value    = scoreValue(stock);
    const momentum = scoreMomentum(stock);
    const risk     = scoreRisk(stock);
    const rating   = overallRating(quality.score, value.score, momentum.score, risk.score);

    const isPremium = req.user?.plan === 'premium';

    const response = {
      success: true,
      symbol,
      name: stock.name,
      sector: stock.sector,
      country: stock.country,
      currency: stock.currency,
      last_price: parseFloat(stock.last_price),
      scores: {
        quality: quality.score,
        value: value.score,
        momentum: momentum.score,
        risk: risk.score,
        composite: rating.composite,
      },
      labels: {
        quality: rating.quality,
        value: rating.value,
        momentum: rating.momentum,
        risk: rating.risk,
      },
      thesis: rating.thesis,
      generated_at: new Date(),
      premium: isPremium,
    };

    if (isPremium) {
      // Full breakdown
      response.breakdown = {
        quality: quality.breakdown,
        value: value.breakdown,
        momentum: momentum.breakdown,
        risk: risk.breakdown,
      };

      // Peers in same sector
      const peersRes = await db.query(
        `SELECT symbol, display_symbol, name, last_price, pe_ratio, roe, debt_to_equity,
                return_1y, volatility_1y, market_cap_millions
         FROM stocks
         WHERE sector = $1 AND symbol != $2 AND is_active = TRUE
         ORDER BY market_cap_millions DESC NULLS LAST
         LIMIT 5`,
        [stock.sector, symbol]
      );
      response.peers = peersRes.rows.map((p) => ({
        symbol: p.symbol,
        display_symbol: p.display_symbol,
        name: p.name,
        pe: num(p.pe_ratio, null),
        roe: num(p.roe, null),
        debt_equity: num(p.debt_to_equity, null),
        return_1y: num(p.return_1y, null),
        volatility_1y: num(p.volatility_1y, null),
      }));

      // Raw metrics
      response.metrics = extractMetrics(stock);
    } else {
      // Free tier: hint at what's locked
      response.locked = {
        message: 'Upgrade to Premium for full factor breakdown, peer comparison, and all metrics',
        features: ['Factor-level sub-scores', 'Sector peer comparison', 'All valuation ratios', 'Full risk metrics'],
      };
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to generate analysis' });
  }
};

function extractMetrics(s) {
  return {
    valuation: {
      pe_ratio: num(s.pe_ratio, null),
      pb_ratio: num(s.pb_ratio, null),
      ps_ratio: num(s.ps_ratio, null),
      ev_ebitda: num(s.ev_ebitda, null),
      peg_ratio: num(s.peg_ratio, null),
      dividend_yield: num(s.dividend_yield, null),
      eps: num(s.eps, null),
      market_cap_millions: num(s.market_cap_millions, null),
    },
    profitability: {
      roe: num(s.roe, null),
      roa: num(s.roa, null),
      gross_margin: num(s.gross_margin, null),
      net_margin: num(s.net_margin, null),
    },
    growth: {
      revenue_growth_yoy: num(s.revenue_growth_yoy, null),
      earnings_growth_yoy: num(s.earnings_growth_yoy, null),
    },
    balance_sheet: {
      debt_to_equity: num(s.debt_to_equity, null),
      current_ratio: num(s.current_ratio, null),
    },
    risk: {
      beta: num(s.beta, null),
      volatility_30d: num(s.volatility_30d, null),
      volatility_1y: num(s.volatility_1y, null),
      max_drawdown_1y: num(s.max_drawdown_1y, null),
      avg_daily_volume_millions: num(s.avg_daily_volume_millions, null),
    },
    returns: {
      return_1m: num(s.return_1m, null),
      return_3m: num(s.return_3m, null),
      return_6m: num(s.return_6m, null),
      return_1y: num(s.return_1y, null),
      high_52w: num(s.high_52w, null),
      low_52w: num(s.low_52w, null),
    },
  };
}

/* ============================================================
 * PUBLIC: GET /api/analysis/rankings
 * Top-rated stocks by factor — the "lazy user" dashboard.
 * Free users can see the list but must pay to see deep analysis.
 * ============================================================ */
export const getRankings = async (req, res) => {
  try {
    const factor = (req.query.factor || 'composite').toLowerCase();
    const country = req.query.country?.toUpperCase();
    const params = [];
    let where = 'WHERE is_active = TRUE';
    if (country) {
      params.push(country);
      where += ` AND country = $${params.length}`;
    }

    const { rows } = await db.query(
      `SELECT * FROM stocks ${where} LIMIT 200`,
      params
    );

    const scored = rows.map((s) => {
      const q = scoreQuality(s).score;
      const v = scoreValue(s).score;
      const m = scoreMomentum(s).score;
      const r = scoreRisk(s).score;
      const composite = Math.round((q + v + m + r) / 4);
      return {
        symbol: s.symbol,
        display_symbol: s.display_symbol,
        name: s.name,
        sector: s.sector,
        country: s.country,
        currency: s.currency,
        last_price: num(s.last_price, null),
        day_change_pct: num(s.day_change_pct, null),
        scores: { quality: q, value: v, momentum: m, risk: r, composite },
      };
    });

    const sortKey = ['quality', 'value', 'momentum', 'risk', 'composite'].includes(factor)
      ? factor : 'composite';
    scored.sort((a, b) => b.scores[sortKey] - a.scores[sortKey]);

    res.json({ success: true, factor: sortKey, country: country || 'ALL', rankings: scored.slice(0, 50) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load rankings' });
  }
};
