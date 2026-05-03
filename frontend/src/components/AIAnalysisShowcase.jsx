import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Award, BarChart3, Activity, Shield, ArrowRight, Lock, Search, Zap } from 'lucide-react';

const SAMPLE_STOCKS = [
  {
    symbol: 'AAPL', name: 'Apple Inc.', flag: '🇺🇸',
    composite: 78, scores: { quality: 84, value: 62, momentum: 71, risk: 80 },
    label: 'High quality · Fairly valued · Low risk',
  },
  {
    symbol: 'DANGCEM', name: 'Dangote Cement', flag: '🇳🇬',
    composite: 71, scores: { quality: 78, value: 81, momentum: 58, risk: 67 },
    label: 'Strong fundamentals · Attractive valuation',
  },
  {
    symbol: 'NVDA', name: 'NVIDIA Corp.', flag: '🇺🇸',
    composite: 73, scores: { quality: 89, value: 38, momentum: 92, risk: 52 },
    label: 'Exceptional quality · Richly priced · Strong uptrend',
  },
];

export default function AIAnalysisShowcase() {
  return (
    <section className="relative py-24 bg-cream overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-coral-300/20 animate-blob" />
      <div className="absolute bottom-20 left-10 w-72 h-72 bg-bull-100 animate-blob" style={{ animationDelay: '3s' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ink text-cream text-xs font-bold uppercase tracking-widest mb-5">
              <Sparkles size={14} className="text-sun-300" />
              AI-Powered Analysis · Built In
            </div>

            <h2 className="font-display font-black text-4xl sm:text-6xl leading-[1.05] mb-5">
              Smart analysis on{' '}
              <span className="relative inline-block">
                <span className="relative z-10 italic">every stock.</span>
                <svg className="absolute -bottom-1 left-0 w-full" height="14" viewBox="0 0 200 14">
                  <path d="M2,10 C50,2 100,10 198,4" stroke="#FB7185" strokeWidth="5" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h2>

            <p className="text-lg text-ink/70 leading-relaxed max-w-2xl mx-auto">
              Our analysis engine scores any stock — US or Nigerian — across four factors that matter:
              <strong> quality, value, momentum, and risk.</strong> Built into the platform.
              No subscription needed to learn how it works.
            </p>
          </motion.div>
        </div>

        {/* Sample analysis cards (rotating preview) */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {SAMPLE_STOCKS.map((s, i) => (
            <motion.div
              key={s.symbol}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="card-soft p-6 relative overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono font-bold text-lg">{s.symbol}</span>
                    <span className="text-sm">{s.flag}</span>
                  </div>
                  <p className="text-xs text-ink/55 truncate">{s.name}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-display text-4xl font-black leading-none">{s.composite}</span>
                  <span className="text-[10px] text-ink/50 font-bold uppercase tracking-wider">/ 100</span>
                </div>
              </div>

              {/* 4 mini factor bars */}
              <div className="space-y-2 mb-4">
                {Object.entries(s.scores).map(([factor, score]) => {
                  const palette = {
                    quality: 'bg-bull-500',
                    value: 'bg-sun-400',
                    momentum: 'bg-coral-400',
                    risk: 'bg-sage-400',
                  }[factor];
                  return (
                    <div key={factor} className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-ink/50 w-16 capitalize">{factor}</span>
                      <div className="flex-1 h-1.5 bg-ink/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${score}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                          className={`h-full ${palette}`}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold w-6 text-right">{score}</span>
                    </div>
                  );
                })}
              </div>

              {/* Verdict label */}
              <p className="text-xs text-ink/65 italic leading-relaxed border-t border-ink/5 pt-3">
                "{s.label}"
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA strip — search teaser + signup gate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative bg-ink text-cream rounded-[2rem] p-8 sm:p-10 overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-sun-300/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-coral-400/20 rounded-full blur-3xl" />

          <div className="relative grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 text-sun-300 text-xs font-bold uppercase tracking-widest mb-3">
                <Zap size={14} /> Try it on any ticker
              </div>
              <h3 className="font-display text-3xl sm:text-4xl font-black leading-tight mb-3">
                Search a stock.<br/>
                <span className="italic">See the analysis.</span>
              </h3>
              <p className="text-cream/70 leading-relaxed mb-5">
                AAPL · Tesla · Dangote Cement · MTN Nigeria — type any ticker or company name and you'll get the full
                four-factor breakdown. Free to use after signing up.
              </p>
            </div>

            {/* Decorative search box (NOT a real input — clicking redirects to signup) */}
            <div>
              <div className="bg-cream/10 backdrop-blur-sm rounded-2xl p-2 mb-4 border border-cream/10">
                <Link
                  to="/signup"
                  className="flex items-center gap-3 bg-cream rounded-xl px-4 py-3 text-ink hover:bg-white transition group"
                >
                  <Search size={18} className="text-ink/40 group-hover:text-ink transition" />
                  <span className="text-sm text-ink/50 flex-1 group-hover:text-ink/70 transition">
                    Search any stock — AAPL, Tesla, MTNN…
                  </span>
                  <span className="hidden sm:flex items-center gap-1 text-xs font-bold bg-ink text-sun-300 px-2 py-1 rounded-full">
                    <Lock size={10}/> Sign up
                  </span>
                </Link>
              </div>
              <Link to="/signup" className="btn-secondary w-full justify-center text-base">
                Sign up free to start analyzing <ArrowRight size={16}/>
              </Link>
              <p className="text-xs text-cream/50 text-center mt-3">
                No credit card. No spam. Takes 30 seconds.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Four-factor explanation strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-12">
          {[
            { icon: Award, label: 'Quality', desc: 'ROE, margins, growth, leverage', color: 'text-bull-600 bg-bull-100' },
            { icon: BarChart3, label: 'Value', desc: 'P/E, P/B, EV/EBITDA, dividend', color: 'text-sun-600 bg-sun-100' },
            { icon: Activity, label: 'Momentum', desc: '1m, 3m, 6m, 1y returns', color: 'text-coral-500 bg-coral-300/30' },
            { icon: Shield, label: 'Risk safety', desc: 'Volatility, beta, drawdown', color: 'text-bull-700 bg-sage-200' },
          ].map((f) => (
            <div key={f.label} className="bg-white rounded-2xl p-4 border border-ink/5">
              <div className={`w-9 h-9 ${f.color} rounded-xl grid place-items-center mb-2`}>
                <f.icon size={16} strokeWidth={2.4} />
              </div>
              <p className="font-bold text-sm">{f.label}</p>
              <p className="text-xs text-ink/55 leading-tight">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
