// ============================================================
// investorProfile.js — the user's investment profile (spec §3).
//
// Pure helpers: validate what the user saves, and turn the profile into ranking
// inputs for the Scout. Nothing here reads the database.
//
// Stored on users: objective, risk_tolerance, preferred_market (columns) and
// investor_profile (JSONB: styles, sectors, holding_period, company_size).
// ============================================================

export const STYLES = ['growth', 'value', 'dividend', 'momentum'];
export const HOLDING = ['days', 'weeks', 'months', 'years'];
export const SIZES = ['any', 'mid_and_up', 'large'];
export const RISKS = ['conservative', 'moderate', 'aggressive'];

// Older rows used low / moderate / high (migration_28 comment). Map them to the
// spec's names so both read the same.
const RISK_ALIASES = { low: 'conservative', medium: 'moderate', high: 'aggressive' };

export function normalizeRisk(v) {
  const s = String(v || '').toLowerCase();
  const r = RISK_ALIASES[s] || s;
  return RISKS.includes(r) ? r : null;
}

// Keep only known keys and values, so the JSONB column can't hold arbitrary data.
export function cleanProfile(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return {};
  const out = {};
  if (Array.isArray(p.styles)) out.styles = [...new Set(p.styles.filter((s) => STYLES.includes(s)))];
  if (Array.isArray(p.sectors)) {
    out.sectors = [...new Set(p.sectors
      .filter((s) => typeof s === 'string' && s.trim())
      .map((s) => s.trim().slice(0, 60)))].slice(0, 12);
  }
  if (HOLDING.includes(p.holding_period)) out.holding_period = p.holding_period;
  if (SIZES.includes(p.company_size)) out.company_size = p.company_size;
  return out;
}

// Weights for the long-term screen. Every metric is ranked 0–1 (percentile)
// within the candidate set, so fractions (ROE, yield) and ratios (P/E) can be
// mixed without one swamping the others.
export function longtermWeights(profile = {}, risk = null) {
  const w = {
    roe: 0.35, earnings_growth: 0.2, revenue_growth: 0.1, low_debt: 0.2,
    dividend: 0.15, cheap: 0, momentum: 0, low_vol: 0,
  };
  const styles = profile.styles || [];
  // When the user picks styles, let them lead: scale the general quality weights
  // down so, say, a dividend investor isn't shown a 0%-yield stock first.
  if (styles.length) for (const k of Object.keys(w)) w[k] *= 0.6;
  if (styles.includes('growth')) { w.revenue_growth += 0.25; w.earnings_growth += 0.15; }
  if (styles.includes('value')) w.cheap += 0.35;
  if (styles.includes('dividend')) w.dividend += 0.35;
  if (styles.includes('momentum')) w.momentum += 0.3;

  const r = normalizeRisk(risk);
  if (r === 'conservative') { w.low_vol += 0.3; w.low_debt += 0.1; }
  if (r === 'aggressive') { w.low_debt = Math.max(0, w.low_debt - 0.1); w.momentum += 0.1; }
  return w;
}

// Largest typical daily move (ATR as % of price) a swing candidate may have.
// null = no cap. Markets without ATR (NGX close-only) are never excluded by it.
export function swingAtrCap(risk) {
  const r = normalizeRisk(risk);
  if (r === 'conservative') return 3;
  if (r === 'moderate') return 5;
  return null;
}

// Company-size floor as a market-cap percentile WITHIN the stock's own market,
// so naira and dollar market caps are never compared directly.
export function sizeFloor(size) {
  if (size === 'large') return 0.7;
  if (size === 'mid_and_up') return 0.4;
  return 0;
}
