import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Brain, BarChart3, Newspaper, GraduationCap, Sparkles, Check, ArrowRight } from 'lucide-react';
import api from '../services/api';
import LiveDemo from './LiveDemo';

// A curated upward candlestick series for the decorative backdrop (viewBox 1200×200).
// Mostly green with a couple of red pullbacks, so it reads as a real, rising chart
// — the goal made visual: learn the market, then watch it grow. y grows downward.
const CANDLES = [
  { x: 70, o: 150, c: 142, h: 134, l: 156, up: true },
  { x: 150, o: 142, c: 150, h: 138, l: 156, up: false },
  { x: 230, o: 150, c: 134, h: 128, l: 154, up: true },
  { x: 310, o: 134, c: 126, h: 120, l: 138, up: true },
  { x: 390, o: 126, c: 132, h: 122, l: 138, up: false },
  { x: 470, o: 132, c: 116, h: 110, l: 136, up: true },
  { x: 550, o: 116, c: 110, h: 104, l: 122, up: true },
  { x: 630, o: 110, c: 118, h: 106, l: 124, up: false },
  { x: 710, o: 118, c: 98, h: 92, l: 122, up: true },
  { x: 790, o: 98, c: 90, h: 84, l: 104, up: true },
  { x: 870, o: 90, c: 96, h: 86, l: 102, up: false },
  { x: 950, o: 96, c: 76, h: 70, l: 100, up: true },
  { x: 1030, o: 76, c: 64, h: 58, l: 80, up: true },
  { x: 1110, o: 64, c: 50, h: 44, l: 70, up: true },
];
const TREND = '0,158 ' + CANDLES.map((k) => `${k.x},${k.c}`).join(' ') + ' 1200,44';

// Points for the "live plotter" dot that traces the trend line on a loop.
const TREND_PTS = [[0, 158], ...CANDLES.map((k) => [k.x, k.c]), [1200, 44]];
const SCAN_X = TREND_PTS.map((p) => p[0]);
const SCAN_Y = TREND_PTS.map((p) => p[1]);
const SCAN_OP = TREND_PTS.map((_, i) => (i === 0 || i === TREND_PTS.length - 1 ? 0 : 0.9));

// ============================================================
// PremiumValue — the "what you get & why it's worth it" showcase.
// Shared by the Dashboard (free-user upsell) and the Pricing page.
// Geo-aware: ₦ + NGX example for Nigeria, $ + US example elsewhere.
// Pass `currency` if the caller already knows it (avoids a second /geo
// call); otherwise it detects on its own. `showPricing` adds the price
// + CTA footer (used on the dashboard; the pricing page hides it because
// its plan cards handle the purchase).
// ============================================================
const DATA = {
  NGN: {
    mo: '₦3,500', yr: '₦33,000',
    proof: {
      a: { sym: 'GTCO' },
      b: { sym: 'ZENITH' },
    },
  },
  USD: {
    mo: '$10', yr: '$96',
    proof: {
      a: { sym: 'AAPL' },
      b: { sym: 'MSFT' },
    },
  },
};

export default function PremiumValue({
  currency,
  eyebrow = 'Premium',
  headline,
  subline,
  showPricing = false,
  ctaTo = '/pricing',
  ctaLabel = 'Get Premium',
}) {
  const [detected, setDetected] = useState('NGN');
  useEffect(() => {
    if (currency) return;
    api.get('/geo')
      .then(({ data }) => { if (data?.success) setDetected(data.country === 'NG' ? 'NGN' : 'USD'); })
      .catch(() => {});
  }, [currency]);

  const reduce = useReducedMotion();
  const cur = currency === 'USD' || currency === 'NGN' ? currency : detected;
  const d = DATA[cur];
  const { a, b } = d.proof;

  const hd = headline || (
    <>Your personal stock analyst — <span className="italic text-sun-300">and a mentor in your corner.</span></>
  );
  const sub = subline || (
    <>The hard part of investing is reading the numbers and knowing if your money is well placed.
      Premium does that work <em className="text-cream not-italic font-semibold">for you</em> — so you
      decide with clarity, not guesswork.</>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] bg-ink text-cream p-5 sm:p-7 lg:p-9 grain-overlay ring-1 ring-cream/10"
    >
      {/* Decorative canvas — a faint candlestick chart trending UP, tied together by
          a rising trend line that draws itself in, with a live pulse at the peak.
          The iconic market motif (NGX + US) and the project's whole promise made
          visual: learn the market, then watch it grow. Crisp solid shapes, no glows. */}
      <div aria-hidden className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(253,248,240,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(253,248,240,0.045) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <svg className="absolute inset-x-0 bottom-0 w-full h-40 sm:h-56" viewBox="0 0 1200 200" preserveAspectRatio="none" fill="none">
          {/* candlesticks assemble themselves, left to right */}
          {CANDLES.map((k, i) => {
            const color = k.up ? '#10B981' : '#EF4444';
            const op = k.up ? 0.2 : 0.15;
            const top = Math.min(k.o, k.c);
            const h = Math.max(2.5, Math.abs(k.c - k.o));
            return (
              <motion.g
                key={i}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={reduce ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.06, ease: 'easeOut' }}
              >
                <line x1={k.x} x2={k.x} y1={k.h} y2={k.l} stroke={color} strokeOpacity={op} strokeWidth="2" />
                <rect x={k.x - 8} y={top} width="16" height={h} rx="1.5" fill={color} fillOpacity={op} />
              </motion.g>
            );
          })}
          {/* soft area + rising trend line through the closes */}
          <polygon points={`${TREND} 1200,200 0,200`} fill="#10B981" fillOpacity="0.05" />
          <motion.polyline
            points={TREND}
            stroke="#10B981" strokeWidth="2.75" strokeOpacity="0.36" strokeLinecap="round" strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={reduce ? undefined : { pathLength: 1 }}
            transition={{ duration: 1.6, ease: 'easeOut', delay: 1.05 }}
          />
          {/* constant "current high" marker */}
          <circle cx="1110" cy="50" r="4" fill="#10B981" fillOpacity="0.4" />
          {/* live plotter — a dot that keeps tracing the growth line */}
          {!reduce && (
            <motion.circle
              r="5" fill="#10B981"
              initial={{ opacity: 0 }}
              animate={{ cx: SCAN_X, cy: SCAN_Y, opacity: SCAN_OP }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'linear', delay: 2.7, repeatDelay: 1.4 }}
            />
          )}
        </svg>
      </div>

      {/* Header */}
      <div className="relative z-10 max-w-2xl mb-5 sm:mb-7">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream/10 text-sun-300 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] mb-3 sm:mb-4">
          <Sparkles size={11} /> {eyebrow}
        </div>
        <h2 className="font-display text-[1.35rem] leading-[1.1] sm:text-3xl lg:text-[2.6rem] sm:leading-[1.04] font-black mb-2 sm:mb-3 break-words">
          {hd}
        </h2>
        <p className="text-cream/70 text-[12.5px] sm:text-base break-words leading-relaxed">{sub}</p>
      </div>

      <div className="relative z-10 grid lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-stretch">
        {/* LEFT: the 4 hero AI tools (same four the live demo cycles through) */}
        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-2.5 sm:gap-4">
          <Perk index={0} icon={Brain} title="Compare any two stocks" tip={`Ask: "${a.sym} or ${b.sym}?"`}>
            A clear side-by-side verdict on growth, risk and value — in seconds, no jargon.
          </Perk>
          <Perk index={1} icon={BarChart3} title="Analyze your portfolio" tip={`e.g. "38% in one stock — trim it"`}>
            Spot over-exposure to a stock or sector, and exactly what to rebalance.
          </Perk>
          <Perk index={2} icon={Newspaper} title="Scan the news for you" tip="31 articles → the 4 that matter">
            Thirty days of headlines on any stock, cut down to what actually moves the price.
          </Perk>
          <Perk index={3} icon={GraduationCap} title="An AI tutor in every lesson" tip={`Ask: "what is a P/E?"`}>
            Stuck on a concept? Ask and get it explained simply — in your language too.
          </Perk>
        </div>

        {/* RIGHT: self-playing live demo of the tools (preview = conversion cue) */}
        <div className="lg:col-span-5 min-w-0">
          <LiveDemo variant="onDark" preview />
        </div>
      </div>

      {/* Everything else Premium unlocks — the full picture, grouped */}
      <div className="relative z-10 grid sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
        <div className="bg-cream/[0.05] border border-cream/10 rounded-2xl p-4 sm:p-5">
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-sun-300 mb-2.5">Real people in your corner</p>
          <div className="space-y-2">
            {[
              ['Personal portfolio review', 'A real mentor checks your actual holdings.'],
              ['Private Telegram channel', 'Members-only insights & alerts to your phone.'],
              ['A verified badge', 'Stand out as a Premium member in the community.'],
            ].map(([t, d]) => <Feature key={t} title={t} desc={d} />)}
          </div>
        </div>

        <div className="bg-cream/[0.05] border border-cream/10 rounded-2xl p-4 sm:p-5">
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] text-sun-300 mb-2.5">Your edge, on autopilot</p>
          <div className="space-y-2">
            {[
              ['Weekly market digest', 'A clear recap of what moved, every week.'],
              ['Answers in your language', 'English, Pidgin, Yorùbá, Hausa & Igbo.'],
              ['PDF reports & unlimited watchlist', 'Download any analysis · track & alert on everything.'],
            ].map(([t, d]) => <Feature key={t} title={t} desc={d} />)}
          </div>
        </div>
      </div>

      {/* Optional price + CTA footer (dashboard upsell) */}
      {showPricing && (
        <div className="relative z-10 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-cream/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="font-display text-xl sm:text-3xl font-black">
              {d.mo}<span className="text-cream/50 text-sm sm:text-base font-bold"> / month</span>
            </p>
            <p className="text-[11px] sm:text-sm text-cream/60 break-words">
              or {d.yr}/year — <span className="text-sun-300 font-bold">save 20%</span> · pay by card, transfer,
              USSD or Opay · cancel anytime
            </p>
          </div>
          <Link
            to={ctaTo}
            className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-7 sm:py-4 rounded-full bg-sun-300 text-ink font-black text-sm sm:text-base hover:bg-sun-400 hover:scale-[1.02] active:scale-[0.98] transition shine"
          >
            {ctaLabel} <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </motion.div>
  );
}

// A perk as a tactile card: icon, title, plain-English benefit, and a concrete
// "this is what you'd actually get" example pill.
function Perk({ icon: Icon, title, children, tip, index = 0 }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
      className="group bg-cream/[0.06] border border-cream/10 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 min-w-0 transition hover:border-sun-300/40 hover:bg-cream/[0.08]"
    >
      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-sun-300 text-ink grid place-items-center mb-2 sm:mb-3 transition group-hover:scale-105">
        <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2.3} />
      </div>
      <p className="font-display font-bold text-sm sm:text-base leading-tight mb-0.5 sm:mb-1 break-words">{title}</p>
      <p className="text-[12px] sm:text-sm text-cream/65 break-words leading-snug">{children}</p>
      {tip && (
        <p className="mt-2 sm:mt-3 inline-block text-[10px] sm:text-[11px] font-semibold text-sun-300 bg-sun-300/10 rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 break-words max-w-full">
          {tip}
        </p>
      )}
    </motion.div>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="flex items-start gap-2">
      <Check size={15} className="text-sun-300 shrink-0 mt-0.5" />
      <p className="text-[12.5px] sm:text-sm leading-snug">
        <span className="font-semibold text-cream">{title}</span>
        <span className="text-cream/60"> — {desc}</span>
      </p>
    </div>
  );
}
