import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Loader2, Scale, Newspaper } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import ShareButton from '../components/ShareButton';
import ToolHero from '../components/ui/ToolHero';
import PremiumLock from '../components/ui/PremiumLock';
import LanguagePicker from '../components/LanguagePicker';
import { ResultSkeleton } from '../components/ui/Skeleton';
import { getLang } from '../lib/lang';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const POPULAR = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NGX:DANGCEM', 'NGX:MTNN', 'NGX:GTCO'];

export default function CompareStocks() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [a, setA] = useState(params.get('a') || '');
  const [b, setB] = useState(params.get('b') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [lang, setLang] = useState(getLang());

  const isPremium = user?.plan === 'premium';

  const compare = async () => {
    if (!a.trim() || !b.trim()) return toast('Enter two tickers', { icon: '✍️' });
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/ai/compare-stocks', { symbol_a: a.trim(), symbol_b: b.trim(), language: lang });
      if (data.success) setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header */}
          <ToolHero
            icon={Brain}
            eyebrow="Premium · AI comparison"
            title="Compare two stocks,"
            accent="side by side."
            subtitle="Fundamentals, risk, and valuation — explained in plain language. Educational, not advice."
          >
            <Link to="/news-scanner" className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-bull-600 hover:underline">
              <Newspaper size={14} /> Or scan a stock's news →
            </Link>
          </ToolHero>

          {!isPremium ? (
            <PremiumLock
              icon={Brain}
              title="Compare any two stocks with AI"
              message="Get Premium to put two tickers head-to-head on fundamentals, risk and valuation — in plain English."
            />
          ) : (
            <>
              {/* Inputs */}
              <div className="card-soft p-5 sm:p-6 mb-8">
                <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                  <TickerInput value={a} onChange={setA} placeholder="e.g. AAPL" label="Stock A" />
                  <div className="hidden sm:grid place-items-center">
                    <div className="w-9 h-9 rounded-full bg-ink grid place-items-center">
                      <Scale size={16} className="text-sun-300" />
                    </div>
                  </div>
                  <TickerInput value={b} onChange={setB} placeholder="e.g. MSFT" label="Stock B" />
                </div>

                <div className="flex flex-wrap gap-1.5 mt-4">
                  {POPULAR.map((t) => (
                    <button
                      key={t}
                      onClick={() => (!a ? setA(t) : setB(t))}
                      className="px-2.5 py-1 rounded-full bg-cream-warm text-ink/60 text-[11px] font-mono font-bold hover:bg-ink hover:text-cream transition"
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-end mt-3">
                  <LanguagePicker value={lang} onChange={setLang} />
                </div>

                <button
                  onClick={compare}
                  disabled={loading}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-ink text-cream font-bold hover:bg-ink-soft transition shine disabled:opacity-60"
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Comparing…</> : <><Brain size={16} /> Compare with AI</>}
                </button>
              </div>

              {loading && <ResultSkeleton />}
              {!loading && result && <Results result={result} />}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function TickerInput({ value, onChange, placeholder, label }) {
  return (
    <div className="min-w-0">
      <label className="text-[11px] font-bold uppercase tracking-wider text-ink/45">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        placeholder={placeholder}
        className="input-field font-mono mt-1"
      />
    </div>
  );
}

function Results({ result }) {
  const a = result.analysis || {};
  const shareSpec = {
    eyebrow: 'AI Stock Comparison',
    title: `${result.stock_a?.symbol} vs ${result.stock_b?.symbol}`,
    lines: [a.summary, a.which_for_what].filter(Boolean),
    footer: a.disclaimer || 'Educational only — not financial advice.',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-ink/40">{result.cached ? 'Cached result' : 'Fresh analysis'}</span>
        <ShareButton
          spec={shareSpec}
          filename={`compare-${result.stock_a?.symbol}-${result.stock_b?.symbol}.png`}
          label="Share result"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NameCard label="Stock A" name={result.stock_a?.name} sym={result.stock_a?.symbol} />
        <NameCard label="Stock B" name={result.stock_b?.name} sym={result.stock_b?.symbol} />
      </div>

      <Section title="Summary" body={a.summary} />
      <Section title="Fundamentals" body={a.fundamentals_comparison} />
      <Section title="Risk" body={a.risk_comparison} />
      <Section title="Valuation" body={a.valuation_comparison} />
      <Section title="Which for what" body={a.which_for_what} highlight />

      <p className="text-[11px] text-ink/45 italic text-center pt-2">{a.disclaimer}</p>
    </motion.div>
  );
}

function NameCard({ label, name, sym }) {
  return (
    <div className="card-soft p-4 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">{label}</p>
      <p className="font-mono font-black text-lg">{sym}</p>
      <p className="text-xs text-ink/55 break-words line-clamp-2">{name}</p>
    </div>
  );
}

function Section({ title, body, highlight }) {
  if (!body) return null;
  return (
    <div className={`card-soft p-5 min-w-0 ${highlight ? 'ring-2 ring-ink' : ''}`}>
      <p className="text-xs font-bold uppercase tracking-widest text-coral-500 mb-1.5">{title}</p>
      <p className="text-sm text-ink/80 leading-relaxed break-words whitespace-pre-line">{body}</p>
    </div>
  );
}
