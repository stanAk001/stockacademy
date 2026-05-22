import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Sparkles, TrendingUp, Users, BookOpen, LineChart, Trophy, Target,
  ShieldCheck, Zap, Search, Award, BarChart3, Activity, Shield, Globe2, Brain,
  GraduationCap
} from 'lucide-react';
import Logo from '../components/Logo';
import TickerTape from '../components/TickerTape';
import AboutCreator from '../components/AboutCreator';
import AIAnalysisShowcase from '../components/AIAnalysisShowcase';
import Footer from '../components/Footer';
import { siteConfig } from '../siteConfig';

const headlineFeatures = [
  { icon: Brain,         title: 'Smart Stock Analysis',  desc: 'Quality, value, momentum, and risk scores on any stock — US or Nigerian.', color: 'bg-coral-300' },
  { icon: Search,        title: 'Search any stock',       desc: 'AAPL, Tesla, Dangote Cement, MTN Nigeria — type a ticker or a name.',  color: 'bg-sun-300' },
  { icon: BookOpen,      title: '6 Structured courses',   desc: 'From "what\'s a dividend?" to fundamental and technical analysis.',     color: 'bg-bull-400' },
  { icon: LineChart,     title: '$100k Paper trading',    desc: 'Practice without losing real money. Make every rookie mistake for free.', color: 'bg-sage-400' },
  { icon: GraduationCap, title: '1-on-1 Mentorship',      desc: 'Book private sessions to accelerate your learning.',                   color: 'bg-coral-300' },
  { icon: Users,         title: 'Community forum',        desc: 'Discuss stocks with other learners. No judgment. No pump groups.',     color: 'bg-sun-300' },
];

const stats = [
  { number: '50+', label: 'Stocks analysed' },
  { number: '4', label: 'Factor scores' },
  { number: '🇳🇬 + 🇺🇸', label: 'Markets covered' },
  { number: 'Free', label: 'To start' },
];

const syllabus = [
  { n: '01', title: 'Stock Market Basics', desc: 'Ownership, exchanges, bull vs bear.' },
  { n: '02', title: 'How to Earn from Stocks', desc: 'Capital gains, dividends, compounding.' },
  { n: '03', title: 'Fundamental Analysis', desc: 'Income statements, P/E, ROE, valuation.' },
  { n: '04', title: 'Technical Analysis', desc: 'Candlesticks, S/R, moving averages, RSI.' },
  { n: '05', title: 'Risk Management', desc: 'Position sizing, stop-loss, diversification.' },
  { n: '06', title: 'Trading Strategies', desc: 'Day, swing, long-term — find your style.' },
];

export default function Landing() {
  return (
    <div className="bg-cream text-ink overflow-x-hidden">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-cream/85 backdrop-blur-md border-b border-ink/5">
        <nav className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
          <Logo />
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            <a href="#analysis" className="px-3 py-2 text-sm font-semibold hover:text-bull-600 transition">AI Analysis</a>
            <a href="#features" className="px-3 py-2 text-sm font-semibold hover:text-bull-600 transition">Features</a>
            <a href="#mentorship" className="px-3 py-2 text-sm font-semibold hover:text-bull-600 transition">Mentorship</a>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link to="/login" className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold hover:text-bull-600 transition">Log in</Link>
            <Link to="/signup" className="px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold bg-ink text-cream rounded-full hover:bg-ink-soft transition shine whitespace-nowrap">
              Start free
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="relative pt-8 sm:pt-20 pb-12 sm:pb-20 overflow-hidden">
        <div className="absolute top-20 -left-20 w-60 sm:w-80 h-60 sm:h-80 bg-sun-300/40 animate-blob" />
        <div className="absolute bottom-10 -right-10 w-52 sm:w-72 h-52 sm:h-72 bg-coral-300/30 animate-blob" style={{ animationDelay: '3s' }} />
        <div className="absolute top-40 right-1/4 w-6 h-6 bg-ink rounded-full animate-float-fast hidden sm:block" />
        <div className="absolute top-60 left-1/4 w-4 h-4 bg-bull-500 rounded-full animate-float-slow hidden sm:block" />

        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-8 sm:gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7"
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-ink text-cream text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-4 sm:mb-6">
              <Sparkles size={12} className="text-sun-300" />
              Real analysis. Smarter learning.
            </div>

            <h1 className="font-display font-black text-3xl sm:text-6xl lg:text-7xl leading-[1] tracking-tight">
              Analyse any{' '}
              <span className="relative inline-block">
                <span className="relative z-10 italic">stock</span>
                <svg className="absolute -bottom-1 sm:-bottom-2 left-0 w-full" height="14" viewBox="0 0 200 18">
                  <path d="M2,14 C50,4 100,14 198,6" stroke="#FBBF24" strokeWidth="6" fill="none" strokeLinecap="round" />
                </svg>
              </span>
              .<br />
              Make smarter{' '}
              <span className="relative inline-block">
                <span className="bg-ink text-cream px-2 sm:px-4 py-0.5 sm:py-1 rounded-xl sm:rounded-2xl">decisions</span>
              </span>
              .
            </h1>

            <p className="mt-5 sm:mt-7 text-base sm:text-xl text-ink/70 leading-relaxed max-w-xl">
              Score any US or Nigerian stock on quality, value, momentum, and risk — then learn what those scores mean through structured courses, paper trading, and 1-on-1 mentorship. The complete platform for people who want to <em>actually understand</em> the market.
            </p>

            <div className="mt-5 sm:mt-7 flex flex-wrap gap-3">
              <Link to="/signup" className="btn-primary text-sm sm:text-base">
                Start learning free <ArrowRight size={16}/>
              </Link>
              <a href="#analysis" className="btn-ghost text-sm sm:text-base">
                See what's inside ↓
              </a>
            </div>

            <div className="mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-lg">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="font-display text-xl sm:text-3xl font-black">{s.number}</div>
                  <div className="text-[10px] sm:text-xs uppercase tracking-wider text-ink/60 font-semibold">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Sample analysis card visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 relative mt-6 lg:mt-0"
          >
            <div className="relative bg-ink text-cream rounded-3xl p-5 sm:p-6 shadow-2xl grain-overlay">
              <div className="flex items-center justify-between mb-4 sm:mb-5">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-cream/50 uppercase tracking-widest font-mono">NASDAQ · AAPL</p>
                  <p className="font-display text-2xl sm:text-3xl font-bold">Apple Inc.</p>
                </div>
                <span className="chip bg-bull-500 text-white shrink-0">
                  <TrendingUp size={12}/> +2.4%
                </span>
              </div>

              <div className="bg-cream/5 rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4">
                <p className="text-[10px] sm:text-xs text-sun-300 font-bold uppercase tracking-widest mb-1 sm:mb-2">Composite score</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl sm:text-6xl font-black">78</span>
                  <span className="text-xs sm:text-sm text-cream/50">/ 100</span>
                </div>
                <p className="text-xs sm:text-sm text-cream/70 mt-1">High quality · Fairly valued · Low risk</p>
              </div>

              <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                {[
                  { label: 'Quality', val: 84 },
                  { label: 'Value', val: 62 },
                  { label: 'Momentum', val: 71 },
                  { label: 'Risk', val: 80 },
                ].map((m) => (
                  <div key={m.label} className="bg-cream/5 rounded-xl p-2 sm:p-2.5 text-center">
                    <p className="text-[9px] sm:text-[10px] text-cream/50 font-bold uppercase tracking-wider">{m.label}</p>
                    <p className="font-display text-xl sm:text-2xl font-black mt-1">{m.val}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -top-4 sm:-top-6 -left-4 sm:-left-8 bg-sun-300 rounded-2xl px-3 sm:px-4 py-2 sm:py-3 rotate-[-6deg] shadow-lg animate-float-slow">
              <p className="text-[10px] sm:text-xs font-bold uppercase">Live data</p>
              <p className="text-[10px] sm:text-xs">🔔 ready</p>
            </div>
            <div className="absolute -bottom-4 -right-4 bg-coral-400 text-white rounded-full w-20 h-20 sm:w-24 sm:h-24 grid place-items-center rotate-6 shadow-xl animate-float-fast">
              <div className="text-center">
                <p className="text-2xl sm:text-3xl">📊</p>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase">Score 0-100</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <TickerTape />

      {/* AI ANALYSIS SHOWCASE */}
      <div id="analysis">
        <AIAnalysisShowcase />
      </div>

      {/* WHAT YOU GET */}
      <section id="features" className="py-16 sm:py-24 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-8 sm:mb-14">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-bull-600 mb-2 sm:mb-3">A complete platform</p>
          <h2 className="font-display font-black text-3xl sm:text-5xl leading-[1.05]">
            More than just a learning site.<br />
            <span className="italic font-medium text-ink/60">Your full investing toolkit.</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {headlineFeatures.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="card-soft p-5 sm:p-7 hover:shadow-2xl hover:-translate-y-1 transition"
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${f.color} grid place-items-center mb-4 sm:mb-5`}>
                <f.icon size={22} className="text-ink" strokeWidth={2.2}/>
              </div>
              <h3 className="font-display text-lg sm:text-2xl font-bold mb-2">{f.title}</h3>
              <p className="text-sm sm:text-base text-ink/70 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ANALYSIS DEEP DIVE */}
      <section className="py-16 sm:py-24 bg-ink text-cream relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-sun-300/15 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-8 sm:mb-14">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-sun-300 mb-2 sm:mb-3">The analysis engine</p>
            <h2 className="font-display font-black text-3xl sm:text-5xl leading-[1.05]">
              Four scores. <span className="italic text-sun-300">One clear picture.</span>
            </h2>
            <p className="text-cream/70 mt-3 sm:mt-4 text-base sm:text-lg">
              Every stock gets analysed across the four factors that matter most to long-term investors.
              No vague signals. Just transparent, educational scoring you can learn from.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: Award, label: 'Quality', desc: 'ROE, margins, leverage, growth', color: 'text-bull-400' },
              { icon: BarChart3, label: 'Value', desc: 'P/E, P/B, EV/EBITDA, PEG', color: 'text-sun-300' },
              { icon: Activity, label: 'Momentum', desc: '1m, 3m, 6m, 1y returns', color: 'text-coral-400' },
              { icon: Shield, label: 'Risk', desc: 'Volatility, beta, drawdown', color: 'text-sage-400' },
            ].map((f) => (
              <div key={f.label} className="border border-cream/10 rounded-3xl p-4 sm:p-6 hover:bg-cream/5 transition">
                <f.icon size={24} className={f.color} strokeWidth={2.2}/>
                <h3 className="font-display text-lg sm:text-2xl font-bold mt-3 sm:mt-4 mb-1">{f.label}</h3>
                <p className="text-xs sm:text-sm text-cream/60">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 sm:mt-10 flex flex-wrap gap-3">
            <Link to="/rankings" className="btn-secondary text-sm sm:text-base">
              Browse top-rated stocks <ArrowRight size={16}/>
            </Link>
            <Link to="/signup" className="btn-ghost border-cream/20 text-cream hover:border-cream/50 text-sm sm:text-base">
              Sign up free
            </Link>
          </div>
        </div>
      </section>

      {/* GLOBAL COVERAGE */}
      <section className="py-16 sm:py-20 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 sm:gap-10 items-center">
          <div>
            <Globe2 className="w-8 h-8 sm:w-10 sm:h-10 text-bull-600 mb-3 sm:mb-4" strokeWidth={2}/>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-bull-600 mb-2 sm:mb-3">Global + Local</p>
            <h2 className="font-display font-black text-3xl sm:text-5xl leading-[1.05] mb-3 sm:mb-4">
              From <span className="italic">Apple</span> to <span className="italic">Dangote</span>.
            </h2>
            <p className="text-ink/70 text-base sm:text-lg mb-5 sm:mb-6">
              Most platforms ignore Nigerian stocks. We don't. Search NGX-listed companies alongside US giants — same analysis, same scoring, same depth.
            </p>
            <Link to="/rankings?country=NG" className="btn-primary text-sm sm:text-base">
              See top Nigerian stocks <ArrowRight size={16}/>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[
              { sym: 'AAPL', name: 'Apple Inc.', flag: '🇺🇸' },
              { sym: 'DANGCEM', name: 'Dangote Cement', flag: '🇳🇬' },
              { sym: 'TSLA', name: 'Tesla Inc.', flag: '🇺🇸' },
              { sym: 'MTNN', name: 'MTN Nigeria', flag: '🇳🇬' },
              { sym: 'NVDA', name: 'NVIDIA Corp.', flag: '🇺🇸' },
              { sym: 'GTCO', name: 'Guaranty Trust', flag: '🇳🇬' },
            ].map((s) => (
              <Link key={s.sym} to={`/stocks/${encodeURIComponent(s.sym.includes(':') ? s.sym : (s.flag === '🇳🇬' ? `NGX:${s.sym}` : s.sym))}`}
                className="card-soft p-3 sm:p-4 hover:shadow-lg hover:-translate-y-0.5 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-sm sm:text-base">{s.sym}</p>
                    <p className="text-[10px] sm:text-xs text-ink/50 truncate">{s.name}</p>
                  </div>
                  <span className="text-base sm:text-lg shrink-0">{s.flag}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SYLLABUS */}
      <section className="py-16 sm:py-20 bg-cream-warm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-8 sm:mb-12">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-coral-500 mb-2 sm:mb-3">The curriculum</p>
            <h2 className="font-display font-black text-3xl sm:text-5xl leading-[1.05]">
              Six courses. One <span className="italic">smart investor.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {syllabus.map((s) => (
              <div key={s.n} className="bg-white rounded-3xl p-5 sm:p-6 hover:shadow-lg transition">
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <span className="font-display text-3xl sm:text-4xl font-black text-coral-400">{s.n}</span>
                  <ArrowRight className="opacity-30" size={18}/>
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold mb-1">{s.title}</h3>
                <p className="text-xs sm:text-sm text-ink/60">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MENTORSHIP TEASER */}
      <section id="mentorship" className="py-16 sm:py-20 bg-ink text-cream relative overflow-hidden">
        <div className="absolute top-0 right-0 w-60 sm:w-80 h-60 sm:h-80 bg-sun-300/15 rounded-full blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-8 sm:gap-10 items-center">
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-sun-300 mb-2 sm:mb-3">Want faster progress?</p>
            <h2 className="font-display text-3xl sm:text-5xl font-black leading-[1.05] mb-3 sm:mb-4">
              Book a <span className="italic text-sun-300">1-on-1 session.</span>
            </h2>
            <p className="text-base sm:text-lg text-cream/70 mb-5 sm:mb-6">
              One focused hour with a human can beat ten hours of YouTube. Chart breakdowns, portfolio reviews, and a structured learning plan — tailored to you.
            </p>
            <Link to="/book-session" className="btn-secondary text-sm sm:text-base">
              Book a mentorship session <ArrowRight size={16}/>
            </Link>
            <p className="text-[10px] sm:text-xs text-cream/40 mt-3 sm:mt-4">Educational sessions only.</p>
          </div>

          <div className="grid gap-2 sm:gap-3">
            {[
              { icon: '⚡', title: '30-min quick session', price: '₦5,000' },
              { icon: '📈', title: '1-hour deep dive', price: '₦10,000', popular: true },
              { icon: '🏆', title: 'Weekly mentorship (4 weeks)', price: '₦35,000', premium: true },
            ].map((p) => (
              <div key={p.title} className={`rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 ${
                p.popular ? 'bg-sun-300 text-ink ring-4 ring-sun-500/20' : 'bg-cream/5 border border-cream/10'
              }`}>
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl grid place-items-center text-xl sm:text-2xl shrink-0 ${p.popular ? 'bg-ink/20' : 'bg-cream/10'}`}>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm sm:text-base truncate">{p.title}</p>
                  {p.premium && <p className="text-[10px] sm:text-xs opacity-70">Premium members only</p>}
                </div>
                <span className="font-display font-black text-base sm:text-lg shrink-0">{p.price}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AboutCreator />

      {/* CTA */}
      <section className="relative py-16 sm:py-20 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="relative bg-gradient-to-br from-sun-300 via-coral-300 to-coral-400 rounded-3xl sm:rounded-[3rem] p-8 sm:p-16 text-center overflow-hidden">
          <div className="absolute top-6 right-6 text-ink/10 font-display text-6xl sm:text-[10rem] font-black leading-none">$</div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-ink/10 rounded-full"/>

          <div className="relative">
            <Zap className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4"/>
            <h2 className="font-display font-black text-3xl sm:text-6xl leading-[1] mb-4 sm:mb-5">
              Stop guessing.<br/>
              <span className="italic">Start analysing.</span>
            </h2>
            <p className="text-base sm:text-lg text-ink/80 max-w-lg mx-auto mb-6 sm:mb-8">
              Free to start. No credit card. Real tools, real data.
            </p>
            <Link to="/signup" className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
              Create your free account <ArrowRight size={18}/>
            </Link>
            <p className="text-[10px] sm:text-xs text-ink/60 mt-5 sm:mt-6 max-w-lg mx-auto">
              {siteConfig.disclaimer}
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}