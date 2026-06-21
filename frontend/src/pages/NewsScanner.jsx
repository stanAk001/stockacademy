import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Newspaper, Loader2, Filter, AlertTriangle, ExternalLink, RefreshCw, Brain,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import ShareButton from '../components/ShareButton';
import ToolHero from '../components/ui/ToolHero';
import PremiumLock from '../components/ui/PremiumLock';
import LanguagePicker from '../components/LanguagePicker';
import { getLang } from '../lib/lang';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const POPULAR = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'NGX:DANGCEM', 'NGX:MTNN', 'NGX:GTCO'];

export default function NewsScanner() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [symbol, setSymbol] = useState(params.get('symbol') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lang, setLang] = useState(getLang());

  const isPremium = user?.plan === 'premium';

  const scan = async () => {
    if (!symbol.trim()) return toast('Enter a ticker', { icon: '✍️' });
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/ai/scan-news', { symbol: symbol.trim(), language: lang });
      if (data.success) setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'News scan failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="overflow-x-hidden">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header */}
          <ToolHero
            icon={Newspaper}
            eyebrow="Premium · AI news scanner"
            title="Cut through the"
            accent="noise."
            subtitle="30 days of headlines, filtered by AI down to the handful that actually move a company — earnings, lawsuits, leadership, regulation, deals. The rest gets thrown out."
          />

          {!isPremium ? (
            <PremiumLock
              icon={Newspaper}
              title="Scan a stock's news with AI"
              message="Get Premium to filter 30 days of news on any stock down to only what actually matters."
            />
          ) : (
            <>
              {/* Input */}
              <div className="card-soft p-4 sm:p-6 mb-7">
                <label className="text-[11px] font-bold uppercase tracking-wider text-ink/45">Stock ticker</label>
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && scan()}
                    placeholder="e.g. AAPL or NGX:DANGCEM"
                    className="input-field font-mono flex-1 min-w-0"
                  />
                  <button
                    onClick={scan}
                    disabled={loading}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-ink text-cream font-bold text-sm sm:text-base hover:bg-ink-soft transition shine disabled:opacity-60"
                  >
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Scanning…</> : <><Newspaper size={16} /> Scan news</>}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {POPULAR.map((t) => (
                    <button
                      key={t}
                      onClick={() => setSymbol(t)}
                      className="px-2.5 py-1 rounded-full bg-cream-warm text-ink/60 text-[11px] font-mono font-bold hover:bg-ink hover:text-cream transition"
                    >
                      {t}
                    </button>
                  ))}
                  <LanguagePicker value={lang} onChange={setLang} className="ml-auto" />
                </div>
              </div>

              {/* Loading */}
              {loading && (
                <div className="card-soft p-8 text-center">
                  <Loader2 size={28} className="animate-spin mx-auto text-ink/40 mb-3" />
                  <p className="font-semibold text-sm sm:text-base">Scanning ~30 days of news…</p>
                  <p className="text-xs text-ink/50 mt-1">This takes 15–30 seconds — the AI is reading every headline.</p>
                </div>
              )}

              {!loading && result && <Results result={result} onRescan={scan} />}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function Results({ result, onRescan }) {
  const a = result.analysis || {};
  const events = a.material_events || [];
  const shareSpec = {
    eyebrow: 'AI News Scanner',
    title: `${result.name || result.symbol} — what matters`,
    lines: [a.summary, ...events.slice(0, 3).map((e) => `• ${e.headline}`)].filter(Boolean),
    footer: a.disclaimer || 'Educational only — not financial advice.',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Meta row */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-ink/45">
        <span className="break-words">
          {result.name} ({result.symbol}) · scanned {result.articles_scanned} items
          {result.generated_at ? ` · ${new Date(result.generated_at).toLocaleString()}` : ''}
          {result.cached ? ' · cached' : ''}
        </span>
        <button onClick={onRescan} className="inline-flex items-center gap-1 font-bold text-bull-600 hover:underline shrink-0">
          <RefreshCw size={12} /> Re-scan
        </button>
      </div>

      {/* Summary */}
      {a.summary && (
        <div className="card-soft p-5 min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-coral-500 mb-1.5">The gist</p>
          <p className="text-sm sm:text-base text-ink/80 leading-relaxed break-words">{a.summary}</p>
        </div>
      )}

      {/* Noise filtered */}
      <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-bull-50 border border-bull-100 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-bull-100 text-bull-700 grid place-items-center shrink-0">
          <Filter size={16} />
        </div>
        <p className="text-sm text-ink/75 break-words">
          Filtered out <strong className="text-bull-700">{a.noise_filtered_out} irrelevant {a.noise_filtered_out === 1 ? 'item' : 'items'}</strong> so you only read what matters.
        </p>
      </div>

      {/* Risk flags */}
      {a.risk_flags?.length > 0 && (
        <div className="p-4 rounded-2xl bg-coral-300/15 border border-coral-300/40 min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-coral-500 mb-2">
            <AlertTriangle size={13} /> Worth watching
          </p>
          <ul className="space-y-1.5">
            {a.risk_flags.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink/75 break-words">
                <span className="text-coral-500 mt-0.5 shrink-0">•</span> <span className="min-w-0">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Material events */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-ink/45 mb-2 mt-2">
          What actually matters {events.length > 0 ? `(${events.length})` : ''}
        </p>
        {events.length === 0 ? (
          <div className="card-soft p-6 text-center text-sm text-ink/55">No material events in the last 30 days.</div>
        ) : (
          <div className="space-y-3">
            {events.map((e, i) => (
              <div key={i} className="card-soft p-4 sm:p-5 min-w-0">
                <div className="flex items-start gap-3 min-w-0">
                  {e.date && (
                    <span className="shrink-0 text-[10px] sm:text-[11px] font-mono font-bold text-ink/50 bg-cream-warm rounded-lg px-2 py-1 whitespace-nowrap">
                      {e.date}
                    </span>
                  )}
                  <div className="min-w-0">
                    {e.url ? (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-display font-bold text-sm sm:text-base leading-snug text-ink hover:text-bull-700 inline-flex items-start gap-1 break-words"
                      >
                        <span className="min-w-0">{e.headline}</span>
                        <ExternalLink size={13} className="shrink-0 mt-1 opacity-50" />
                      </a>
                    ) : (
                      <p className="font-display font-bold text-sm sm:text-base leading-snug break-words">{e.headline}</p>
                    )}
                    {e.why_it_matters && (
                      <p className="text-[13px] sm:text-sm text-ink/65 mt-1.5 break-words leading-snug">
                        <span className="font-semibold text-ink/80">Why it matters: </span>{e.why_it_matters}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share + other premium AI tools */}
      <div className="flex flex-wrap gap-2 pt-1">
        <ShareButton spec={shareSpec} filename={`news-${result.symbol}.png`} label="Share summary" />
        <Link to="/compare-stocks" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-cream-warm text-ink/70 text-xs font-bold hover:bg-ink hover:text-cream transition">
          <Brain size={13} /> Compare two stocks
        </Link>
      </div>

      <p className="text-[11px] text-ink/45 italic text-center pt-1">{a.disclaimer}</p>
    </motion.div>
  );
}
