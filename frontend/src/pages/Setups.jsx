import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crosshair, Target, ShieldAlert, Radar, Trash2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import PremiumShell, { BarsMotif } from '../components/ui/PremiumShell';
import AlertGate from '../components/AlertGate';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const STAGES = ['watching', 'approaching', 'triggered', 'active'];
const STAGE_LABEL = { watching: 'Watching', approaching: 'Approaching', triggered: 'Triggered', active: 'Active', target: 'Target hit', invalidated: 'Invalidated', expired: 'Expired' };
const TERMINAL = { target: 'var(--green)', invalidated: 'var(--red)', expired: 'var(--faint)' };
const ACCENT = '#E8B04B'; // Setups — gold

export default function Setups() {
  const { user } = useAuth();
  const [setups, setSetups] = useState(null);
  const isPremium = user?.plan === 'premium';

  const load = async () => { try { const { data } = await api.get('/ai/setups'); if (data.success) setSetups(data.setups); } catch { setSetups([]); } };
  useEffect(() => { if (isPremium) load(); }, [isPremium]);

  const remove = async (id) => {
    setSetups((s) => s.filter((x) => x.id !== id));
    try { await api.delete(`/ai/setups/${id}`); toast('Stopped tracking', { icon: '🗑️' }); }
    catch { toast.error('Could not remove'); load(); }
  };

  return (
    <Layout>
      <PremiumShell
        icon={Crosshair} accentColor={ACCENT}
        eyebrow="Premium · Tracked setups"
        title="Your setups, watched" accent="around the clock."
        subtitle="Every setup you track moves through its lifecycle on real prices. We nudge you only when something meaningful changes — never on noise."
        motif={<BarsMotif color={ACCENT} />}
      >
        {isPremium && <AlertGate variant="dark" what="your tracked setups" />}
        {!isPremium ? (
          <LockPanel />
        ) : setups === null ? (
          <div className="psh-card" style={{ textAlign: 'center', padding: 34 }}><span className="psh-spin" style={{ width: 24, height: 24, borderColor: 'var(--line2)', borderTopColor: 'var(--accent)' }} /></div>
        ) : setups.length === 0 ? (
          <div className="psh-card" style={{ textAlign: 'center', padding: 40 }}>
            <Radar size={30} className="psh-faint" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p className="psh-serif psh-t" style={{ fontSize: '1.15rem', fontWeight: 600 }}>No tracked setups yet</p>
            <p className="psh-muted" style={{ fontSize: 13, margin: '4px 0 16px' }}>Find a setup with the Scout, tap “Get AI entry plan”, and it’ll show up here — monitored automatically.</p>
            <Link to="/scout" className="psh-btn" style={{ textDecoration: 'none' }}><Radar size={15} /> Open the Scout</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {setups.map((s) => <SetupCard key={s.id} s={s} onRemove={remove} />)}
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
      <h3 className="psh-serif" style={{ fontSize: '1.5rem', fontWeight: 500 }}>Track swing setups</h3>
      <p className="psh-muted" style={{ fontSize: 14, margin: '8px auto 20px', maxWidth: 380 }}>Get Premium to have the AI monitor your setups and alert you when they trigger, confirm, or break.</p>
      <Link to="/pricing" className="psh-btn" style={{ textDecoration: 'none' }}>Unlock Premium</Link>
    </div>
  );
}

function SetupCard({ s, onRemove }) {
  const money = (v) => `${s.currency_symbol}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const terminalCol = TERMINAL[s.status];
  const stageIdx = STAGES.indexOf(s.status);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="psh-card psh-lift">
      <div className="flex items-start justify-between gap-3">
        <div style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/stocks/${s.symbol}`} className="psh-serif psh-t" style={{ fontSize: '1.25rem', fontWeight: 600, textDecoration: 'none' }}>{s.symbol}</Link>
            <span className="psh-badge">{s.market}</span>
            <StatusPill status={s.status} terminalCol={terminalCol} />
          </div>
          <p className="psh-muted" style={{ fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</p>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          {s.last_price != null && <p className="psh-mono psh-t" style={{ fontWeight: 700, fontSize: 13 }}>{money(s.last_price)}</p>}
          <button onClick={() => onRemove(s.id)} className="psh-faint" style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}><Trash2 size={12} /> Stop</button>
        </div>
      </div>

      {/* Lifecycle rail */}
      {!terminalCol ? (
        <div className="flex items-center gap-1" style={{ marginTop: 16 }}>
          {STAGES.map((st, i) => (
            <div key={st} style={{ flex: 1 }}>
              <div style={{ height: 6, borderRadius: 999, background: i <= stageIdx ? 'var(--accent)' : 'rgba(255,255,255,0.08)' }} />
              <p className="psh-label" style={{ fontSize: 9.5, marginTop: 5, color: i === stageIdx ? 'var(--accent)' : 'var(--faint)' }}>{STAGE_LABEL[st]}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="psh-card psh-card-2" style={{ marginTop: 12, padding: '9px 13px', fontSize: 13, fontWeight: 700, color: terminalCol, borderLeft: `3px solid ${terminalCol}` }}>{STAGE_LABEL[s.status]}</div>
      )}

      {/* Levels */}
      <div className="grid grid-cols-3 gap-2" style={{ marginTop: 16 }}>
        <Lvl icon={Crosshair} label="Entry" value={`${money(s.entry_low)}–${money(s.entry_high)}`} />
        <Lvl icon={ShieldAlert} label="Invalidation" value={money(s.invalidation)} col="var(--red)" />
        <Lvl icon={Target} label="Target" value={s.targets?.[0] ? money(s.targets[0].level) : '—'} col="var(--green)" />
      </div>

      {s.last_event?.note && (
        <p className="psh-muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.45 }}>
          <span className="psh-t" style={{ fontWeight: 600 }}>Latest: </span>{s.last_event.note}
          {s.last_event.at && <span className="psh-faint"> · {new Date(s.last_event.at).toLocaleDateString()}</span>}
        </p>
      )}
    </motion.div>
  );
}

function StatusPill({ status, terminalCol }) {
  if (terminalCol) return <span className="psh-badge" style={{ color: terminalCol, borderColor: terminalCol }}>{STAGE_LABEL[status] || status}</span>;
  return <span className="psh-badge psh-badge-gold">{STAGE_LABEL[status] || status}</span>;
}

function Lvl({ icon: Icon, label, value, col = 'var(--text)' }) {
  return (
    <div className="psh-card psh-card-2" style={{ padding: 10, minWidth: 0 }}>
      <p className="psh-label" style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>{Icon && <Icon size={11} />}{label}</p>
      <p className="psh-mono" style={{ fontWeight: 700, fontSize: 12.5, color: col, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
    </div>
  );
}
