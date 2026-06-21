import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Check, Sparkles, Loader2, Brain, BarChart3, Users, FileText,
  Send, ClipboardCheck, Activity, Star, Shield, Award, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import PremiumValue from '../components/PremiumValue';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ------------------------------------------------------------------ *
 * Pricing data — the single source of truth for the offer.
 * Premium: ₦3,500/mo · ₦33,000/yr  |  $35/mo · $336/yr  (annual = 20% off)
 * Free: ₦0. Certificate is a separate one-time ₦4,000 / $15 purchase.
 * ------------------------------------------------------------------ */
const PRICING = {
  NGN: {
    symbol: '₦',
    monthly:     { total: '3,500',  perMonth: '3,500' },
    annual:      { total: '33,000', perMonth: '2,750' },
    certificate: '4,000',
  },
  USD: {
    symbol: '$',
    monthly:     { total: '10', perMonth: '10' },
    annual:      { total: '96', perMonth: '8' },
    certificate: '15',
  },
};

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get('return_to');
  const previewCountry = params.get('country'); // optional: preview a region's pricing, e.g. /pricing?country=US

  const [currency, setCurrency] = useState('NGN');     // 'NGN' | 'USD' — decided by location
  const [interval, setInterval] = useState('monthly'); // 'monthly' | 'annual'
  const [region, setRegion] = useState(null);          // detected country name, for the note
  const [planInfo, setPlanInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRenew, setAutoRenew] = useState(false);   // opt-in at checkout (card only)

  // Currency follows the visitor's location (server-side IP geolocation).
  // Nigeria -> NGN. Every other country -> USD. No manual switch.
  useEffect(() => {
    api.get(previewCountry ? `/geo?country=${previewCountry}` : '/geo')
      .then(({ data }) => {
        if (data?.success) {
          setCurrency(data.country === 'NG' ? 'NGN' : 'USD');
          setRegion(data.country_name || (data.country === 'NG' ? 'Nigeria' : 'your region'));
        }
      })
      .catch(() => {});
    if (user) {
      api.get('/subscriptions').then(({ data }) => data?.success && setPlanInfo(data)).catch(() => {});
    }
  }, [user, previewCountry]);

  const c = PRICING[currency];
  const sym = c.symbol;
  const price = c[interval];
  const isPremium = user?.plan === 'premium';

  // Pay-first: charge for the chosen period via Paystack (card OR transfer OR
  // USSD OR Opay). No trial, no auto-renew — access lasts the period paid for.
  const subscribe = async () => {
    if (!user) {
      toast('Create a free account first', { icon: '👋' });
      navigate(`/signup?return_to=${encodeURIComponent('/pricing')}`);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/subscriptions/start', {
        interval,
        currency,
        auto_renew: autoRenew,
        return_to: returnTo,
      });
      if (data?.success && data.authorization_url) {
        toast.success('Redirecting to secure checkout…');
        window.location.href = data.authorization_url;
      } else if (data?.success && data.redirect_url) {
        // Demo mode — access granted without payment.
        toast('Demo mode — Premium activated', { icon: '🧪' });
        window.location.href = data.redirect_url;
      } else {
        toast.error(data?.message || 'Could not start checkout.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout is unavailable right now — try again soon.');
    } finally {
      setLoading(false);
    }
  };

  // Existing members: turn card auto-renew on/off.
  const toggleAutoRenew = async () => {
    const enable = !planInfo?.auto_renew;
    try {
      const { data } = await api.post('/subscriptions/auto-renew', { enabled: enable });
      if (data.success) {
        toast.success(data.message || (enable ? 'Auto-renew on' : 'Auto-renew off'));
        const { data: sub } = await api.get('/subscriptions');
        if (sub?.success) setPlanInfo(sub);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update auto-renew');
    }
  };

  return (
    <Layout>
      <div className="overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">

          {/* ---------- Header ---------- */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 min-w-0"
          >
            <div>
              {/* Eyebrow chip */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-ink/[0.08] text-coral-500 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] mb-4 sm:mb-5 shadow-sm">
                <Sparkles size={12} /> Simple, honest pricing
              </div>

              <h1 className="font-display text-[1.8rem] leading-[1.08] sm:text-[2.7rem] lg:text-[3.4rem] sm:leading-[1.02] font-black mb-3 sm:mb-4 break-words">
                Free to learn.<br />
                Premium to{' '}
                <span className="relative inline-block whitespace-nowrap">
                  <span className="relative z-10 italic">stop guessing.</span>
                  <span
                    aria-hidden
                    className="absolute left-[-3px] right-[-3px] bottom-[0.08em] h-[0.4em] bg-sun-300 -rotate-1 rounded-[2px] z-0"
                  />
                </span>
              </h1>

              <p className="text-ink/65 text-[13px] sm:text-lg px-1 sm:px-2 break-words leading-relaxed">
                The whole course is <strong className="text-ink font-bold">free, forever</strong>. Premium puts AI
                on the analysis and a real mentor in your corner — so you act on facts, not feelings, and finally
                feel <em className="text-ink not-italic font-semibold">sure</em> about where your money goes.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-1.5 mt-4 sm:mt-5 text-[11px] sm:text-xs font-semibold text-ink/55">
                <span className="inline-flex items-center gap-1"><Check size={13} className="text-bull-600 shrink-0" /> Free forever</span>
                <span className="inline-flex items-center gap-1"><Check size={13} className="text-bull-600 shrink-0" /> No card to start</span>
                <span className="inline-flex items-center gap-1"><Check size={13} className="text-bull-600 shrink-0" /> Cancel Premium anytime</span>
              </div>
            </div>
          </motion.div>

          {/* ---------- Controls: billing interval (currency is automatic by location) ---------- */}
          <div className="flex flex-col items-center gap-3 mb-7 sm:mb-9">
            {/* Billing interval */}
            <div className="inline-flex items-center gap-2">
              <div className="inline-flex p-1 rounded-full bg-cream-warm border border-ink/10">
                {[['monthly', 'Monthly'], ['annual', 'Annual']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setInterval(val)}
                    className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition ${
                      interval === val ? 'bg-ink text-cream' : 'text-ink/55 hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="chip bg-bull-100 text-bull-700 text-[10px] sm:text-xs">Save 20% yearly</span>
            </div>

            {/* Detected region — currency follows location, no switch */}
            {region && (
              <p className="text-[10px] sm:text-xs text-ink/45 break-words text-center px-2">
                Prices shown in {currency === 'NGN' ? 'Naira (₦)' : 'US Dollars ($)'} based on your location ({region}).
              </p>
            )}
          </div>

          {/* ---------- Plan cards ---------- */}
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto items-start">

            {/* FREE */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="card-soft p-5 sm:p-8 min-w-0"
            >
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-ink/50">Free</p>
              <p className="font-display text-2xl sm:text-4xl font-black mt-1">{sym}0</p>
              <p className="text-xs sm:text-sm text-ink/55 mb-4 sm:mb-5 break-words">
                Everything you need to actually learn the market.
              </p>
              <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
                <Feature>All 6 courses &amp; lessons, with diagrams</Feature>
                <Feature>Quizzes, XP &amp; leaderboard</Feature>
                <Feature>Paper-trading simulator ({sym === '₦' ? '$100k' : '$100k'} virtual)</Feature>
                <Feature>Full stock metrics, charts &amp; peer comparison</Feature>
                <Feature>Watchlist up to 5 stocks</Feature>
                <Feature>Community forum</Feature>
              </ul>

              <div className="mt-4 sm:mt-5 p-3 rounded-2xl bg-cream-warm flex items-start gap-2 min-w-0">
                <Award size={16} className="text-sun-600 shrink-0 mt-0.5" />
                <p className="text-[11px] sm:text-xs text-ink/65 break-words">
                  Course certificate available as a one-time <strong className="text-ink">{sym}{c.certificate}</strong> purchase —
                  not a subscription, and not required.
                </p>
              </div>

              <button
                disabled
                className="mt-5 sm:mt-6 w-full py-2.5 sm:py-3 rounded-full bg-ink/5 text-ink/40 font-semibold text-xs sm:text-sm cursor-default"
              >
                {isPremium ? 'Included in your account' : "You're on the Free plan"}
              </button>
            </motion.div>

            {/* PREMIUM */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="card-soft p-5 sm:p-8 ring-2 sm:ring-4 ring-ink relative overflow-hidden min-w-0"
            >
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-coral-400 to-sun-400 text-ink text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-bl-2xl">
                ⭐ Most popular
              </div>

              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-coral-500">Premium</p>

              <div className="flex items-baseline gap-2 mt-1 flex-wrap min-w-0">
                <p className="font-display text-2xl sm:text-4xl font-black break-words">
                  {sym}{price.total}
                </p>
                <p className="text-xs sm:text-sm text-ink/50 font-semibold">
                  / {interval === 'annual' ? 'year' : 'month'}
                </p>
              </div>
              <p className="text-[11px] sm:text-xs text-ink/55 mt-1 break-words">
                {interval === 'annual'
                  ? `Billed yearly — works out to ${sym}${price.perMonth}/month. Save 20%.`
                  : `Billed monthly. Switch to yearly to save 20%.`}
              </p>
              <p className="text-xs sm:text-sm text-ink/55 mt-3 mb-4 sm:mb-5 break-words">
                For people who want help researching — not hype.
              </p>

              <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
                <Feature highlight>Everything in Free</Feature>
                <Feature highlight icon={Sparkles}>
                  Plain-English AI verdict on any stock — in English, Pidgin, Yorùbá, Hausa or Igbo
                </Feature>
                <Feature highlight icon={Brain}>
                  AI stock comparison — two tickers, side-by-side fundamentals, risk &amp; valuation
                </Feature>
                <Feature highlight icon={BarChart3}>
                  AI portfolio analysis — concentration, sector exposure &amp; diversification gaps
                </Feature>
                <Feature highlight icon={Send}>
                  Private premium Telegram channel
                </Feature>
                <Feature highlight icon={ClipboardCheck}>
                  One personal portfolio review per quarter, answered by a human
                </Feature>
                <Feature highlight icon={FileText}>
                  Full analysis report — every metric, peer comparison &amp; PDF export
                </Feature>
                <Feature highlight icon={Star}>Unlimited watchlist</Feature>
                <Feature highlight icon={Activity}>Unlimited price alerts</Feature>
              </ul>

              {isPremium ? (
                <div className="mt-5 sm:mt-6 space-y-2">
                  <div className="w-full py-2.5 sm:py-3 rounded-full bg-bull-100 text-bull-700 text-center font-bold text-xs sm:text-sm">
                    ⭐ You're a Premium member
                  </div>
                  {planInfo?.access_ends_at && (
                    <p className="text-[10px] sm:text-xs text-ink/50 text-center break-words">
                      Access until {new Date(planInfo.access_ends_at).toLocaleDateString()}
                    </p>
                  )}
                  {/* Auto-renew management */}
                  {planInfo?.auto_renew ? (
                    <div className="text-center">
                      <p className="text-[10px] sm:text-xs text-bull-700 font-semibold">
                        🔁 Auto-renew ON{planInfo.card_last4 ? ` · card ···· ${planInfo.card_last4}` : ''}
                      </p>
                      <button onClick={toggleAutoRenew} className="text-[10px] sm:text-xs text-ink/45 hover:text-bear-500 mt-0.5">
                        Turn off auto-renew
                      </button>
                    </div>
                  ) : planInfo?.can_auto_renew ? (
                    <button onClick={toggleAutoRenew} className="w-full text-[10px] sm:text-xs font-bold text-bull-600 hover:underline text-center">
                      Turn on auto-renew (card ···· {planInfo.card_last4})
                    </button>
                  ) : (
                    <p className="text-[10px] sm:text-xs text-ink/40 text-center break-words">
                      Pay by card next time to enable auto-renew.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={subscribe}
                    disabled={loading}
                    className="mt-5 sm:mt-6 w-full inline-flex items-center justify-center gap-2 py-3 sm:py-4 rounded-full bg-ink text-cream font-bold text-sm sm:text-base hover:bg-ink-soft transition shine disabled:opacity-60"
                  >
                    {loading
                      ? <><Loader2 size={16} className="animate-spin" /> Starting…</>
                      : <><Sparkles size={16} /> Get Premium — {sym}{price.total}/{interval === 'annual' ? 'yr' : 'mo'}</>}
                  </button>
                  <label className="flex items-center justify-center gap-2 mt-3 text-[11px] sm:text-xs text-ink/60 cursor-pointer break-words">
                    <input
                      type="checkbox"
                      checked={autoRenew}
                      onChange={(e) => setAutoRenew(e.target.checked)}
                      className="accent-ink w-3.5 h-3.5 shrink-0"
                    />
                    Auto-renew each {interval === 'annual' ? 'year' : 'month'} (card payments only)
                  </label>
                  <p className="text-[10px] sm:text-xs text-ink/45 text-center mt-2 break-words">
                    One payment for 1 {interval === 'annual' ? 'year' : 'month'}. Pay by card, bank transfer,
                    USSD or Opay. {autoRenew
                      ? 'If you pay by card, it renews automatically — cancel anytime.'
                      : "Without auto-renew it simply ends when the period is up."}
                  </p>
                </>
              )}
            </motion.div>
          </div>

          {/* ---------- What Premium actually does for you ---------- */}
          <div className="max-w-5xl mx-auto mt-10 sm:mt-14">
            <PremiumValue
              currency={currency}
              eyebrow="What you get"
              headline={<>Everything Premium <span className="italic text-sun-300">does for you.</span></>}
              subline={<>Here's exactly what your subscription unlocks — and what the AI does for you in seconds, in plain English.</>}
            />
          </div>

          {/* ---------- Trust strip ---------- */}
          <div className="max-w-3xl mx-auto mt-8 sm:mt-12 grid grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="p-3 sm:p-5 bg-cream-warm rounded-2xl min-w-0">
              <Shield className="mx-auto mb-1 sm:mb-2 text-bull-600" size={20} />
              <p className="text-xs sm:text-sm font-bold">Secure</p>
              <p className="text-[10px] sm:text-xs text-ink/55 break-words">Paystack-secured payment</p>
            </div>
            <div className="p-3 sm:p-5 bg-cream-warm rounded-2xl min-w-0">
              <Check className="mx-auto mb-1 sm:mb-2 text-coral-500" size={20} />
              <p className="text-xs sm:text-sm font-bold">Pay your way</p>
              <p className="text-[10px] sm:text-xs text-ink/55 break-words">Card · transfer · USSD · Opay</p>
            </div>
            <div className="p-3 sm:p-5 bg-cream-warm rounded-2xl min-w-0">
              <Sparkles className="mx-auto mb-1 sm:mb-2 text-sun-500" size={20} />
              <p className="text-xs sm:text-sm font-bold">You're in control</p>
              <p className="text-[10px] sm:text-xs text-ink/55 break-words">Auto-renew optional · cancel anytime</p>
            </div>
          </div>

          {/* ---------- FAQ ---------- */}
          <div className="max-w-2xl mx-auto mt-12 sm:mt-16 min-w-0">
            <h2 className="font-display text-2xl sm:text-3xl font-black text-center mb-5 sm:mb-7">
              Questions, answered honestly
            </h2>
            <div className="space-y-2.5">
              {FAQ.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>

          {/* ---------- Disclaimer ---------- */}
          <p className="text-[10px] sm:text-xs text-ink/40 mt-10 sm:mt-12 text-center max-w-xl mx-auto leading-relaxed px-2 break-words">
            StockAcademia provides educational analysis and research tools. The AI features are
            for learning — they are not financial advice and not a buy or sell recommendation.
            Investment decisions are yours to make.
          </p>
        </div>
      </div>
    </Layout>
  );
}

/* ------------------------------------------------------------------ */

const FAQ = [
  {
    q: 'How do I pay? Do I need a card?',
    a: 'No card required. Pay however you like through Paystack — debit card, bank transfer, USSD, Opay or mobile money. Whatever you trust.',
  },
  {
    q: 'Does it auto-renew? Will I be charged again automatically?',
    a: 'Only if you choose to. By default there\'s no auto-renew — you pay once for a month or a year and it simply stops at the end. If you tick "auto-renew" and pay by card, it renews itself each period and you can turn it off anytime from this page. Bank transfer, USSD and Opay never auto-renew.',
  },
  {
    q: 'What happens when my Premium ends?',
    a: 'You keep your account, all your course progress, and your certificate. Only the premium tools — AI stock comparison, AI portfolio analysis, the Telegram channel, and portfolio reviews — pause until you renew.',
  },
  {
    q: 'Is the certificate included in Premium?',
    a: 'No. The course and its certificate are separate from Premium. The course is free; the certificate is a one-time purchase (₦4,000 / $15). Premium is for the AI tools, Telegram channel, and portfolio review — you don\'t need it to finish the course or get certified.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Premium unlocks digital tools the moment you pay, so payments aren\'t refundable. But since there\'s no auto-renew, you\'ll never be charged unexpectedly — you only ever pay for a period you chose.',
  },
  {
    q: 'Are the AI features financial advice?',
    a: 'No. They explain fundamentals, risk, valuation, and portfolio structure in plain language to help you learn. Every result carries a disclaimer: this is educational analysis, not a buy/sell recommendation.',
  },
  {
    q: 'Monthly or yearly — what\'s the difference?',
    a: 'Same features. Yearly costs about 20% less than paying month-to-month. Pick whichever suits you each time you pay.',
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-soft overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 text-left px-4 sm:px-5 py-3.5 sm:py-4 min-w-0"
      >
        <span className="font-semibold text-sm sm:text-base break-words min-w-0">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-ink/50 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="px-4 sm:px-5 pb-4 -mt-1 text-xs sm:text-sm text-ink/70 leading-relaxed break-words">
          {a}
        </p>
      )}
    </div>
  );
}

function Feature({ children, highlight, icon: Icon }) {
  return (
    <li className="flex items-start gap-2 sm:gap-2.5 min-w-0">
      <div className={`mt-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full grid place-items-center shrink-0 ${
        highlight ? 'bg-ink text-sun-300' : 'bg-bull-100 text-bull-600'
      }`}>
        {Icon ? <Icon size={10} /> : <Check size={10} strokeWidth={3} />}
      </div>
      <span className={`break-words min-w-0 ${highlight ? 'font-medium' : 'text-ink/75'}`}>{children}</span>
    </li>
  );
}
