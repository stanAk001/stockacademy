import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Sparkles, BarChart3, TrendingUp, PieChart, Bell, Crown, ArrowRight, ArrowUpRight,
  Telescope, Radar, Search, Brain, Newspaper, Crosshair, Zap, ClipboardCheck,
  LineChart, ShieldCheck, Send, Languages, Check, Compass, Wallet, BookOpen, NotebookPen,
} from 'lucide-react';

// ============================================================
// PremiumShowcase — the flagship premium presentation.
//   mode "upgrade" → for non-subscribers: value framing + Upgrade CTAs + banner
//   mode "active"  → for premium members: every card links to the live tool
// A dark gold-accented hero, interactive category tabs, and rich color-coded
// feature cards. Mobile-first; motion respects prefers-reduced-motion.
// ============================================================

const TABS = [
  { id: 'ai', label: 'AI Intelligence', icon: Sparkles },
  { id: 'analysis', label: 'Analysis Tools', icon: BarChart3 },
  { id: 'trading', label: 'Trading Support', icon: TrendingUp },
  { id: 'portfolio', label: 'Portfolio Intelligence', icon: PieChart },
  { id: 'alerts', label: 'Alerts & Monitoring', icon: Bell },
  { id: 'benefits', label: 'Exclusive Benefits', icon: Crown },
];

// Full class strings (never interpolated) so Tailwind keeps them.
const C = {
  indigo:  { grad: 'from-indigo-500/25',  ring: 'ring-indigo-400/25',  icon: 'bg-indigo-500',  badge: 'bg-indigo-500/15 text-indigo-200',  link: 'text-indigo-300',  glow: 'bg-indigo-500/25' },
  violet:  { grad: 'from-violet-500/25',  ring: 'ring-violet-400/25',  icon: 'bg-violet-500',  badge: 'bg-violet-500/15 text-violet-200',  link: 'text-violet-300',  glow: 'bg-violet-500/25' },
  emerald: { grad: 'from-emerald-500/25', ring: 'ring-emerald-400/25', icon: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-200', link: 'text-emerald-300', glow: 'bg-emerald-500/25' },
  sky:     { grad: 'from-sky-500/25',     ring: 'ring-sky-400/25',     icon: 'bg-sky-500',     badge: 'bg-sky-500/15 text-sky-200',     link: 'text-sky-300',     glow: 'bg-sky-500/25' },
  amber:   { grad: 'from-amber-500/25',   ring: 'ring-amber-400/25',   icon: 'bg-amber-500',   badge: 'bg-amber-500/15 text-amber-200',   link: 'text-amber-300',   glow: 'bg-amber-500/25' },
  rose:    { grad: 'from-rose-500/25',    ring: 'ring-rose-400/25',    icon: 'bg-rose-500',    badge: 'bg-rose-500/15 text-rose-200',    link: 'text-rose-300',    glow: 'bg-rose-500/25' },
  teal:    { grad: 'from-teal-500/25',    ring: 'ring-teal-400/25',    icon: 'bg-teal-500',    badge: 'bg-teal-500/15 text-teal-200',    link: 'text-teal-300',    glow: 'bg-teal-500/25' },
};

const FEATURES = [
  // AI Intelligence
  { cat: 'ai', color: 'indigo',  icon: Telescope, name: 'AI Stock Scout',        badge: 'AI-Powered',  to: '/scout',           tagline: 'Find opportunities faster',   desc: 'Discover high-potential stocks with AI-powered analysis across US & NGX markets.' },
  { cat: 'ai', color: 'violet',  icon: Radar,     name: 'AI Swing Radar',        badge: 'For Traders', to: '/scout',           tagline: 'Trade with confidence',       desc: 'AI-identified swing setups with entry zones, targets and risk — from real price structure.' },
  { cat: 'ai', color: 'emerald', icon: TrendingUp, name: 'AI Long-Term Research', badge: 'For Investors', to: '/scout',          tagline: 'Build wealth strategically',  desc: 'In-depth fundamental analysis and long-term insights for smarter, calmer decisions.' },
  { cat: 'ai', color: 'sky',     icon: Search,    name: 'Opportunity Radar',     badge: 'Live',        to: '/radar',           tagline: 'See what’s hot',              desc: 'A live board of the strongest AI-surfaced setups, ranked by transparent quality.' },
  { cat: 'ai', color: 'amber',   icon: Compass,   name: 'My Market',             badge: 'Daily',       to: '/my-market',       tagline: 'See what changed',            desc: 'Your personal briefing: what changed since your last visit across your setups, positions, theses and news.' },

  // Analysis Tools
  { cat: 'analysis', color: 'amber', icon: BarChart3, name: 'Technical & Fundamental', badge: 'Pro',     to: '/rankings',        tagline: 'Know more. Trade smarter.',   desc: 'Professional-grade analysis using advanced AI and proven financial metrics.' },
  { cat: 'analysis', color: 'rose',  icon: Brain,     name: 'AI Stock Comparison',     badge: 'Popular', to: '/compare-stocks',  tagline: 'Compare instantly',           desc: 'Two tickers side-by-side on fundamentals, risk and valuation — with a clear verdict.' },
  { cat: 'analysis', color: 'teal',  icon: Newspaper, name: 'AI News Scanner',         badge: 'Focused', to: '/news-scanner',    tagline: 'Cut the noise',               desc: '30 days of news on any stock, filtered down to only what moves the price.' },

  // Trading Support
  { cat: 'trading', color: 'violet', icon: Crosshair, name: 'Tracked Setups',    badge: 'Auto',        to: '/setups',          tagline: 'Never miss an entry',         desc: 'Entry plans the AI monitors around the clock — it alerts you when they trigger, confirm or break.' },
  { cat: 'trading', color: 'indigo', icon: Radar,     name: 'Entry Plans',       badge: 'For Traders', to: '/scout',           tagline: 'Plan every trade',            desc: 'Entry zone, confirmation, stop and targets — checked on weekly, daily, 4-hour and 1-hour charts. A full plan, not just a signal.' },
  { cat: 'trading', color: 'sky',    icon: Zap,       name: 'Market Regime Read', badge: 'Context',    to: '/scout',           tagline: 'Trade the conditions',        desc: 'Know whether conditions favour trend-following or caution — before you commit.' },

  // Portfolio Intelligence
  { cat: 'portfolio', color: 'teal',    icon: PieChart,      name: 'AI Portfolio Intelligence', badge: 'Premium', to: '/dashboard',       tagline: 'Keep your portfolio healthy', desc: 'Analyze, track and optimize your holdings with AI insights and risk intelligence.' },
  { cat: 'portfolio', color: 'emerald', icon: ClipboardCheck, name: 'Personal Portfolio Review', badge: 'Human',   to: '/portfolio-review', tagline: 'Get expert eyes',            desc: 'A real mentor reviews your actual holdings and tells you exactly what to change.' },
  { cat: 'portfolio', color: 'amber',   icon: LineChart,     name: 'Smart Watchlist',           badge: 'Smart',   to: '/watchlist',       tagline: 'Watch smarter',              desc: 'Every watched stock shows what’s happening — ready, approaching, thesis weakening — and alerts you when it changes.' },
  { cat: 'portfolio', color: 'violet',  icon: Wallet,        name: 'Position Monitoring',       badge: 'Live',    to: '/positions',       tagline: 'Know where you stand',       desc: 'Record what you bought and see whether your thesis is intact, strengthening or weakening as prices move.' },
  { cat: 'portfolio', color: 'indigo',  icon: BookOpen,      name: 'Investment Thesis Tracking', badge: 'Long-term', to: '/theses',       tagline: 'Hold with conviction',       desc: 'Write down why you own a company. We watch its fundamentals and show exactly what changed, and why.' },
  { cat: 'portfolio', color: 'rose',    icon: NotebookPen,   name: 'Journal & Post-Trade Review', badge: 'Learn',  to: '/journal',        tagline: 'Improve your process',       desc: 'Every closed trade is journalled. The AI reviews it, and over time shows your personal patterns.' },

  // Alerts & Monitoring
  { cat: 'alerts', color: 'rose',   icon: Bell,      name: 'Smart Alerts & Scanner',  badge: 'Real-Time',     to: '/alerts',  tagline: 'Stay ahead always',        desc: 'Timely notifications and market insights before opportunities pass you by.' },
  { cat: 'alerts', color: 'indigo', icon: Crosshair, name: 'Setup Lifecycle Alerts',  badge: 'Push',          to: '/setups',  tagline: 'The right moment, every time', desc: 'Get pinged the moment a tracked setup approaches, triggers, confirms or invalidates.' },
  { cat: 'alerts', color: 'sky',    icon: Send,      name: 'Push & Telegram',         badge: 'Multi-Channel', to: '/profile', tagline: 'Wherever you are',         desc: 'Alerts on your phone even when the app is closed — in-app, web push and Telegram.' },
  { cat: 'alerts', color: 'teal',   icon: Newspaper, name: 'Company News Alerts',     badge: 'Automatic',     to: '/my-market', tagline: 'Hear it first',          desc: 'Results, dividends, deals and leadership changes on the stocks you follow, flagged as they happen.' },

  // Exclusive Benefits
  { cat: 'benefits', color: 'sky',     icon: Send,       name: 'Premium Telegram',       badge: 'Exclusive', to: '/profile',  tagline: 'Join the inner circle', desc: 'A members-only channel with insights and alerts straight to your phone.' },
  { cat: 'benefits', color: 'emerald', icon: Languages,  name: 'Answers in Your Language', badge: 'Naija',    to: '/scout',    tagline: 'In your words',         desc: 'The AI explains in English, Pidgin, Yorùbá, Hausa and Igbo.' },
  { cat: 'benefits', color: 'amber',   icon: Newspaper,  name: 'Weekly Market Digest',   badge: 'Weekly',    to: '/insights', tagline: 'Stay informed',         desc: 'A clear recap of what moved and why — delivered every week.' },
  { cat: 'benefits', color: 'violet',  icon: ShieldCheck, name: 'PDF Reports & Unlimited', badge: 'Unlimited', to: '/watchlist', tagline: 'No limits',            desc: 'Download any analysis and track & alert on as many stocks as you want.' },
];

const HIGHLIGHTS = [
  { icon: Sparkles, label: 'AI-Powered Insights' },
  { icon: BarChart3, label: 'Smarter Stock Analysis' },
  { icon: Bell, label: 'Real-Time Opportunities' },
];

export default function PremiumShowcase({
  mode = 'upgrade',       // 'upgrade' | 'active'
  price = null,           // { mo, yr } for the CTA line
  ctaTo = '/pricing',
  ctaLabel = 'Upgrade to Premium',
}) {
  const [tab, setTab] = useState('ai');
  const reduce = useReducedMotion();
  const cards = FEATURES.filter((f) => f.cat === tab);
  const upgrade = mode === 'upgrade';

  return (
    <div className="min-w-0">
      {/* ---------- HERO ---------- */}
      <div className="relative overflow-hidden rounded-[1.5rem] sm:rounded-[1.9rem] bg-ink text-cream p-5 sm:p-8">
        {/* contained gold accents + faint grid + chart motif (no hazy header orbs) */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(253,248,240,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(253,248,240,0.04) 1px, transparent 1px)',
            backgroundSize: '38px 38px',
          }} />
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-sun-400/15 blur-[80px]" />
          <ChartMotif reduce={reduce} />
        </div>

        <div className="relative">
          {/* top bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-sun-300 grid place-items-center shrink-0">
                <LineChart size={18} className="text-ink" strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-black leading-none">StockAcademia</span>
                  <span className="text-[8.5px] font-black uppercase tracking-widest bg-sun-300 text-ink rounded-full px-1.5 py-0.5">Premium</span>
                </div>
                <p className="text-[10px] text-cream/45 tracking-wide mt-0.5">AI-Powered Market Intelligence</p>
              </div>
            </div>
            {upgrade ? (
              <Link to={ctaTo} className="shrink-0 inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-sun-300 text-ink text-xs sm:text-sm font-black hover:bg-sun-400 hover:scale-[1.03] active:scale-95 transition motion-reduce:transform-none">
                <Crown size={14} /> <span className="hidden sm:inline">Upgrade to Premium</span><span className="sm:hidden">Upgrade</span>
              </Link>
            ) : (
              <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bull-500/15 text-bull-400 text-xs font-bold ring-1 ring-bull-400/30">
                <Check size={13} /> Premium active
              </span>
            )}
          </div>

          {/* headline */}
          <div className="mt-6 sm:mt-8 max-w-xl">
            <h2 className="font-display text-[1.7rem] leading-[1.06] sm:text-4xl lg:text-[2.7rem] sm:leading-[1.03] font-black">
              Smarter Research. <span className="text-sun-300">Better Decisions.</span>
            </h2>
            <p className="text-cream/65 text-[13px] sm:text-base mt-2.5 leading-relaxed">
              StockAcademia Premium gives you the AI-powered tools, insights and alerts to discover
              opportunities, analyze stocks and stay ahead of the market.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {HIGHLIGHTS.map((h) => (
                <span key={h.label} className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-cream/85 bg-cream/[0.07] ring-1 ring-cream/10 rounded-full px-3 py-1.5">
                  <h.icon size={13} className="text-sun-300" /> {h.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- TABS ---------- */}
      <div className="mt-4 sm:mt-5 -mx-1 px-1 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-1 border-b border-ink/10 min-w-max">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 text-[12.5px] sm:text-sm font-bold whitespace-nowrap transition ${on ? 'text-ink' : 'text-ink/45 hover:text-ink/70'}`}
              >
                <t.icon size={14} className={on ? 'text-sun-600' : ''} /> {t.label}
                {on && (
                  <motion.span layoutId="tabline" className="absolute left-2 right-2 -bottom-px h-[2.5px] rounded-full bg-sun-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- CARDS ---------- */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 mt-4 sm:mt-5"
        >
          {cards.map((f, i) => (
            <FeatureCard key={f.name + i} f={f} i={i} reduce={reduce} upgrade={upgrade} ctaTo={ctaTo} />
          ))}
        </motion.div>
      </AnimatePresence>

      {/* ---------- CTA BANNER ---------- */}
      {upgrade ? (
        <div className="mt-5 rounded-[1.25rem] bg-gradient-to-r from-sun-300 to-sun-400 text-ink p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-ink/10 grid place-items-center shrink-0">
              <Crown size={20} className="text-ink" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-lg sm:text-2xl font-black leading-tight">Unlock the full power of StockAcademia</h3>
              <p className="text-ink/70 text-[12.5px] sm:text-sm mt-0.5">
                Join smart investors using AI to research, analyze and grow their wealth
                {price ? <> · <span className="font-bold">{price.mo}/mo</span>, save 20% yearly</> : null}.
              </p>
            </div>
          </div>
          <Link to={ctaTo} className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-ink text-cream font-black text-sm hover:bg-ink-soft hover:scale-[1.02] active:scale-95 transition motion-reduce:transform-none">
            {ctaLabel} <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <p className="mt-5 text-center text-[12px] text-ink/45">
          You’re on Premium — every station above is unlocked. Tap any card to open it.
        </p>
      )}
    </div>
  );
}

function FeatureCard({ f, i, reduce, upgrade, ctaTo }) {
  const c = C[f.color];
  const Icon = f.icon;
  const to = upgrade ? ctaTo : f.to;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.05 }}
    >
      <Link
        to={to}
        className={`group relative block overflow-hidden rounded-xl sm:rounded-2xl p-3.5 sm:p-5 h-full bg-ink bg-gradient-to-br ${c.grad} via-ink to-ink ring-1 ${c.ring} transition duration-300 hover:-translate-y-1.5 hover:ring-2 active:scale-[0.99] motion-reduce:transform-none`}
      >
        {/* contained corner glow — intensifies on hover */}
        <div aria-hidden className={`absolute -right-8 -top-8 w-28 h-28 rounded-full ${c.glow} blur-2xl opacity-50 group-hover:opacity-90 transition duration-300`} />
        <div className="relative">
          <div className="flex items-start justify-between gap-1.5">
            <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl ${c.icon} text-white grid place-items-center shadow-lg shrink-0`}>
              <Icon className="w-[17px] h-[17px] sm:w-5 sm:h-5" strokeWidth={2.2} aria-hidden="true" />
            </div>
            <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${c.badge} shrink-0`}>{f.badge}</span>
          </div>
          <h3 className="font-display text-[15px] sm:text-lg font-black text-cream leading-tight mt-3 sm:mt-4">{f.name}</h3>
          <p className="text-[11.5px] sm:text-[12.5px] text-cream/60 leading-snug mt-1.5">{f.desc}</p>
          <div className={`inline-flex items-center gap-1.5 mt-3 sm:mt-4 text-[11.5px] sm:text-[12px] font-bold ${c.link}`}>
            {upgrade ? f.tagline : 'Open'}
            {upgrade
              ? <ArrowRight size={13} className="group-hover:translate-x-1 transition motion-reduce:transform-none" />
              : <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition motion-reduce:transform-none" />}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// A small rising candlestick motif for the hero's right side (decorative).
function ChartMotif({ reduce }) {
  const bars = [
    [0, 62, 40], [1, 54, 46], [2, 58, 30], [3, 40, 34], [4, 44, 24],
    [5, 30, 28], [6, 34, 18], [7, 22, 22], [8, 26, 12],
  ];
  return (
    <svg className="absolute right-0 bottom-0 h-32 sm:h-44 w-1/2 opacity-70 hidden sm:block" viewBox="0 0 200 90" preserveAspectRatio="none" fill="none">
      {bars.map(([i, top, h]) => (
        <rect key={i} x={10 + i * 21} y={top} width="11" height={h} rx="1.5" fill="#FCD34D" fillOpacity="0.18" />
      ))}
      <motion.polyline
        points="8,70 30,60 51,50 72,44 93,40 114,30 135,26 156,18 178,12 196,8"
        stroke="#FCD34D" strokeWidth="2.5" strokeOpacity="0.55" strokeLinecap="round" strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={reduce ? undefined : { pathLength: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut', delay: 0.4 }}
      />
      <circle cx="196" cy="8" r="3.5" fill="#FCD34D" />
    </svg>
  );
}
