import { Fragment, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Loader2, Scale, Newspaper, GitCompareArrows, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import ShareButton from '../components/ShareButton';
import ToolHero from '../components/ui/ToolHero';
import PremiumLock from '../components/ui/PremiumLock';
import LanguagePicker from '../components/LanguagePicker';
import ChatMarkdown from '../components/ChatMarkdown';
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
    lines: [a.summary, a.bottom_line || a.which_for_what].filter(Boolean),
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
        <NameCard label="Stock A" stock={result.stock_a} />
        <NameCard label="Stock B" stock={result.stock_b} />
      </div>

      <Section title="Summary" body={a.summary} />
      <KeyDifferences items={a.key_differences} />
      <MetricsTable ma={result.metrics_a} mb={result.metrics_b} symA={result.stock_a?.symbol} symB={result.stock_b?.symbol} />
      <Section title="Fundamentals" body={a.fundamentals_comparison} />
      <Section title="Risk" body={a.risk_comparison} />
      <Section title="Valuation" body={a.valuation_comparison} />
      <Section title="Which for what" body={a.which_for_what} />
      <BottomLine body={a.bottom_line} />

      <p className="text-[11px] text-ink/45 italic text-center pt-2">{a.disclaimer}</p>
    </motion.div>
  );
}

const CCY = { USD: '$', NGN: '₦', GBP: '£', EUR: '€' };

function NameCard({ label, stock }) {
  const price = stock?.last_price;
  const sym = CCY[stock?.currency] || '';
  return (
    <div className="card-soft p-4 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">{label}</p>
      <p className="font-mono font-black text-lg">{stock?.symbol}</p>
      <p className="text-xs text-ink/55 break-words line-clamp-2">{stock?.name}</p>
      {price != null && (
        <p className="text-sm font-bold text-ink mt-1.5">{sym}{Number(price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
      )}
    </div>
  );
}

function Section({ title, body }) {
  if (!body) return null;
  return (
    <div className="card-soft p-5 min-w-0">
      <p className="text-xs font-bold uppercase tracking-widest text-coral-500 mb-1.5">{title}</p>
      <ChatMarkdown className="text-ink/80">{body}</ChatMarkdown>
    </div>
  );
}

function KeyDifferences({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="card-soft p-5 min-w-0">
      <p className="text-xs font-bold uppercase tracking-widest text-coral-500 mb-3 flex items-center gap-1.5">
        <GitCompareArrows size={14} /> Key differences
      </p>
      <ul className="space-y-2">
        {items.map((d, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-ink/80 leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-ink shrink-0" />
            <span className="break-words">{d}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// The learner's decision moment — clear enough to choose, without us choosing for them.
function BottomLine({ body }) {
  if (!body) return null;
  return (
    <div className="card-soft p-5 min-w-0 ring-2 ring-ink">
      <p className="text-xs font-bold uppercase tracking-widest text-ink mb-1.5 flex items-center gap-1.5">
        <Flag size={14} /> Bottom line — your call
      </p>
      <ChatMarkdown className="text-ink/85">{body}</ChatMarkdown>
    </div>
  );
}

// ---- side-by-side factual metrics (live where available) ----
const FMT = {
  num1: (v) => Number(v).toFixed(1),
  num2: (v) => Number(v).toFixed(2),
  pct: (v) => `${(Number(v) * 100).toFixed(1)}%`,
  mcap: (v) => {
    const m = Number(v); // value is in millions
    if (m >= 1_000_000) return `$${(m / 1_000_000).toFixed(2)}T`;
    if (m >= 1_000) return `$${(m / 1_000).toFixed(1)}B`;
    return `$${m.toFixed(0)}M`;
  },
};

const METRIC_GROUPS = [
  { group: 'Valuation', rows: [
    ['P/E ratio', 'valuation.pe_ratio', 'num1'],
    ['P/B ratio', 'valuation.pb_ratio', 'num2'],
    ['P/S ratio', 'valuation.ps_ratio', 'num2'],
    ['EV / EBITDA', 'valuation.ev_ebitda', 'num1'],
    ['PEG ratio', 'valuation.peg_ratio', 'num2'],
    ['Dividend yield', 'valuation.dividend_yield', 'pct'],
    ['Market cap', 'valuation.market_cap_millions', 'mcap'],
  ] },
  { group: 'Profitability', rows: [
    ['Return on equity', 'profitability.roe', 'pct'],
    ['Return on assets', 'profitability.roa', 'pct'],
    ['Gross margin', 'profitability.gross_margin', 'pct'],
    ['Net margin', 'profitability.net_margin', 'pct'],
  ] },
  { group: 'Growth', rows: [
    ['Revenue growth (YoY)', 'growth.revenue_growth_yoy', 'pct'],
    ['Earnings growth (YoY)', 'growth.earnings_growth_yoy', 'pct'],
  ] },
  { group: 'Balance sheet', rows: [
    ['Debt / equity', 'balance_sheet.debt_to_equity', 'num2'],
    ['Current ratio', 'balance_sheet.current_ratio', 'num2'],
  ] },
  { group: 'Risk', rows: [
    ['Beta', 'risk.beta', 'num2'],
    ['Volatility (1y)', 'risk.volatility_1y', 'pct'],
    ['Max drawdown (1y)', 'risk.max_drawdown_1y', 'pct'],
  ] },
  { group: 'Returns', rows: [
    ['Return (1 month)', 'returns.return_1m', 'pct'],
    ['Return (6 months)', 'returns.return_6m', 'pct'],
    ['Return (1 year)', 'returns.return_1y', 'pct'],
  ] },
];

const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? null : o[k]), obj);
const fmt = (v, type) => (v === null || v === undefined || Number.isNaN(v) ? '—' : FMT[type](v));

function MetricsTable({ ma, mb, symA, symB }) {
  if (!ma || !mb) return null;
  return (
    <div className="card-soft p-0 overflow-hidden min-w-0">
      <div className="px-5 pt-5 pb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-coral-500">The numbers, side by side</p>
        <p className="text-[11px] text-ink/45 mt-0.5">Live where available. A dash (—) means it isn't on file — the AI read still covers it.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-ink/10 bg-cream-warm/60">
              <th className="text-left font-bold text-ink/50 text-[11px] uppercase tracking-wider px-5 py-2">Metric</th>
              <th className="text-right font-mono font-black px-4 py-2 whitespace-nowrap">{symA}</th>
              <th className="text-right font-mono font-black px-5 py-2 whitespace-nowrap">{symB}</th>
            </tr>
          </thead>
          <tbody>
            {METRIC_GROUPS.map((g) => {
              const rows = g.rows.filter(([, path]) => getPath(ma, path) != null || getPath(mb, path) != null);
              if (rows.length === 0) return null;
              return (
                <Fragment key={g.group}>
                  <tr className="bg-ink/[0.03]">
                    <td colSpan={3} className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-ink/40">{g.group}</td>
                  </tr>
                  {rows.map(([label, path, type]) => (
                    <tr key={path} className="border-t border-ink/5">
                      <td className="px-5 py-2 text-ink/70 whitespace-nowrap">{label}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-ink/85 whitespace-nowrap">{fmt(getPath(ma, path), type)}</td>
                      <td className="px-5 py-2 text-right font-mono font-semibold text-ink/85 whitespace-nowrap">{fmt(getPath(mb, path), type)}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
