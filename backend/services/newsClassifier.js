// ============================================================
// newsClassifier.js — is a headline material? (deterministic, no AI)
//
// Used by the background news monitor to decide which headlines are worth an
// alert. Keyword rules, checked in order; the first match wins. Anything that
// matches none of them (price chatter, listicles, "could this stock double?")
// is treated as noise. Cheap enough to run on every headline.
// ============================================================

const KINDS = [
  ['earnings', 'Results', /\b(earnings|results|profit|revenue|quarterly|q[1-4]|h[12]|half[- ]year|full[- ]year|interim report)\b/i],
  ['dividend', 'Dividend', /\b(dividends?|payout)\b/i],
  ['m&a', 'Deal', /\b(acquires?|acquired|acquisition|merger|merges?|takeover|buyout)\b/i],
  ['legal', 'Legal', /\b(lawsuit|sued|sues|court|fined|penalt(y|ies)|probe|investigation|fraud)\b/i],
  ['regulatory', 'Regulatory', /\b(regulators?|sec|cbn|suspend(s|ed)?|suspension|sanctions?|licen[cs]e[sd]?)\b/i],
  ['leadership', 'Leadership', /\b(ceo|chief executive|chairman|managing director|resigns?|resigned|resignation|steps down|appoints?|appointed|appointment)\b/i],
  ['guidance', 'Outlook', /\b(guidance|outlook|forecasts?|downgraded?|upgraded?|profit warning)\b/i],
  ['capital', 'Capital', /\b(rights issue|bonus shares?|buybacks?|share repurchase|stock split|delist(ed|ing)?|ipo|capital raise)\b/i],
];

/** @returns {{ material: boolean, kind: string|null, label: string|null }} */
export function classifyHeadline(headline) {
  const h = String(headline || '');
  for (const [kind, label, re] of KINDS) {
    if (re.test(h)) return { material: true, kind, label };
  }
  return { material: false, kind: null, label: null };
}
