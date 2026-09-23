// Smoke test: does the OpenAI key actually work end to end?
import 'dotenv/config';
import { analyzeWithAI, AI_MODEL } from '../services/aiProvider.js';

console.log('OPENAI_API_KEY present:', Boolean(process.env.OPENAI_API_KEY), '· model:', AI_MODEL);
try {
  const r = await analyzeWithAI(
    'You are a test. Reply with ONLY valid JSON.',
    'Return {"ok": true, "msg": "hello"}',
    { maxTokens: 60, timeoutMs: 20000 }
  );
  console.log('AI OK ✓  text:', (r.text || '').slice(0, 120));
  console.log('usage:', JSON.stringify(r.usage || {}), 'cost:', r.costUsd);
  process.exit(0);
} catch (e) {
  console.error('AI FAILED ✗  code:', e.code || '-', ' message:', e.message);
  process.exit(1);
}
