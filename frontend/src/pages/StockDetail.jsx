import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Lock, Sparkles, ArrowUp, ArrowDown,
  Award, BarChart3, Activity, Shield, Info, Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import BuyThisStockButton from '../components/BuyThisStockButton';
import PdfDownloadButton from '../components/PdfDownloadButton';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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
                {quote.display_symbol} <span className="italic text-ink/50 font-normal">at a glance</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-1 card-soft p-6 bg-ink text-cream relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sun-300/10 rounded-full blur-2xl" />
                <p className="text-xs font-bold uppercase tracking-widest text-sun-300 mb-2">Composite score</p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-7xl font-black text-sun-300 drop-shadow-sm">{analysis.scores.composite}</span>
                  <span className="text-base font-bold text-cream/90">/ 100</span>
                </div>
                <p className="text-sm font-semibold text-cream mt-2">{analysis.labels.quality}</p>
              </div>

              <div className="md:col-span-2 card-soft p-6 bg-gradient-to-br from-sun-100 to-coral-300/30">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="text-coral-500"/>
                  <p className="text-xs font-bold uppercase tracking-widest text-coral-500">The thesis</p>
                </div>
                <p className="font-display text-xl leading-snug font-semibold">"{analysis.thesis}"</p>
                <p className="text-xs text-ink/50 mt-3 italic">
                  Educational interpretation. Investment decisions are yours to make.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <FactorCard icon={Award} label="Quality" score={analysis.scores.quality} verdict={analysis.labels.quality} color="bull"/>
              <FactorCard icon={BarChart3} label="Value" score={analysis.scores.value} verdict={analysis.labels.value} color="sun"/>
              <FactorCard icon={Activity} label="Momentum" score={analysis.scores.momentum} verdict={analysis.labels.momentum} color="coral"/>
              <FactorCard icon={Shield} label="Risk safety" score={analysis.scores.risk} verdict={analysis.labels.risk} color="sage"/>
            </div>

            {isPremium ? (
              <PremiumAnalysis analysis={analysis} symb={symb} fmt={fmt} fmtPct={fmtPct} />
            ) : (
              <PremiumLockCard />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function FactorCard({ icon: Icon, label, score, verdict, color }) {
  const palette = {
    bull: { bg: 'bg-bull-100', text: 'text-bull-700', bar: 'bg-bull-500' },
    sun: { bg: 'bg-sun-100', text: 'text-sun-600', bar: 'bg-sun-400' },
    coral: { bg: 'bg-coral-300/30', text: 'text-coral-500', bar: 'bg-coral-400' },
    sage: { bg: 'bg-sage-200', text: 'text-bull-700', bar: 'bg-sage-400' },
  }[color];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-soft p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 ${palette.bg} rounded-xl grid place-items-center`}>
          <Icon size={16} className={palette.text} strokeWidth={2.4}/>
        </div>
        <span className="font-display font-black text-3xl">{score}</span>
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-ink/60">{label}</p>
      <p className="text-sm font-semibold mt-1 mb-3 leading-tight">{verdict}</p>
      <div className="h-1.5 bg-ink/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.8 }} className={`h-full ${palette.bar}`}/>
      </div>
    </motion.div>
  );
}

function PremiumLockCard() {
  return (
    <div className="card-soft p-10 text-center relative overflow-hidden mb-6">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-coral-300/30 rounded-full blur-3xl" />
      <div className="relative">
        <div className="w-16 h-16 mx-auto bg-ink text-sun-300 rounded-2xl grid place-items-center mb-4">
          <Lock size={28}/>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-coral-500 mb-1">Premium Analysis</p>
        <h3 className="font-display text-2xl font-black mb-2">See the full breakdown</h3>
        <p className="text-ink/60 max-w-md mx-auto mb-5">
          Unlock factor-level sub-scores, sector peer comparison, and every metric.
        </p>
        <ul className="text-sm text-ink/70 max-w-md mx-auto mb-6 space-y-1.5 text-left">
          <li>📊 Sub-scores for every factor input</li>
          <li>🏆 Sector peer comparison with 5 similar companies</li>
          <li>📈 Full valuation, profitability, and risk metrics</li>
          <li>📄 Download analysis as PDF</li>
          <li>💎 Unlimited stock analyses</li>
        </ul>
        <Link to="/upgrade" className="btn-primary bg-gradient-to-r from-coral-400 to-sun-400 text-ink">
          <Sparkles size={16}/> Upgrade to Premium
        </Link>
      </div>
    </div>
  );
}

function PremiumAnalysis({ analysis, symb, fmt, fmtPct }) {
  return (
    <div className="space-y-6">
      {['quality', 'value', 'momentum', 'risk'].map((factor) => (
        <BreakdownCard key={factor} factor={factor} items={analysis.breakdown[factor]} score={analysis.scores[factor]} />
      ))}

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
          <p className="text-xs font-bold uppercase tracking-widest text-bull-600 mb-1">Raw metrics</p>
          <h3 className="font-display text-2xl font-bold mb-4">Every number behind the scores</h3>
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
          Scores are educational interpretations of fundamental and price data. They are not buy or sell recommendations. Each individual investor's goals, time horizon, and risk tolerance determine what's right for their situation.
        </p>
      </div>
    </div>
  );
}

function BreakdownCard({ factor, items, score }) {
  const labels = {
    quality: 'Quality breakdown', value: 'Value breakdown',
    momentum: 'Momentum breakdown', risk: 'Risk breakdown',
  }[factor];

  return (
    <div className="card-soft p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl font-bold">{labels}</h3>
        <span className="font-display text-2xl font-black">{score}</span>
      </div>
      <div className="space-y-2">
        {(items || []).map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm font-medium w-32 shrink-0 truncate">{item.name}</span>
            <div className="flex-1 h-2 bg-ink/5 rounded-full overflow-hidden">
              <div className="h-full bg-ink/40" style={{ width: `${item.score}%` }} />
            </div>
            <span className="text-xs font-mono font-bold w-10 text-right">{item.score}</span>
          </div>
        ))}
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