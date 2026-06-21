import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Coins, Building2, Tag } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';

// Factual discovery lists — ranked by real market data, no proprietary scoring.
const METRICS = [
  { id: 'gainers',  label: 'Top 1-year performers', icon: TrendingUp, col: 'return_1y',           kind: 'pct' },
  { id: 'dividend', label: 'Highest dividend yield', icon: Coins,      col: 'dividend_yield',      kind: 'pct' },
  { id: 'largest',  label: 'Largest companies',      icon: Building2,  col: 'market_cap_millions', kind: 'cap' },
  { id: 'value',    label: 'Lowest P/E',             icon: Tag,        col: 'pe_ratio',            kind: 'num' },
];

const COUNTRIES = [
  { id: '', label: 'All markets', flag: '🌍' },
  { id: 'US', label: 'United States', flag: '🇺🇸' },
  { id: 'NG', label: 'Nigeria', flag: '🇳🇬' },
];

const fmtPct = (v) => (v == null ? '—' : `${(Number(v) * 100).toFixed(1)}%`);
const fmtNum = (v) => (v == null ? '—' : Number(v).toFixed(2));
const fmtCap = (v) => {
  if (v == null) return '—';
  const n = Number(v); // value is in millions
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}T`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}B`;
  return `${n.toFixed(0)}M`;
};

function formatMetricValue(s, metric) {
  if (metric.kind === 'pct') return fmtPct(s[metric.col]);
  if (metric.kind === 'cap') return fmtCap(s[metric.col]);
  return fmtNum(s[metric.col]);
}

export default function Rankings() {
  const [metricId, setMetricId] = useState('gainers');
  const [country, setCountry] = useState('');
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  const metric = METRICS.find((m) => m.id === metricId) || METRICS[0];

  useEffect(() => {
    setLoading(true);
    const params = { metric: metricId };
    if (country) params.country = country;
    api.get('/stocks/analysis/rankings', { params })
      .then(({ data }) => data.success && setRankings(data.rankings))
      .finally(() => setLoading(false));
  }, [metricId, country]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-coral-500">Discover</p>
          <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight mt-1">
            Browse stocks <span className="italic text-ink/50">by the numbers.</span>
          </h1>
          <p className="text-ink/60 mt-1">Sort by real market data — performance, dividends, size or valuation. A starting point for your own research, not a recommendation.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
          {METRICS.map((m) => (
            <button key={m.id} onClick={() => setMetricId(m.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
                metricId === m.id ? 'bg-ink text-cream' : 'bg-white text-ink/70 hover:bg-ink/5'
              }`}>
              <m.icon size={14}/> {m.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {COUNTRIES.map((c) => (
            <button key={c.id} onClick={() => setCountry(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                country === c.id ? 'bg-ink text-cream' : 'bg-white text-ink/70 hover:bg-ink/5'
              }`}>
              {c.flag} {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-ink/5 animate-pulse rounded-2xl"/>)}
          </div>
        ) : (
          <div className="card-soft overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 px-5 py-3 text-xs font-bold uppercase tracking-widest text-ink/50 border-b border-ink/5 bg-cream-warm">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Stock</div>
              <div className="col-span-3 text-right">Price</div>
              <div className="col-span-3 text-right">{metric.label.replace(/^(Top|Highest|Largest|Lowest)\s/i, '')}</div>
            </div>

            {rankings.map((s, i) => {
              const sym = s.currency === 'NGN' ? '₦' : '$';
              const dayUp = (s.day_change_pct ?? 0) >= 0;
              return (
                <motion.div key={s.symbol}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                >
                  <Link to={`/stocks/${encodeURIComponent(s.symbol)}`}
                    className="grid grid-cols-12 gap-2 sm:gap-0 items-center px-5 py-4 hover:bg-cream-warm transition border-b border-ink/5 last:border-0">
                    <div className="col-span-2 sm:col-span-1 font-display text-2xl font-black text-ink/30">{i + 1}</div>
                    <div className="col-span-10 sm:col-span-5 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold">{s.display_symbol}</span>
                        <span className="text-xs text-ink/40">{s.country === 'NG' ? '🇳🇬' : '🇺🇸'}</span>
                      </div>
                      <p className="text-xs text-ink/55 truncate">{s.name}</p>
                    </div>
                    <div className="col-span-6 sm:col-span-3 sm:text-right">
                      {s.last_price != null && (
                        <>
                          <p className="font-mono text-sm font-semibold">{sym}{s.last_price.toFixed(2)}</p>
                          {s.day_change_pct != null && (
                            <p className={`font-mono text-xs ${dayUp ? 'text-bull-600' : 'text-bear-500'}`}>
                              {dayUp ? '+' : ''}{s.day_change_pct.toFixed(2)}%
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div className="col-span-6 sm:col-span-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-ink text-cream font-mono font-bold text-sm">
                        {formatMetricValue(s, metric)}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            {rankings.length === 0 && <div className="p-10 text-center text-ink/50">No stocks with this data yet.</div>}
          </div>
        )}

        <p className="text-xs text-ink/40 mt-6 text-center max-w-2xl mx-auto">
          Ranked purely on factual market data. Educational tool for discovery — not investment advice. Always do your own research.
        </p>
      </div>
    </Layout>
  );
}
