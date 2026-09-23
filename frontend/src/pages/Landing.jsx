import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, Sparkles, TrendingUp, Users, BookOpen, LineChart, Trophy, Target,
  ShieldCheck, Zap, Search, Award, BarChart3, Activity, Shield, Globe2, Brain,
  GraduationCap, MessageSquareText, Languages, ChevronDown, LayoutDashboard, User, LogOut,
  Telescope, Crosshair, BellRing, NotebookPen, Radar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PremiumBadge, { premiumRing } from '../components/PremiumBadge';
import Logo from '../components/Logo';
import TickerTape from '../components/TickerTape';
import IntelligenceDemo from '../components/IntelligenceDemo';
import AboutCreator from '../components/AboutCreator';
import AIAnalysisShowcase from '../components/AIAnalysisShowcase';
import Footer from '../components/Footer';
import { siteConfig } from '../siteConfig';

// The product's loop, in the order a user lives it. `free` = free users can try
// this step every month; the rest is what Premium adds.
const WORKFLOW = [
  { n: '01', step: 'Find', icon: Telescope, free: true,
    title: 'Spot the opportunities',
    desc: 'The AI Scout and Opportunity Radar scan US and NGX stocks for setups that fit how you invest.' },
  { n: '02', step: 'Understand', icon: Brain, free: true,
    title: 'Know what you’re looking at',
    desc: 'Fundamentals, technicals and news on any stock, in plain English, Pidgin, Yorùbá, Hausa or Igbo.' },
  { n: '03', step: 'Plan', icon: Crosshair, free: false,
    title: 'Get a clear plan',
    desc: 'Entry, confirmation, stop and targets, checked from the weekly chart down to the 1-hour.' },
  { n: '04', step: 'Monitor', icon: BellRing, free: false,
    title: 'Let us watch it',
    desc: 'Setups, positions, theses and your watchlist, tracked for you. An alert when something changes.' },
  { n: '05', step: 'Review', icon: NotebookPen, free: false,
    title: 'Get better every trade',
    desc: 'Your journal, AI post-trade reviews and personal patterns show what works for you.' },
];

// One zone of the "How it works" band. The free zone is light, the Premium
// zone is dark, so where Premium takes over is obvious without per-step badges.
// A journey line runs through the step icons and draws in on scroll.
function JourneyZone({ free, steps, className = '' }) {
  const reduce = useReducedMotion();
  return (
    <div className={`${free ? 'bg-white text-ink' : 'bg-ink text-cream'} p-4 sm:p-8 lg:p-9 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-5 sm:mb-9">
        <span className={`inline-flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest px-2.5 sm:px-3 py-1 rounded-full whitespace-nowrap ${
          free ? 'bg-bull-100 text-bull-700' : 'bg-sun-300 text-ink'
        }`}>
          <Sparkles size={11} /> {free ? 'Free to try · every month' : 'Premium · we take it from here'}
        </span>
        <Link
          to={free ? '/signup' : '/pricing'}
          className={`text-xs sm:text-sm font-bold inline-flex items-center gap-1 hover:underline whitespace-nowrap ${free ? 'text-bull-600' : 'text-sun-300'}`}
        >
          {free ? 'Start free' : 'See Premium'} <ArrowRight size={13} />
        </Link>
      </div>

      {/* steps stay side by side at every size; phones get tighter type */}
      <ol className={`relative grid gap-3 sm:gap-6 ${free ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {/* journey line, running behind the icons */}
        <motion.span
          aria-hidden
          className={`block absolute top-4 sm:top-5 left-4 sm:left-5 right-0 h-px origin-left ${free ? 'bg-ink/10' : 'bg-sun-300/40'}`}
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
        {steps.map((w, i) => (
          <motion.li
            key={w.n}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
            className="relative min-w-0"
          >
            <div className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl grid place-items-center ${
              free ? 'bg-sun-300 text-ink' : 'bg-ink text-sun-300 ring-1 ring-sun-300/40'
            }`}>
              <w.icon className="w-[15px] h-[15px] sm:w-[18px] sm:h-[18px]" strokeWidth={2.2} />
            </div>
            <p className={`mt-2.5 sm:mt-4 font-mono text-[9px] sm:text-[11px] font-bold tracking-wider sm:tracking-widest ${free ? 'text-ink/40' : 'text-cream/40'}`}>
              {w.n} · {w.step.toUpperCase()}
            </p>
            <h3 className="font-display text-[13px] sm:text-xl font-bold mt-0.5 sm:mt-1 leading-tight">{w.title}</h3>
            <p className={`text-[11px] sm:text-sm mt-1 sm:mt-2 leading-snug sm:leading-relaxed ${free ? 'text-ink/65' : 'text-cream/65'}`}>{w.desc}</p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

// The learning foundation the platform was built on.
const BASICS = [
  { icon: BookOpen, title: '6 structured courses', desc: 'From “what’s a dividend?” to technical analysis. Free.' },
  { icon: LineChart, title: '$100k paper trading', desc: 'Practise without risking real money. Free.' },
  { icon: GraduationCap, title: '1-on-1 mentorship', desc: 'Book time with a human mentor when you’re ready.' },
  { icon: Users, title: 'Community forum', desc: 'Learn with other investors. No pump groups.' },
];

const stats = [
  { number: '50+', label: 'Stocks covered' },
  { number: '🇳🇬 + 🇺🇸', label: 'Markets' },
  { number: '5', label: 'Languages' },
  { number: 'Free', label: 'AI to start' },
];

const syllabus = [
  { n: '01', title: 'Stock Market Basics', desc: 'Ownership, exchanges, bull vs bear.' },
  { n: '02', title: 'How to Earn from Stocks', desc: 'Capital gains, dividends, compounding.' },
  { n: '03', title: 'Fundamental Analysis', desc: 'Income statements, P/E, ROE, valuation.' },
  { n: '04', title: 'Technical Analysis', desc: 'Candlesticks, S/R, moving averages, RSI.' },
  { n: '05', title: 'Risk Management', desc: 'Position sizing, stop-loss, diversification.' },
  { n: '06', title: 'Trading Strategies', desc: 'Day, swing, long-term — find your style.' },
];

// Hero badge that cycles a tagline + matching icon. The text slides inside a
// fixed-height window that clips it (grid + overflow-hidden + explicit height),
// so it can never spill out of the pill mid-animation. Every phrase is stacked
// invisibly in the same cell, so the pill is as wide as the WIDEST one (pixel
// width, not character count) and never clips or jumps. Holds still for
// reduced motion.
const BADGE_ITEMS = [
  { text: 'AI that watches the market', Icon: Radar },
  { text: 'US + NGX stocks', Icon: TrendingUp },
  { text: 'Plain English · even Pidgin', Icon: Languages },
  { text: 'Alerts when it matters', Icon: BellRing },
];

function RotatingBadge() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduce) return undefined;
    const t = setInterval(() => setI((p) => (p + 1) % BADGE_ITEMS.length), 4200);
    return () => clearInterval(t);
  }, [reduce]);
  const Active = BADGE_ITEMS[i].Icon;
  return (
    <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-ink text-cream text-[10px] sm:text-xs font-semibold uppercase tracking-widest mb-4 sm:mb-6">
      <span className="relative w-4 h-4 shrink-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={i}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 grid place-items-center text-sun-300"
          >
            <Active size={13} strokeWidth={2.6} />
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="relative grid overflow-hidden h-[1.3em] leading-[1.3em]">
        {BADGE_ITEMS.map((it) => (
          <span key={it.text} aria-hidden className="invisible whitespace-nowrap" style={{ gridArea: '1 / 1' }}>{it.text}</span>
        ))}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={i}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-100%', opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 block whitespace-nowrap"
          >
            {BADGE_ITEMS[i].text}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );
}

function MenuItem({ to, icon: Icon, onClick, children }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-2.5 px-4 py-3 hover:bg-cream-warm text-sm font-medium transition">
      <Icon size={16} className="text-ink/50" /> {children}
    </Link>
  );
}

// Logged-in account menu for the homepage header — an avatar pill that opens a
// clean animated dropdown. No truncating username inline; premium members get a
// gold ring + verified badge.
function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isPremium = user?.plan === 'premium';
  const firstName = user?.full_name?.trim().split(/\s+/)[0] || user?.username || 'You';

  const doLogout = () => { setOpen(false); logout(); navigate('/'); };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 p-1 sm:pr-2.5 rounded-full transition ${isPremium ? 'bg-sun-300/25 hover:bg-sun-300/40' : 'bg-ink/5 hover:bg-ink/10'}`}
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className={`w-8 h-8 rounded-full object-cover ${premiumRing(user.plan)}`} />
        ) : (
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-sun-400 to-coral-400 grid place-items-center text-ink font-bold text-sm ${premiumRing(user.plan)}`}>
            {firstName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden sm:block text-sm font-semibold max-w-[90px] truncate">{firstName}</span>
        <ChevronDown size={15} className={`hidden sm:block text-ink/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-ink/5 overflow-hidden z-50"
            >
              <div className="p-4 border-b border-ink/5">
                <p className="font-bold text-sm truncate flex items-center gap-1.5">
                  {user.full_name || user.username} <PremiumBadge plan={user.plan} />
                </p>
                <p className="text-xs text-ink/55 truncate">{user.email}</p>
                {!isPremium && (
                  <Link to="/upgrade" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-coral-500 hover:underline">
                    <Sparkles size={12} /> Upgrade to Premium
                  </Link>
                )}
              </div>
              <MenuItem to="/dashboard" icon={LayoutDashboard} onClick={() => setOpen(false)}>Dashboard</MenuItem>
              <MenuItem to="/profile" icon={User} onClick={() => setOpen(false)}>Profile</MenuItem>
              <MenuItem to="/forum" icon={Users} onClick={() => setOpen(false)}>Community</MenuItem>
              <button onClick={doLogout} className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-cream-warm text-sm font-medium text-bear-500 border-t border-ink/5 transition">
                <LogOut size={16} /> Log out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Bento tiles for the signed-in launcher — varied sizes + treatments so it
// reads as a designed hub, not a uniform list.
const HUB_TILES = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',  desc: 'Your overview, stock search & recent activity — your command center.', span: 'sm:col-span-2 lg:col-span-2 lg:row-span-2', variant: 'dark',   cta: 'Open dashboard', bgImages: [
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1400&q=70', // candlestick research chart
      'https://images.unsplash.com/photo-1744782211816-c5224434614f?auto=format&fit=crop&w=1400&q=70', // multi-screen "command center"
      'https://images.unsplash.com/photo-1560221328-12fe60f83ab8?auto=format&fit=crop&w=1400&q=70',     // live market data monitor
  ] },
  { to: '/simulator',    icon: LineChart,       label: 'Simulator',  desc: 'Trade with $100,000 in virtual cash — risk-free practice.', span: 'lg:col-span-2', variant: 'accent', tag: '$100k virtual', bgImages: [
      'https://images.unsplash.com/photo-1612178991541-b48cc8e92a4d?auto=format&fit=crop&w=1200&q=70', // live trading chart
      'https://images.unsplash.com/photo-1645226880663-81561dcab0ae?auto=format&fit=crop&w=1200&q=70', // trading app on a phone
  ] },
  { to: '/courses',      icon: BookOpen,        label: 'Courses',    desc: 'Lessons, quizzes & a certificate.', span: '', variant: 'light', bgImages: [
      'https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=1200&q=70', // taking notes
      'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=1200&q=70', // studying on a laptop
  ] },
  { to: '/rankings',     icon: BarChart3,       label: 'Discover',   desc: 'Top gainers, value & dividends.', span: '', variant: 'light', bgImages: [
      'https://images.unsplash.com/photo-1535320903710-d993d3d77d29?auto=format&fit=crop&w=1200&q=70', // market data graph
      'https://images.unsplash.com/photo-1768055104895-e6185762f2a9?auto=format&fit=crop&w=1200&q=70', // analysing the numbers
  ] },
  { to: '/forum',        icon: Users,           label: 'Community',  desc: 'Ask questions, share trades, learn together.', span: 'sm:col-span-2 lg:col-span-2', variant: 'light', bgImages: [
      'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?auto=format&fit=crop&w=1200&q=70', // people collaborating
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=70', // group around a table
  ] },
  { to: '/book-session', icon: GraduationCap,   label: 'Mentorship', desc: 'Sit 1-on-1 with a mentor — get your portfolio reviewed.', span: 'lg:col-span-2', variant: 'light', bgImages: [
      'https://images.unsplash.com/photo-1561346745-5db62ae43861?auto=format&fit=crop&w=1200&q=70', // 1-on-1 mentoring
      'https://images.unsplash.com/photo-1512238972088-8acb84db0771?auto=format&fit=crop&w=1200&q=70', // a working session
  ] },
];

// Ambient "video" background — crossfades through on-brand photos while each one
// slowly Ken-Burns pans/zooms. Pure GPU transforms (no video file); holds a single
// still frame for users who prefer reduced motion.
function KenBurnsBackground({ images, interval = 5500 }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const motionClass = ['kb-a', 'kb-b', 'kb-c'];

  useEffect(() => {
    if (reduce || images.length <= 1) return;
    const id = setInterval(() => setActive((p) => (p + 1) % images.length), interval);
    return () => clearInterval(id);
  }, [reduce, images.length, interval]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {images.map((src, idx) => (
        <img
          key={src}
          src={src}
          alt=""
          loading={idx === 0 ? 'eager' : 'lazy'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1600ms] ease-in-out ${
            idx === active ? 'opacity-100' : 'opacity-0'
          } ${reduce ? '' : motionClass[idx % 3]}`}
        />
      ))}
    </div>
  );
}

function HubTile({ tile, index }) {
  const onPhoto = tile.bgImages?.length > 0;
  const dark = onPhoto || tile.variant === 'dark'; // light-text (cream) treatment
  const surface = onPhoto
    ? 'bg-ink text-cream hover:shadow-xl'
    : {
        dark: 'bg-ink text-cream hover:shadow-xl',
        accent: 'bg-sun-100 border border-sun-300/50 hover:shadow-lg',
        light: 'card-soft hover:shadow-lg',
      }[tile.variant];
  const iconBox = dark ? 'bg-sun-300 text-ink' : 'bg-ink text-sun-300';
  const arrow = dark ? 'text-sun-300' : 'text-ink/30 group-hover:text-ink';
  const sub = onPhoto ? 'text-cream/90' : tile.variant === 'dark' ? 'text-cream/65' : 'text-ink/55';
  const tagCls = onPhoto ? 'bg-sun-300 text-ink' : 'bg-ink text-sun-300';

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className={tile.span}
    >
      <Link to={tile.to} className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 flex flex-col h-full min-h-[7.5rem] transition hover:-translate-y-0.5 group ${surface}`}>
        {tile.bgImages?.length > 0 && (
          <>
            {/* Auto-crossfading Ken Burns montage — plays like ambient video.
                Staggered cadence so the tiles don't all switch at once. */}
            <KenBurnsBackground images={tile.bgImages} interval={5200 + index * 650} />
            {/* Flat solid scrim (NOT a gradient wash) — strong enough to keep text
                legible even over the brighter frames. */}
            <div className="absolute inset-0 bg-ink/80" />
          </>
        )}

        <div className="relative z-10 flex items-start justify-between">
          <div className={`w-11 h-11 rounded-2xl grid place-items-center shrink-0 ${iconBox}`}>
            <tile.icon size={20} strokeWidth={2.2} />
          </div>
          {tile.tag && (
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${tagCls}`}>{tile.tag}</span>
          )}
          {!tile.tag && <ArrowRight size={18} className={`${arrow} group-hover:translate-x-0.5 transition`} />}
        </div>

        <div className={`relative z-10 mt-auto pt-6 ${onPhoto ? 'text-shadow-photo' : ''}`}>
          <p className="font-display text-lg sm:text-xl font-black leading-tight">{tile.label}</p>
          <p className={`text-sm mt-1 ${sub}`}>{tile.desc}</p>
          {tile.cta && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-sun-300 mt-3">
              {tile.cta} <ArrowRight size={13} className="group-hover:translate-x-0.5 transition" />
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// Signed-in homepage: a designed bento launcher instead of the sales pitch.
function SignedInHub() {
  const { user } = useAuth();
  const firstName = user?.full_name?.trim().split(/\s+/)[0] || user?.username || 'there';
  const isPremium = user?.plan === 'premium';

  return (
    <section className="py-10 sm:py-14 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-coral-500">Welcome back</p>
          <h2 className="font-display text-3xl sm:text-4xl font-black leading-tight mt-1">
            Hey <span className="italic">{firstName}</span> 👋
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-cream-warm border border-ink/5 rounded-full px-3 py-1.5">
            ⚡ {user?.total_xp ?? 0} XP
          </span>
          {isPremium ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-sun-300 text-ink rounded-full px-3 py-1.5">
              <PremiumBadge plan="premium" size={13} /> Member
            </span>
          ) : (
            <Link to="/upgrade" className="inline-flex items-center gap-1 text-xs font-bold bg-ink text-cream rounded-full px-3 py-1.5 hover:bg-ink-soft transition">
              <Sparkles size={12} className="text-sun-300" /> Upgrade
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:auto-rows-[10.5rem]">
        {HUB_TILES.map((tile, i) => (
          <HubTile key={tile.to} tile={tile} index={i} />
        ))}
      </div>
    </section>
  );
}

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="bg-cream text-ink overflow-x-hidden">
      {/* NAV */}
      <header className="sticky top-0 z-40 bg-cream/85 backdrop-blur-md border-b border-ink/5">
        <nav className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3">
          <Logo />
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {user ? (
              <>
                <Link to="/dashboard" className="px-3 py-2 text-sm font-semibold hover:text-bull-600 transition">Dashboard</Link>
                <Link to="/courses" className="px-3 py-2 text-sm font-semibold hover:text-bull-600 transition">Courses</Link>
                <Link to="/forum" className="px-3 py-2 text-sm font-semibold hover:text-bull-600 transition">Community</Link>
              </>
            ) : (
              <>
                <a href="#features" className="px-3 py-2 text-sm font-semibold hover:text-bull-600 transition">How it works</a>
                <a href="#analysis" className="px-3 py-2 text-sm font-semibold hover:text-bull-600 transition">AI Analysis</a>
                <Link to="/pricing" className="px-3 py-2 text-sm font-semibold hover:text-bull-600 transition">Pricing</Link>
                <a href="#mentorship" className="px-3 py-2 text-sm font-semibold hover:text-bull-600 transition">Mentorship</a>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {user ? (
              <UserMenu />
            ) : (
              <>
                <Link to="/login" className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold hover:text-bull-600 transition">Log in</Link>
                <Link to="/signup" className="px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-bold bg-ink text-cream rounded-full hover:bg-ink-soft transition shine whitespace-nowrap">
                  Start free
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* HERO — logged-out only; signed-in users get the lean hub below */}
      {!user && (
      <section className="relative pt-8 sm:pt-20 pb-12 sm:pb-20 overflow-hidden">
        <div className="absolute top-20 -left-20 w-60 sm:w-80 h-60 sm:h-80 bg-sun-300/40 animate-blob" />
        <div className="absolute bottom-10 -right-10 w-52 sm:w-72 h-52 sm:h-72 bg-coral-300/30 animate-blob" style={{ animationDelay: '3s' }} />

        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-8 sm:gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7"
          >
            <RotatingBadge />

            <h1 className="font-display font-black text-3xl sm:text-6xl lg:text-[4.25rem] leading-[1.05] tracking-tight">
              Any stock,{' '}
              <span className="relative inline-block">
                <span className="relative z-10 italic">analysed</span>
                <svg className="absolute -bottom-1 sm:-bottom-2 left-0 w-full" height="14" viewBox="0 0 200 18">
                  <path d="M2,14 C50,4 100,14 198,6" stroke="#FBBF24" strokeWidth="6" fill="none" strokeLinecap="round" />
                </svg>
              </span>
              .<br />
              Then{' '}
              {/* margin keeps the italic "d" from leaning into the next word */}
              <span className="italic text-coral-500 mr-[0.08em]">watched</span>{' '}
              <span className="whitespace-nowrap">for you.</span>
            </h1>

            {/* The story, with one turning point in bold ink. */}
            <p className="mt-5 sm:mt-7 text-base sm:text-lg text-ink/70 leading-relaxed max-w-xl">
              StockAcademia scans US and Nigerian stocks for potential opportunities, explains what matters in plain
              English, and turns the analysis into a clear plan — potential entry, stop and targets.{' '}
              <strong className="text-ink font-semibold">Then it keeps watching.</strong>{' '}
              When something important changes, you get an alert. No endless feed to monitor. No need to stare at
              charts all day.
            </p>

            {/* The offer, set apart and a step quieter. */}
            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-ink/60 leading-relaxed max-w-xl">
              Start{' '}
              <strong className="font-bold text-ink bg-sun-300/60 rounded-[3px] px-1 box-decoration-clone">free</strong>{' '}
              with monthly AI analyses, six investing courses and{' '}
              <strong className="text-ink font-semibold">$100,000</strong> in practice money.
            </p>

            <div className="mt-5 sm:mt-7 flex flex-wrap gap-3">
              <Link to={user ? '/dashboard' : '/signup'} className="btn-primary text-sm sm:text-base">
                {user ? 'Go to your dashboard' : 'Start free — try the AI'} <ArrowRight size={16}/>
              </Link>
              <a href="#features" className="btn-ghost text-sm sm:text-base">
                See how it works ↓
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

          {/* Live, self-playing demo of the tools */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 relative mt-6 lg:mt-0"
          >
            <IntelligenceDemo />
          </motion.div>
        </div>
      </section>
      )}

      <TickerTape />

      {/* Signed-in: a lean app launcher instead of the marketing pitch */}
      {user && <SignedInHub />}

      {/* Logged-out: the full marketing homepage */}
      {!user && (
       <>
      {/* AI ANALYSIS SHOWCASE */}
      <div id="analysis">
        <AIAnalysisShowcase />
      </div>

      {/* HOW IT WORKS — the product's loop. Two zones make the offer obvious:
          what you can try free, and where Premium takes over. */}
      <section id="features" className="py-16 sm:py-24 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-3xl mb-10 sm:mb-12">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-bull-600 mb-2 sm:mb-3">How StockAcademia works</p>
          <h2 className="font-display font-black text-3xl sm:text-5xl lg:text-[3.4rem] leading-[1.05]" style={{ textWrap: 'balance' }}>
            From first search to final review.{' '}
            <span className="italic font-medium text-ink/55">We watch the market in between.</span>
          </h2>
          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-ink/65 leading-relaxed max-w-2xl">
            Five steps, one place. Try the first two free every month. Premium adds the plan, the monitoring and
            the review, so nothing important slips past you.
          </p>
        </div>

        {/* zones stack on phones (free on top, Premium below), sit side by side on desktop */}
        <div className="grid lg:grid-cols-5 rounded-2xl sm:rounded-[1.75rem] overflow-hidden ring-1 ring-ink/10 shadow-sm">
          <JourneyZone free steps={WORKFLOW.filter((w) => w.free)} className="lg:col-span-2" />
          <JourneyZone steps={WORKFLOW.filter((w) => !w.free)} className="lg:col-span-3" />
        </div>

        {/* the learning foundation */}
        <div className="mt-10 sm:mt-12 card-soft p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-widest text-coral-500 mb-4 sm:mb-5">Plus everything you need to learn</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5 sm:gap-6">
            {BASICS.map((b) => (
              <div key={b.title} className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-cream-warm grid place-items-center shrink-0">
                  <b.icon size={18} className="text-ink" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm">{b.title}</p>
                  <p className="text-xs sm:text-[13px] text-ink/60 mt-0.5 leading-snug">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ANALYSIS DEEP DIVE */}
      <section className="py-16 sm:py-24 bg-ink text-cream relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-8 sm:mb-14">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-sun-300 mb-2 sm:mb-3">The analysis</p>
            <h2 className="font-display font-black text-3xl sm:text-5xl leading-[1.05]">
              The numbers that matter. <span className="italic text-sun-300">Explained simply.</span>
            </h2>
            <p className="text-cream/70 mt-3 sm:mt-4 text-base sm:text-lg">
              Every stock comes with the real figures across the areas long-term investors care about —
              plus a plain-English read of what they mean. No vague signals, no black-box score to blindly trust.
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
              Browse stocks by the numbers <ArrowRight size={16}/>
            </Link>
            <Link to={user ? '/dashboard' : '/signup'} className="btn-ghost border-cream/20 text-cream hover:border-cream/50 text-sm sm:text-base">
              {user ? 'Go to dashboard' : 'Sign up free'}
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

          {/* Two side by side on phones, three on desktop. */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            {syllabus.map((s) => (
              <div key={s.n} className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:shadow-lg transition min-w-0">
                <div className="flex items-start justify-between mb-2 sm:mb-4">
                  <span className="font-display text-2xl sm:text-4xl font-black text-coral-400">{s.n}</span>
                  <ArrowRight className="opacity-30 shrink-0" size={16}/>
                </div>
                <h3 className="font-display text-base sm:text-xl font-bold mb-1 leading-tight">{s.title}</h3>
                <p className="text-xs sm:text-sm text-ink/60 leading-snug">{s.desc}</p>
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
            <Link to={user ? '/dashboard' : '/signup'} className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
              {user ? 'Go to your dashboard' : 'Create your free account'} <ArrowRight size={18}/>
            </Link>
            <p className="text-[10px] sm:text-xs text-ink/60 mt-5 sm:mt-6 max-w-lg mx-auto">
              {siteConfig.disclaimer}
            </p>
          </div>
        </div>
      </section>
       </>
      )}

      <Footer />
    </div>
  );
}