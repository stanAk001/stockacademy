import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, MessageSquareText, Globe, BarChart3, Users, ArrowRight, Lock, Search, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Illustrative examples (clearly labelled) of what an analysis looks like:
// real numbers + a plain-English read. No proprietary 0–100 scores.
const SAMPLE_STOCKS = [
  {
    symbol: 'AAPL', name: 'Apple Inc.', flag: '🇺🇸',
    facts: [['P/E', '31.2'], ['1Y', '+18%'], ['Div', '0.5%']],
    verdict: 'Hugely profitable, but priced for high expectations — that premium is the real risk.',
  },
  {
    symbol: 'DANGCEM', name: 'Dangote Cement', flag: '🇳🇬',
    facts: [['P/E', '9.4'], ['1Y', '+12%'], ['Div', '5.8%']],
    verdict: 'Strong margins and a healthy dividend — a steadier, income-leaning Nigerian blue-chip.',
  },
  {
    symbol: 'NVDA', name: 'NVIDIA Corp.', flag: '🇺🇸',
    facts: [['P/E', '55.0'], ['1Y', '+92%'], ['Div', '0.0%']],
    verdict: 'Explosive growth and momentum, but expensive and volatile — high risk, high reward.',
  },
];

const PILLARS = [
  { icon: MessageSquareText, label: 'Plain-English verdict', desc: 'What the numbers mean, no jargon', color: 'text-bull-600 bg-bull-100' },
  { icon: Globe, label: 'In your language', desc: 'English, Pidgin, Yorùbá, Hausa, Igbo', color: 'text-coral-500 bg-coral-300/30' },
  { icon: BarChart3, label: 'Real metrics', desc: 'Valuation, profit, growth, risk', color: 'text-sun-600 bg-sun-100' },
  { icon: Users, label: 'Peer comparison', desc: 'See it next to its rivals', color: 'text-bull-700 bg-sage-200' },
];

export default function AIAnalysisShowcase() {
  const { user } = useAuth();
  return (
    <section className="relative py-24 bg-cream overflow-hidden">
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
              Numbers that finally{' '}
              <span className="relative inline-block">
                <span className="relative z-10 italic">make sense.</span>
                <svg className="absolute -bottom-1 left-0 w-full" height="14" viewBox="0 0 200 14">
                  <path d="M2,10 C50,2 100,10 198,4" stroke="#FB7185" strokeWidth="5" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h2>

            <p className="text-lg text-ink/70 leading-relaxed max-w-2xl mx-auto">
              P/E, ROE, margins — jargon that means nothing until someone explains it. <strong className="text-ink">So we do.</strong>{' '}
              Type any ticker, US or Nigerian, and get the real figures plus a plain-English read of what they mean
              <strong className="text-ink"> for your money</strong> — even in Pidgin, Yorùbá, Hausa &amp; Igbo. No mystery
              score to trust blindly. Just clarity — free after you sign up.
            </p>
          </motion.div>
        </div>

        {/* Sample cards — facts + a plain-English read */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {SAMPLE_STOCKS.map((s, i) => (
            <motion.div
              key={s.symbol}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="card-soft p-6 relative hover:shadow-2xl hover:-translate-y-1 transition"
            >
              <span className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-wider text-ink/30">Example</span>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-mono font-bold text-lg">{s.symbol}</span>
                <span className="text-sm">{s.flag}</span>
              </div>
              <p className="text-xs text-ink/55 truncate mb-4">{s.name}</p>

              <div className="flex gap-2 mb-4">
                {s.facts.map(([k, v]) => (
                  <div key={k} className="flex-1 bg-cream-warm rounded-xl px-2 py-2 text-center">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-ink/45">{k}</p>
                    <p className="font-mono font-bold text-sm">{v}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 border-t border-ink/5 pt-3">
                <Sparkles size={13} className="text-coral-500 shrink-0 mt-0.5" />
                <p className="text-xs text-ink/70 leading-relaxed">{s.verdict}</p>
              </div>
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
          <div className="relative grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 text-sun-300 text-xs font-bold uppercase tracking-widest mb-3">
                <Zap size={14} /> Try it on any ticker
              </div>
              <h3 className="font-display text-3xl sm:text-4xl font-black leading-tight mb-3">
                Search a stock.<br/>
                <span className="italic">Understand it in seconds.</span>
              </h3>
              <p className="text-cream/70 leading-relaxed mb-5">
                AAPL · Tesla · Dangote Cement · MTN Nigeria — type any ticker or company name and get the
                real numbers plus a plain-English read, in your language.{user ? '' : ' Free after signing up.'}
              </p>
            </div>

            {/* Decorative search box — links into the app once signed in */}
            <div>
              <div className="bg-cream/10 rounded-2xl p-2 mb-4 border border-cream/10">
                <Link
                  to={user ? '/dashboard' : '/signup'}
                  className="flex items-center gap-3 bg-cream rounded-xl px-4 py-3 text-ink hover:bg-white transition group"
                >
                  <Search size={18} className="text-ink/40 group-hover:text-ink transition" />
                  <span className="text-sm text-ink/50 flex-1 group-hover:text-ink/70 transition">
                    Search any stock — AAPL, Tesla, MTNN…
                  </span>
                  <span className="hidden sm:flex items-center gap-1 text-xs font-bold bg-ink text-sun-300 px-2 py-1 rounded-full">
                    {user ? <><Search size={10}/> Search</> : <><Lock size={10}/> Sign up</>}
                  </span>
                </Link>
              </div>
              <Link to={user ? '/dashboard' : '/signup'} className="btn-secondary w-full justify-center text-base">
                {user ? 'Go to your dashboard' : 'Sign up free to start analyzing'} <ArrowRight size={16}/>
              </Link>
              <p className="text-xs text-cream/50 text-center mt-3">
                {user ? "You're signed in — search any stock to begin." : 'No credit card. No spam. Takes 30 seconds.'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* What you get */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-12">
          {PILLARS.map((f) => (
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
