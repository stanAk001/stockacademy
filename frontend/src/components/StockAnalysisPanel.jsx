import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles, ArrowRight } from 'lucide-react';
import api from '../services/api';

// A compact, FACTUAL snapshot of a stock — real metrics only, no proprietary
// scoring. The plain-English interpretation lives on the full stock page.
const fmt = (v) => (v === null || v === undefined ? '—' : Number(v).toFixed(2));
const fmtPct = (v) => (v === null || v === undefined ? '—' : `${(Number(v) * 100).toFixed(1)}%`);

export default function StockAnalysisPanel({ symbol }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    api.get(`/stocks/analysis/${symbol}`)
      .then(({ data }) => data.success && setAnalysis(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="card-soft p-6">
        <div className="flex items-center gap-2 text-ink/50 text-sm">
          <Loader2 className="animate-spin" size={14} /> Loading {symbol}…
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const m = analysis.metrics || {};
  const sym = analysis.currency === 'NGN' ? '₦' : '$';
  const r1y = m.returns?.return_1y;

  const facts = [
    { label: 'Price', value: analysis.last_price != null ? `${sym}${fmt(analysis.last_price)}` : '—' },
    { label: 'P/E ratio', value: fmt(m.valuation?.pe_ratio) },
    { label: 'Dividend yield', value: fmtPct(m.valuation?.dividend_yield) },
    { label: 'ROE', value: fmtPct(m.profitability?.roe) },
    { label: '1-year return', value: fmtPct(r1y), tone: r1y == null ? '' : r1y >= 0 ? 'text-bull-600' : 'text-bear-500' },
    { label: 'Net margin', value: fmtPct(m.profitability?.net_margin) },
  ];

  return (
    <div className="card-soft p-6">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-coral-500">Key facts</p>
        <h3 className="font-display text-xl font-bold mt-0.5">
          <span className="font-mono">{symbol}</span> at a glance
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
        {facts.map((f) => (
          <div key={f.label} className="flex justify-between text-sm py-1.5 border-b border-ink/5">
            <span className="text-ink/55">{f.label}</span>
            <span className={`font-mono font-semibold ${f.tone || ''}`}>{f.value}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-ink/40 mb-4 leading-relaxed">
        Factual figures from market data — not advice. Always verify against another source.
      </p>

      <Link
        to={`/stocks/${encodeURIComponent(symbol)}`}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-ink text-cream rounded-full font-bold text-xs hover:bg-ink-soft transition"
      >
        <Sparkles size={12} className="text-sun-300"/> See the full breakdown <ArrowRight size={12}/>
      </Link>
    </div>
  );
}
