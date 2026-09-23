import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Compass, Crosshair, Wallet, BookOpen, Bell, Radar, Lock, ArrowRight, Activity, TrendingUp, Newspaper,
} from 'lucide-react';
import Layout from '../components/Layout';
import PremiumShell, { BarsMotif, DeskClock } from '../components/ui/PremiumShell';
import AlertGate from '../components/AlertGate';
import api from '../services/api';
import { track } from '../lib/analytics';

const ACCENT = '#E8B04B';
const ccy = (c) => (c === 'NGN' ? '₦' : '$');

const REGIME = {
  bullish: { c: 'var(--green)', t: 'Bullish' },
  bearish: { c: 'var(--red)', t: 'Bearish' },
  sideways: { c: 'var(--accent)', t: 'Sideways' },
  unknown: { c: 'var(--faint)', t: 'Quiet' },
};
const FEED_ICON = { setup: Crosshair, position: Wallet, thesis: BookOpen, news: Newspaper };

export default function MyMarket() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  // Everyone loads it; Free users get a preview payload (data.preview).
  useEffect(() => {
    api.get('/ai/my-market')
      .then(({ data: d }) => { if (d.success) setData(d); else setErr(true); })
      .catch(() => setErr(true));
  }, []);

  return (
    <Layout>
      <PremiumShell
        wide icon={Compass} accentColor={ACCENT}
        eyebrow="Premium · My Market"
        title="What changed" accent="since your last visit?"
        subtitle="Your personal intelligence center — setups approaching, positions moving, theses shifting, and the strongest opportunities right now. Everything the AI watched for you while you were away."
        motif={<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}><DeskClock /><BarsMotif color={ACCENT} /></div>}
      >
        {data && !data.preview && <AlertGate variant="dark" what="everything on your desk" />}
        {err ? (
          <div className="psh-card" style={{ textAlign: 'center', padding: 34 }}>
            <p className="psh-muted">Couldn’t load your briefing right now. Please try again.</p>
          </div>
        ) : data === null ? (
          <div className="psh-card" style={{ textAlign: 'center', padding: 34 }}><span className="psh-spin" style={{ width: 24, height: 24, borderColor: 'var(--line2)', borderTopColor: 'var(--accent)' }} /></div>
        ) : data.preview ? (
          <Preview data={data} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <MarketStatus market={data.market} />
            <ChangeStrip changes={data.changes} counts={data.counts} />
            <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 16 }}>
              <Feed feed={data.feed} firstVisit={data.first_visit} />
              <Opportunities items={data.opportunities} />
            </div>
          </div>
        )}
      </PremiumShell>
    </Layout>
  );
}

function LockPanel() {
  return (
    <div className="psh-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div className="psh-ico" style={{ margin: '0 auto 16px' }}><Lock size={20} /></div>
      <h3 className="psh-serif" style={{ fontSize: '1.5rem', fontWeight: 500 }}>Your personal market briefing</h3>
      <p className="psh-muted" style={{ fontSize: 14, margin: '8px auto 20px', maxWidth: 400 }}>Get Premium and StockAcademia watches the market for you — then tells you exactly what changed each time you come back.</p>
      <Link to="/pricing" onClick={() => track('upgrade_clicked', { surface: 'my_market_preview' })} className="psh-btn" style={{ textDecoration: 'none' }}>Unlock Premium</Link>
    </div>
  );
}

// Free users: real market status + a real count of matching opportunities, three
// of them shown, and the continuous-intelligence part locked.
function Preview({ data }) {
  const n = data.matching_count || 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <MarketStatus market={data.market} />
      <div className="psh-card" style={{ border: '1.5px solid var(--accent)', background: 'var(--raise)' }}>
        <p className="psh-label psh-gold">Your premium market preview</p>
        <p className="psh-serif psh-t" style={{ fontSize: '1.35rem', fontWeight: 600, marginTop: 6, lineHeight: 1.25 }}>
          {n > 0
            ? `${n} ${n === 1 ? 'opportunity currently matches' : 'opportunities currently match'} your markets.`
            : 'No strong setups match right now.'}
        </p>
        <p className="psh-muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
          {n > 0
            ? `Here ${Math.min(3, n) === 1 ? 'is 1' : `are ${Math.min(3, n)}`} of them. Premium shows every match, builds entry plans, and alerts you when they move.`
            : 'Quality setups aren’t always available. That’s normal. Premium watches the market continuously and alerts you when one forms.'}
        </p>
      </div>
      <Opportunities items={data.opportunities} />
      <LockPanel />
    </div>
  );
}

function MarketStatus({ market }) {
  const cell = (label, r) => {
    const st = REGIME[r?.label] || REGIME.unknown;
    return (
      <div className="psh-card psh-card-2" style={{ padding: 15 }}>
        <div className="flex items-center gap-2">
          <span style={{ width: 9, height: 9, borderRadius: 999, background: st.c, flex: 'none' }} />
          <p className="psh-label">{label}</p>
          <span className="psh-mono" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: st.c }}>{st.t}</span>
        </div>
        {r?.note && <p className="psh-muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>{r.note}</p>}
      </div>
    );
  };
  return (
    <div>
      <p className="psh-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><Activity size={12} /> Market status</p>
      <div className="grid grid-cols-2 gap-3">
        {cell('🇺🇸 US market', market?.US)}
        {cell('🇳🇬 NGX', market?.NG)}
      </div>
    </div>
  );
}

function ChangeStrip({ changes, counts }) {
  const items = [
    { label: 'Approaching entry', value: changes.setups_approaching, to: '/setups', icon: Crosshair },
    { label: 'Confirmed setups', value: changes.setups_confirmed, to: '/setups', icon: TrendingUp },
    { label: 'Position updates', value: changes.position_updates, to: '/positions', icon: Wallet, alert: changes.positions_need_attention },
    { label: 'Thesis changes', value: changes.thesis_changes, to: '/theses', icon: BookOpen },
    { label: 'News on your stocks', value: changes.news_events || 0, to: '/news-scanner', icon: Newspaper },
    { label: 'Unread alerts', value: changes.unread_notifications, to: '/positions', icon: Bell },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
      {items.map((it) => {
        const Icon = it.icon;
        const hot = it.value > 0;
        return (
          <Link key={it.label} to={it.to} className="psh-card psh-card-2 psh-lift" style={{ padding: 14, textDecoration: 'none', borderColor: hot ? 'var(--accent)' : 'var(--line)' }}>
            <div className="flex items-center justify-between">
              <Icon size={15} style={{ color: hot ? 'var(--accent)' : 'var(--faint)' }} />
              {it.alert > 0 && <span className="psh-badge" style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>{it.alert} watch</span>}
            </div>
            <p className="psh-serif psh-t" style={{ fontSize: '1.7rem', fontWeight: 600, marginTop: 6, lineHeight: 1 }}>{it.value}</p>
            <p className="psh-label" style={{ marginTop: 4 }}>{it.label}</p>
          </Link>
        );
      })}
      <div className="psh-card psh-card-2" style={{ padding: 14 }}>
        <p className="psh-label">You're tracking</p>
        <p className="psh-mono psh-muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.7 }}>
          {counts.tracked_setups} setups<br />{counts.open_positions} positions<br />{counts.theses} theses
        </p>
      </div>
    </div>
  );
}

function Feed({ feed, firstVisit }) {
  return (
    <div>
      <p className="psh-label" style={{ marginBottom: 10 }}>What changed</p>
      {!feed.length ? (
        <div className="psh-card" style={{ textAlign: 'center', padding: 30 }}>
          <p className="psh-serif psh-t" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{firstVisit ? 'Welcome to your desk' : 'All quiet since your last visit'}</p>
          <p className="psh-muted" style={{ fontSize: 13, margin: '4px auto 14px', maxWidth: 360 }}>
            {firstVisit
              ? 'Track a few setups and positions and this feed fills with everything that moves — approaching entries, confirmations, thesis shifts.'
              : 'Nothing material moved on your setups, positions or theses. We’ll flag the moment something does.'}
          </p>
          <Link to="/scout" className="psh-btn" style={{ textDecoration: 'none' }}><Radar size={15} /> Find opportunities</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {feed.map((e, i) => {
            const Icon = FEED_ICON[e.type] || Crosshair;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Link to={e.link} className="psh-card psh-card-2 psh-lift flex items-start gap-3" style={{ padding: '13px 15px', textDecoration: 'none' }}>
                  <div className="psh-ico" style={{ width: 34, height: 34, borderRadius: 10, flex: 'none' }}><Icon size={15} /></div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="psh-serif psh-t" style={{ fontWeight: 600, fontSize: 14 }}>{e.symbol}</span>
                      {e.status && <span className="psh-badge psh-badge-gold" style={{ textTransform: 'capitalize' }}>{String(e.status).replace(/_/g, ' ')}</span>}
                    </div>
                    <p className="psh-muted" style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.45 }}>{e.note}</p>
                  </div>
                  <span className="psh-faint" style={{ fontSize: 10.5, flex: 'none', whiteSpace: 'nowrap' }}>{new Date(e.at).toLocaleDateString()}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Opportunities({ items }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <p className="psh-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Radar size={12} /> Strongest right now</p>
        <Link to="/radar" className="psh-link-gold" style={{ fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>Full board <ArrowRight size={12} /></Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((o) => (
          <Link key={o.symbol} to={`/stocks/${o.symbol}`} onClick={() => track('opportunity_opened', { symbol: o.symbol, surface: 'my_market' })} className="psh-card psh-card-2 psh-lift flex items-center gap-3" style={{ padding: '11px 15px', textDecoration: 'none' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="psh-serif psh-t" style={{ fontWeight: 600, fontSize: 14 }}>{o.symbol}</span>
                <span className="psh-badge">{o.market}</span>
                {o.setup && <span className="psh-badge psh-badge-gold" style={{ textTransform: 'capitalize' }}>{String(o.setup).replace(/_/g, ' ')}</span>}
              </div>
              <p className="psh-muted" style={{ fontSize: 11.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</p>
            </div>
            <div style={{ textAlign: 'right', flex: 'none' }}>
              {o.last_price != null && <p className="psh-mono psh-t" style={{ fontWeight: 700, fontSize: 12.5 }}>{o.currency_symbol}{Number(o.last_price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>}
              {o.quality_score != null && <p className="psh-mono" style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 700 }}>Q{o.quality_score}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
