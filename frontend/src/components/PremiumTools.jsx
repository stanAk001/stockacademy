import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain, BarChart3, Send, ClipboardCheck, Sparkles, Loader2, Check, ArrowRight, Newspaper,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PremiumValue from './PremiumValue';
import ShareButton from './ShareButton';
import LiveDemo from './LiveDemo';
import { getLang } from '../lib/lang';

// One dashboard block that surfaces all Phase-1 premium tools.
export default function PremiumTools() {
  const { user } = useAuth();
  const isPremium = user?.plan === 'premium';

  if (!isPremium) {
    return (
      <div className="mb-8 sm:mb-10">
        <PremiumValue showPricing />
      </div>
    );
  }

  return (
    <div className="mb-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 mb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ink text-sun-300 text-[10px] font-black uppercase tracking-[0.15em]">
            <Sparkles size={11} /> Premium
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-black mt-2.5 leading-tight">Your premium toolkit</h2>
        </div>
        <p className="text-[13px] sm:text-sm text-ink/50">Everything your subscription unlocks.</p>
      </div>

      {/* Self-playing demo of each tool */}
      <div className="mb-4 sm:mb-5">
        <LiveDemo />
      </div>

      {/* Featured: AI portfolio analysis (interactive) */}
      <PortfolioAnalyzer />

      {/* Tool grid */}
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
        <ToolCard to="/compare-stocks" icon={Brain} iconBg="bg-coral-400"
          title="AI stock comparison" desc="Two tickers, side-by-side on fundamentals, risk & valuation." />
        <ToolCard to="/news-scanner" icon={Newspaper} iconBg="bg-bull-400"
          title="AI news scanner" desc="30 days of news, filtered to only what matters." />
        <ToolCard to="/portfolio-review" icon={ClipboardCheck} iconBg="bg-sun-300"
          title="Personal portfolio review" desc="A human reviews your holdings — once a quarter." />
        <TelegramCard />
      </div>
    </div>
  );
}

/* ---------- A polished navigation tile for a premium tool ---------- */
function ToolCard({ to, icon: Icon, iconBg, title, desc }) {
  return (
    <Link
      to={to}
      className="group block card-soft p-4 sm:p-5 transition hover:shadow-lg hover:-translate-y-0.5 hover:ring-1 hover:ring-ink/10 min-w-0"
    >
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-2xl ${iconBg} grid place-items-center shrink-0 transition group-hover:scale-105`}>
          <Icon size={18} className="text-ink" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base sm:text-lg font-black leading-tight break-words">{title}</h3>
          <p className="text-[12.5px] sm:text-sm text-ink/55 break-words leading-snug mt-0.5">{desc}</p>
        </div>
        <ArrowRight size={18} className="text-ink/25 group-hover:text-ink group-hover:translate-x-0.5 transition shrink-0 mt-1" />
      </div>
    </Link>
  );
}

/* ---------- AI Portfolio Analyzer ---------- */
function PortfolioAnalyzer() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/analyze-portfolio', { language: getLang() });
      if (data.success) {
        if (data.empty) { toast(data.message, { icon: '📭' }); setResult(null); }
        else { setResult(data); if (!data.cached) toast.success('Analysis ready'); }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const a = result?.analysis;

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card-soft p-5 sm:p-6 min-w-0">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-ink grid place-items-center shrink-0 shadow-sm">
            <BarChart3 size={18} className="text-sun-300" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg sm:text-xl font-black leading-tight">AI portfolio analysis</h3>
            <p className="text-[11px] text-ink/45">Reads your simulator portfolio · nothing to paste</p>
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-cream text-xs sm:text-sm font-bold hover:bg-ink-soft transition shine disabled:opacity-60"
        >
          {loading ? <><Loader2 size={13} className="animate-spin" /> Analyzing…</> : <><Sparkles size={13} /> Run analysis</>}
        </button>
      </div>

      {!a && !loading && (
        <div>
          <p className="text-[13px] sm:text-sm text-ink/55 break-words">
            Just tap <strong className="text-ink font-semibold">Run analysis</strong> — no pasting. The AI reads the
            holdings in your $100k practice portfolio and reports back on:
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {['Concentration', 'Sector exposure', 'Diversification', 'Specific suggestions'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink/65 bg-cream-warm rounded-full px-2.5 py-1">
                <Check size={11} className="text-bull-600" /> {t}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-ink/45 mt-3 break-words">
            Want feedback on your <em>real</em> money instead? Use the{' '}
            <Link to="/portfolio-review" className="font-bold text-bull-600 hover:underline">Personal portfolio review</Link>.
          </p>
        </div>
      )}

      {a && (
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-ink/45">
              {result.generated_at ? `Last run ${new Date(result.generated_at).toLocaleString()}` : ''} {result.cached ? '· cached' : ''}
            </p>
            <ShareButton
              spec={{
                eyebrow: 'AI Portfolio Analysis',
                title: 'My portfolio — the AI read',
                lines: [a.summary, ...(a.suggestions || []).slice(0, 3).map((s) => `• ${s}`)].filter(Boolean),
                footer: a.disclaimer || 'Educational only — not financial advice.',
              }}
              filename="portfolio-analysis.png"
              label="Share"
            />
          </div>
          <Block label="Summary" text={a.summary} />
          <Block label="Concentration" text={a.concentration_risk} />
          <Block label="Sector exposure" text={a.sector_exposure} />
          <Block label="Diversification gaps" text={a.diversification_gaps} />
          <Block label="Risk profile" text={a.risk_profile} />
          {a.suggestions?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45 mb-1">Suggestions</p>
              <ul className="space-y-1">
                {a.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 break-words">
                    <Check size={14} className="text-bull-600 shrink-0 mt-0.5" /> <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[10px] text-ink/40 italic pt-2 border-t border-ink/5">{a.disclaimer}</p>
        </div>
      )}
    </motion.div>
  );
}

function Block({ label, text }) {
  if (!text) return null;
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45 mb-0.5">{label}</p>
      <p className="text-ink/75 break-words">{text}</p>
    </div>
  );
}

/* ---------- Telegram link ---------- */
function TelegramCard() {
  const [linked, setLinked] = useState(null);
  const [code, setCode] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => api.get('/telegram/status').then(({ data }) => setLinked(data.linked)).catch(() => {});
  useEffect(() => { refresh(); }, []);

  const getCode = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/telegram/link-code');
      if (data.success) setCode(data);
    } catch { toast.error('Could not generate a code'); }
    finally { setBusy(false); }
  };

  const unlink = async () => {
    await api.post('/telegram/unlink').catch(() => {});
    setCode(null); refresh(); toast('Telegram disconnected', { icon: '🔌' });
  };

  return (
    <div className="card-soft p-4 sm:p-5 min-w-0">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-2xl bg-sage-400 grid place-items-center shrink-0">
          <Send size={18} className="text-ink" strokeWidth={2.2} />
        </div>
        <h3 className="font-display text-base sm:text-lg font-black">Premium Telegram</h3>
        {linked && <span className="ml-auto chip bg-bull-100 text-bull-700 text-[10px]"><Check size={11} /> Linked</span>}
      </div>

      {linked ? (
        <div className="text-sm text-ink/65">
          <p className="break-words">You're connected. Premium updates and review notifications arrive in your Telegram.</p>
          <button onClick={unlink} className="mt-2 text-xs text-ink/45 hover:text-bear-500">Disconnect</button>
        </div>
      ) : code ? (
        <div className="text-sm text-ink/70">
          <p className="mb-2 break-words">Open the StockAcademia bot on Telegram and send:</p>
          <code className="block bg-ink text-sun-300 rounded-xl px-3 py-2 font-mono text-sm break-all">/link {code.code}</code>
          <p className="text-[11px] text-ink/45 mt-2">Code expires in 15 minutes. After sending it, refresh.</p>
          <button onClick={refresh} className="mt-2 text-xs font-bold text-bull-600 hover:underline">I've sent it — refresh</button>
        </div>
      ) : (
        <div className="text-sm text-ink/55">
          <p className="break-words mb-3">Link your Telegram to get the premium channel and review alerts.</p>
          <button onClick={getCode} disabled={busy} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-ink text-cream text-xs font-bold hover:bg-ink-soft transition disabled:opacity-60">
            {busy ? <><Loader2 size={13} className="animate-spin" /> …</> : 'Get my link code'}
          </button>
        </div>
      )}
    </div>
  );
}

