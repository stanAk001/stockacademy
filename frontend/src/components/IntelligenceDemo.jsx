import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Telescope, Crosshair, BellRing, Compass, Lock, Sparkles, Newspaper, TrendingUp, Clock } from 'lucide-react';

// ============================================================
// IntelligenceDemo — the homepage hero demo.
//
// Plays the product's loop: Find → Plan → Watch → My Market. Self-playing,
// no API calls. It's an ILLUSTRATION and says so: plans are described the way
// the engine builds them (from chart structure), not with invented prices, so
// nothing here reads as live market data. Clean dark screen, no glows.
// ============================================================

const STEP_MS = 6200;   // how long each step stays after its prompt is typed
const TYPE_MS = 38;

const STEPS = [
  {
    key: 'find', label: 'Find', icon: Telescope, tool: 'AI Stock Scout', free: true,
    prompt: "I'm a swing trader · US stocks",
    kind: 'rows',
    rows: [
      { sym: 'AAPL', tag: 'Pullback', text: 'Easing back to its 20-day average in an uptrend' },
      { sym: 'MA', tag: 'Trend', text: 'Higher highs, momentum still rising' },
      { sym: 'XOM', tag: 'Pullback', text: 'Holding support after a strong run' },
    ],
    note: '3 setups match your profile, ranked by setup quality.',
    cta: 'Try the Scout free every month',
  },
  {
    key: 'plan', label: 'Plan', icon: Crosshair, tool: 'Entry plan', free: false,
    prompt: 'Plan the AAPL pullback',
    kind: 'plan',
    plan: [
      ['Entry zone', 'Near the 20-day average'],
      ['Confirm', 'Daily close above it, volume rising'],
      ['Stop', 'Below the last swing low'],
      ['Targets', 'Recent high, then next resistance'],
    ],
    timeframes: [['W', true], ['D', true], ['4H', true], ['1H', false]],
    status: 'Waiting for 1H confirmation',
    cta: 'Full entry plans come with Premium',
  },
  {
    key: 'watch', label: 'Watch', icon: BellRing, tool: 'Monitoring & alerts', free: false,
    prompt: 'Watching 3 setups · 2 positions · 1 thesis',
    kind: 'alerts',
    alerts: [
      { icon: Clock, sym: 'AAPL', text: 'Approaching your entry zone', when: '09:42', tone: 'text-sun-300' },
      { icon: TrendingUp, sym: 'AAPL', text: 'Confirmation met. Setup is active', when: '15:10', tone: 'text-bull-400' },
      { icon: Newspaper, sym: 'GTCO', text: 'News: half-year results released', when: 'Tue', tone: 'text-coral-300' },
    ],
    cta: 'Premium watches it and alerts you',
  },
  {
    key: 'market', label: 'My Market', icon: Compass, tool: 'My Market', free: false,
    prompt: 'What changed since my last visit?',
    kind: 'stats',
    stats: [
      ['2', 'setups approaching entry'],
      ['1', 'position strengthening'],
      ['1', 'thesis change'],
      ['3', 'news items on your stocks'],
    ],
    cta: 'Your daily briefing, with Premium',
  },
];

// Reveal children one after another once the prompt is "answered".
function Reveal({ i, reduce, children, className = '' }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : i * 0.35, duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function IntelligenceDemo() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState('');
  const [ready, setReady] = useState(false);
  const s = STEPS[step];
  const total = s.prompt.length * TYPE_MS + STEP_MS;

  useEffect(() => {
    if (reduce) { setTyped(s.prompt); setReady(true); return undefined; }
    setTyped('');
    setReady(false);
    let i = 0;
    const typeId = setInterval(() => {
      i += 1;
      setTyped(s.prompt.slice(0, i));
      if (i >= s.prompt.length) clearInterval(typeId);
    }, TYPE_MS);
    const typing = s.prompt.length * TYPE_MS;
    const readyId = setTimeout(() => setReady(true), typing + 300);
    const nextId = setTimeout(() => setStep((p) => (p + 1) % STEPS.length), typing + STEP_MS);
    return () => { clearInterval(typeId); clearTimeout(readyId); clearTimeout(nextId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, reduce]);

  const Icon = s.icon;

  return (
    <div className="rounded-2xl bg-ink text-cream p-4 sm:p-5 overflow-hidden">
      {/* header: live indicator + the four steps */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-sun-300">
          <span className="relative flex h-2 w-2">
            {!reduce && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bull-400 opacity-75" />}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-bull-400" />
          </span>
          How it works
        </span>
        <div className="flex gap-1" role="tablist" aria-label="Demo steps">
          {STEPS.map((st, i) => (
            <button
              key={st.key}
              type="button"
              role="tab"
              aria-selected={i === step}
              onClick={() => setStep(i)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                i === step ? 'bg-sun-300 text-ink' : 'bg-cream/10 text-cream/50 hover:bg-cream/20 hover:text-cream/80'
              }`}
            >
              <span className="opacity-60 mr-0.5">{i + 1}</span> {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* step progress */}
      <div className="h-[2px] bg-cream/10 rounded-full mt-3 overflow-hidden">
        {!reduce && (
          <motion.div
            key={step}
            className="h-full bg-sun-300"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: total / 1000, ease: 'linear' }}
          />
        )}
      </div>

      {/* active tool */}
      <div className="flex items-center justify-between gap-2 mt-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cream/10 grid place-items-center shrink-0">
            <Icon size={15} className="text-sun-300" />
          </div>
          <p className="font-display font-bold text-sm truncate">{s.tool}</p>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
          s.free ? 'bg-bull-400/15 text-bull-400' : 'bg-sun-300/15 text-sun-300'
        }`}>{s.free ? 'Free to try' : 'Premium'}</span>
      </div>

      {/* prompt (typing) */}
      <div className="font-mono text-[12px] sm:text-[13px] bg-cream/[0.06] rounded-lg px-3 py-2 mb-3 min-h-[2.5rem] flex items-center break-words">
        <span className="text-sun-300 mr-1.5 shrink-0">›</span>
        <span className="text-cream/90">{typed}</span>
        {!ready && <span className="ml-0.5 inline-block w-[2px] h-4 bg-cream/70 animate-pulse" />}
      </div>

      {/* result */}
      <div className="min-h-[11.5rem]">
        {ready && s.kind === 'rows' && (
          <div className="space-y-2">
            {s.rows.map((r, i) => (
              <Reveal key={`${step}-${r.sym}`} i={i} reduce={reduce} className="flex items-start gap-2.5 rounded-lg bg-cream/[0.04] px-3 py-2">
                <span className="font-mono font-bold text-[13px] w-11 shrink-0">{r.sym}</span>
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-wider text-sun-300">{r.tag}</span>
                  <p className="text-[12.5px] text-cream/75 leading-snug">{r.text}</p>
                </div>
              </Reveal>
            ))}
            <Reveal i={s.rows.length} reduce={reduce}>
              <p className="text-[12.5px] sm:text-sm text-sun-300 font-semibold pt-1">→ {s.note}</p>
            </Reveal>
          </div>
        )}

        {ready && s.kind === 'plan' && (
          <div>
            <div className="rounded-lg bg-cream/[0.04] divide-y divide-cream/[0.06]">
              {s.plan.map(([k, v], i) => (
                <Reveal key={`${step}-${k}`} i={i} reduce={reduce} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cream/45 shrink-0">{k}</span>
                  <span className="text-[12.5px] text-cream/85 text-right leading-snug">{v}</span>
                </Reveal>
              ))}
            </div>
            <Reveal i={s.plan.length} reduce={reduce} className="flex items-center justify-between gap-2 mt-2.5 flex-wrap">
              <div className="flex gap-1">
                {s.timeframes.map(([tf, ok]) => (
                  <span key={tf} className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${ok ? 'bg-bull-400/15 text-bull-400' : 'bg-sun-300/15 text-sun-300'}`}>
                    {tf} {ok ? '✓' : '…'}
                  </span>
                ))}
              </div>
              <span className="text-[11px] font-semibold text-sun-300">{s.status}</span>
            </Reveal>
          </div>
        )}

        {ready && s.kind === 'alerts' && (
          <div className="space-y-2">
            {s.alerts.map((a, i) => {
              const AIcon = a.icon;
              return (
                <Reveal key={`${step}-${i}`} i={i * 1.6} reduce={reduce} className="flex items-center gap-2.5 rounded-xl bg-cream/[0.06] ring-1 ring-cream/10 px-3 py-2">
                  <div className="w-7 h-7 rounded-lg bg-cream/10 grid place-items-center shrink-0">
                    <AIcon size={13} className={a.tone} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-cream/45">StockAcademia · {a.sym}</p>
                    <p className="text-[12.5px] text-cream/90 leading-snug">{a.text}</p>
                  </div>
                  <span className="text-[10px] text-cream/40 shrink-0">{a.when}</span>
                </Reveal>
              );
            })}
          </div>
        )}

        {ready && s.kind === 'stats' && (
          <div className="grid grid-cols-2 gap-2">
            {s.stats.map(([n, label], i) => (
              <Reveal key={`${step}-${label}`} i={i} reduce={reduce} className="rounded-lg bg-cream/[0.04] px-3 py-2.5">
                <p className="font-display text-2xl font-black text-sun-300 leading-none">{n}</p>
                <p className="text-[11.5px] text-cream/70 mt-1 leading-snug">{label}</p>
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {/* footer: what this step costs + honesty label */}
      <div className="mt-3 pt-3 border-t border-cream/10 flex items-center justify-between gap-2 flex-wrap">
        <Link to="/signup" className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-cream/75 hover:text-cream transition min-w-0">
          {s.free ? <Sparkles size={12} className="text-bull-400 shrink-0" /> : <Lock size={12} className="text-sun-300 shrink-0" />}
          <span className="break-words">{s.cta}</span>
        </Link>
        <span className="text-[10px] text-cream/35 shrink-0">Example, not live data</span>
      </div>
    </div>
  );
}
