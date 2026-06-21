import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Newspaper, BarChart3, GraduationCap, Lock } from 'lucide-react';

// A self-playing demo of the premium tools. Auto-types a sample prompt and
// reveals a sample result, cycling through each tool. No API calls — pure
// front-end animation, so it always runs (even without AI credits) and costs
// nothing. Clean dark "screen" — no gradients/glows.
const DEMOS = [
  {
    tool: 'AI comparison', icon: Brain, promptLabel: '›',
    prompt: 'Compare GTCO vs ZENITH',
    lines: [
      '✓ GTCO — stronger fundamentals, higher ROE',
      '✓ ZENITH — cheaper P/E, bigger dividend',
      '→ GTCO for stability, ZENITH for value.',
    ],
    cta: 'Run this on any two stocks you own',
  },
  {
    tool: 'News scanner', icon: Newspaper, promptLabel: '›',
    prompt: 'Scan AAPL — last 30 days',
    lines: [
      'Read 31 articles · kept 4 that matter',
      '• Q3 earnings beat — revenue up 18%',
      '• New EU regulatory review opened',
      '→ The other 27 were price noise. Filtered.',
    ],
    cta: 'Filter the noise on any stock you follow',
  },
  {
    tool: 'Portfolio analysis', icon: BarChart3, promptLabel: '›',
    prompt: 'Analyze my portfolio',
    lines: [
      '⚠ 38% sits in a single stock',
      '• Heavy in banking · no tech exposure',
      '→ Consider trimming that position under 20%.',
    ],
    cta: 'Get this read on your real portfolio',
  },
  {
    tool: 'AI tutor', icon: GraduationCap, promptLabel: 'You:',
    prompt: 'What is a P/E ratio?',
    lines: [
      "It's what you pay for ₦1 of a company's yearly profit.",
      'A P/E of 15 → investors pay ₦15 for ₦1 of earnings.',
      'Lower can mean cheaper — but context matters.',
    ],
    cta: 'Ask anything, on any lesson, anytime',
  },
];

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function LiveDemo({ variant = 'dark', preview = false }) {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState(reduceMotion ? DEMOS[0].prompt : '');
  const [answering, setAnswering] = useState(reduceMotion);
  // 'dark' = solid ink (on a light page); 'onDark' = translucent panel (inside a dark card)
  const surface = variant === 'onDark' ? 'bg-cream/[0.07] border border-cream/10' : 'bg-ink';

  useEffect(() => {
    if (reduceMotion) return; // accessibility: show static, don't auto-play
    const demo = DEMOS[step];
    setTyped('');
    setAnswering(false);

    let i = 0;
    const typeMs = 45;
    const typeId = setInterval(() => {
      i += 1;
      setTyped(demo.prompt.slice(0, i));
      if (i >= demo.prompt.length) clearInterval(typeId);
    }, typeMs);

    const typingTotal = demo.prompt.length * typeMs;
    const answerId = setTimeout(() => setAnswering(true), typingTotal + 350);
    const nextId = setTimeout(() => setStep((s) => (s + 1) % DEMOS.length), typingTotal + 5400);

    return () => { clearInterval(typeId); clearTimeout(answerId); clearTimeout(nextId); };
  }, [step]);

  const demo = DEMOS[step];
  const Icon = demo.icon;

  return (
    <div className={`rounded-2xl ${surface} text-cream p-4 sm:p-5 overflow-hidden h-full`}>
      {/* header: live indicator + tool tabs */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-sun-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bull-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-bull-400" />
          </span>
          Live demo
        </span>
        <div className="flex flex-wrap gap-1 justify-end">
          {DEMOS.map((d, i) => (
            <button
              key={d.tool}
              type="button"
              onClick={() => setStep(i)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                i === step ? 'bg-sun-300 text-ink' : 'bg-cream/10 text-cream/50 hover:bg-cream/20 hover:text-cream/80'
              }`}
            >
              {d.tool}
            </button>
          ))}
        </div>
      </div>

      {/* active tool */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-cream/10 grid place-items-center shrink-0">
          <Icon size={15} className="text-sun-300" />
        </div>
        <p className="font-display font-bold text-sm">{demo.tool}</p>
      </div>

      {/* prompt (typing) */}
      <div className="font-mono text-[12px] sm:text-[13px] bg-cream/[0.06] rounded-lg px-3 py-2 mb-3 min-h-[2.5rem] flex items-center break-words">
        <span className="text-sun-300 mr-1.5 shrink-0">{demo.promptLabel}</span>
        <span className="text-cream/90">{typed}</span>
        {!answering && <span className="ml-0.5 inline-block w-[2px] h-4 bg-cream/70 animate-pulse" />}
      </div>

      {/* answer (revealed line by line) */}
      <div className="space-y-1.5 min-h-[5.25rem]">
        {answering && demo.lines.map((line, i) => (
          <motion.p
            key={`${step}-${i}`}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : i * 0.5, duration: 0.35 }}
            className={`text-[12.5px] sm:text-sm break-words leading-snug ${
              line.startsWith('→') ? 'text-sun-300 font-semibold'
                : line.startsWith('⚠') ? 'text-coral-300'
                : 'text-cream/80'
            }`}
          >
            {line}
          </motion.p>
        ))}
      </div>

      {/* Free-user conversion cue — ties the demo to "your" stocks (cycles per tool) */}
      {preview && (
        <div className="mt-3 pt-3 border-t border-cream/10 flex items-center gap-2">
          <Lock size={12} className="text-sun-300 shrink-0" />
          <p className="text-[11px] sm:text-xs text-cream/70 break-words leading-snug">
            {demo.cta} — <span className="text-sun-300 font-semibold">with Premium</span>.
          </p>
        </div>
      )}
    </div>
  );
}
