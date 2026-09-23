// ============================================================
// journalController.js — trading journal, post-trade review, personal insights.
//
//   GET    /api/ai/journal              — list entries
//   POST   /api/ai/journal              — add one by hand
//   DELETE /api/ai/journal/:id          — remove one
//   GET    /api/ai/journal/:id/review   — AI post-trade review (cached on the row)
//   GET    /api/ai/insights             — behavioural patterns from the journal
//
// Most entries are created automatically by recordClosedTrade() when a position
// closes. Reviews use AI on demand and are cached. Insights are DETERMINISTIC —
// we only draw a behavioural conclusion when there's enough history to be honest,
// and every statement traces to the numbers (spec §14: no tiny-sample conclusions).
// ============================================================
import db from '../config/db.js';
import { analyzeWithAI, parseJsonFromAI } from '../services/aiProvider.js';
import { MENTOR_VOICE, DISCLAIMER, logUsage } from './aiController.js';
import { logEvent } from '../services/analytics.js';

const num = (v) => (v === null || v === undefined ? null : parseFloat(v));
const MIN_SAMPLE = 5; // fewer than this = not enough to conclude anything

// Called by positionsController.closePosition after a position is closed. Writes
// a journal entry capturing the trade + the AI thesis behind it. Best-effort:
// journalling must never break the close itself.
export async function recordClosedTrade(position, exitPrice, pnl) {
  try {
    const entry = num(position.entry_price);
    const exit = num(exitPrice);
    const resultPct = entry ? +(((exit - entry) / entry) * 100).toFixed(2) : null;
    const outcome = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven';

    // Pull the AI setup thesis behind the position, if it came from one.
    let setup = null, aiThesis = null;
    if (position.setup_id) {
      const { rows } = await db.query('SELECT setup, reasons FROM ai_setups WHERE id = $1', [position.setup_id]);
      if (rows[0]) {
        setup = rows[0].setup;
        const reasons = Array.isArray(rows[0].reasons) ? rows[0].reasons : [];
        aiThesis = reasons.length ? reasons.join(' ') : null;
      }
    }

    await db.query(
      `INSERT INTO journal_entries
         (user_id, position_id, symbol, market, objective, setup, entry_price, exit_price,
          quantity, entry_date, exit_date, holding_days, result_pct, realized_pnl, outcome,
          ai_thesis, user_thesis, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, CURRENT_DATE,
               GREATEST(0, (CURRENT_DATE - $10)), $11,$12,$13,$14,$15,$16)`,
      [
        position.user_id, position.id, position.symbol, position.market, position.objective, setup,
        entry, exit, num(position.quantity), position.entry_date, resultPct, pnl, outcome,
        aiThesis, null, position.notes || null,
      ]
    );
    logEvent(position.user_id, 'journal_created', { symbol: position.symbol, outcome, auto: true });
  } catch (e) {
    console.error('recordClosedTrade failed:', e.message);
  }
}

function shape(r) {
  return {
    id: r.id, symbol: r.symbol, market: r.market, objective: r.objective, setup: r.setup,
    entry_price: num(r.entry_price), exit_price: num(r.exit_price), quantity: num(r.quantity),
    entry_date: r.entry_date, exit_date: r.exit_date, holding_days: r.holding_days,
    result_pct: num(r.result_pct), realized_pnl: num(r.realized_pnl), outcome: r.outcome,
    ai_thesis: r.ai_thesis, user_thesis: r.user_thesis, notes: r.notes,
    has_review: !!r.review, review: r.review || null, created_at: r.created_at,
  };
}

export const listJournal = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json({ success: true, entries: rows.map(shape) });
  } catch (err) {
    console.error('listJournal error:', err);
    res.status(500).json({ success: false, message: 'Failed to load journal' });
  }
};

export const createJournal = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.symbol) return res.status(400).json({ success: false, message: 'A ticker is required.' });
    const entry = num(b.entry_price), exit = num(b.exit_price);
    const resultPct = entry && exit ? +(((exit - entry) / entry) * 100).toFixed(2) : null;
    const pnl = entry && exit && b.quantity ? +((exit - entry) * num(b.quantity)).toFixed(2) : null;
    const outcome = resultPct == null ? null : resultPct > 0 ? 'win' : resultPct < 0 ? 'loss' : 'breakeven';

    const { rows } = await db.query(
      `INSERT INTO journal_entries
         (user_id, symbol, market, objective, setup, entry_price, exit_price, quantity,
          entry_date, exit_date, holding_days, result_pct, realized_pnl, outcome, user_thesis, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
               CASE WHEN $9 IS NOT NULL AND $10 IS NOT NULL THEN GREATEST(0,($10::date - $9::date)) END,
               $11,$12,$13,$14,$15)
       RETURNING id`,
      [
        req.user.id, String(b.symbol).toUpperCase(), b.market || null, b.objective || null,
        b.setup || null, entry, exit, num(b.quantity), b.entry_date || null, b.exit_date || null,
        resultPct, pnl, outcome, (b.user_thesis || '').slice(0, 2000), (b.notes || '').slice(0, 2000),
      ]
    );
    logEvent(req.user.id, 'journal_created', { symbol: b.symbol, auto: false });
    res.json({ success: true, id: rows[0].id });
  } catch (err) {
    console.error('createJournal error:', err);
    res.status(500).json({ success: false, message: 'Could not save the entry.' });
  }
};

export const deleteJournal = async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM journal_entries WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!rowCount) return res.status(404).json({ success: false, message: 'Entry not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteJournal error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete entry' });
  }
};

// GET /api/ai/journal/:id/review — AI post-trade review (§16), cached on the row.
export const postTradeReview = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    const e = rows[0];
    if (!e) return res.status(404).json({ success: false, message: 'Entry not found.' });
    if (e.exit_price == null) return res.status(400).json({ success: false, message: 'Add an exit price before reviewing this trade.' });
    if (e.review) return res.json({ success: true, cached: true, review: e.review });

    const system =
      MENTOR_VOICE +
      `You are running a POST-TRADE REVIEW to help this trader improve their PROCESS — not to relive the result. ` +
      `Judge the decision quality, not just the outcome (a good process can lose; a bad one can win). Cover: was ` +
      `the original thesis sound, was the entry reasonable, was risk managed, did the thesis actually play out, ` +
      `and the honest lesson. Be specific and kind. This is educational, not advice — no "buy"/"sell", no ` +
      `guarantees. Respond with ONLY valid JSON (no fences): {"summary": string, "what_went_well": string[], ` +
      `"what_to_improve": string[], "thesis_played_out": string, "lesson": string}.`;

    const userMsg = JSON.stringify({
      symbol: e.symbol, market: e.market, objective: e.objective, setup: e.setup,
      entry_price: num(e.entry_price), exit_price: num(e.exit_price), quantity: num(e.quantity),
      holding_days: e.holding_days, result_pct: num(e.result_pct), outcome: e.outcome,
      ai_thesis: e.ai_thesis, user_thesis: e.user_thesis, notes: e.notes,
    });

    let result;
    try {
      result = await analyzeWithAI(system, userMsg, { maxTokens: 1600, timeoutMs: 40000 });
    } catch (err2) {
      if (err2.code === 'AI_NOT_CONFIGURED') return res.status(503).json({ success: false, message: 'AI review is not configured yet.' });
      console.error('review AI error:', err2.message);
      return res.status(502).json({ success: false, message: 'Could not build the review right now. Please try again.' });
    }

    let review;
    try { review = parseJsonFromAI(result.text); }
    catch {
      await logUsage(req.user.id, 'post_trade_review', result);
      return res.status(502).json({ success: false, message: 'The AI returned an unexpected format. Please try again.' });
    }
    review.disclaimer = DISCLAIMER;
    await logUsage(req.user.id, 'post_trade_review', result);
    await db.query('UPDATE journal_entries SET review = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(review), e.id]);
    logEvent(req.user.id, 'post_trade_review_opened', { symbol: e.symbol });
    res.json({ success: true, cached: false, review });
  } catch (err) {
    console.error('postTradeReview error:', err);
    res.status(500).json({ success: false, message: 'Review failed' });
  }
};

// GET /api/ai/insights — deterministic behavioural patterns from closed trades.
export const getPersonalInsights = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT setup, objective, outcome, result_pct, holding_days
         FROM journal_entries
        WHERE user_id = $1 AND outcome IS NOT NULL`,
      [req.user.id]
    );
    const n = rows.length;
    if (n < MIN_SAMPLE) {
      return res.json({ success: true, ready: false, sample_size: n, needed: MIN_SAMPLE,
        message: `Close ${MIN_SAMPLE - n} more trade${MIN_SAMPLE - n === 1 ? '' : 's'} and we’ll start spotting your patterns. We won’t guess from a tiny sample.` });
    }

    const wins = rows.filter((r) => r.outcome === 'win');
    const losses = rows.filter((r) => r.outcome === 'loss');
    const avg = (arr, f) => (arr.length ? arr.reduce((s, r) => s + (Number(f(r)) || 0), 0) / arr.length : null);
    const pct1 = (v) => (v == null ? null : +v.toFixed(1));

    const stats = {
      total: n,
      win_rate: pct1((wins.length / n) * 100),
      avg_win_pct: pct1(avg(wins, (r) => r.result_pct)),
      avg_loss_pct: pct1(avg(losses, (r) => r.result_pct)),
      avg_hold_win: pct1(avg(wins, (r) => r.holding_days)),
      avg_hold_loss: pct1(avg(losses, (r) => r.holding_days)),
      by_setup: {},
    };

    // Group by setup (only setups with a meaningful count get a callout).
    const bySetup = {};
    for (const r of rows) {
      const k = r.setup || 'other';
      (bySetup[k] ||= []).push(r);
    }
    for (const [k, arr] of Object.entries(bySetup)) {
      const w = arr.filter((r) => r.outcome === 'win').length;
      stats.by_setup[k] = { n: arr.length, win_rate: pct1((w / arr.length) * 100) };
    }

    // ---- turn the numbers into honest, plain-language patterns ----
    const insights = [];
    insights.push(`Across ${n} closed trades, your win rate is ${stats.win_rate}%.`);

    const rankedSetups = Object.entries(stats.by_setup).filter(([k, s]) => k !== 'other' && s.n >= 3).sort((a, b) => b[1].win_rate - a[1].win_rate);
    if (rankedSetups.length) {
      const [bestK, best] = rankedSetups[0];
      if (best.win_rate >= 55) insights.push(`You perform best with ${bestK.replace(/_/g, ' ')} setups — ${best.win_rate}% wins over ${best.n} trades.`);
      const [worstK, worst] = rankedSetups[rankedSetups.length - 1];
      if (rankedSetups.length > 1 && worst.win_rate <= 40) insights.push(`Your ${worstK.replace(/_/g, ' ')} trades have struggled — ${worst.win_rate}% over ${worst.n}. Worth reviewing what's different about them.`);
    }

    if (stats.avg_win_pct != null && stats.avg_loss_pct != null) {
      const winMag = stats.avg_win_pct, lossMag = Math.abs(stats.avg_loss_pct);
      if (lossMag > winMag * 1.2) insights.push(`Your average loss (${stats.avg_loss_pct}%) is bigger than your average win (+${stats.avg_win_pct}%). Cutting losers sooner would tilt the maths back in your favour.`);
      else if (winMag > lossMag * 1.2) insights.push(`You let winners run — your average win (+${stats.avg_win_pct}%) outsizes your average loss (${stats.avg_loss_pct}%). That's a healthy pattern.`);
    }
    if (stats.avg_hold_win != null && stats.avg_hold_loss != null && stats.avg_hold_loss > stats.avg_hold_win * 1.3) {
      insights.push(`You hold losing trades (~${stats.avg_hold_loss} days) longer than winners (~${stats.avg_hold_win} days) — a sign of hoping a loser turns around. A firm invalidation level helps.`);
    }

    // Persist the latest read (upsert).
    await db.query(
      `INSERT INTO personal_insights (user_id, sample_size, stats, insights, generated_at)
       VALUES ($1,$2,$3,$4, NOW())
       ON CONFLICT (user_id) DO UPDATE SET sample_size = EXCLUDED.sample_size,
         stats = EXCLUDED.stats, insights = EXCLUDED.insights, generated_at = NOW()`,
      [req.user.id, n, JSON.stringify(stats), JSON.stringify(insights)]
    );
    logEvent(req.user.id, 'insights_opened', { sample: n });

    res.json({ success: true, ready: true, sample_size: n, stats, insights, disclaimer: DISCLAIMER });
  } catch (err) {
    console.error('getPersonalInsights error:', err);
    res.status(500).json({ success: false, message: 'Could not build your insights.' });
  }
};
