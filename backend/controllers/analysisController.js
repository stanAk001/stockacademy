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

const num = (v, fallback) => {
  if (v === null || v === undefined) return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

/* ============================================================
 * PUBLIC: GET /api/analysis/:symbol
 * Returns ONLY factual data: the company's real metrics and a
 * factual peer comparison. No proprietary scoring/grades — the
 * interpretation layer is the AI plain-English verdict, served
 * separately by /api/ai/explain-stock (balanced + disclaimered).
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

    // Track view (recently-viewed list)
    try {
      if (req.user) {
        await db.query('INSERT INTO stock_views (user_id, symbol) VALUES ($1, $2)', [req.user.id, symbol]);
      }
    } catch {}

    const response = {
      success: true,
      symbol,
      name: stock.name,
      sector: stock.sector,
      country: stock.country,
      currency: stock.currency,
      last_price: parseFloat(stock.last_price),
      generated_at: new Date(),
    };

    // Peers in same sector — factual figures only.
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

    // Raw, factual metrics straight from the data.
    response.metrics = extractMetrics(stock);

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load analysis' });
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
 * PUBLIC: GET /api/analysis/rankings?metric=&country=
 * Discovery lists ranked by FACTUAL metrics only — no proprietary
 * scoring. Stocks missing the chosen metric are excluded so we never
 * rank on invented data.
 * ============================================================ */
const RANKING_METRICS = {
  gainers:  { col: 'return_1y',           dir: 'DESC', label: 'Top 1-year performers' },
  dividend: { col: 'dividend_yield',      dir: 'DESC', label: 'Highest dividend yield' },
  largest:  { col: 'market_cap_millions', dir: 'DESC', label: 'Largest companies' },
  value:    { col: 'pe_ratio',            dir: 'ASC',  label: 'Lowest P/E ratio' },
};

export const getRankings = async (req, res) => {
  try {
    const key = (req.query.metric || 'gainers').toLowerCase();
    const metric = RANKING_METRICS[key] ? key : 'gainers';
    const m = RANKING_METRICS[metric];

    const country = req.query.country?.toUpperCase();
    const params = [];
    let where = `WHERE is_active = TRUE AND ${m.col} IS NOT NULL`;
    if (metric === 'value') where += ' AND pe_ratio > 0'; // negative P/E isn't "cheap"
    if (country) {
      params.push(country);
      where += ` AND country = $${params.length}`;
    }

    // m.col / m.dir come from a fixed allow-list above, never raw user input.
    const { rows } = await db.query(
      `SELECT symbol, display_symbol, name, sector, country, currency, last_price,
              day_change_pct, return_1y, dividend_yield, market_cap_millions, pe_ratio
       FROM stocks ${where}
       ORDER BY ${m.col} ${m.dir} NULLS LAST
       LIMIT 50`,
      params
    );

    const rankings = rows.map((s) => ({
      symbol: s.symbol,
      display_symbol: s.display_symbol,
      name: s.name,
      sector: s.sector,
      country: s.country,
      currency: s.currency,
      last_price: num(s.last_price, null),
      day_change_pct: num(s.day_change_pct, null),
      return_1y: num(s.return_1y, null),
      dividend_yield: num(s.dividend_yield, null),
      market_cap_millions: num(s.market_cap_millions, null),
      pe_ratio: num(s.pe_ratio, null),
    }));

    res.json({ success: true, metric, label: m.label, country: country || 'ALL', rankings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load rankings' });
  }
};
