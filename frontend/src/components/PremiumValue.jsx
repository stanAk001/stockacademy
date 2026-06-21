import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, BarChart3, Newspaper, GraduationCap, Sparkles, Check, ArrowRight } from 'lucide-react';
import api from '../services/api';
import LiveDemo from './LiveDemo';

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
      className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] bg-ink text-cream p-4 sm:p-7 lg:p-9 grain-overlay"
    >
      {/* Header */}
      <div className="relative max-w-2xl mb-5 sm:mb-7">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cream/10 text-sun-300 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] mb-3 sm:mb-4">
          <Sparkles size={11} /> {eyebrow}
        </div>
        <h2 className="font-display text-[1.35rem] leading-[1.1] sm:text-3xl lg:text-[2.6rem] sm:leading-[1.04] font-black mb-2 sm:mb-3 break-words">
          {hd}
        </h2>
        <p className="text-cream/70 text-[12.5px] sm:text-base break-words leading-relaxed">{sub}</p>
      </div>

      <div className="relative grid lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-stretch">
        {/* LEFT: the 4 hero AI tools (same four the live demo cycles through) */}
        <div className="lg:col-span-7 grid sm:grid-cols-2 gap-2.5 sm:gap-4">
          <Perk icon={Brain} title="Compare any two stocks" tip={`Ask: "${a.sym} or ${b.sym}?"`}>
            A clear side-by-side verdict on growth, risk and value — in seconds, no jargon.
          </Perk>
          <Perk icon={BarChart3} title="Analyze your portfolio" tip={`e.g. "38% in one stock — trim it"`}>
            Spot over-exposure to a stock or sector, and exactly what to rebalance.
          </Perk>
          <Perk icon={Newspaper} title="Scan the news for you" tip="31 articles → the 4 that matter">
            Thirty days of headlines on any stock, cut down to what actually moves the price.
          </Perk>
          <Perk icon={GraduationCap} title="An AI tutor in every lesson" tip={`Ask: "what is a P/E?"`}>
            Stuck on a concept? Ask and get it explained simply — in your language too.
          </Perk>
        </div>

        {/* RIGHT: self-playing live demo of the tools (preview = conversion cue) */}
        <div className="lg:col-span-5 min-w-0">
          <LiveDemo variant="onDark" preview />
        </div>
      </div>

      {/* Everything else Premium unlocks — the full picture, grouped */}
      <div className="relative grid sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
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
        <div className="relative mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-cream/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
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
function Perk({ icon: Icon, title, children, tip }) {
  return (
    <div className="group bg-cream/[0.06] border border-cream/10 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 min-w-0 transition hover:border-sun-300/40 hover:-translate-y-0.5">
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
    </div>
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
