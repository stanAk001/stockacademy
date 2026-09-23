// ============================================================
// missedSetups.js — "what happened to the setup you didn't take?" (spec §14).
//
// Pure and deterministic. Given a tracked setup, its lifecycle events and the
// current price, describe the outcome in plain words and draw one lesson.
//
// This is an EDUCATIONAL feature, so it deliberately covers both outcomes: setups
// that went on to work AND setups that failed (where skipping them avoided a
// loss). It never says "you missed out on X%". It states what the price did.
// ============================================================

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const r1 = (v) => (isNum(v) ? Math.round(v * 10) / 10 : null);
const fmt = (sym, v) => `${sym}${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

// Stages that mean price actually reached the entry zone.
const ENTRY_STAGES = new Set(['triggered', 'confirmed', 'active']);

const SETUP_LESSON = {
  pullback: 'Pullbacks that hold support and then turn up with improving momentum are the pattern worth learning to recognise.',
  breakout: 'Breakouts that clear resistance on rising volume are the ones that most often follow through.',
  trend_continuation: 'Trend continuations tend to work best when the higher timeframes already point the same way.',
};
const DEFAULT_LESSON = 'Notice which conditions lined up before the move. Recognising the same combination next time is the point of reviewing it.';

/**
 * @param {object} setup    ai_setups row (entry_low, entry_high, invalidation, targets, status, setup, reasons)
 * @param {number} price    current price
 * @param {Array}  events   ai_setup_events for this setup, oldest first
 * @param {string} sym      currency symbol for the text ('$' / '₦')
 * @returns {object|null}   null when price never reached the entry zone (nothing was missed)
 */
export function describeMissedSetup(setup, price, events = [], sym = '$') {
  const lo = num(setup.entry_low);
  const hi = num(setup.entry_high);
  const inval = num(setup.invalidation);
  if (!isNum(lo) || !isNum(hi)) return null;

  const trig = events.find((e) => ENTRY_STAGES.has(e.to_status));
  if (!trig) return null;

  const mid = (lo + hi) / 2;
  const zone = `${fmt(sym, lo)}–${fmt(sym, hi)}`;
  const targets = (Array.isArray(setup.targets) ? setup.targets : []).map((t) => num(t?.level)).filter(isNum);
  const hitTarget = setup.status === 'target' || events.some((e) => e.to_status === 'target');
  const invalidated = setup.status === 'invalidated' || events.some((e) => e.to_status === 'invalidated');
  const p = num(price);
  const movePct = isNum(p) ? r1(((p - mid) / mid) * 100) : null;

  let outcome;
  let what;
  if (hitTarget) {
    outcome = 'target';
    const t = targets[0];
    what = isNum(t)
      ? `Price moved from the ${zone} entry zone to the ${fmt(sym, t)} target, about ${r1(((t - mid) / mid) * 100)}% from the middle of the zone.`
      : `Price moved from the ${zone} entry zone to its target.`;
  } else if (invalidated) {
    outcome = 'invalidated';
    const lossPct = isNum(inval) ? r1(((inval - mid) / mid) * 100) : null;
    what = `Price reached the ${zone} entry zone, then fell through the ${isNum(inval) ? `${fmt(sym, inval)} ` : ''}invalidation level.`
      + (lossPct != null ? ` An entry in the middle of the zone would have been stopped out for a loss of about ${Math.abs(lossPct)}%.` : '');
  } else {
    outcome = 'running';
    what = `Price moved through the ${zone} entry zone`
      + (movePct != null ? ` and is now ${movePct >= 0 ? `${movePct}% above` : `${Math.abs(movePct)}% below`} the middle of it.` : '.');
  }

  const lesson = outcome === 'invalidated'
    ? 'Setups fail too. Deciding the invalidation level before you enter is what keeps a failed setup to a small, planned loss. Skipping this one avoided that loss.'
    : `${SETUP_LESSON[setup.setup] || DEFAULT_LESSON} If you hesitated, write down why: an unclear entry, or a position size that felt too big. That answer is more useful than the move itself.`;

  return {
    outcome,
    what_happened: what,
    move_pct: movePct,
    trigger: { status: trig.to_status, at: trig.created_at, price: num(trig.price_at) },
    factors: Array.isArray(setup.reasons) ? setup.reasons.slice(0, 4) : [],
    lesson,
  };
}
