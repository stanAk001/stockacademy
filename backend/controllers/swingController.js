// ============================================================
// swingController.js — AI Swing Radar (per-symbol entry analysis) + tracked setups.
//
//   GET    /api/ai/swing/:symbol   — full setup: plan + AI read, tracked
//   GET    /api/ai/setups          — the user's tracked setups + latest event
//   DELETE /api/ai/setups/:id      — stop tracking a setup
//
// The trade PLAN (entry zone, invalidation, targets, R:R) is computed
// deterministically from real structure by services/indicators.js — the AI only
// explains it. This is analysis, not advice: a scenario with defined risk.
// ============================================================
import db from '../config/db.js';
import { analyzeWithAI, parseJsonFromAI } from '../services/aiProvider.js';
import { fetchDailyCandles, fetchTimeframes } from '../services/priceHistory.js';
import {
  computeTechnicals, classifySetup, scoreSetup, buildSwingPlan,
  frameRead, multiTimeframe, vwap, sessionVwap,
} from '../services/indicators.js';
import { langDirective, MENTOR_VOICE, DISCLAIMER, logUsage } from './aiController.js';
import { describeMissedSetup } from '../services/missedSetups.js';

const num = (v) => (v === null || v === undefined ? null : parseFloat(v));
const ccy = (c) => (c === 'NGN' ? '₦' : '$');

async function findStock(ticker) {
  const t = String(ticker || '').trim().toUpperCase();
  if (!t) return null;
  const { rows } = await db.query(
    `SELECT * FROM stocks WHERE UPPER(symbol) = $1 OR UPPER(display_symbol) = $1 LIMIT 1`,
    [t]
  );
  return rows[0] || null;
}

// Prefer the cached technicals row; compute fresh only if it's missing.
async function getTechnicals(stock) {
  const { rows } = await db.query(
    `SELECT technicals, setup, quality_score, factors, setup_reason
       FROM stock_technicals WHERE symbol = $1`,
    [stock.symbol]
  );
  if (rows[0]?.technicals) {
    const r = rows[0];
    return {
      technicals: r.technicals,
      setup: r.setup,
      setup_reason: r.setup_reason,
      quality: { score: r.quality_score, factors: Array.isArray(r.factors) ? r.factors : [] },
      source: 'cache',
    };
  }
  const candles = await fetchDailyCandles(stock.symbol, stock.country, stock.display_symbol);
  if (!candles || candles.length < 30) return null;
  const technicals = computeTechnicals(candles);
  if (!technicals.ok) return null;
  const { setup, reason } = classifySetup(technicals);
  const quality = scoreSetup(technicals, setup);
  return { technicals, setup, setup_reason: reason, quality, source: 'live' };
}

export const swingRadar = async (req, res) => {
  try {
    const stock = await findStock(req.params.symbol);
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found.' });

    const tech = await getTechnicals(stock);
    if (!tech) {
      return res.status(503).json({ success: false, message: "Not enough price history to read a setup yet." });
    }

    const label = stock.display_symbol || stock.symbol;
    const market = stock.country === 'NG' ? 'NGX' : 'US';

    if (tech.setup === 'none') {
      return res.json({
        success: true, symbol: label, market, setup: 'none',
        setup_reason: tech.setup_reason,
        technicals: summarize(tech.technicals, stock.currency),
        message: 'No actionable setup right now — a valid setup is not always available, and forcing one is how people lose money.',
        disclaimer: DISCLAIMER,
      });
    }

    const plan = buildSwingPlan(tech.technicals, tech.setup);
    const mtf = await buildMtf(stock, tech.technicals);
    const lang = req.query?.language;

    // AI explains the plan — it must NOT alter any number.
    const system =
      MENTOR_VOICE +
      `You are the AI Swing Radar. A quant engine has ALREADY produced the exact trade plan (entry zone, ` +
      `invalidation, targets, risk/reward) from real price structure. You must NOT change, round, or invent any ` +
      `number — refer to the given levels exactly. Explain, in plain words: the thesis (why this setup exists ` +
      `now), what confirms it, what would break it, and what to watch. This is analysis, NOT advice — no ` +
      `"buy"/"sell", no guarantees, no "risk-free"/"perfect entry". Speak of a POTENTIAL setup/scenario. ` +
      `Respond with ONLY valid JSON (no fences): {"thesis": string, "reasons": string[], "risks": string[], ` +
      `"suits": string, "confidence": number}. confidence is 0-1 (your honest read of setup quality). ` +
      `A multi-timeframe read (weekly → 1H) may be included: say plainly whether the timeframes agree, ` +
      `mention the lower-timeframe confirmation condition if given, and never contradict the read.`;

    const userMsg = JSON.stringify({
      symbol: label, market, currency: stock.currency,
      setup: tech.setup, setup_quality: tech.quality.score,
      quality_factors: tech.quality.factors,
      technicals: summarize(tech.technicals, stock.currency),
      plan,
      timeframes: mtf.summary.alignment === 'insufficient' ? null : {
        alignment: mtf.summary.alignment, note: mtf.summary.note,
        confirmation: mtf.summary.confirmation, frames: mtf.frames,
      },
    });

    let result;
    try {
      result = await analyzeWithAI(system + langDirective(lang), userMsg, { maxTokens: 2200, timeoutMs: 45000 });
    } catch (e) {
      if (e.code === 'AI_NOT_CONFIGURED') return res.status(503).json({ success: false, message: 'AI Swing Radar is not configured yet.' });
      console.error('swing AI error:', e.message);
      return res.status(502).json({ success: false, message: 'Could not build the setup right now. Please try again.' });
    }

    let ai = {};
    try { ai = parseJsonFromAI(result.text) || {}; } catch { /* fall back to plan-only */ }
    await logUsage(req.user?.id, 'ai_swing', result);

    const confidence = typeof ai.confidence === 'number' ? Math.max(0, Math.min(1, ai.confidence)) : null;
    const reasons = Array.isArray(ai.reasons) ? ai.reasons : [];
    const risks = Array.isArray(ai.risks) ? ai.risks : [];

    const setupId = await trackSetup({
      userId: req.user.id, stock, market, plan, tech, confidence, reasons, risks,
    });

    res.json({
      success: true,
      setup_id: setupId,
      symbol: label,
      market,
      currency: stock.currency,
      setup: tech.setup,
      quality: tech.quality,
      technicals: summarize(tech.technicals, stock.currency),
      plan,
      thesis: ai.thesis || tech.setup_reason,
      reasons,
      risks,
      suits: ai.suits || '',
      confidence,
      status: 'watching',
      timeframes: mtf,
      confirmation_state: mtf.summary.lower_confirmed ? 'lower_timeframes_confirm' : 'waiting_for_confirmation',
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    console.error('swingRadar error:', err);
    res.status(500).json({ success: false, message: 'Swing analysis failed' });
  }
};

// Weekly / daily / 4H / 1H read (spec §6). The daily frame reuses the technicals
// we already have; the others come from fresh candles. Never throws — if the
// extra data can't be loaded, the plan still goes out with a note.
async function buildMtf(stock, dailyTech) {
  const frames = { '1d': frameRead(dailyTech, null) };
  try {
    const tf = await fetchTimeframes(stock.symbol, stock.country);
    for (const k of ['1wk', '4h', '1h']) {
      const c = tf[k];
      if (!c) { frames[k] = { available: false }; continue; }
      // 1H: VWAP anchored to today's session. 4H: 20-bar VWAP (~2 weeks). Weekly: none.
      const v = k === '1h' ? sessionVwap(c) : k === '4h' ? vwap(c, 20) : null;
      frames[k] = frameRead(computeTechnicals(c), v);
    }
    return { frames, summary: multiTimeframe(frames), note: tf.reason || null };
  } catch (e) {
    console.warn('multi-timeframe read failed:', e.message);
    for (const k of ['1wk', '4h', '1h']) frames[k] = { available: false };
    return { frames, summary: multiTimeframe(frames), note: 'Weekly and intraday data couldn’t be loaded right now.' };
  }
}

// Trimmed technicals for display + the AI payload (no raw internals).
function summarize(t, currency) {
  return {
    price: t.price, trend: t.trend, rsi14: t.rsi14, macd: t.macd,
    atr_pct: t.atr_pct, relative_volume: t.relative_volume,
    range_position: t.range_position, support: t.support, resistance: t.resistance,
    currency,
  };
}

// Upsert into ai_setups: one live setup per (user, symbol). Logs a lifecycle
// event when a new one is created.
async function trackSetup({ userId, stock, market, plan, tech, confidence, reasons, risks }) {
  const existing = await db.query(
    `SELECT id FROM ai_setups
      WHERE user_id = $1 AND symbol = $2
        AND status IN ('watching','approaching','triggered','confirmed','active')
      ORDER BY created_at DESC LIMIT 1`,
    [userId, stock.symbol]
  );

  const vals = [
    tech.setup, tech.quality.score, confidence,
    plan.entry_low, plan.entry_high, plan.trigger, plan.invalidation,
    JSON.stringify(plan.targets), JSON.stringify(reasons), JSON.stringify(risks),
  ];

  if (existing.rows[0]) {
    const id = existing.rows[0].id;
    await db.query(
      `UPDATE ai_setups SET setup=$1, quality_score=$2, confidence=$3, entry_low=$4,
         entry_high=$5, confirmation=$6, invalidation=$7, targets=$8, reasons=$9,
         risks=$10, updated_at=NOW() WHERE id=$11`,
      [...vals, id]
    );
    return id;
  }

  const ins = await db.query(
    `INSERT INTO ai_setups
       (user_id, symbol, market, objective, setup, quality_score, confidence,
        entry_low, entry_high, confirmation, invalidation, targets, reasons, risks,
        status, created_at, updated_at, expires_at)
     VALUES ($1,$2,$3,'swing',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'watching',NOW(),NOW(), NOW() + INTERVAL '30 days')
     RETURNING id`,
    [userId, stock.symbol, market, ...vals]
  );
  const id = ins.rows[0].id;
  await db.query(
    `INSERT INTO ai_setup_events (setup_id, from_status, to_status, note, price_at)
     VALUES ($1, NULL, 'watching', 'Setup created — now monitoring for your entry.', $2)`,
    [id, num(tech.technicals.price)]
  );
  return id;
}

// GET /api/ai/setups — the user's tracked setups + their newest lifecycle event.
export const listSetups = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, st.display_symbol, st.name, st.currency, st.last_price,
              e.to_status AS last_event_status, e.note AS last_event_note, e.created_at AS last_event_at
         FROM ai_setups s
         JOIN stocks st ON st.symbol = s.symbol
         LEFT JOIN LATERAL (
           SELECT to_status, note, created_at FROM ai_setup_events
           WHERE setup_id = s.id ORDER BY created_at DESC LIMIT 1
         ) e ON TRUE
        WHERE s.user_id = $1
        ORDER BY
          CASE WHEN s.status IN ('target','invalidated','expired') THEN 1 ELSE 0 END,
          s.updated_at DESC
        LIMIT 50`,
      [req.user.id]
    );
    res.json({
      success: true,
      setups: rows.map((r) => ({
        id: r.id,
        symbol: r.display_symbol || r.symbol,
        name: r.name,
        market: r.market,
        currency: r.currency,
        currency_symbol: ccy(r.currency),
        last_price: num(r.last_price),
        setup: r.setup,
        status: r.status,
        quality_score: r.quality_score,
        confidence: num(r.confidence),
        entry_low: num(r.entry_low),
        entry_high: num(r.entry_high),
        invalidation: num(r.invalidation),
        confirmation: r.confirmation,
        targets: r.targets || [],
        reasons: r.reasons || [],
        risks: r.risks || [],
        last_event: r.last_event_status ? { status: r.last_event_status, note: r.last_event_note, at: r.last_event_at } : null,
        updated_at: r.updated_at,
      })),
    });
  } catch (err) {
    console.error('listSetups error:', err);
    res.status(500).json({ success: false, message: 'Failed to load setups' });
  }
};

// DELETE /api/ai/setups/:id — stop tracking (scoped to the owner).
export const untrackSetup = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM ai_setups WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ success: false, message: 'Setup not found.' });
    res.json({ success: true });
  } catch (err) {
    console.error('untrackSetup error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove setup' });
  }
};

// GET /api/ai/missed-setups — tracked setups the user never entered (§14).
// "Never entered" = no position is linked to the setup. Covers the last 90 days,
// and only setups that reached the entry zone (see describeMissedSetup).
export const listMissedSetups = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, st.display_symbol, st.name, st.currency, st.last_price
         FROM ai_setups s
         JOIN stocks st ON st.symbol = s.symbol
        WHERE s.user_id = $1
          AND s.status IN ('active', 'target', 'invalidated')
          AND s.updated_at > NOW() - INTERVAL '90 days'
          AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.setup_id = s.id)
        ORDER BY s.updated_at DESC
        LIMIT 20`,
      [req.user.id]
    );
    if (!rows.length) return res.json({ success: true, missed: [] });

    const ev = await db.query(
      `SELECT setup_id, to_status, note, price_at, created_at
         FROM ai_setup_events WHERE setup_id = ANY($1::int[])
        ORDER BY created_at ASC`,
      [rows.map((r) => r.id)]
    );
    const bySetup = {};
    for (const e of ev.rows) (bySetup[e.setup_id] ||= []).push(e);

    const missed = rows
      .map((s) => {
        const d = describeMissedSetup(s, s.last_price, bySetup[s.id] || [], ccy(s.currency));
        if (!d) return null;
        return {
          id: s.id,
          symbol: s.display_symbol || s.symbol,
          name: s.name,
          market: s.market,
          currency_symbol: ccy(s.currency),
          setup: s.setup,
          entry_low: num(s.entry_low),
          entry_high: num(s.entry_high),
          invalidation: num(s.invalidation),
          confirmation: s.confirmation,
          current_price: num(s.last_price),
          updated_at: s.updated_at,
          ...d,
        };
      })
      .filter(Boolean);

    res.json({ success: true, missed });
  } catch (err) {
    console.error('listMissedSetups error:', err);
    res.status(500).json({ success: false, message: 'Failed to load missed setups' });
  }
};
