import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, BarChart3, Activity, Shield, Trophy } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';

const FACTORS = [
  { id: 'composite', label: 'Top overall', icon: Trophy },
  { id: 'quality',   label: 'Highest quality', icon: Award },
  { id: 'value',     label: 'Best value', icon: BarChart3 },
  { id: 'momentum',  label: 'Strongest momentum', icon: Activity },
  { id: 'risk',      label: 'Lowest risk', icon: Shield },
];

const COUNTRIES = [
  { id: '', label: 'All markets', flag: '🌍' },
  { id: 'US', label: 'United States', flag: '🇺🇸' },
  { id: 'NG', label: 'Nigeria', flag: '🇳🇬' },
];

export default function Rankings() {
  const [factor, setFactor] = useState('composite');
  const [country, setCountry] = useState('');
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { factor };
    if (country) params.country = country;
    api.get('/stocks/analysis/rankings', { params })
      .then(({ data }) => data.success && setRankings(data.rankings))
      .finally(() => setLoading(false));
  }, [factor, country]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-coral-500">Smart Rankings</p>
          <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight mt-1">
            Top stocks <span className="italic text-ink/50">at a glance.</span>
          </h1>
          <p className="text-ink/60 mt-1">Don't have time to research? Here are the highest-scoring stocks across our universe.</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
          {FACTORS.map((f) => (
            <button key={f.id} onClick={() => setFactor(f.id)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
                factor === f.id ? 'bg-ink text-cream' : 'bg-white text-ink/70 hover:bg-ink/5'
              }`}>
              <f.icon size={14}/> {f.label}
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
              <div className="col-span-4">Stock</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-1 text-center">Q</div>
              <div className="col-span-1 text-center">V</div>
              <div className="col-span-1 text-center">M</div>
              <div className="col-span-1 text-center">R</div>
              <div className="col-span-1 text-right">Score</div>
            </div>

            {rankings.map((s, i) => {
              const sym = s.currency === 'NGN' ? '₦' : '$';
              const dayUp = (s.day_change_pct ?? 0) >= 0;
              const activeScore = s.scores[factor] ?? s.scores.composite;
              return (
                <motion.div key={s.symbol}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                >
                  <Link to={`/stocks/${encodeURIComponent(s.symbol)}`}
                    className="grid grid-cols-12 gap-2 sm:gap-0 items-center px-5 py-4 hover:bg-cream-warm transition border-b border-ink/5 last:border-0">
                    <div className="col-span-2 sm:col-span-1 font-display text-2xl font-black text-ink/30">{i + 1}</div>
                    <div className="col-span-10 sm:col-span-4 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold">{s.display_symbol}</span>
                        <span className="text-xs text-ink/40">{s.country === 'NG' ? '🇳🇬' : '🇺🇸'}</span>
                      </div>
                      <p className="text-xs text-ink/55 truncate">{s.name}</p>
                    </div>
                    <div className="col-span-6 sm:col-span-2 sm:text-right">
                      {s.last_price && (
                        <>
                          <p className="font-mono text-sm font-semibold">{sym}{s.last_price?.toFixed(2)}</p>
                          {s.day_change_pct != null && (
                            <p className={`font-mono text-xs ${dayUp ? 'text-bull-600' : 'text-bear-500'}`}>
                              {dayUp ? '+' : ''}{s.day_change_pct.toFixed(2)}%
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <ScoreCell score={s.scores.quality} />
                    <ScoreCell score={s.scores.value} />
                    <ScoreCell score={s.scores.momentum} />
                    <ScoreCell score={s.scores.risk} />
                    <div className="col-span-6 sm:col-span-1 sm:text-right">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ink text-cream font-mono font-bold text-sm">
                        {activeScore}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            {rankings.length === 0 && <div className="p-10 text-center text-ink/50">No stocks in this view.</div>}
          </div>
        )}

        <p className="text-xs text-ink/40 mt-6 text-center max-w-2xl mx-auto">
          Scores are computed from valuation ratios, profitability, momentum, and risk metrics. Educational analysis — not investment recommendations.
        </p>
      </div>
    </Layout>
  );
}

function ScoreCell({ score }) {
  const tone =
    score >= 70 ? 'bg-bull-100 text-bull-700' :
    score >= 50 ? 'bg-sun-100 text-sun-600' :
    'bg-coral-300/30 text-bear-500';
  return (
    <div className="col-span-1 text-center hidden sm:block">
      <span className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-sm ${tone}`}>{score}</span>
    </div>
  );
}
