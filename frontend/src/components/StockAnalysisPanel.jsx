import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Lock, Sparkles, ArrowRight, Award, BarChart3, Activity, Shield } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function StockAnalysisPanel({ symbol }) {
  const { user } = useAuth();
  const isPremium = user?.plan === 'premium';

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
          <Loader2 className="animate-spin" size={14} /> Analysing {symbol}…
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="card-soft p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-coral-500">Analysis</p>
          <h3 className="font-display text-xl font-bold mt-0.5">
            <span className="font-mono">{symbol}</span> · score
          </h3>
        </div>
        <div className="text-right">
          <span className="font-display text-4xl font-black">{analysis.scores.composite}</span>
          <p className="text-[10px] text-ink/50 font-bold uppercase tracking-wider">/ 100</p>
        </div>
      </div>

      {/* Thesis */}
      <div className="bg-cream-warm rounded-xl p-3 mb-4">
        <p className="text-xs italic text-ink/70 leading-relaxed">"{analysis.thesis}"</p>
      </div>

      {/* 4 factor mini-bars */}
      <div className="space-y-2 mb-4">
        {[
          { key: 'quality',  icon: Award,      label: 'Quality',  color: 'bg-bull-500' },
          { key: 'value',    icon: BarChart3,  label: 'Value',    color: 'bg-sun-400' },
          { key: 'momentum', icon: Activity,   label: 'Momentum', color: 'bg-coral-400' },
          { key: 'risk',     icon: Shield,     label: 'Risk',     color: 'bg-sage-400' },
        ].map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            <f.icon size={12} className="text-ink/50 shrink-0" strokeWidth={2.4}/>
            <span className="text-xs font-bold text-ink/70 w-16">{f.label}</span>
            <div className="flex-1 h-1.5 bg-ink/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${analysis.scores[f.key]}%` }}
                transition={{ duration: 0.6 }}
                className={`h-full ${f.color}`}
              />
            </div>
            <span className="text-xs font-mono font-bold w-7 text-right">{analysis.scores[f.key]}</span>
          </div>
        ))}
      </div>

      {/* CTA - different for premium vs free */}
      {isPremium ? (
        <Link
          to={`/stocks/${encodeURIComponent(symbol)}`}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-ink text-cream rounded-full font-bold text-xs hover:bg-ink-soft transition"
        >
          <Sparkles size={12} className="text-sun-300"/> See full report <ArrowRight size={12}/>
        </Link>
      ) : (
        <Link
          to={`/upgrade?return_to=/stocks/${encodeURIComponent(symbol)}`}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-coral-400 to-sun-400 text-ink rounded-full font-bold text-xs hover:scale-[1.02] transition"
        >
          <Lock size={12}/> Unlock full breakdown
        </Link>
      )}
    </div>
  );
}