// ============================================================
// aiProvider.js — the ONLY place that talks to an AI provider.
//
// Everything else in the app calls analyzeWithAI(). To swap Anthropic
// for OpenAI (or anything else) later, change this file and nothing else.
//
// Provider:  Anthropic Claude via @anthropic-ai/sdk
// Model:     claude-haiku-4-5  (cheap, fast — good for this workload)
// Caching:   system prompt is sent with cache_control: { type: 'ephemeral' }
//            so repeated calls with the same system prompt bill the cached
//            portion at ~10% of input price.
// ============================================================
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-4-5';

// claude-haiku-4-5 pricing, USD per 1,000,000 tokens (for cost logging).
const PRICE = {
  input: 1.0,
  output: 5.0,
  cacheRead: 0.10,   // cached input ≈ 0.1× input
  cacheWrite: 1.25,  // cache write ≈ 1.25× input
};

let _client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Estimate USD cost from a Claude usage object.
export function estimateCostUsd(usage = {}) {
  const inp = usage.input_tokens || 0;
  const out = usage.output_tokens || 0;
  const cr = usage.cache_read_input_tokens || 0;
  const cw = usage.cache_creation_input_tokens || 0;
  const cost =
    (inp * PRICE.input + out * PRICE.output + cr * PRICE.cacheRead + cw * PRICE.cacheWrite) /
    1_000_000;
  return +cost.toFixed(6);
}

/**
 * analyzeWithAI — single entry point for AI calls.
 *
 * @param {string} systemPrompt  Stable instructions (cached).
 * @param {string} userPrompt    Per-request content.
 * @param {object} [options]
 * @param {number} [options.maxTokens=2048]
 * @param {number} [options.timeoutMs=30000]
 * @returns {Promise<{ text: string, usage: object, costUsd: number }>}
 * @throws  Error with .code = 'AI_NOT_CONFIGURED' when no API key is set.
 */
export async function analyzeWithAI(systemPrompt, userPrompt, options = {}) {
  const client = getClient();
  if (!client) {
    const err = new Error('AI features are not configured (missing ANTHROPIC_API_KEY).');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const { maxTokens = 2048, timeoutMs = 30000 } = options;

  const response = await client.messages.create(
    {
      model: MODEL,
      max_tokens: maxTokens,
      system: [
        { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    },
    { timeout: timeoutMs }
  );

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  return {
    text,
    usage: response.usage,
    costUsd: estimateCostUsd(response.usage),
  };
}

// Parse JSON the model returned, tolerating ```json fences.
export function parseJsonFromAI(text) {
  let t = (text || '').trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  }
  return JSON.parse(t);
}

export const AI_MODEL = MODEL;
