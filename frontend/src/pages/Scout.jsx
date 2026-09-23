import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Radar, TrendingUp, TrendingDown, Minus, ChevronDown, Brain, Info,
  Target, ShieldAlert, Crosshair, Check, FileText, Activity, Globe, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import PremiumShell, { BarsMotif } from '../components/ui/PremiumShell';
import { UsageMeter, UpgradeNudge, isUpgradeError } from '../components/ui/UsageMeter';
import ChatMarkdown from '../components/ChatMarkdown';
import { LANGS, getLang, setLang as saveLang } from '../lib/lang';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const OBJECTIVES = [
  {
    id: 'swing', label: 'Swing trading', hint: 'Setups over days to weeks', motif: 'swing',
    blurb: 'Catch moves that play out over days to a few weeks — with a plan for every trade.',
    features: ['Entry zone, targets & risk/reward', 'Tracked with lifecycle alerts', 'A transparent setup-quality score'],
    example: 'e.g. a breakout — entry $142 → target $168, stop $135',
  },
  {
    id: 'longterm', label: 'Long-term', hint: 'Quality businesses to hold', motif: 'growth',
    blurb: 'Find durable, quality businesses to buy and hold with conviction.',
    features: ['A deep fundamental research report', 'Bear · base · bull scenarios', 'A quality tier — with the reasons'],
    example: 'e.g. compounders ranked by profitability & growth',
  },
  {
    id: 'explore', label: 'Explore', hint: 'Show me what stands out', motif: 'radar',
    blurb: 'Not sure yet? Let the AI surface whatever is most notable right now.',
    features: ['The strongest of both worlds', 'Ranked by opportunity quality', 'A quick read on the market'],
    example: "e.g. today's most notable movers & setups",
  },
];
const MARKETS = [{ id: 'ALL', label: 'Both' }, { id: 'US', label: '🇺🇸 US' }, { id: 'NG', label: '🇳🇬 NGX' }];
const ACCENT = '#E8B04B'; // one brand gold accent across all premium pages

const ccy = (c) => (c === 'NGN' ? '₦' : '$');
const readLS = (k, fb) => { try { return localStorage.getItem(k) || fb; } catch { return fb; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private */ } };

export default function Scout() {
  const { user } = useAuth();
  const [objective, setObjective] = useState(() => readLS('sa_objective', user?.objective || 'swing'));
  const [market, setMarket] = useState(() => readLS('sa_market', user?.preferred_market || 'ALL'));
  const [lang, setLang] = useState(getLang());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [regime, setRegime] = useState(null);
  const [upgrade, setUpgrade] = useState(null);
  const [runs, setRuns] = useState(0);
  const isPremium = user?.plan === 'premium';

  const pickObjective = (o) => { setObjective(o); writeLS('sa_objective', o); api.patch('/users/objective', { objective: o }).catch(() => {}); };
  const pickMarket = (m) => { setMarket(m); writeLS('sa_market', m); api.patch('/users/objective', { preferred_market: m === 'ALL' ? null : m }).catch(() => {}); };
  const pickLang = (code) => { setLang(code); saveLang(code); };

  useEffect(() => {
    if (!isPremium) return;
    api.get('/ai/market-regime', { params: market !== 'ALL' ? { market } : {} })
      .then(({ data: r }) => r.success && setRegime(r.regime)).catch(() => {});
  }, [isPremium, market]);

  const run = async () => {
    setLoading(true); setData(null); setUpgrade(null);
    try {
      const { data: res } = await api.get('/ai/scout', { params: { objective, market, language: lang } });
      if (res.success) { setData(res); setRuns((r) => r + 1); }
    } catch (err) {
      if (isUpgradeError(err)) setUpgrade(err.response.data.message);
      else toast.error(err.response?.data?.message || 'Scout failed');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <PremiumShell
        icon={Radar} accentColor={ACCENT}
        eyebrow="Premium · AI Stock Scout"
        title="Let the AI find the" accent="opportunities."
        subtitle="Tell it what you're trying to do. It scans the market on real data, ranks what stands out, and explains why — so you don't screen hundreds of stocks by hand."
        motif={<BarsMotif color={ACCENT} />}
      >
        <>
            <UsageMeter feature="ai_scout" refreshKey={runs} />
            {regime && regime.label !== 'unknown' && <RegimeBanner regime={regime} />}

            {/* Controls */}
            <div className="psh-card">
              <ObjectivePicker value={objective} onChange={pickObjective} />
              <Link to="/investment-profile" className="psh-link-gold" style={{ fontSize: 12, display: 'inline-block', marginTop: 10, textDecoration: 'none' }}>
                Tune the ranking to your profile →
              </Link>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                {MARKETS.map((m) => (
                  <button key={m.id} onClick={() => pickMarket(m.id)} className={`psh-toggle ${market === m.id ? 'is-on' : ''}`}>{m.label}</button>
                ))}
                <label className="ml-auto inline-flex items-center gap-2 psh-muted" style={{ fontSize: 13 }}>
                  <Globe size={14} />
                  <select value={lang} onChange={(e) => pickLang(e.target.value)} className="psh-select">
                    {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </label>
              </div>

              <button onClick={run} disabled={loading} className="psh-btn psh-btn-lg" style={{ marginTop: 16 }}>
                {loading ? <><span className="psh-spin" /> Scanning the market…</> : <><Radar size={17} /> Scan for opportunities</>}
              </button>
            </div>

            {loading && (
              <div className="psh-card" style={{ marginTop: 16, textAlign: 'center', padding: 34 }}>
                <span className="psh-spin" style={{ width: 26, height: 26, borderWidth: 3 }} />
                <p className="psh-t" style={{ fontWeight: 700, marginTop: 12 }}>Reading real market data…</p>
                <p className="psh-faint" style={{ fontSize: 12.5, marginTop: 4 }}>Ranking candidates, then explaining the strongest — 15–30 seconds.</p>
              </div>
            )}

            {!loading && upgrade && <UpgradeNudge message={upgrade} />}
            {!loading && data && <Results data={data} onRescan={run} lang={lang} />}
          </>
      </PremiumShell>
    </Layout>
  );
}

const REGIME = {
  bullish: { c: 'var(--green)', t: 'Bullish' },
  bearish: { c: 'var(--red)', t: 'Bearish' },
  sideways: { c: 'var(--accent)', t: 'Sideways' },
};

function RegimeBanner({ regime }) {
  const st = REGIME[regime.label] || REGIME.sideways;
  const b = regime.breadth;
  return (
    <div className="psh-card psh-card-2" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start', padding: 15 }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: st.c, marginTop: 6, flex: 'none' }} />
      <div style={{ minWidth: 0 }}>
        <p className="psh-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={12} /> Market conditions · <span style={{ color: st.c }}>{st.t}</span>
        </p>
        <p className="psh-t" style={{ fontSize: 13, marginTop: 4, lineHeight: 1.45 }}>{regime.note}</p>
        {b && <p className="psh-faint psh-mono" style={{ fontSize: 11, marginTop: 4 }}>{b.bullish_pct}% trending up · avg RSI {b.avg_rsi ?? '—'} · {b.setups_pct}% with a setup</p>}
      </div>
    </div>
  );
}

function Results({ data, onRescan, lang }) {
  const list = data.candidates || [];
  if (!list.length) {
    return (
      <div className="psh-card" style={{ marginTop: 16, textAlign: 'center', padding: 34 }}>
        <Info size={24} className="psh-faint" style={{ margin: '0 auto 10px', display: 'block' }} />
        <p className="psh-serif" style={{ fontSize: '1.15rem', fontWeight: 600 }}>Nothing actionable right now</p>
        <p className="psh-muted" style={{ fontSize: 13, maxWidth: 340, margin: '4px auto 0' }}>{data.empty_reason || 'No candidates passed the screen. Check back after the next scan.'}</p>
      </div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {data.market_note && (
        <div className="psh-card psh-raise" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 15, borderColor: 'rgba(232,176,75,.25)' }}>
          <Brain size={16} style={{ color: ACCENT, flex: 'none', marginTop: 2 }} />
          <p className="psh-t" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{data.market_note}</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="psh-faint" style={{ fontSize: 11 }}>{list.length} candidate{list.length === 1 ? '' : 's'} · {data.cached ? 'cached' : 'fresh'}</span>
        <button onClick={onRescan} className="psh-link-gold" style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 12 }}>Re-scan ↻</button>
      </div>
      {list.map((c) => <Candidate key={c.symbol} c={c} objective={data.objective} lang={lang} />)}
      <p className="psh-faint" style={{ fontSize: 11, fontStyle: 'italic', textAlign: 'center' }}>{data.disclaimer}</p>
    </motion.div>
  );
}

const SETUP_LABEL = { breakout: 'Breakout', pullback: 'Pullback', trend_continuation: 'Trend continuation', support_bounce: 'Support bounce', none: 'No setup' };

function Candidate({ c, objective, lang }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const trendCol = c.trend === 'bullish' ? 'var(--green)' : c.trend === 'bearish' ? 'var(--red)' : 'var(--faint)';
  const TrendIcon = c.trend === 'bullish' ? TrendingUp : c.trend === 'bearish' ? TrendingDown : Minus;

  const getPlan = async () => {
    setPlanLoading(true);
    try {
      const { data } = await api.get(`/ai/swing/${c.symbol}`, { params: { language: lang } });
      if (data.success) { if (data.setup === 'none') toast(data.message || 'No setup right now', { icon: '👀' }); else { setPlan(data); toast.success('Entry plan ready — now tracking'); } }
    } catch (err) { toast.error(err.response?.data?.message || 'Could not build the entry plan'); }
    finally { setPlanLoading(false); }
  };
  const getReport = async () => {
    setReportLoading(true);
    try { const { data } = await api.get(`/ai/research/${c.symbol}`, { params: { language: lang } }); if (data.success) setReport(data); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not build the research report'); }
    finally { setReportLoading(false); }
  };

  return (
    <div className="psh-card psh-lift">
      <div className="flex items-start justify-between gap-3">
        <div style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/stocks/${c.symbol}`} className="psh-serif psh-t" style={{ fontSize: '1.25rem', fontWeight: 600, textDecoration: 'none' }}>{c.symbol}</Link>
            <span className="psh-badge">{c.market}</span>
            {c.setup && c.setup !== 'none' && <span className="psh-badge psh-badge-gold">{SETUP_LABEL[c.setup] || c.setup}</span>}
          </div>
          <p className="psh-muted" style={{ fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}{c.sector ? ` · ${c.sector}` : ''}</p>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          {c.price != null && <p className="psh-mono psh-t" style={{ fontWeight: 700 }}>{ccy(c.currency)}{Number(c.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>}
          <p style={{ fontSize: 11, fontWeight: 600, color: trendCol, display: 'inline-flex', alignItems: 'center', gap: 4 }}><TrendIcon size={12} /> {c.trend || '—'}</p>
        </div>
      </div>

      {c.headline && <p className="psh-t" style={{ fontSize: 13.5, fontWeight: 600, marginTop: 12, lineHeight: 1.45 }}>{c.headline}</p>}

      {objective !== 'longterm' && c.setup_quality != null && <SetupQuality score={c.setup_quality} factors={c.factors} open={open} setOpen={setOpen} />}
      {objective === 'longterm' && c.quality_tier && (
        <div style={{ marginTop: 12 }}><span className="psh-badge psh-badge-gold" style={{ textTransform: 'capitalize' }}>{c.quality_tier} quality</span></div>
      )}

      <div className="grid sm:grid-cols-2 gap-x-5 gap-y-3" style={{ marginTop: 16 }}>
        <ReasonList label="Why it surfaced" items={c.why} tone="bull" />
        <ReasonList label="What to watch" items={c.watch} tone="ink" />
        {c.risks?.length > 0 && <ReasonList label="What could go wrong" items={c.risks} tone="bear" />}
        {c.suits && <div><p className="psh-label" style={{ marginBottom: 4 }}>Who it suits</p><p className="psh-muted" style={{ fontSize: 13, lineHeight: 1.45 }}>{c.suits}</p></div>}
      </div>

      {c.setup_reason && objective !== 'longterm' && <p className="psh-faint" style={{ fontSize: 11, marginTop: 12, fontStyle: 'italic' }}>{c.setup_reason}</p>}

      {objective !== 'longterm' && c.setup && c.setup !== 'none' && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          {!plan ? (
            <button onClick={getPlan} disabled={planLoading} className="psh-ghost psh-btn" style={{ fontSize: 12.5, padding: '9px 15px' }}>
              {planLoading ? <><span className="psh-spin" style={{ borderTopColor: 'var(--accent)' }} /> Building your plan…</> : <><Crosshair size={13} /> Get AI entry plan &amp; track it</>}
            </button>
          ) : <EntryPlan plan={plan} />}
        </div>
      )}

      {objective === 'longterm' && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
          {!report ? (
            <button onClick={getReport} disabled={reportLoading} className="psh-ghost psh-btn" style={{ fontSize: 12.5, padding: '9px 15px' }}>
              {reportLoading ? <><span className="psh-spin" style={{ borderTopColor: 'var(--accent)' }} /> Writing the report…</> : <><FileText size={13} /> Full research report</>}
            </button>
          ) : <ResearchReport data={report} />}
        </div>
      )}
    </div>
  );
}

function ResearchReport({ data }) {
  const r = data.report || {};
  const SECTIONS = [['Business quality', r.business_quality], ['Growth', r.growth], ['Profitability', r.profitability], ['Balance sheet', r.balance_sheet], ['Valuation', r.valuation], ['Dividend', r.dividend]];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="psh-label psh-gold">Research report</span>
        {r.quality_tier && <span className="psh-badge psh-badge-gold" style={{ textTransform: 'capitalize' }}>{r.quality_tier} quality</span>}
      </div>
      {r.summary && <p className="psh-t" style={{ fontSize: 13, lineHeight: 1.5 }}>{r.summary}</p>}
      {r.quality_reasons?.length > 0 && (
        <div className="psh-card psh-card-2" style={{ padding: 12 }}>
          <p className="psh-label" style={{ marginBottom: 4 }}>Why this quality tier</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {r.quality_reasons.map((q, i) => <li key={i} className="psh-muted" style={{ display: 'flex', gap: 6, fontSize: 12, marginBottom: 2 }}><span style={{ color: 'var(--green)' }}>•</span><span>{q}</span></li>)}
          </ul>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SECTIONS.filter(([, v]) => v).map(([label, v]) => (
          <div key={label}><p className="psh-label" style={{ marginBottom: 2 }}>{label}</p><ChatMarkdown tone="dark" className="psh-muted" >{v}</ChatMarkdown></div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {[['Bear case', r.bear_case, 'var(--red)'], ['Base case', r.base_case, 'var(--faint)'], ['Bull case', r.bull_case, 'var(--green)']].filter(([, v]) => v).map(([label, v, col]) => (
          <div key={label} className="psh-card psh-card-2" style={{ padding: 12, borderLeft: `3px solid ${col}` }}>
            <p className="psh-label" style={{ marginBottom: 2 }}>{label}</p><p className="psh-t" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{v}</p>
          </div>
        ))}
      </div>
      {r.risks?.length > 0 && <ReasonList label="Key risks" items={r.risks} tone="bear" />}
      {r.catalysts?.length > 0 && <ReasonList label="Catalysts to watch" items={r.catalysts} tone="bull" />}
      <p className="psh-faint" style={{ fontSize: 10, fontStyle: 'italic' }}>{data.disclaimer}</p>
    </motion.div>
  );
}

function EntryPlan({ plan }) {
  const sym = ccy(plan.currency); const p = plan.plan;
  const money = (v) => `${sym}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="flex items-center gap-2">
        <span className="psh-label psh-gold">The entry plan</span>
        <span className="psh-badge psh-badge-green"><Check size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> Tracking</span>
      </div>
      {plan.thesis && <p className="psh-t" style={{ fontSize: 13, lineHeight: 1.5 }}>{plan.thesis}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <PlanStat icon={Crosshair} label="Entry zone" value={`${money(p.entry_low)}–${money(p.entry_high)}`} />
        <PlanStat icon={ShieldAlert} label="Invalidation" value={money(p.invalidation)} col="var(--red)" />
        <PlanStat icon={Target} label="Target 1" value={money(p.targets[0]?.level)} col="var(--green)" />
        <PlanStat label="Risk / reward" value={`1 : ${p.risk_reward}`} col="var(--accent)" />
      </div>
      <div className="psh-card psh-card-2" style={{ padding: 12 }}>
        <span className="psh-t" style={{ fontSize: 12.5 }}><b>Confirmation: </b><span className="psh-muted">{p.trigger}</span></span>
      </div>
      {plan.timeframes && <TimeframePanel mtf={plan.timeframes} />}
      {p.targets?.length > 1 && <p className="psh-muted" style={{ fontSize: 11 }}>Targets: {p.targets.map((t) => `${money(t.level)} (${t.r_multiple}R, ${t.basis})`).join(' · ')}</p>}
      {p.approximate && <p className="psh-gold" style={{ fontSize: 11 }}>Levels are approximate — this market only reports daily closing prices, so intraday range isn’t available.</p>}
      {plan.risks?.length > 0 && <ReasonList label="What could go wrong" items={plan.risks} tone="bear" />}
      <p className="psh-faint" style={{ fontSize: 10, fontStyle: 'italic' }}>{plan.disclaimer}</p>
    </motion.div>
  );
}

// Weekly → 1H read from the Swing Radar (spec §6). Each row is one timeframe's
// job in the plan; the badge says whether they line up.
const TF_ROWS = [
  ['1wk', 'Weekly', 'Macro trend'],
  ['1d', 'Daily', 'Primary setup'],
  ['4h', '4H', 'Entry structure'],
  ['1h', '1H', 'Confirmation'],
];
const ALIGN_LABEL = {
  aligned_bullish: 'Timeframes aligned',
  pullback_in_uptrend: 'Pullback in an uptrend',
  mixed: 'Timeframes mixed',
  counter_trend: 'Counter-trend',
  aligned_bearish: 'All timeframes down',
  insufficient: 'Not enough data',
};

function TimeframePanel({ mtf }) {
  const s = mtf.summary || {};
  const good = s.alignment === 'aligned_bullish' || s.alignment === 'pullback_in_uptrend';
  const trendCol = (t) => (t === 'bullish' ? 'var(--green)' : t === 'bearish' ? 'var(--red)' : 'var(--muted)');
  return (
    <div className="psh-card psh-card-2" style={{ padding: 14 }}>
      <div className="flex items-center justify-between gap-2 flex-wrap" style={{ marginBottom: 8 }}>
        <span className="psh-label">Multi-timeframe read</span>
        <span className={`psh-badge ${good ? 'psh-badge-green' : 'psh-badge-gold'}`}>{ALIGN_LABEL[s.alignment] || 'Timeframes mixed'}</span>
      </div>
      {s.note && <p className="psh-muted" style={{ fontSize: 12, lineHeight: 1.45, marginBottom: 10 }}>{s.note}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {TF_ROWS.map(([k, label, role]) => {
          const f = mtf.frames?.[k];
          const ok = f?.available;
          return (
            <div key={k} className="grid items-center gap-2" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) minmax(0,0.8fr) minmax(0,1.1fr)', fontSize: 11.5, padding: '6px 0', borderTop: '1px solid var(--line)' }}>
              <span style={{ minWidth: 0 }}>
                <span className="psh-mono psh-t" style={{ fontWeight: 700 }}>{label}</span>
                <span className="psh-faint" style={{ display: 'block', fontSize: 10 }}>{role}</span>
              </span>
              <span className="psh-mono" style={{ color: ok ? trendCol(f.trend) : 'var(--faint)', textTransform: 'capitalize' }}>{ok ? f.trend : 'n/a'}</span>
              <span className="psh-mono psh-muted">{ok && f.rsi14 != null ? `RSI ${Math.round(f.rsi14)}` : '—'}</span>
              <span className="psh-mono" style={{ color: !ok || f.vwap == null ? 'var(--faint)' : f.above_vwap ? 'var(--green)' : 'var(--red)' }}>
                {!ok ? '—' : f.vwap == null ? (f.momentum === 'unknown' ? '—' : `MACD ${f.momentum}`) : f.above_vwap ? 'Above VWAP' : 'Below VWAP'}
              </span>
            </div>
          );
        })}
      </div>

      {s.confirmation && (
        <p className="psh-t" style={{ fontSize: 12, lineHeight: 1.45, marginTop: 10 }}>
          <b>Lower-timeframe confirmation: </b><span className="psh-muted">{s.confirmation}</span>{' '}
          <span className={`psh-badge ${s.lower_confirmed ? 'psh-badge-green' : 'psh-badge-gold'}`}>{s.lower_confirmed ? 'Met' : 'Waiting'}</span>
        </p>
      )}
      {mtf.note && <p className="psh-gold" style={{ fontSize: 11, marginTop: 8 }}>{mtf.note}</p>}
    </div>
  );
}

function PlanStat({ icon: Icon, label, value, col = 'var(--text)' }) {
  return (
    <div className="psh-card psh-card-2" style={{ padding: '10px 12px' }}>
      <p className="psh-label" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>{Icon && <Icon size={11} />}{label}</p>
      <p className="psh-mono" style={{ fontWeight: 700, fontSize: 13, color: col }}>{value}</p>
    </div>
  );
}

function SetupQuality({ score, factors, open, setOpen }) {
  const col = score >= 75 ? 'var(--green)' : score >= 55 ? 'var(--accent)' : 'var(--red)';
  return (
    <div style={{ marginTop: 14 }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }} aria-expanded={open}>
        <div className="flex items-center justify-between" style={{ marginBottom: 5 }}>
          <span className="psh-label">Setup quality</span>
          <span className="psh-mono psh-t" style={{ fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{score}/100 <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', color: 'var(--faint)' }} /></span>
        </div>
        <div className="psh-meter-track"><span className="psh-meter-fill" style={{ width: `${Math.max(4, score)}%`, background: col }} /></div>
        {!open && <p className="psh-faint" style={{ fontSize: 10.5, marginTop: 4 }}>Tap to see why — every point traces to a real metric</p>}
      </button>
      <AnimatePresence>
        {open && factors?.length > 0 && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', margin: '8px 0 0', padding: 0, listStyle: 'none' }}>
            {factors.map((f, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3" style={{ fontSize: 12, padding: '5px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ minWidth: 0 }}><span className="psh-t" style={{ fontWeight: 700 }}>{f.label}</span>{f.detail && <span className="psh-muted"> — {f.detail}</span>}</span>
                <span className="psh-mono" style={{ fontWeight: 700, flex: 'none', color: f.points >= 0 ? 'var(--green)' : 'var(--red)' }}>{f.points >= 0 ? '+' : ''}{f.points}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- the expressive objective picker -------------------------------------
function ObjectivePicker({ value, onChange }) {
  const reduce = useReducedMotion();
  const sel = OBJECTIVES.find((o) => o.id === value) || OBJECTIVES[0];
  return (
    <div>
      <p className="psh-label" style={{ marginBottom: 12 }}>What are you trying to do?</p>
      {/* three across at every width — the tiles shrink rather than stack */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
        {OBJECTIVES.map((o) => {
          const active = value === o.id;
          const mColor = active ? '#161005' : 'var(--accent)';
          return (
            <motion.button
              key={o.id}
              onClick={() => onChange(o.id)}
              whileHover={reduce ? undefined : { y: -4 }}
              whileTap={{ scale: 0.99 }}
              animate={{ boxShadow: active ? '0 18px 42px -18px rgba(232,176,75,.55)' : '0 0 0 rgba(0,0,0,0)' }}
              className="p-2.5 sm:p-4 min-w-0"
              style={{
                textAlign: 'left', cursor: 'pointer', borderRadius: 14, position: 'relative', overflow: 'hidden',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                background: active ? 'linear-gradient(158deg,#F5C868,#E8B04B)' : 'var(--bg2)',
                color: active ? '#161005' : 'var(--text)',
                transition: 'background .28s ease, border-color .28s ease',
              }}
            >
              <Motif type={o.motif} color={mColor} reduce={reduce} />
              <div className="flex items-center justify-between gap-1.5 mt-2 sm:mt-3">
                <span className="psh-serif text-[12.5px] sm:text-[1.05rem] leading-tight min-w-0" style={{ fontWeight: 600 }}>{o.label}</span>
                {active && (
                  <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                    className="w-4 h-4 sm:w-5 sm:h-5 shrink-0"
                    style={{ borderRadius: 999, background: '#161005', color: '#F5C868', display: 'grid', placeItems: 'center' }}>
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </motion.span>
                )}
              </div>
              <span className="block text-[10px] sm:text-xs mt-0.5 sm:mt-1 leading-snug"
                style={{ color: active ? 'rgba(22,16,5,.68)' : 'var(--muted)' }}>{o.hint}</span>
            </motion.button>
          );
        })}
      </div>

      {/* What the AI actually does for this goal */}
      <AnimatePresence mode="wait">
        <motion.div key={sel.id}
          initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }} className="psh-card psh-card-2" style={{ marginTop: 12, padding: 16 }}>
          <div className="flex items-start gap-2.5">
            <span style={{ color: 'var(--accent)', marginTop: 1, flex: 'none' }}><Sparkles size={15} /></span>
            <p className="psh-t" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{sel.blurb}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-x-4 gap-y-2" style={{ marginTop: 12 }}>
            {sel.features.map((f, i) => (
              <motion.div key={f} initial={reduce ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.06 }}
                style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent)', marginTop: 1, flex: 'none' }}><Check size={14} /></span>
                <span className="psh-muted" style={{ fontSize: 12.5, lineHeight: 1.4 }}>{f}</span>
              </motion.div>
            ))}
          </div>
          <p className="psh-mono psh-faint" style={{ fontSize: 11, marginTop: 12, fontStyle: 'italic' }}>{sel.example}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Motif({ type, color, reduce }) {
  if (type === 'swing') return <SwingMotif color={color} reduce={reduce} />;
  if (type === 'growth') return <GrowthMotif color={color} reduce={reduce} />;
  return <RadarMotif color={color} reduce={reduce} />;
}

function SwingMotif({ color, reduce }) {
  return (
    <svg viewBox="0 0 120 40" width="100%" className="block h-7 sm:h-10" fill="none" aria-hidden="true">
      <motion.polyline points="4,30 24,14 44,32 64,10 84,26 116,6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeOut' }} />
      <motion.circle cx="44" cy="32" r="3" fill={color} animate={reduce ? undefined : { scale: [1, 1.4, 1] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.6 }} />
      <motion.circle cx="116" cy="6" r="3.2" fill={color} animate={reduce ? undefined : { scale: [1, 1.45, 1] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.4, repeatDelay: 0.6 }} />
    </svg>
  );
}

function GrowthMotif({ color, reduce }) {
  return (
    <svg viewBox="0 0 120 40" width="100%" className="block h-7 sm:h-10" fill="none" aria-hidden="true">
      <defs><linearGradient id="scout-gm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d="M4,36 C36,34 62,24 116,5 L116,40 L4,40 Z" fill="url(#scout-gm)" />
      <motion.path d="M4,36 C36,34 62,24 116,5" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none"
        initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
      <motion.circle cx="116" cy="5" r="3.2" fill={color} animate={reduce ? undefined : { scale: [1, 1.45, 1] }} transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 0.5 }} />
    </svg>
  );
}

function RadarMotif({ color, reduce }) {
  const dots = [[26, 12], [46, 26], [64, 8], [82, 28], [98, 16], [110, 30], [54, 34]];
  return (
    <svg viewBox="0 0 120 40" width="100%" className="block h-7 sm:h-10" fill="none" aria-hidden="true">
      <circle cx="8" cy="34" r="11" stroke={color} strokeOpacity="0.28" strokeWidth="1.4" />
      <circle cx="8" cy="34" r="21" stroke={color} strokeOpacity="0.16" strokeWidth="1.4" />
      <circle cx="8" cy="34" r="31" stroke={color} strokeOpacity="0.08" strokeWidth="1.4" />
      {dots.map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r="2.2" fill={color}
          initial={{ opacity: 0.3 }} animate={reduce ? { opacity: 0.75 } : { opacity: [0.2, 1, 0.2], scale: [1, 1.35, 1] }}
          transition={{ duration: 1.9, repeat: Infinity, delay: i * 0.22 }} />
      ))}
    </svg>
  );
}

function ReasonList({ label, items, tone }) {
  if (!items?.length) return null;
  const dot = tone === 'bull' ? 'var(--green)' : tone === 'bear' ? 'var(--red)' : 'var(--faint)';
  return (
    <div>
      <p className="psh-label" style={{ marginBottom: 4 }}>{label}</p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((it, i) => <li key={i} className="psh-muted" style={{ display: 'flex', gap: 6, fontSize: 13, lineHeight: 1.45 }}><span style={{ color: dot, flex: 'none', marginTop: 1 }}>•</span><span style={{ minWidth: 0 }}>{it}</span></li>)}
      </ul>
    </div>
  );
}
