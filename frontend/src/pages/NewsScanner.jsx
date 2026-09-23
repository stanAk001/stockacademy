import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Newspaper, Filter, AlertTriangle, ExternalLink, RefreshCw, Brain, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import ShareButton from '../components/ShareButton';
import PremiumShell, { BarsMotif } from '../components/ui/PremiumShell';
import { UsageMeter, UpgradeNudge, isUpgradeError } from '../components/ui/UsageMeter';
import ChatMarkdown from '../components/ChatMarkdown';
import { LANGS, getLang, setLang as saveLang } from '../lib/lang';
import api from '../services/api';

const POPULAR = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'NGX:DANGCEM', 'NGX:MTNN', 'NGX:GTCO'];
const ACCENT = '#E8B04B'; // one brand gold accent across all premium pages

export default function NewsScanner() {
  const [params] = useSearchParams();
  const [symbol, setSymbol] = useState(params.get('symbol') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [upgrade, setUpgrade] = useState(null);
  const [runs, setRuns] = useState(0);
  const [lang, setLang] = useState(getLang());
  const pickLang = (code) => { setLang(code); saveLang(code); };

  const scan = async () => {
    if (!symbol.trim()) return toast('Enter a ticker', { icon: '✍️' });
    setLoading(true); setResult(null); setUpgrade(null);
    try {
      const { data } = await api.post('/ai/scan-news', { symbol: symbol.trim(), language: lang });
      if (data.success) { setResult(data); setRuns((r) => r + 1); }
    } catch (err) {
      if (isUpgradeError(err)) setUpgrade(err.response.data.message);
      else toast.error(err.response?.data?.message || 'News scan failed');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <PremiumShell
        icon={Newspaper} accentColor={ACCENT}
        eyebrow="Premium · AI news scanner"
        title="Cut through the" accent="noise."
        subtitle="30 days of headlines, filtered by AI down to the handful that actually move a company — earnings, lawsuits, leadership, regulation, deals. The rest gets thrown out."
        motif={<BarsMotif color={ACCENT} />}
      >
        <>
            <UsageMeter feature="ai_news" refreshKey={runs} />
            <div className="psh-card">
              <p className="psh-label" style={{ marginBottom: 8 }}>Stock ticker</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && scan()}
                  placeholder="e.g. AAPL or NGX:DANGCEM" className="psh-input" style={{ flex: 1 }} />
                <button onClick={scan} disabled={loading} className="psh-btn" style={{ flex: 'none' }}>
                  {loading ? <><span className="psh-spin" /> Scanning…</> : <><Newspaper size={16} /> Scan news</>}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5" style={{ marginTop: 12 }}>
                {POPULAR.map((t) => <button key={t} onClick={() => setSymbol(t)} className="psh-chip">{t}</button>)}
                <label className="ml-auto inline-flex items-center gap-2 psh-muted" style={{ fontSize: 13 }}>
                  <Globe size={14} />
                  <select value={lang} onChange={(e) => pickLang(e.target.value)} className="psh-select">
                    {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {loading && (
              <div className="psh-card" style={{ marginTop: 16, textAlign: 'center', padding: 34 }}>
                <span className="psh-spin" style={{ width: 26, height: 26, borderWidth: 3, borderColor: 'var(--line2)', borderTopColor: 'var(--accent)' }} />
                <p className="psh-t" style={{ fontWeight: 700, marginTop: 12 }}>Scanning ~30 days of news…</p>
                <p className="psh-faint" style={{ fontSize: 12.5, marginTop: 4 }}>This takes 15–30 seconds — the AI is reading every headline.</p>
              </div>
            )}

            {!loading && upgrade && <UpgradeNudge message={upgrade} />}
            {!loading && result && <Results result={result} onRescan={scan} />}
          </>
      </PremiumShell>
    </Layout>
  );
}

function Results({ result, onRescan }) {
  const a = result.analysis || {};
  const events = a.material_events || [];
  const shareSpec = {
    eyebrow: 'AI News Scanner', title: `${result.name || result.symbol} — what matters`,
    lines: [a.summary, ...events.slice(0, 3).map((e) => `• ${e.headline}`)].filter(Boolean),
    footer: a.disclaimer || 'Educational only — not financial advice.',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="flex flex-wrap items-center justify-between gap-2 psh-faint" style={{ fontSize: 11 }}>
        <span>{result.name} ({result.symbol}) · scanned {result.articles_scanned} items{result.cached ? ' · cached' : ''}</span>
        <button onClick={onRescan} className="psh-link-gold" style={{ background: 'none', border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><RefreshCw size={12} /> Re-scan</button>
      </div>

      {a.summary && (
        <div className="psh-card">
          <p className="psh-label psh-gold" style={{ marginBottom: 6 }}>The gist</p>
          <ChatMarkdown tone="dark" className="psh-t">{a.summary}</ChatMarkdown>
        </div>
      )}

      <div className="psh-card psh-card-2" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(63,207,142,.14)', color: 'var(--green)', display: 'grid', placeItems: 'center', flex: 'none' }}><Filter size={16} /></div>
        <p className="psh-t" style={{ fontSize: 13.5 }}>Filtered out <b className="psh-bull">{a.noise_filtered_out} irrelevant {a.noise_filtered_out === 1 ? 'item' : 'items'}</b> so you only read what matters.</p>
      </div>

      {a.risk_flags?.length > 0 && (
        <div className="psh-card psh-card-2" style={{ borderLeft: '3px solid var(--red)' }}>
          <p className="psh-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--red)' }}><AlertTriangle size={13} /> Worth watching</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {a.risk_flags.map((f, i) => <li key={i} className="psh-t" style={{ display: 'flex', gap: 8, fontSize: 13.5 }}><span style={{ color: 'var(--red)', flex: 'none' }}>•</span><span>{f}</span></li>)}
          </ul>
        </div>
      )}

      <div>
        <p className="psh-label" style={{ marginBottom: 10 }}>What actually matters {events.length > 0 ? `(${events.length})` : ''}</p>
        {events.length === 0 ? (
          <div className="psh-card psh-muted" style={{ textAlign: 'center', padding: 24, fontSize: 13 }}>No material events in the last 30 days.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {events.map((e, i) => (
              <div key={i} className="psh-card psh-lift" style={{ display: 'flex', gap: 12 }}>
                {e.date && <span className="psh-mono psh-muted" style={{ flex: 'none', fontSize: 10.5, fontWeight: 700, background: 'var(--bg2)', borderRadius: 8, padding: '4px 8px', height: 'fit-content', whiteSpace: 'nowrap' }}>{e.date}</span>}
                <div style={{ minWidth: 0 }}>
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="psh-serif psh-t" style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3, textDecoration: 'none', display: 'inline-flex', gap: 4, alignItems: 'start' }}>
                      <span>{e.headline}</span><ExternalLink size={12} style={{ flex: 'none', marginTop: 4, opacity: .5 }} />
                    </a>
                  ) : <p className="psh-serif psh-t" style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{e.headline}</p>}
                  {e.why_it_matters && <p className="psh-muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.45 }}><span className="psh-t" style={{ fontWeight: 600 }}>Why it matters: </span>{e.why_it_matters}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {a.bottom_line && (
        <div className="psh-card psh-raise" style={{ borderColor: 'rgba(232,176,75,.25)' }}>
          <p className="psh-label psh-gold" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><Brain size={13} /> What this means for you</p>
          <ChatMarkdown tone="dark" className="psh-t">{a.bottom_line}</ChatMarkdown>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <ShareButton spec={shareSpec} filename={`news-${result.symbol}.png`} label="Share summary" />
        <Link to="/compare-stocks" className="psh-ghost psh-btn" style={{ fontSize: 12.5, padding: '9px 15px', textDecoration: 'none' }}><Brain size={13} /> Compare two stocks</Link>
      </div>
      <p className="psh-faint" style={{ fontSize: 11, fontStyle: 'italic', textAlign: 'center' }}>{a.disclaimer}</p>
    </motion.div>
  );
}
