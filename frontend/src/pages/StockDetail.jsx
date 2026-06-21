import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Sparkles, ArrowUp, ArrowDown, Info, Star, Lock,
  Loader2, CheckCircle2, AlertTriangle, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import BuyThisStockButton from '../components/BuyThisStockButton';
import PdfDownloadButton from '../components/PdfDownloadButton';
import ShareButton from '../components/ShareButton';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getLang, setLang, LANGS } from '../lib/lang';

export default function StockDetail() {
  const { symbol } = useParams();
  const { user } = useAuth();
  const isPremium = user?.plan === 'premium';

  const [quote, setQuote] = useState(null);
  const [candles, setCandles] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [q, c, a] = await Promise.all([
          api.get(`/stocks/quote/${symbol}`),
          api.get(`/stocks/candles/${symbol}?days=90`),
          api.get(`/stocks/analysis/${symbol}`),
        ]);
        if (q.data.success) setQuote(q.data);
        if (c.data.success) setCandles(c.data.candles);
        if (a.data.success) setAnalysis(a.data);
      } catch {
        toast.error('Failed to load stock data');
      } finally { setLoading(false); }
    };
    load();
  }, [symbol]);

  const addToWatchlist = async () => {
    try {
      await api.post('/watchlist', { symbol: quote?.symbol, company_name: quote?.name });
      toast.success(`${quote?.display_symbol} added to watchlist`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add');
    }
  };

  if (loading || !quote) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="space-y-4 animate-pulse">
            <div className="h-12 w-1/3 bg-ink/5 rounded" />
            <div className="h-64 bg-ink/5 rounded-3xl" />
          </div>
        </div>
      </Layout>
    );
  }

  const isUp = (quote.change_pct ?? 0) >= 0;
  const fmt = (v) => v == null ? '—' :
    new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const fmtPct = (v) => v == null ? '—' : `${(v * 100).toFixed(1)}%`;
  const symb = quote.currency === 'NGN' ? '₦' : '$';

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-widest text-ink/50">{quote.exchange}</span>
              <span className="text-xs text-ink/40">·</span>
              <span className={`chip ${quote.country === 'NG' ? 'bg-bull-100 text-bull-700' : 'bg-sun-100 text-sun-600'}`}>
                {quote.country === 'NG' ? '🇳🇬 Nigeria' : '🇺🇸 United States'}
              </span>
              {quote.sector && (
                <>
                  <span className="text-xs text-ink/40">·</span>
                  <span className="chip bg-ink/5 text-ink/70">{quote.sector}</span>
                </>
              )}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight font-mono">
              {quote.display_symbol}
            </h1>
            <p className="text-lg text-ink/60 mt-1">{quote.name}</p>
          </div>

          <div className="text-left lg:text-right">
            <p className="font-display text-5xl font-black font-mono">{symb}{fmt(quote.price)}</p>
            <p className={`text-sm font-bold font-mono flex items-center lg:justify-end gap-1 ${isUp ? 'text-bull-600' : 'text-bear-500'}`}>
              {isUp ? <ArrowUp size={14}/> : <ArrowDown size={14}/>}
              {quote.change_pct >= 0 ? '+' : ''}{fmt(quote.change_pct)}%
            </p>
            <div className="flex flex-wrap gap-2 mt-3 lg:justify-end">
              <button onClick={addToWatchlist} className="btn-ghost text-sm">
                <Star size={14}/> Watch
              </button>
              <BuyThisStockButton symbol={quote.symbol} className="text-sm" />
              {analysis && <PdfDownloadButton analysis={analysis} quote={quote} isPremium={isPremium} />}
              {analysis && (
                <ShareButton
                  spec={{
                    eyebrow: 'Stock Snapshot',
                    title: analysis.symbol,
                    stats: [
                      { label: 'P/E', value: fmt(analysis.metrics?.valuation?.pe_ratio) },
                      { label: 'ROE', value: fmtPct(analysis.metrics?.profitability?.roe) },
                      { label: '1Y return', value: fmtPct(analysis.metrics?.returns?.return_1y) },
                    ],
                    lines: [
                      `Price: ${symb}${fmt(analysis.last_price)}`,
                      `Dividend yield: ${fmtPct(analysis.metrics?.valuation?.dividend_yield)}`,
                    ].filter(Boolean),
                    footer: 'Educational only — not financial advice.',
                  }}
                  filename={`${analysis.symbol}-snapshot.png`}
                />
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="card-soft p-6 mb-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={candles}>
                <defs>
                  <linearGradient id="cgrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isUp ? '#10B981' : '#EF4444'} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={isUp ? '#10B981' : '#EF4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#0F141910" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#0F141980' }} tickFormatter={(d) => d?.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#0F141980' }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#0F1419', border: 'none', borderRadius: 12, color: '#FDF8F0' }}/>
                <Area type="monotone" dataKey="close" stroke={isUp ? '#10B981' : '#EF4444'} strokeWidth={2.5} fill="url(#cgrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {analysis && (
          <>
            <div className="mb-6">
              <p className="text-sm font-bold uppercase tracking-widest text-coral-500 mb-1">Stock Analysis</p>
              <h2 className="font-display text-3xl font-black leading-tight">
                {quote.display_symbol} <span className="italic text-ink/50 font-normal">— the facts, explained</span>
              </h2>
              <p className="text-ink/60 text-sm mt-1">
                The company's real numbers, plus a plain-English read. Educational only — always do your own research before investing.
              </p>
            </div>

            <div className="space-y-6">
              {/* AI plain-English verdict — Premium only. */}
              {isPremium ? (
                <AiVerdict ticker={symbol} displaySymbol={analysis.symbol} />
              ) : (
                <AiVerdictLocked displaySymbol={analysis.symbol} />
              )}
              {/* Full breakdown — free for everyone. */}
              <FullBreakdown analysis={analysis} symb={symb} fmt={fmt} fmtPct={fmtPct} />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

// Free users see a locked preview of the verdict with an upgrade prompt.
function AiVerdictLocked({ displaySymbol }) {
  return (
    <div className="card-dark p-6">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-sun-300" />
        <p className="text-xs font-bold uppercase tracking-widest text-sun-300">Plain-English verdict</p>
        <span className="ml-auto text-[10px] font-black uppercase tracking-wider bg-sun-300 text-ink px-2 py-0.5 rounded-full">Premium</span>
      </div>
      <h3 className="font-display text-2xl font-bold mb-2">
        What do {displaySymbol}'s numbers actually mean?
      </h3>
      <p className="text-cream/70 text-sm max-w-xl leading-relaxed mb-4">
        Premium gives you a clear, beginner-friendly read on this stock — what kind of company it is,
        what's strong, what to watch, and what it means for you. In English, Pidgin, Yorùbá, Hausa or Igbo.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/pricing" className="btn-primary">
          <Lock size={15} /> Unlock with Premium
        </Link>
        <span className="text-xs text-cream/50">Educational analysis — not financial advice.</span>
      </div>
    </div>
  );
}

// The AI plain-English (or local-language) verdict — Premium only. On-demand
// (button) so it doesn't burn the daily AI quota on every page view.
function AiVerdict({ ticker, displaySymbol }) {
  const [lang, setLangState] = useState(getLang());
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const generate = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const { data: res } = await api.get(
        `/ai/explain-stock/${encodeURIComponent(ticker)}?language=${lang}`
      );
      if (res.success) {
        setData(res.analysis);
        setStatus('done');
      } else {
        throw new Error(res.message || 'Could not generate the verdict.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const onLangChange = (code) => {
    setLangState(code);
    setLang(code);
  };

  return (
    <div className="card-dark p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-sun-300" />
          <p className="text-xs font-bold uppercase tracking-widest text-sun-300">Plain-English verdict</p>
        </div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-cream/70">
          <Globe size={13} />
          <select
            value={lang}
            onChange={(e) => onLangChange(e.target.value)}
            className="bg-cream/10 text-cream rounded-lg px-2 py-1 outline-none border border-cream/15 focus:border-sun-300"
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code} className="text-ink">{l.label}</option>
            ))}
          </select>
        </label>
      </div>

      <h3 className="font-display text-2xl font-bold mb-3">
        What do {displaySymbol}'s numbers actually mean?
      </h3>

      {status === 'idle' && (
        <div>
          <p className="text-cream/70 text-sm max-w-xl">
            Get a clear, beginner-friendly read on this stock — what kind of company it is, what's strong,
            what to watch, and what it means for you. In your chosen language.
          </p>
          <button onClick={generate} className="btn-primary mt-4">
            <Sparkles size={16} /> Explain in plain {LANGS.find((l) => l.code === lang)?.label || 'English'}
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div className="space-y-3 animate-pulse">
          <div className="flex items-center gap-2 text-sun-300 text-sm font-semibold">
            <Loader2 size={16} className="animate-spin" /> Reading the numbers…
          </div>
          <div className="h-3 bg-cream/10 rounded w-3/4" />
          <div className="h-3 bg-cream/10 rounded w-full" />
          <div className="h-3 bg-cream/10 rounded w-5/6" />
        </div>
      )}

      {status === 'error' && (
        <div className="bg-cream/5 border border-coral-400/40 rounded-2xl p-4 flex gap-3">
          <AlertTriangle size={18} className="text-coral-300 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-cream/85">{errorMsg}</p>
            <button onClick={generate} className="text-sun-300 text-sm font-bold mt-2 hover:underline">Try again</button>
          </div>
        </div>
      )}

      {status === 'done' && data && (
        <div className="space-y-4">
          <p className="font-display text-lg font-semibold text-sun-300">{data.headline}</p>
          <p className="text-cream/85 text-sm leading-relaxed">{data.plain_english}</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-cream/5 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-bull-300 mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Strengths
              </p>
              <ul className="space-y-1.5 text-sm text-cream/85">
                {(data.strengths || []).map((s, i) => <li key={i} className="flex gap-2"><span className="text-bull-300">+</span><span>{s}</span></li>)}
              </ul>
            </div>
            <div className="bg-cream/5 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-coral-300 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={13} /> Watch-outs
              </p>
              <ul className="space-y-1.5 text-sm text-cream/85">
                {(data.watch_outs || []).map((s, i) => <li key={i} className="flex gap-2"><span className="text-coral-300">!</span><span>{s}</span></li>)}
              </ul>
            </div>
          </div>

          {data.for_beginners && (
            <div className="bg-sun-300/10 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-sun-300 mb-1">If you're new to this</p>
              <p className="text-sm text-cream/85 leading-relaxed">{data.for_beginners}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-cream/50 italic max-w-md">{data.disclaimer}</p>
            <button onClick={generate} className="text-sun-300 text-xs font-bold hover:underline flex items-center gap-1">
              <Sparkles size={12} /> Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FullBreakdown({ analysis, symb, fmt, fmtPct }) {
  return (
    <div className="space-y-6">
      {analysis.peers?.length > 0 && (
        <div className="card-soft p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-bull-600 mb-1">Sector peers</p>
          <h3 className="font-display text-2xl font-bold mb-4">How {analysis.symbol} stacks up</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-ink/10 text-ink/50 uppercase text-xs">
                  <th className="py-2 pr-3">Symbol</th>
                  <th className="py-2 px-3">P/E</th>
                  <th className="py-2 px-3">ROE</th>
                  <th className="py-2 px-3">Debt/Eq</th>
                  <th className="py-2 px-3">1Y return</th>
                  <th className="py-2 pl-3">Volatility</th>
                </tr>
              </thead>
              <tbody>
                {analysis.peers.map((p) => (
                  <tr key={p.symbol} className="border-b border-ink/5 hover:bg-cream-warm">
                    <td className="py-2 pr-3">
                      <Link to={`/stocks/${encodeURIComponent(p.symbol)}`} className="font-mono font-bold hover:text-bull-600">{p.display_symbol}</Link>
                      <p className="text-xs text-ink/50 truncate max-w-[12rem]">{p.name}</p>
                    </td>
                    <td className="py-2 px-3 font-mono">{fmt(p.pe)}</td>
                    <td className="py-2 px-3 font-mono">{fmtPct(p.roe)}</td>
                    <td className="py-2 px-3 font-mono">{fmt(p.debt_equity)}</td>
                    <td className={`py-2 px-3 font-mono ${p.return_1y >= 0 ? 'text-bull-600' : 'text-bear-500'}`}>{fmtPct(p.return_1y)}</td>
                    <td className="py-2 pl-3 font-mono">{fmtPct(p.volatility_1y)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {analysis.metrics && (
        <div className="card-soft p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-bull-600 mb-1">The numbers</p>
          <h3 className="font-display text-2xl font-bold mb-4">Every metric, straight from the data</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricGroup title="Valuation" items={[
              ['P/E ratio', fmt(analysis.metrics.valuation.pe_ratio)],
              ['P/B ratio', fmt(analysis.metrics.valuation.pb_ratio)],
              ['P/S ratio', fmt(analysis.metrics.valuation.ps_ratio)],
              ['EV/EBITDA', fmt(analysis.metrics.valuation.ev_ebitda)],
              ['PEG', fmt(analysis.metrics.valuation.peg_ratio)],
              ['Dividend yield', fmtPct(analysis.metrics.valuation.dividend_yield)],
            ]}/>
            <MetricGroup title="Profitability" items={[
              ['ROE', fmtPct(analysis.metrics.profitability.roe)],
              ['ROA', fmtPct(analysis.metrics.profitability.roa)],
              ['Gross margin', fmtPct(analysis.metrics.profitability.gross_margin)],
              ['Net margin', fmtPct(analysis.metrics.profitability.net_margin)],
            ]}/>
            <MetricGroup title="Growth" items={[
              ['Revenue growth (YoY)', fmtPct(analysis.metrics.growth.revenue_growth_yoy)],
              ['Earnings growth (YoY)', fmtPct(analysis.metrics.growth.earnings_growth_yoy)],
            ]}/>
            <MetricGroup title="Balance sheet" items={[
              ['Debt/Equity', fmt(analysis.metrics.balance_sheet.debt_to_equity)],
              ['Current ratio', fmt(analysis.metrics.balance_sheet.current_ratio)],
            ]}/>
            <MetricGroup title="Risk" items={[
              ['Beta', fmt(analysis.metrics.risk.beta)],
              ['30-day volatility', fmtPct(analysis.metrics.risk.volatility_30d)],
              ['1-year volatility', fmtPct(analysis.metrics.risk.volatility_1y)],
              ['Max drawdown (1y)', fmtPct(analysis.metrics.risk.max_drawdown_1y)],
            ]}/>
            <MetricGroup title="Returns" items={[
              ['1-month', fmtPct(analysis.metrics.returns.return_1m)],
              ['3-month', fmtPct(analysis.metrics.returns.return_3m)],
              ['6-month', fmtPct(analysis.metrics.returns.return_6m)],
              ['1-year', fmtPct(analysis.metrics.returns.return_1y)],
              ['52-wk high', `${symb}${fmt(analysis.metrics.returns.high_52w)}`],
              ['52-wk low',  `${symb}${fmt(analysis.metrics.returns.low_52w)}`],
            ]}/>
          </div>
        </div>
      )}

      <div className="bg-ink/5 rounded-2xl p-5 flex gap-3">
        <Info size={18} className="text-ink/40 shrink-0 mt-0.5" />
        <p className="text-xs text-ink/60 leading-relaxed">
          These are factual figures and an educational explanation — not buy or sell recommendations. Always verify numbers against another source and consider your own goals, time horizon, and risk tolerance before investing.
        </p>
      </div>
    </div>
  );
}

function MetricGroup({ title, items }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-ink/50 mb-2">{title}</p>
      <div className="space-y-1.5">
        {items.map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm py-1 border-b border-ink/5 last:border-0">
            <span className="text-ink/60">{label}</span>
            <span className="font-mono font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}