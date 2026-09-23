// ============================================================
// stockBriefController.js — universal "search any stock" fallback.
//
// When a user opens a ticker we DON'T have live data for (an NGX name not in
// our table, an obscure global listing), instead of a dead "unavailable" we ask
// the AI to identify the company and give a plain-English, beginner overview.
//
// Public (optionalAuth) so free users can still explore. Heavily cached per
// ticker+language (7 days — a company's identity is stable) and rate-limited at
// the route, so the AI cost stays tiny even under browsing.
// ============================================================
import { analyzeWithAI, parseJsonFromAI } from '../services/aiProvider.js';
import { langDirective, langKey, readCache, writeCache, logUsage } from './aiController.js';

const DISCLAIMER =
  'AI overview from general knowledge — not live market data, and not financial advice.';

/* GET /api/stocks/ai-brief/:symbol?language=xx */
export const aiStockBrief = async (req, res) => {
  try {
    const raw = String(req.params.symbol || '').trim().toUpperCase();
    if (!raw || raw.length > 24) {
      return res.status(400).json({ success: false, message: 'Provide a valid ticker.' });
    }
    const lang = req.query?.language;

    const key = `brief:v3:${raw}:${langKey(lang)}`;
    const cached = await readCache(key);
    if (cached) return res.json({ success: true, cached: true, ...cached });

    const system =
      `You are a warm, expert markets mentor helping a beginner who searched a ticker our platform ` +
      `doesn't have live data for. Identify the company from the ticker and give a clear, educational ` +
      `overview. You know US, Nigerian (NGX) and other global exchanges. ` +
      `CRITICAL: if you do NOT confidently recognise this ticker as a REAL, listed public company, set ` +
      `"recognised" to false and DO NOT invent a company — a wrong guess misleads a beginner. ` +
      `When you do recognise it, teach in plain words with a simple analogy where it helps: what the ` +
      `business actually does, how it makes money, and its general character. Do NOT state precise live ` +
      `figures (today's price, an exact current P/E) as if they were live — speak qualitatively ` +
      `("historically high-margin", "a large-cap", "more volatile than average") and make clear these ` +
      `are general facts, not live market data. No hype, no "guaranteed", no buy/sell calls, no price ` +
      `targets. Respond with ONLY valid JSON (no markdown fences) in exactly this shape: ` +
      `{"recognised": boolean, "company": {"name": string, "exchange": string, "country": string, ` +
      `"currency": string, "sector": string, "what_it_does": string}, "headline": string, ` +
      `"plain_english": string, "strengths": string[], "watch_outs": string[], "for_beginners": string, ` +
      `"disclaimer": string}. "strengths" and "watch_outs" = 2-3 short plain bullets each. ` +
      `If "recognised" is false, set company.name to "" and briefly say so in "plain_english". ` +
      `Always set "disclaimer" to: "${DISCLAIMER}".`;

    const user = `Ticker searched: ${raw}. Give the beginner overview.`;

    let result;
    try {
      result = await analyzeWithAI(system + langDirective(lang), user, { maxTokens: 1100, timeoutMs: 30000 });
    } catch (e) {
      if (e.code === 'AI_NOT_CONFIGURED') {
        return res.status(503).json({ success: false, message: 'AI overview is not configured yet.' });
      }
      console.error('stock-brief AI error:', e.message);
      return res.status(502).json({ success: false, message: 'Could not build an overview right now. Please try again.' });
    }

    let brief;
    try {
      brief = parseJsonFromAI(result.text);
    } catch {
      await logUsage(req.user?.id, 'stock_brief', result);
      return res.status(502).json({ success: false, message: 'The AI returned an unexpected format. Please try again.' });
    }
    await logUsage(req.user?.id, 'stock_brief', result);

    // Unknown ticker → clean 404 (don't cache a miss; it may resolve on retry).
    if (!brief || brief.recognised === false || !brief.company?.name) {
      return res.status(404).json({
        success: false,
        message: `We couldn't find a stock for “${raw}”. Double-check the ticker, or search by company name.`,
      });
    }
    if (!brief.disclaimer) brief.disclaimer = DISCLAIMER;
    if (!Array.isArray(brief.strengths)) brief.strengths = [];
    if (!Array.isArray(brief.watch_outs)) brief.watch_outs = [];

    const payload = { symbol: raw, ai_only: true, brief, generated_at: new Date().toISOString() };
    await writeCache(key, payload, 24 * 7); // 7 days
    res.json({ success: true, cached: false, ...payload });
  } catch (err) {
    console.error('aiStockBrief error:', err);
    res.status(500).json({ success: false, message: 'Overview failed' });
  }
};
