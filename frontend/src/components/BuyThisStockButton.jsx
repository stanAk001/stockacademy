import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, X, Copy, Check, Smartphone, Apple, ShieldCheck,
  ExternalLink, Loader2, Globe,
} from 'lucide-react';
import api from '../services/api';

// Bamboo referral — for NIGERIAN users. It's an app: copy the code → get the
// app → enter the code at signup. This is the only monetised path (my code).
const BAMBOO = {
  code: 'akeem898606',
  android: 'https://play.google.com/store/apps/details?id=com.invest.bamboo&referrer=akeem898606',
  ios: 'https://apps.apple.com/app/id1474833078',
};

// For users OUTSIDE Nigeria we can't earn a commission, but we can still point
// them at well-known, regulated brokers in their region. NOT affiliate links —
// plain homepages, shown to be genuinely helpful.
const US_BROKERS = [
  { name: 'Robinhood', blurb: 'Commission-free stocks & ETFs, simple app', url: 'https://robinhood.com' },
  { name: 'Fidelity', blurb: 'Trusted full-service broker, $0 commissions', url: 'https://www.fidelity.com' },
  { name: 'Charles Schwab', blurb: 'Long-established and beginner-friendly', url: 'https://www.schwab.com' },
  { name: 'Webull', blurb: 'Active-trader app with rich charting', url: 'https://www.webull.com' },
];
const INTL_BROKERS = [
  { name: 'Interactive Brokers', blurb: 'Global access to 150+ markets', url: 'https://www.interactivebrokers.com' },
  { name: 'eToro', blurb: 'Stocks & crypto, available in many countries', url: 'https://www.etoro.com' },
  { name: 'Trading 212', blurb: 'Commission-free, popular across UK & Europe', url: 'https://www.trading212.com' },
];

export default function BuyThisStockButton({ symbol, className = '' }) {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState(null); // null until /geo resolves
  const [forceView, setForceView] = useState(null); // 'NG' | 'OTHER' manual override
  const [copied, setCopied] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    if (country) return; // already detected this session
    try {
      const { data } = await api.get('/geo');
      setCountry((data?.country || 'NG').toUpperCase());
    } catch {
      setCountry('NG'); // matches the backend's home-market fallback
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(BAMBOO.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — the code is shown on screen anyway */ }
  };

  // Which view to show: manual override wins, else Nigeria → Bamboo, else local brokers.
  const view = forceView || (country === 'NG' ? 'NG' : 'OTHER');
  const regionBrokers = country === 'US' ? US_BROKERS : INTL_BROKERS;

  return (
    <>
      <button
        onClick={handleOpen}
        className={`btn-primary bg-bull-600 hover:bg-bull-700 text-white ${className}`}
      >
        <ShoppingCart size={16} /> Buy {symbol} for real
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ink/70 grid place-items-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-cream rounded-3xl max-w-md w-full overflow-hidden max-h-[92vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="bg-ink text-cream p-6 relative">
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-cream/10 rounded-full text-cream/70"
                >
                  <X size={20} />
                </button>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-sun-300">Ready to own it?</p>
                <h2 className="font-display text-2xl sm:text-3xl font-black leading-tight mt-1">
                  {view === 'NG' ? (
                    <>Buy {symbol} on <span className="text-sun-300">Bamboo</span></>
                  ) : (
                    <>Buy {symbol} for <span className="text-sun-300">real</span></>
                  )}
                </h2>
                <p className="text-cream/70 text-sm leading-relaxed mt-2">
                  {view === 'NG'
                    ? <>You've done the homework here — now buy the real thing. Bamboo lets you invest in US <span className="text-cream">and</span> Nigerian stocks straight from your phone, in minutes.</>
                    : <>You've done the homework here — these are trusted, regulated brokers to actually buy {symbol}. Open an account, fund it, and you're investing for real.</>}
                </p>
              </div>

              {/* Body */}
              <div className="p-6">
                {!country ? (
                  <div className="py-10 grid place-items-center text-ink/40">
                    <Loader2 size={28} className="animate-spin" />
                  </div>
                ) : view === 'NG' ? (
                  /* ---------- Nigeria: Bamboo (monetised) ---------- */
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ink/45 mb-2">
                        Step 1 · Use this code at signup
                      </p>
                      <button
                        onClick={copyCode}
                        className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl border-2 border-dashed border-ink/15 hover:border-ink/40 hover:bg-cream-warm transition"
                      >
                        <span className="font-display text-2xl font-black tracking-wide">{BAMBOO.code}</span>
                        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-bull-600 shrink-0">
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                          {copied ? 'Copied' : 'Copy'}
                        </span>
                      </button>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ink/45 mb-2">Step 2 · Get the app</p>
                      <div className="grid grid-cols-2 gap-3">
                        <a href={BAMBOO.android} target="_blank" rel="noopener noreferrer sponsored"
                          className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-ink text-cream font-bold hover:bg-ink-soft transition">
                          <Smartphone size={18} /> Android
                        </a>
                        <a href={BAMBOO.ios} target="_blank" rel="noopener noreferrer sponsored"
                          className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-ink text-cream font-bold hover:bg-ink-soft transition">
                          <Apple size={18} /> iPhone
                        </a>
                      </div>
                      <p className="text-xs text-ink/45 mt-2 leading-relaxed">
                        On iPhone, paste the code <strong className="text-ink/70">{BAMBOO.code}</strong> during signup —
                        the App Store can't carry it automatically.
                      </p>
                    </div>

                    <div className="p-4 bg-sun-100 rounded-2xl flex gap-3">
                      <ShieldCheck size={18} className="text-sun-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-ink/70 leading-relaxed">
                        This is where the learning pays off. StockAcademia taught you the <span className="italic">why</span> —
                        Bamboo handles the <span className="italic">how</span>. The decision is always yours, so invest only
                        what you can comfortably afford.
                      </p>
                    </div>

                    <button onClick={() => setForceView('OTHER')}
                      className="w-full text-center text-sm font-semibold text-ink/55 hover:text-ink inline-flex items-center justify-center gap-1.5">
                      <Globe size={14} /> Not in Nigeria? See brokers near you
                    </button>
                  </div>
                ) : (
                  /* ---------- Outside Nigeria: helpful broker list (not affiliated) ---------- */
                  <div className="space-y-3">
                    {regionBrokers.map((b) => (
                      <a
                        key={b.name}
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 rounded-2xl border-2 border-ink/5 hover:border-ink hover:bg-cream-warm transition group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-ink text-cream grid place-items-center font-display font-black text-lg shrink-0">
                          {b.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-bold">{b.name}</p>
                          <p className="text-xs text-ink/55 truncate">{b.blurb}</p>
                        </div>
                        <ExternalLink size={16} className="text-ink/30 group-hover:text-ink group-hover:translate-x-0.5 transition shrink-0" />
                      </a>
                    ))}

                    <div className="p-4 bg-sun-100 rounded-2xl flex gap-3 mt-1">
                      <ShieldCheck size={18} className="text-sun-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-ink/70 leading-relaxed">
                        Pick one that's regulated where you live, fund it, and the learning pays off. StockAcademia
                        taught you the <span className="italic">why</span> — these handle the <span className="italic">how</span>.
                        The call is always yours.
                      </p>
                    </div>

                    <button onClick={() => setForceView('NG')}
                      className="w-full text-center text-sm font-semibold text-ink/55 hover:text-ink inline-flex items-center justify-center gap-1.5 pt-1">
                      <Globe size={14} /> In Nigeria? Use Bamboo instead
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
