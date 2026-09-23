// ============================================================
// thesisMonitor.js — detect MATERIAL changes to a long-term thesis (§10/§11).
//
// Runs on the daily fundamentals cron. Compares each thesis's stored baseline
// (the fundamentals when it was created) to the current stocks row. When a
// tracked metric moves past a material threshold, it records exactly WHAT changed
// (field, from, to, direction) and rolls those into a thesis state:
//   intact | strengthening | weakening | invalidated
// This is the data behind "Why did this change?" — deterministic and explainable,
// never an opaque score. No AI in the loop.
// ============================================================
import db from '../config/db.js';
import { dispatch } from './notificationEngine.js';

const numOr = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

// field → { good: 'up'|'down', material: absolute-move that counts, label }
// A "material" move is in the metric's own units (percentage points for margins
// /growth/roe/yield; a ratio delta for pe / debt-to-equity).
const FIELDS = {
  revenue_growth_yoy: { good: 'up', material: 5, label: 'Revenue growth' },
  earnings_growth_yoy: { good: 'up', material: 10, label: 'Earnings growth' },
  net_margin: { good: 'up', material: 3, label: 'Net margin' },
  roe: { good: 'up', material: 3, label: 'Return on equity' },
  debt_to_equity: { good: 'down', material: 0.3, label: 'Debt-to-equity' },
  dividend_yield: { good: 'up', material: 1, label: 'Dividend yield' },
};

// Compare a baseline snapshot to the current row. Returns { changed_fields, score,
// invalidated }. score < 0 = net deterioration, > 0 = net improvement.
export function diffFundamentals(baseline, current) {
  const changed = [];
  let score = 0;
  let invalidated = false;

  for (const [field, cfg] of Object.entries(FIELDS)) {
    const from = numOr(baseline?.[field]);
    const to = numOr(current?.[field]);
    if (from === null || to === null) continue;
    const delta = to - from;
    if (Math.abs(delta) < cfg.material) continue;

    const improved = cfg.good === 'up' ? delta > 0 : delta < 0;
    const direction = improved ? 'improved' : 'deteriorated';
    changed.push({ field, label: cfg.label, from, to, direction });
    score += improved ? 1 : -1;

    // Hard invalidation signals: earnings growth collapsing negative, or margin
    // flipping from profit to loss.
    if (field === 'earnings_growth_yoy' && from > 0 && to <= -20) invalidated = true;
    if (field === 'net_margin' && from > 0 && to < 0) invalidated = true;
  }
  return { changed_fields: changed, score, invalidated };
}

function nextState(prev, diff) {
  if (diff.invalidated) return 'invalidated';
  if (prev === 'invalidated') return 'invalidated'; // don't silently un-break
  if (diff.score <= -2) return 'weakening';
  if (diff.score >= 2) return 'strengthening';
  return 'intact';
}

export async function monitorTheses() {
  let changed = 0;
  try {
    const { rows } = await db.query(
      `SELECT t.*, s.display_symbol, s.name, s.currency,
              s.revenue_growth_yoy, s.earnings_growth_yoy, s.net_margin, s.roe,
              s.debt_to_equity, s.dividend_yield
         FROM investment_theses t
         JOIN stocks s ON s.symbol = t.symbol
        WHERE t.state <> 'invalidated'`
    );

    for (const t of rows) {
      const current = {
        revenue_growth_yoy: t.revenue_growth_yoy, earnings_growth_yoy: t.earnings_growth_yoy,
        net_margin: t.net_margin, roe: t.roe, debt_to_equity: t.debt_to_equity,
        dividend_yield: t.dividend_yield,
      };
      const diff = diffFundamentals(t.baseline || {}, current);
      await db.query('UPDATE investment_theses SET last_reviewed_at = NOW() WHERE id = $1', [t.id]);

      // Nothing material moved → nothing to say.
      if (!diff.changed_fields.length) continue;

      const next = nextState(t.state, diff);
      if (next === t.state) continue; // material noise but no state flip → stay quiet

      const label = t.display_symbol || t.symbol;
      const worst = diff.changed_fields.find((c) => c.direction === 'deteriorated') || diff.changed_fields[0];
      const note = next === 'invalidated'
        ? `Your ${label} investment thesis is invalidated — ${worst.label} moved from ${worst.from} to ${worst.to}.`
        : next === 'weakening'
          ? `Your ${label} thesis is weakening — ${diff.changed_fields.length} fundamental${diff.changed_fields.length > 1 ? 's' : ''} deteriorated, led by ${worst.label}.`
          : `Your ${label} thesis is strengthening — fundamentals improved, led by ${worst.label}.`;

      await db.query(
        'UPDATE investment_theses SET state = $1, updated_at = NOW() WHERE id = $2 AND state = $3',
        [next, t.id, t.state]
      );
      await db.query(
        `INSERT INTO thesis_events (thesis_id, from_state, to_state, note, changed_fields)
         VALUES ($1,$2,$3,$4,$5)`,
        [t.id, t.state, next, note, JSON.stringify(diff.changed_fields)]
      );
      await dispatch({
        userId: t.user_id, category: 'portfolio', type: 'thesis_change',
        title: 'Investment thesis changed', message: note, deepLink: '/theses',
        severity: next === 'invalidated' ? 'warning' : next === 'strengthening' ? 'success' : 'info',
      });
      changed++;
    }
  } catch (err) {
    console.error('monitorTheses error:', err.message);
  }
  return changed;
}
