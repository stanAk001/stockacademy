import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Radar as RadarIcon, TrendingUp, TrendingDown, Minus, Flame, Eye, Search, Lock } from 'lucide-react';
import Layout from '../components/Layout';
import PremiumShell, { BarsMotif } from '../components/ui/PremiumShell';
import api from '../services/api';
import { track } from '../lib/analytics';

const MARKETS = [{ id: 'ALL', label: 'Both' }, { id: 'US', label: '🇺🇸 US' }, { id: 'NG', label: '🇳🇬 NGX' }];
const ACCENT = '#E8B04B'; // one brand gold accent across all premium pages

export default function Radar() {
  const [market, setMarket] = useState('ALL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (m) => {
    setLoading(true);
    try { const { data: res } = await api.get('/ai/opportunities', { params: m && m !== 'ALL' ? { market: m } : {} }); if (res.success) setData(res); }
    catch { setData({ opportunities: [] }); } finally { setLoading(false); }
  };
  // Everyone loads the board; the server trims it to a preview for Free users.
  useEffect(() => { load(market); }, [market]);

  const ops = data?.opportunities || [];
  const strong = ops.filter((o) => (o.quality_score ?? 0) >= 75);
  const developing = ops.filter((o) => (o.quality_score ?? 0) >= 55 && (o.quality_score ?? 0) < 75);
  const rest = ops.filter((o) => (o.quality_score ?? 0) < 55);

  return (
    <Layout>
      <PremiumShell
        wide icon={RadarIcon} accentColor={ACCENT}
        eyebrow="Premium · Opportunity Radar"
        title="The strongest setups," accent="all in one view."
        subtitle="A live board of what the AI Scout has surfaced across US and NGX — ranked by setup quality, refreshed as the market moves."
        motif={<BarsMotif color={ACCENT} />}
      >
        {(
          <>
            <div className="flex items-center justify-between gap-3" style={{ marginBottom: 18 }}>
              <div className="flex gap-2">
                {MARKETS.map((m) => <button key={m.id} onClick={() => setMarket(m.id)} className={`psh-toggle ${market === m.id ? 'is-on' : ''}`}>{m.label}</button>)}
              </div>
              {data?.generated_at && <span className="psh-faint" style={{ fontSize: 11 }}>Updated {new Date(data.generated_at).toLocaleString()}</span>}
            </div>

            {loading ? (
              <div className="psh-card" style={{ textAlign: 'center', padding: 40 }}><span className="psh-spin" style={{ width: 24, height: 24, borderColor: 'var(--line2)', borderTopColor: 'var(--accent)' }} /></div>
            ) : ops.length === 0 ? (
              <div className="psh-card" style={{ textAlign: 'center', padding: 40 }}>
                <RadarIcon size={30} className="psh-faint" style={{ margin: '0 auto 12px', display: 'block' }} />
                <p className="psh-serif psh-t" style={{ fontSize: '1.15rem', fontWeight: 600 }}>The radar is empty</p>
                <p className="psh-muted" style={{ fontSize: 13, margin: '4px 0 16px' }}>Run the AI Scout once and the opportunities it finds will land here automatically.</p>
                <Link to="/scout" className="psh-btn" style={{ textDecoration: 'none' }}><Search size={15} /> Open the Scout</Link>
              </div>
            ) : data?.preview ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <p className="psh-label psh-gold">Free preview · top {ops.length}</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ops.map((o) => <OppCard key={`${o.scope}-${o.symbol}`} o={o} />)}
                </div>
                <LockPanel locked={data.locked_count} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
                <Bucket title="Strong setups" icon={Flame} color="var(--green)" items={strong} />
                <Bucket title="Developing" icon={Eye} color="var(--accent)" items={developing} />
                <Bucket title="Also on the radar" icon={RadarIcon} color="var(--faint)" items={rest} />
              </div>
            )}
          </>
        )}
      </PremiumShell>
    </Layout>
  );
}

// Shown under the Free preview: what's behind the wall, with the real count.
function LockPanel({ locked = 0 }) {
  return (
    <div className="psh-card" style={{ textAlign: 'center', padding: '32px 24px' }}>
      <div className="psh-ico" style={{ margin: '0 auto 16px' }}><Lock size={20} /></div>
      <h3 className="psh-serif" style={{ fontSize: '1.5rem', fontWeight: 500 }}>
        {locked > 0 ? `${locked} more on the board` : 'See the full Opportunity Radar'}
      </h3>
      <p className="psh-muted" style={{ fontSize: 14, margin: '8px auto 20px', maxWidth: 400 }}>Premium unlocks the full ranked board, setup quality scores, the AI's reasoning for each pick, and entry plans you can track.</p>
      <Link to="/pricing" onClick={() => track('upgrade_clicked', { surface: 'radar_preview' })} className="psh-btn" style={{ textDecoration: 'none' }}>Unlock Premium</Link>
    </div>
  );
}

function Bucket({ title, icon: Icon, color, items }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="psh-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, color }}>
        <Icon size={14} /> {title} <span className="psh-faint">· {items.length}</span>
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((o) => <OppCard key={`${o.scope}-${o.symbol}`} o={o} />)}
      </div>
    </div>
  );
}

function OppCard({ o }) {
  const up = o.trend === 'bullish';
  const TrendIcon = up ? TrendingUp : o.trend === 'bearish' ? TrendingDown : Minus;
  const s = o.summary || {};
  const scoreCol = (o.quality_score ?? 0) >= 75 ? 'var(--green)' : (o.quality_score ?? 0) >= 55 ? 'var(--text)' : 'var(--faint)';
  const trendCol = up ? 'var(--green)' : o.trend === 'bearish' ? 'var(--red)' : 'var(--faint)';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="psh-card psh-lift" style={{ padding: 16 }}>
      <div className="flex items-start justify-between gap-2">
        <div style={{ minWidth: 0 }}>
          <div className="flex items-center gap-1.5">
            <Link to={`/stocks/${o.symbol}`} onClick={() => track('opportunity_opened', { symbol: o.symbol, surface: 'radar' })} className="psh-serif psh-t" style={{ fontWeight: 600, textDecoration: 'none' }}>{o.symbol}</Link>
            <span className="psh-badge">{o.market}</span>
          </div>
          <p className="psh-muted" style={{ fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</p>
        </div>
        {o.quality_score != null && (
          <div style={{ textAlign: 'right', flex: 'none' }}>
            <p className="psh-mono" style={{ fontWeight: 800, fontSize: '1.15rem', lineHeight: 1, color: scoreCol }}>{o.quality_score}</p>
            <p className="psh-label" style={{ fontSize: 9 }}>quality</p>
          </div>
        )}
      </div>
      {s.headline && <p className="psh-t" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 8, lineHeight: 1.45 }}>{s.headline}</p>}
      <div className="flex items-center gap-2" style={{ marginTop: 8, fontSize: 11 }}>
        {o.setup && o.setup !== 'none' && <span className="psh-badge psh-badge-gold">{o.setup.replace('_', ' ')}</span>}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: trendCol }}><TrendIcon size={12} /> {o.trend || '—'}</span>
        {o.last_price != null && <span className="psh-mono psh-muted" style={{ marginLeft: 'auto', fontWeight: 700 }}>{o.currency_symbol}{Number(o.last_price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>}
      </div>
    </motion.div>
  );
}
