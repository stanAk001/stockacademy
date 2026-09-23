import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Trash2, Lock, X, TrendingUp, TrendingDown, Minus, ShieldAlert, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import PremiumShell, { BarsMotif } from '../components/ui/PremiumShell';
import AlertGate from '../components/AlertGate';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ACCENT = '#E8B04B';

const STATE = {
  intact:        { label: 'Intact',        col: 'var(--muted)', icon: Minus },
  strengthening: { label: 'Strengthening', col: 'var(--green)', icon: TrendingUp },
  weakening:     { label: 'Weakening',     col: '#E8945B',      icon: TrendingDown },
  invalidated:   { label: 'Invalidated',   col: 'var(--red)',   icon: ShieldAlert },
};
const TIER = {
  strong:      { label: 'Strong',      cls: 'psh-badge-green' },
  solid:       { label: 'Solid',       cls: 'psh-badge-gold' },
  speculative: { label: 'Speculative', cls: 'psh-badge' },
};

export default function Theses() {
  const { user } = useAuth();
  const [theses, setTheses] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const isPremium = user?.plan === 'premium';

  const load = async () => {
    try { const { data } = await api.get('/ai/theses'); if (data.success) setTheses(data.theses); }
    catch { setTheses([]); }
  };
  useEffect(() => { if (isPremium) load(); }, [isPremium]);

  const remove = async (id) => {
    setTheses((t) => t.filter((x) => x.id !== id));
    try { await api.delete(`/ai/theses/${id}`); toast('Stopped tracking', { icon: '🗑️' }); }
    catch { toast.error('Could not remove'); load(); }
  };

  return (
    <Layout>
      <PremiumShell
        icon={BookOpen} accentColor={ACCENT}
        eyebrow="Premium · Investment thesis"
        title="Your long-term theses," accent="under watch."
        subtitle="Write down why a company is worth holding. We snapshot its fundamentals and tell you — with the exact numbers — when the story materially changes."
        motif={<BarsMotif color={ACCENT} />}
      >
        {isPremium && <AlertGate variant="dark" what="the companies behind your theses" />}
        {!isPremium ? (
          <LockPanel />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3" style={{ marginBottom: 16 }}>
              <p className="psh-label" style={{ letterSpacing: '.12em' }}>{theses === null ? 'Loading…' : `${theses.length} tracked`}</p>
              <button className="psh-btn" style={{ padding: '10px 18px' }} onClick={() => setShowForm((s) => !s)}>
                {showForm ? <X size={15} /> : <Plus size={15} />}{showForm ? 'Close' : 'Track a thesis'}
              </button>
            </div>

            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
                  <ThesisForm onDone={() => { setShowForm(false); load(); }} />
                </motion.div>
              )}
            </AnimatePresence>

            {theses === null ? (
              <div className="psh-card" style={{ textAlign: 'center', padding: 34 }}><span className="psh-spin" style={{ width: 24, height: 24, borderColor: 'var(--line2)', borderTopColor: 'var(--accent)' }} /></div>
            ) : theses.length === 0 ? (
              <div className="psh-card" style={{ textAlign: 'center', padding: 40 }}>
                <BookOpen size={30} className="psh-faint" style={{ margin: '0 auto 12px', display: 'block' }} />
                <p className="psh-serif psh-t" style={{ fontSize: '1.15rem', fontWeight: 600 }}>No theses tracked yet</p>
                <p className="psh-muted" style={{ fontSize: 13, margin: '4px 0 16px' }}>Found a company you believe in for the long run? Track your thesis and we’ll watch its fundamentals for you.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {theses.map((t) => <ThesisCard key={t.id} t={t} onRemove={remove} />)}
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
      <h3 className="psh-serif" style={{ fontSize: '1.5rem', fontWeight: 500 }}>Track investment theses</h3>
      <p className="psh-muted" style={{ fontSize: 14, margin: '8px auto 20px', maxWidth: 380 }}>Get Premium to have the AI monitor the fundamentals behind your long-term holdings and flag material changes.</p>
      <Link to="/pricing" className="psh-btn" style={{ textDecoration: 'none' }}>Unlock Premium</Link>
    </div>
  );
}

function ThesisForm({ onDone }) {
  const [f, setF] = useState({ symbol: '', quality_tier: '', summary: '', watch: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.symbol.trim()) return toast.error('Enter a ticker.');
    setBusy(true);
    try {
      const { data } = await api.post('/ai/theses', {
        symbol: f.symbol.trim().toUpperCase(),
        quality_tier: f.quality_tier || null,
        summary: f.summary || null,
        watch_items: f.watch ? f.watch.split('\n').map((s) => s.trim()).filter(Boolean) : [],
      });
      if (data.success) { toast.success('Thesis tracked'); onDone(); }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not start the thesis.');
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="psh-card psh-card-2">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ticker"><input className="psh-input" placeholder="GTCO / AAPL" value={f.symbol} onChange={set('symbol')} /></Field>
        <Field label="Your quality read (optional)">
          <select className="psh-input" style={{ fontFamily: 'var(--sans)' }} value={f.quality_tier} onChange={set('quality_tier')}>
            <option value="">—</option>
            <option value="strong">Strong</option>
            <option value="solid">Solid</option>
            <option value="speculative">Speculative</option>
          </select>
        </Field>
      </div>
      <Field label="Why you're holding (optional)">
        <textarea className="psh-input" rows={2} style={{ fontFamily: 'var(--sans)', resize: 'vertical' }} placeholder="The core reason this is worth owning for years…" value={f.summary} onChange={set('summary')} />
      </Field>
      <Field label="What would change your mind — one per line (optional)">
        <textarea className="psh-input" rows={2} style={{ fontFamily: 'var(--sans)', resize: 'vertical' }} placeholder={'Margins fall below 20%\nDebt keeps climbing'} value={f.watch} onChange={set('watch')} />
      </Field>
      <button className="psh-btn psh-btn-lg" disabled={busy} style={{ marginTop: 14 }}>
        {busy ? <span className="psh-spin" /> : <Plus size={16} />}{busy ? 'Saving…' : 'Track thesis'}
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

function ThesisCard({ t, onRemove }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const st = STATE[t.state] || STATE.intact;
  const StIcon = st.icon;
  const tier = t.quality_tier ? TIER[t.quality_tier] : null;

  const toggle = async () => {
    const next = !open; setOpen(next);
    if (next && !detail) {
      try { const { data } = await api.get(`/ai/theses/${t.id}`); if (data.success) setDetail(data); }
      catch { setDetail({ events: [] }); }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="psh-card psh-lift">
      <div className="flex items-start justify-between gap-3">
        <div style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/stocks/${t.symbol}`} className="psh-serif psh-t" style={{ fontSize: '1.25rem', fontWeight: 600, textDecoration: 'none' }}>{t.symbol}</Link>
            <span className="psh-badge">{t.market}</span>
            {tier && <span className={`psh-badge ${tier.cls}`}>{tier.label}</span>}
            <span className="psh-badge" style={{ color: st.col, borderColor: st.col, display: 'inline-flex', alignItems: 'center', gap: 4 }}><StIcon size={11} />{st.label}</span>
          </div>
          <p className="psh-muted" style={{ fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
        </div>
        <button onClick={() => onRemove(t.id)} className="psh-faint" style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, flex: 'none' }}><Trash2 size={12} /> Stop</button>
      </div>

      {t.summary && <p className="psh-muted" style={{ fontSize: 13, marginTop: 12, lineHeight: 1.5 }}>{t.summary}</p>}

      {t.last_event?.note && (
        <div className="psh-card psh-card-2" style={{ marginTop: 12, padding: '10px 13px', borderLeft: `3px solid ${st.col}` }}>
          <p className="psh-label" style={{ marginBottom: 3 }}>Latest change</p>
          <p className="psh-t" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{t.last_event.note}</p>
        </div>
      )}

      <button className="psh-link-gold" style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 12.5, marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={toggle}>
        {open ? 'Hide history' : 'Why did this change?'} <ArrowRight size={13} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {detail === null ? (
                <span className="psh-spin" style={{ borderColor: 'var(--line2)', borderTopColor: 'var(--accent)', margin: '8px auto' }} />
              ) : !detail.events?.length ? (
                <p className="psh-faint" style={{ fontSize: 12 }}>No material changes recorded yet. We check daily against the fundamentals we snapshotted when you started tracking.</p>
              ) : (
                detail.events.map((e, i) => (
                  <div key={i} className="psh-card psh-card-2" style={{ padding: '11px 13px' }}>
                    <p className="psh-t" style={{ fontSize: 12.5, fontWeight: 600 }}>{e.note}</p>
                    {Array.isArray(e.changed_fields) && e.changed_fields.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {e.changed_fields.map((c, j) => (
                          <div key={j} className="flex items-center gap-2" style={{ fontSize: 11.5 }}>
                            <span className="psh-label" style={{ minWidth: 130 }}>{c.label || c.field}</span>
                            <span className="psh-mono psh-faint">{c.from}</span>
                            <ArrowRight size={11} className="psh-faint" />
                            <span className="psh-mono" style={{ color: c.direction === 'improved' ? 'var(--green)' : 'var(--red)' }}>{c.to}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="psh-faint" style={{ fontSize: 10.5, marginTop: 6 }}>{new Date(e.created_at).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
