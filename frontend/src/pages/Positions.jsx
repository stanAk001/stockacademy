import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Target, ShieldAlert, Plus, Trash2, Lock, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import PremiumShell, { BarsMotif } from '../components/ui/PremiumShell';
import AlertGate from '../components/AlertGate';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ACCENT = '#E8B04B';

// thesis_state → colour + label + icon. Intact is neutral; the market decides the rest.
const STATE = {
  intact:        { label: 'Thesis intact',        col: 'var(--muted)', icon: Minus },
  strengthening: { label: 'Strengthening',        col: 'var(--green)', icon: TrendingUp },
  weakening:     { label: 'Weakening',            col: '#E8945B',      icon: TrendingDown },
  invalidated:   { label: 'Thesis invalidated',   col: 'var(--red)',   icon: ShieldAlert },
};

export default function Positions() {
  const { user } = useAuth();
  const [positions, setPositions] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const isPremium = user?.plan === 'premium';

  const load = async () => {
    try { const { data } = await api.get('/ai/positions'); if (data.success) setPositions(data.positions); }
    catch { setPositions([]); }
  };
  useEffect(() => { if (isPremium) load(); }, [isPremium]);

  const remove = async (id) => {
    setPositions((p) => p.filter((x) => x.id !== id));
    try { await api.delete(`/ai/positions/${id}`); toast('Position removed', { icon: '🗑️' }); }
    catch { toast.error('Could not remove'); load(); }
  };

  return (
    <Layout>
      <PremiumShell
        icon={Wallet} accentColor={ACCENT}
        eyebrow="Premium · Position monitoring"
        title="Your positions," accent="watched live."
        subtitle="Record what you actually bought and we keep comparing your original thesis to the market — strengthening, weakening, or broken — and tell you when it changes."
        motif={<BarsMotif color={ACCENT} />}
      >
        {isPremium && <AlertGate variant="dark" what="your open positions" />}
        {!isPremium ? (
          <LockPanel />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3" style={{ marginBottom: 16 }}>
              <p className="psh-label" style={{ letterSpacing: '.12em' }}>
                {positions === null ? 'Loading…' : `${positions.filter((p) => p.status === 'open').length} open · ${positions.length} total`}
              </p>
              <button className="psh-btn" style={{ padding: '10px 18px' }} onClick={() => setShowForm((s) => !s)}>
                {showForm ? <X size={15} /> : <Plus size={15} />}{showForm ? 'Close' : 'Record a position'}
              </button>
            </div>

            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
                  <PositionForm onDone={() => { setShowForm(false); load(); }} />
                </motion.div>
              )}
            </AnimatePresence>

            {positions === null ? (
              <div className="psh-card" style={{ textAlign: 'center', padding: 34 }}><span className="psh-spin" style={{ width: 24, height: 24, borderColor: 'var(--line2)', borderTopColor: 'var(--accent)' }} /></div>
            ) : positions.length === 0 ? (
              <div className="psh-card" style={{ textAlign: 'center', padding: 40 }}>
                <Wallet size={30} className="psh-faint" style={{ margin: '0 auto 12px', display: 'block' }} />
                <p className="psh-serif psh-t" style={{ fontSize: '1.15rem', fontWeight: 600 }}>No positions yet</p>
                <p className="psh-muted" style={{ fontSize: 13, margin: '4px 0 16px' }}>Bought a stock? Record it here and we’ll monitor your thesis against live prices.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {positions.map((p) => <PositionCard key={p.id} p={p} onRemove={remove} onClosed={load} />)}
              </div>
            )}
          </>
        )}
      </PremiumShell>
    </Layout>
  );
}

function LockPanel() {
  return (
    <div className="psh-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div className="psh-ico" style={{ margin: '0 auto 16px' }}><Lock size={20} /></div>
      <h3 className="psh-serif" style={{ fontSize: '1.5rem', fontWeight: 500 }}>Monitor your positions</h3>
      <p className="psh-muted" style={{ fontSize: 14, margin: '8px auto 20px', maxWidth: 380 }}>Get Premium to track real positions and have the AI watch your thesis against the market, round the clock.</p>
      <Link to="/pricing" className="psh-btn" style={{ textDecoration: 'none' }}>Unlock Premium</Link>
    </div>
  );
}

function PositionForm({ onDone }) {
  const [f, setF] = useState({ symbol: '', entry_price: '', quantity: '', stop_price: '', target_price: '', objective: 'swing', notes: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.symbol.trim() || !(Number(f.entry_price) > 0) || !(Number(f.quantity) > 0)) {
      return toast.error('Symbol, entry price and quantity are required.');
    }
    setBusy(true);
    try {
      const { data } = await api.post('/ai/positions', {
        symbol: f.symbol.trim().toUpperCase(),
        entry_price: Number(f.entry_price), quantity: Number(f.quantity),
        stop_price: f.stop_price ? Number(f.stop_price) : null,
        target_price: f.target_price ? Number(f.target_price) : null,
        objective: f.objective, notes: f.notes || null,
      });
      if (data.success) { toast.success('Position recorded'); onDone(); }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not record the position.');
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="psh-card psh-card-2">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ticker"><input className="psh-input" placeholder="AAPL / GTCO" value={f.symbol} onChange={set('symbol')} /></Field>
        <Field label="Objective">
          <select className="psh-input" style={{ fontFamily: 'var(--sans)' }} value={f.objective} onChange={set('objective')}>
            <option value="swing">Swing trade</option>
            <option value="longterm">Long-term</option>
          </select>
        </Field>
        <Field label="Entry price"><input className="psh-input" type="number" step="any" placeholder="0.00" value={f.entry_price} onChange={set('entry_price')} /></Field>
        <Field label="Quantity"><input className="psh-input" type="number" step="any" placeholder="0" value={f.quantity} onChange={set('quantity')} /></Field>
        <Field label="Stop / invalidation (optional)"><input className="psh-input" type="number" step="any" placeholder="0.00" value={f.stop_price} onChange={set('stop_price')} /></Field>
        <Field label="Target (optional)"><input className="psh-input" type="number" step="any" placeholder="0.00" value={f.target_price} onChange={set('target_price')} /></Field>
      </div>
      <Field label="Notes (optional)"><input className="psh-input" placeholder="Why you entered…" value={f.notes} onChange={set('notes')} /></Field>
      <button className="psh-btn psh-btn-lg" disabled={busy} style={{ marginTop: 14 }}>
        {busy ? <span className="psh-spin" /> : <Plus size={16} />}{busy ? 'Recording…' : 'Record position'}
      </button>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginTop: 12 }}>
      <span className="psh-label" style={{ display: 'block', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

function PositionCard({ p, onRemove, onClosed }) {
  const [closing, setClosing] = useState(false);
  const [exit, setExit] = useState('');
  const money = (v) => (v == null ? '—' : `${p.currency_symbol}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
  const st = STATE[p.thesis_state] || STATE.intact;
  const StIcon = st.icon;
  const isOpen = p.status === 'open';
  const pnl = isOpen ? p.unrealized_pnl : p.realized_pnl;
  const pnlCol = pnl == null ? 'var(--muted)' : pnl >= 0 ? 'var(--green)' : 'var(--red)';

  const doClose = async () => {
    if (!(Number(exit) > 0)) return toast.error('Enter a valid exit price.');
    try {
      const { data } = await api.post(`/ai/positions/${p.id}/close`, { exit_price: Number(exit) });
      if (data.success) { toast.success(`Closed · P&L ${data.realized_pnl >= 0 ? '+' : ''}${data.realized_pnl}`); onClosed(); }
    } catch { toast.error('Could not close.'); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="psh-card psh-lift" style={{ opacity: isOpen ? 1 : 0.72 }}>
      <div className="flex items-start justify-between gap-3">
        <div style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/stocks/${p.symbol}`} className="psh-serif psh-t" style={{ fontSize: '1.25rem', fontWeight: 600, textDecoration: 'none' }}>{p.symbol}</Link>
            <span className="psh-badge">{p.market}</span>
            <span className="psh-badge" style={{ textTransform: 'capitalize' }}>{p.objective}</span>
            {isOpen ? (
              <span className="psh-badge" style={{ color: st.col, borderColor: st.col, display: 'inline-flex', alignItems: 'center', gap: 4 }}><StIcon size={11} />{st.label}</span>
            ) : (
              <span className="psh-badge">Closed{p.close_reason ? ` · ${p.close_reason}` : ''}</span>
            )}
          </div>
          <p className="psh-muted" style={{ fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <p className="psh-mono" style={{ fontWeight: 800, fontSize: 15, color: pnlCol }}>{pnl == null ? '—' : `${pnl >= 0 ? '+' : ''}${money(Math.abs(pnl)).replace('-', '')}`}</p>
          <p className="psh-label" style={{ fontSize: 9.5 }}>{isOpen ? 'Unrealized P&L' : 'Realized P&L'}{isOpen && p.change_pct != null ? ` · ${p.change_pct >= 0 ? '+' : ''}${p.change_pct}%` : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2" style={{ marginTop: 16 }}>
        <Lvl label="Entry" value={money(p.entry_price)} />
        <Lvl label="Now" value={money(p.last_price)} col={st.col} />
        <Lvl label="Stop" value={money(p.stop_price)} col="var(--red)" />
        <Lvl label="Target" value={money(p.target_price)} col="var(--green)" />
      </div>

      {p.last_event?.note && (
        <p className="psh-muted" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.45 }}>
          <span className="psh-t" style={{ fontWeight: 600 }}>Latest: </span>{p.last_event.note}
          {p.last_event.at && <span className="psh-faint"> · {new Date(p.last_event.at).toLocaleDateString()}</span>}
        </p>
      )}

      {isOpen && (
        <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 14 }}>
          {!closing ? (
            <>
              <button className="psh-toggle" onClick={() => setClosing(true)}>Close position</button>
              <button className="psh-toggle" onClick={() => onRemove(p.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Trash2 size={12} /> Delete</button>
            </>
          ) : (
            <div className="flex items-center gap-2 flex-wrap" style={{ width: '100%' }}>
              <input className="psh-input" style={{ flex: 1, minWidth: 120, padding: '9px 12px' }} type="number" step="any" placeholder="Exit price" value={exit} onChange={(e) => setExit(e.target.value)} />
              <button className="psh-btn" style={{ padding: '9px 16px' }} onClick={doClose}>Confirm</button>
              <button className="psh-toggle" onClick={() => setClosing(false)}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function Lvl({ label, value, col = 'var(--text)' }) {
  return (
    <div className="psh-card psh-card-2" style={{ padding: 10, minWidth: 0 }}>
      <p className="psh-label" style={{ marginBottom: 3 }}>{label}</p>
      <p className="psh-mono" style={{ fontWeight: 700, fontSize: 12.5, color: col, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
    </div>
  );
}
