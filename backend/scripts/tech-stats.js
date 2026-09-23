// Diagnostic: what's in stock_technicals right now?
import 'dotenv/config';
import db from '../config/db.js';

const q = async (sql, p = []) => (await db.query(sql, p)).rows;

const total = (await q('SELECT COUNT(*)::int n FROM stock_technicals'))[0].n;
const bySetup = await q(`SELECT setup, COUNT(*)::int n FROM stock_technicals GROUP BY setup ORDER BY n DESC`);
const swingable = (await q(`SELECT COUNT(*)::int n FROM stock_technicals WHERE setup <> 'none' AND quality_score IS NOT NULL`))[0].n;
const byTrend = await q(`SELECT trend, COUNT(*)::int n FROM stock_technicals GROUP BY trend ORDER BY n DESC`);
const top = await q(`SELECT symbol, trend, rsi14, setup, quality_score FROM stock_technicals ORDER BY quality_score DESC NULLS LAST LIMIT 10`);

console.log(`\nstock_technicals rows: ${total}`);
console.log(`swing-eligible (setup<>'none' & score): ${swingable}\n`);
console.log('by setup:', bySetup.map((r) => `${r.setup}=${r.n}`).join('  '));
console.log('by trend:', byTrend.map((r) => `${r.trend}=${r.n}`).join('  '));
console.log('\ntop by quality:');
for (const r of top) console.log(`  ${r.symbol.padEnd(14)} trend=${r.trend}  rsi=${r.rsi14}  setup=${r.setup}  q=${r.quality_score}`);
process.exit(0);
