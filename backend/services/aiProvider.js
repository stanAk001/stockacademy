// ============================================================
// aiProvider.js — the ONLY place that talks to an AI provider.
//
// Everything else in the app calls analyzeWithAI(); swapping providers means
// changing this file and nothing else.
//
// Provider:  OpenAI via the official `openai` SDK
// Model:     OPENAI_MODEL, default gpt-4o-mini (cheap + fast for this workload)
// Caching:   OpenAI caches long prompts automatically (no cache_control flag to
//            set). Cached input tokens come back as usage.prompt_tokens_details
//            .cached_tokens and are billed at a discount, which the cost
//            estimate below accounts for.
//
// The returned `usage` deliberately keeps the { input_tokens, output_tokens }
// shape the rest of the app (and the ai_usage_log table) already expects.
// ============================================================
import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// USD per 1,000,000 tokens, for cost logging only. Rates change and new models
// appear, so an unknown model falls back to the default entry rather than
// guessing — and OPENAI_PRICE_IN / OPENAI_PRICE_OUT override it outright.
const PRICING = {
  'gpt-4o-mini':  { input: 0.15, output: 0.60 },
  'gpt-4o':       { input: 2.50, output: 10.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'gpt-4.1':      { input: 2.00, output: 8.00 },
};
const DEFAULT_PRICE = { input: 0.15, output: 0.60 };

function priceFor(model) {
  const envIn = Number(process.env.OPENAI_PRICE_IN);
  const envOut = Number(process.env.OPENAI_PRICE_OUT);
  if (Number.isFinite(envIn) && Number.isFinite(envOut)) return { input: envIn, output: envOut };
  return PRICING[model] || DEFAULT_PRICE;
}

let _client = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // Optional: set for org/project-scoped keys.
      organization: process.env.OPENAI_ORG_ID || undefined,
      project: process.env.OPENAI_PROJECT_ID || undefined,
    });
  }
  return _client;
}

export function aiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Estimate USD cost from a usage object. Accepts either the normalised shape
 * this module returns or OpenAI's raw one, so older log rows still price up.
 * Cached input bills at 50% of the input rate.
 */
export function estimateCostUsd(usage = {}, model = MODEL) {
  const price = priceFor(model);
  const inp = usage.input_tokens ?? usage.prompt_tokens ?? 0;
  const out = usage.output_tokens ?? usage.completion_tokens ?? 0;
  const cached = usage.cached_input_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0;
  const fresh = Math.max(0, inp - cached);
  const cost =
    (fresh * price.input + cached * price.input * 0.5 + out * price.output) / 1_000_000;
  return +cost.toFixed(6);
}

/**
 * analyzeWithAI — single entry point for AI calls.
 *
 * @param {string} systemPrompt  Stable instructions.
 * @param {string} userPrompt    Per-request content.
 * @param {object} [options]
 * @param {number} [options.maxTokens=2048]
 * @param {number} [options.timeoutMs=30000]
 * @param {boolean} [options.json=false]  Ask the model for a JSON object.
 * @returns {Promise<{ text: string, usage: object, costUsd: number }>}
 * @throws  Error with .code = 'AI_NOT_CONFIGURED' when no API key is set.
 */
export async function analyzeWithAI(systemPrompt, userPrompt, options = {}) {
  const client = getClient();
  if (!client) {
    const err = new Error('AI features are not configured (missing OPENAI_API_KEY).');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const { maxTokens = 2048, timeoutMs = 30000, json = false } = options;

  const params = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_completion_tokens: maxTokens,
  };
  if (json) params.response_format = { type: 'json_object' };

  let response;
  try {
    response = await client.chat.completions.create(params, { timeout: timeoutMs });
  } catch (err) {
    // Older models only accept the legacy max_tokens name. Retry once rather
    // than fail the request over a parameter rename.
    if (err?.status === 400 && /max_completion_tokens|max_tokens/i.test(err?.message || '')) {
      const legacy = { ...params, max_tokens: maxTokens };
      delete legacy.max_completion_tokens;
      response = await client.chat.completions.create(legacy, { timeout: timeoutMs });
    } else {
      throw err;
    }
  }

  const text = (response.choices?.[0]?.message?.content || '').trim();

  const u = response.usage || {};
  const usage = {
    input_tokens: u.prompt_tokens || 0,
    output_tokens: u.completion_tokens || 0,
    cached_input_tokens: u.prompt_tokens_details?.cached_tokens || 0,
  };

  return { text, usage, costUsd: estimateCostUsd(usage, response.model || MODEL) };
}

// Parse JSON the model returned, tolerating ```json fences AND stray prose the
// model sometimes adds before or after the JSON (e.g. a closing sentence). We
// first try a clean parse, then fall back to the outermost {...} / [...] block.
export function parseJsonFromAI(text) {
  let t = (text || '').trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  }
  try {
    return JSON.parse(t);
  } catch (err) {
    // Extract the outermost JSON block and parse that. Handles leading/trailing
    // commentary. (Genuinely truncated JSON still throws — as it should.)
    const starts = ['{', '['].map((c) => t.indexOf(c)).filter((i) => i !== -1);
    if (starts.length) {
      const first = Math.min(...starts);
      const close = t[first] === '{' ? '}' : ']';
      const last = t.lastIndexOf(close);
      if (last > first) {
        return JSON.parse(t.slice(first, last + 1));
      }
    }
    throw err;
  }
}

export const AI_MODEL = MODEL;
