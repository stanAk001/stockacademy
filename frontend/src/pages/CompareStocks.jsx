import { Fragment, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Scale, Newspaper, GitCompareArrows, Flag, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import ShareButton from '../components/ShareButton';
import PremiumShell, { BarsMotif } from '../components/ui/PremiumShell';
import { UsageMeter, UpgradeNudge, isUpgradeError } from '../components/ui/UsageMeter';
import ChatMarkdown from '../components/ChatMarkdown';
import { LANGS, getLang, setLang as saveLang } from '../lib/lang';
import api from '../services/api';

const POPULAR = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NGX:DANGCEM', 'NGX:MTNN', 'NGX:GTCO'];
const ACCENT = '#E8B04B'; // one brand gold accent across all premium pages

export default function CompareStocks() {
  const [params] = useSearchParams();
  const [a, setA] = useState(params.get('a') || '');
  const [b, setB] = useState(params.get('b') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [upgrade, setUpgrade] = useState(null);
  const [runs, setRuns] = useState(0);
  const [lang, setLang] = useState(getLang());
  const pickLang = (code) => { setLang(code); saveLang(code); };

  const compare = async () => {
    if (!a.trim() || !b.trim()) return toast('Enter two tickers', { icon: '✍️' });
    setLoading(true); setResult(null); setUpgrade(null);
    try {
      const { data } = await api.post('/ai/compare-stocks', { symbol_a: a.trim(), symbol_b: b.trim(), language: lang });
      if (data.success) { setResult(data); setRuns((r) => r + 1); }
    } catch (err) {
      if (isUpgradeError(err)) setUpgrade(err.response.data.message);
      else toast.error(err.response?.data?.message || 'Comparison failed');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <PremiumShell
        wide icon={Brain} accentColor={ACCENT}
        eyebrow="Premium · AI comparison"
        title="Compare two stocks," accent="side by side."
        subtitle="Fundamentals, risk, and valuation — explained in plain language. Educational, not advice."
        motif={<BarsMotif color={ACCENT} />}
      >
        <>
            <UsageMeter feature="ai_comparison" refreshKey={runs} />
            <div className="psh-card">
              <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
                <TickerInput value={a} onChange={setA} placeholder="e.g. AAPL" label="Stock A" />
                <div className="hidden sm:grid place-items-center" style={{ paddingBottom: 6 }}>
                  <div className="psh-ico" style={{ width: 38, height: 38 }}><Scale size={17} /></div>
                </div>
                <TickerInput value={b} onChange={setB} placeholder="e.g. MSFT" label="Stock B" />
              </div>

              <div className="flex flex-wrap gap-1.5" style={{ marginTop: 14 }}>
                {POPULAR.map((t) => <button key={t} onClick={() => (!a ? setA(t) : setB(t))} className="psh-chip">{t}</button>)}
                <label className="ml-auto inline-flex items-center gap-2 psh-muted" style={{ fontSize: 13 }}>
                  <Globe size={14} />
                  <select value={lang} onChange={(e) => pickLang(e.target.value)} className="psh-select">
                    {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </label>
              </div>

              <button onClick={compare} disabled={loading} className="psh-btn psh-btn-lg" style={{ marginTop: 18 }}>
                {loading ? <><span className="psh-spin" /> Comparing…</> : <><Brain size={16} /> Compare with AI</>}
              </button>
            </div>

            {loading && (
              <div className="psh-card" style={{ marginTop: 16, textAlign: 'center', padding: 34 }}>
                <span className="psh-spin" style={{ width: 26, height: 26, borderWidth: 3, borderColor: 'var(--line2)', borderTopColor: 'var(--accent)' }} />
                <p className="psh-t" style={{ fontWeight: 700, marginTop: 12 }}>Reading both companies…</p>
              </div>
            )}
            {!loading && upgrade && <UpgradeNudge message={upgrade} />}
            {!loading && result && <Results result={result} />}
          </>
      </PremiumShell>
    </Layout>
  );
}

function TickerInput({ value, onChange, placeholder, label }) {
  return (
    <div style={{ minWidth: 0 }}>
      <label className="psh-label">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} placeholder={placeholder} className="psh-input" style={{ marginTop: 6 }} />
    </div>
  );
}

function Results({ result }) {
  const a = result.analysis || {};
  const shareSpec = {
    eyebrow: 'AI Stock Comparison', title: `${result.stock_a?.symbol} vs ${result.stock_b?.symbol}`,
    lines: [a.summary, a.bottom_line || a.which_for_what].filter(Boolean),
    footer: a.disclaimer || 'Educational only — not financial advice.',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="flex items-center justify-between gap-2">
        <span className="psh-faint" style={{ fontSize: 11 }}>{result.cached ? 'Cached result' : 'Fresh analysis'}</span>
        <ShareButton spec={shareSpec} filename={`compare-${result.stock_a?.symbol}-${result.stock_b?.symbol}.png`} label="Share result" />
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
      <p className="psh-faint" style={{ fontSize: 11, fontStyle: 'italic', textAlign: 'center' }}>{a.disclaimer}</p>
    </motion.div>
  );
}

const CCY = { USD: '$', NGN: '₦', GBP: '£', EUR: '€' };

function NameCard({ label, stock }) {
  const price = stock?.last_price;
  const sym = CCY[stock?.currency] || '';
  return (
    <div className="psh-card" style={{ minWidth: 0 }}>
      <p className="psh-label">{label}</p>
      <p className="psh-serif psh-t" style={{ fontWeight: 600, fontSize: '1.35rem', marginTop: 2 }}>{stock?.symbol}</p>
      <p className="psh-muted" style={{ fontSize: 12, lineHeight: 1.3 }}>{stock?.name}</p>
      {price != null && <p className="psh-mono psh-t" style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>{sym}{Number(price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>}
    </div>
  );
}

function Section({ title, body }) {
  if (!body) return null;
  return (
    <div className="psh-card">
      <p className="psh-label psh-gold" style={{ marginBottom: 6 }}>{title}</p>
      <ChatMarkdown tone="dark" className="psh-t">{body}</ChatMarkdown>
    </div>
  );
}

function KeyDifferences({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="psh-card">
      <p className="psh-label psh-gold" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><GitCompareArrows size={14} /> Key differences</p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((d, i) => <li key={i} className="psh-t" style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.5 }}><span style={{ marginTop: 7, width: 6, height: 6, borderRadius: 999, background: 'var(--accent)', flex: 'none' }} /><span>{d}</span></li>)}
      </ul>
    </div>
  );
}

function BottomLine({ body }) {
  if (!body) return null;
  return (
    <div className="psh-card" style={{ border: '1.5px solid var(--accent)', background: 'var(--raise)' }}>
      <p className="psh-label psh-gold" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><Flag size={14} /> Bottom line — your call</p>
      <ChatMarkdown tone="dark" className="psh-t">{body}</ChatMarkdown>
    </div>
  );
}

const FMT = {
  num1: (v) => Number(v).toFixed(1), num2: (v) => Number(v).toFixed(2), pct: (v) => `${(Number(v) * 100).toFixed(1)}%`,
  mcap: (v) => { const m = Number(v); if (m >= 1_000_000) return `$${(m / 1_000_000).toFixed(2)}T`; if (m >= 1_000) return `$${(m / 1_000).toFixed(1)}B`; return `$${m.toFixed(0)}M`; },
};
const METRIC_GROUPS = [
  { group: 'Valuation', rows: [['P/E ratio', 'valuation.pe_ratio', 'num1'], ['P/B ratio', 'valuation.pb_ratio', 'num2'], ['P/S ratio', 'valuation.ps_ratio', 'num2'], ['EV / EBITDA', 'valuation.ev_ebitda', 'num1'], ['PEG ratio', 'valuation.peg_ratio', 'num2'], ['Dividend yield', 'valuation.dividend_yield', 'pct'], ['Market cap', 'valuation.market_cap_millions', 'mcap']] },
  { group: 'Profitability', rows: [['Return on equity', 'profitability.roe', 'pct'], ['Return on assets', 'profitability.roa', 'pct'], ['Gross margin', 'profitability.gross_margin', 'pct'], ['Net margin', 'profitability.net_margin', 'pct']] },
  { group: 'Growth', rows: [['Revenue growth (YoY)', 'growth.revenue_growth_yoy', 'pct'], ['Earnings growth (YoY)', 'growth.earnings_growth_yoy', 'pct']] },
  { group: 'Balance sheet', rows: [['Debt / equity', 'balance_sheet.debt_to_equity', 'num2'], ['Current ratio', 'balance_sheet.current_ratio', 'num2']] },
  { group: 'Risk', rows: [['Beta', 'risk.beta', 'num2'], ['Volatility (1y)', 'risk.volatility_1y', 'pct'], ['Max drawdown (1y)', 'risk.max_drawdown_1y', 'pct']] },
  { group: 'Returns', rows: [['Return (1 month)', 'returns.return_1m', 'pct'], ['Return (6 months)', 'returns.return_6m', 'pct'], ['Return (1 year)', 'returns.return_1y', 'pct']] },
];
const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? null : o[k]), obj);
const fmt = (v, type) => (v === null || v === undefined || Number.isNaN(v) ? '—' : FMT[type](v));

function MetricsTable({ ma, mb, symA, symB }) {
  if (!ma || !mb) return null;
  return (
    <div className="psh-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px 12px' }}>
        <p className="psh-label psh-gold">The numbers, side by side</p>
        <p className="psh-faint" style={{ fontSize: 11, marginTop: 2 }}>Live where available. A dash (—) means it isn’t on file — the AI read still covers it.</p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="psh-mono" style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg2)', borderTop: '1px solid var(--line)' }}>
              <th className="psh-label" style={{ textAlign: 'left', padding: '8px 20px', fontFamily: 'var(--sans)' }}>Metric</th>
              <th className="psh-t" style={{ textAlign: 'right', padding: '8px 14px', fontWeight: 800, whiteSpace: 'nowrap' }}>{symA}</th>
              <th className="psh-t" style={{ textAlign: 'right', padding: '8px 20px', fontWeight: 800, whiteSpace: 'nowrap' }}>{symB}</th>
            </tr>
          </thead>
          <tbody>
            {METRIC_GROUPS.map((g) => {
              const rows = g.rows.filter(([, path]) => getPath(ma, path) != null || getPath(mb, path) != null);
              if (rows.length === 0) return null;
              return (
                <Fragment key={g.group}>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}><td colSpan={3} className="psh-label" style={{ padding: '6px 20px', fontFamily: 'var(--sans)' }}>{g.group}</td></tr>
                  {rows.map(([label, path, type]) => (
                    <tr key={path} style={{ borderTop: '1px solid var(--line)' }}>
                      <td className="psh-muted" style={{ padding: '8px 20px', fontFamily: 'var(--sans)', whiteSpace: 'nowrap' }}>{label}</td>
                      <td className="psh-t" style={{ textAlign: 'right', padding: '8px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(getPath(ma, path), type)}</td>
                      <td className="psh-t" style={{ textAlign: 'right', padding: '8px 20px', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(getPath(mb, path), type)}</td>
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
