import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { NotebookPen, Plus, Trash2, Lock, X, Brain, Sparkles, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import PremiumShell, { BarsMotif } from '../components/ui/PremiumShell';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ACCENT = '#E8B04B';
const OUTCOME = {
  win: { label: 'Win', col: 'var(--green)' },
  loss: { label: 'Loss', col: 'var(--red)' },
  breakeven: { label: 'Breakeven', col: 'var(--faint)' },
};

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState(null);
  const [insights, setInsights] = useState(null);
  const [missed, setMissed] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const isPremium = user?.plan === 'premium';

  const load = async () => {
    try { const { data } = await api.get('/ai/journal'); if (data.success) setEntries(data.entries); } catch { setEntries([]); }
    try { const { data } = await api.get('/ai/insights'); if (data.success) setInsights(data); } catch { /* ignore */ }
    try { const { data } = await api.get('/ai/missed-setups'); if (data.success) setMissed(data.missed); } catch { /* ignore */ }
  };
  useEffect(() => { if (isPremium) load(); }, [isPremium]);

  const remove = async (id) => {
    setEntries((e) => e.filter((x) => x.id !== id));
    try { await api.delete(`/ai/journal/${id}`); toast('Entry removed', { icon: '🗑️' }); }
    catch { toast.error('Could not remove'); load(); }
  };

  return (
    <Layout>
      <PremiumShell
        icon={NotebookPen} accentColor={ACCENT}
        eyebrow="Premium · Trading journal"
        title="Your trades," accent="and what they teach you."
        subtitle="Every closed position lands here automatically. Once you've got a track record, we surface the honest patterns — what you do well, and what quietly costs you."
        motif={<BarsMotif color={ACCENT} />}
      >
        {!isPremium ? (
          <LockPanel />
        ) : (
          <>
            {insights && <InsightsPanel insights={insights} />}
            {missed?.length > 0 && <MissedSetups items={missed} />}

            <div className="flex items-center justify-between gap-3" style={{ margin: '16px 0' }}>
              <p className="psh-label" style={{ letterSpacing: '.12em' }}>{entries === null ? 'Loading…' : `${entries.length} entries`}</p>
              <button className="psh-btn" style={{ padding: '10px 18px' }} onClick={() => setShowForm((s) => !s)}>
                {showForm ? <X size={15} /> : <Plus size={15} />}{showForm ? 'Close' : 'Add entry'}
              </button>
            </div>

            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
                  <JournalForm onDone={() => { setShowForm(false); load(); }} />
                </motion.div>
              )}
            </AnimatePresence>

            {entries === null ? (
              <div className="psh-card" style={{ textAlign: 'center', padding: 34 }}><span className="psh-spin" style={{ width: 24, height: 24, borderColor: 'var(--line2)', borderTopColor: 'var(--accent)' }} /></div>
            ) : entries.length === 0 ? (
              <div className="psh-card" style={{ textAlign: 'center', padding: 40 }}>
                <NotebookPen size={30} className="psh-faint" style={{ margin: '0 auto 12px', display: 'block' }} />
                <p className="psh-serif psh-t" style={{ fontSize: '1.15rem', fontWeight: 600 }}>No entries yet</p>
                <p className="psh-muted" style={{ fontSize: 13, margin: '4px 0 16px' }}>Close a position and it’s journalled automatically — or add a past trade by hand.</p>
                <Link to="/positions" className="psh-btn" style={{ textDecoration: 'none' }}>Go to Positions</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {entries.map((e) => <Entry key={e.id} e={e} onRemove={remove} />)}
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
      <h3 className="psh-serif" style={{ fontSize: '1.5rem', fontWeight: 500 }}>Keep a trading journal</h3>
      <p className="psh-muted" style={{ fontSize: 14, margin: '8px auto 20px', maxWidth: 380 }}>Get Premium to auto-journal every trade, get an AI post-trade review, and learn your personal patterns over time.</p>
      <Link to="/pricing" className="psh-btn" style={{ textDecoration: 'none' }}>Unlock Premium</Link>
    </div>
  );
}

function InsightsPanel({ insights }) {
  if (!insights.ready) {
    return (
      <div className="psh-card psh-card-2" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Sparkles size={16} className="psh-gold" style={{ flex: 'none', marginTop: 1 }} />
        <div>
          <p className="psh-t" style={{ fontSize: 13.5, fontWeight: 600 }}>Building your personal insights</p>
          <p className="psh-muted" style={{ fontSize: 12.5, marginTop: 3, lineHeight: 1.5 }}>{insights.message}</p>
        </div>
      </div>
    );
  }
  const s = insights.stats || {};
  return (
    <div className="psh-card" style={{ border: '1.5px solid var(--accent)', background: 'var(--raise)' }}>
      <p className="psh-label psh-gold" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}><Brain size={14} /> Your patterns · {insights.sample_size} trades</p>
      <div className="grid grid-cols-3 gap-2" style={{ marginBottom: 14 }}>
        <Stat label="Win rate" value={s.win_rate != null ? `${s.win_rate}%` : '—'} col="var(--accent)" />
        <Stat label="Avg win" value={s.avg_win_pct != null ? `+${s.avg_win_pct}%` : '—'} col="var(--green)" />
        <Stat label="Avg loss" value={s.avg_loss_pct != null ? `${s.avg_loss_pct}%` : '—'} col="var(--red)" />
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insights.insights.map((t, i) => (
          <li key={i} className="psh-t" style={{ display: 'flex', gap: 10, fontSize: 13.5, lineHeight: 1.5 }}>
            <span style={{ marginTop: 6, width: 6, height: 6, borderRadius: 999, background: 'var(--accent)', flex: 'none' }} /><span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// §14: setups the user tracked but never entered, with what happened next.
// Educational: shows setups that failed as well as ones that worked.
const MISSED_OUTCOME = {
  target: { label: 'Reached target', col: 'var(--green)' },
  running: { label: 'Still running', col: 'var(--accent)' },
  invalidated: { label: 'Invalidated', col: 'var(--red)' },
};

function MissedSetups({ items }) {
  return (
    <div style={{ marginTop: 16 }}>
      <p className="psh-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><TrendingUp size={13} /> Setups you tracked but didn’t take</p>
      <p className="psh-muted" style={{ fontSize: 12.5, marginBottom: 10, lineHeight: 1.5 }}>What happened next, so you can learn from the setups you passed on. That includes the ones that failed, not just the ones that worked.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((m) => {
          const oc = MISSED_OUTCOME[m.outcome] || MISSED_OUTCOME.running;
          const money = (v) => (v == null ? '—' : `${m.currency_symbol}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
          return (
            <div key={m.id} className="psh-card psh-card-2" style={{ padding: 14, borderLeft: `3px solid ${oc.col}` }}>
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/stocks/${m.symbol}`} className="psh-serif psh-t" style={{ fontWeight: 600, fontSize: '1.05rem', textDecoration: 'none' }}>{m.symbol}</Link>
                {m.setup && <span className="psh-badge psh-badge-gold" style={{ textTransform: 'capitalize' }}>{String(m.setup).replace(/_/g, ' ')}</span>}
                <span className="psh-badge" style={{ color: oc.col, borderColor: oc.col }}>{oc.label}</span>
              </div>
              <p className="psh-t" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{m.what_happened}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 psh-mono psh-muted" style={{ fontSize: 11.5, marginTop: 8 }}>
                <span>Entry {money(m.entry_low)}–{money(m.entry_high)}</span>
                <span>Stop {money(m.invalidation)}</span>
                <span>Now {money(m.current_price)}</span>
                {m.trigger?.at && <span>Reached entry {new Date(m.trigger.at).toLocaleDateString()}</span>}
              </div>
              {m.factors?.length > 0 && (
                <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {m.factors.map((f, i) => <li key={i} className="psh-muted" style={{ fontSize: 12, display: 'flex', gap: 6 }}><span style={{ color: 'var(--accent)' }}>•</span><span>{f}</span></li>)}
                </ul>
              )}
              <p className="psh-t" style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.5 }}><b className="psh-gold">Lesson: </b>{m.lesson}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, col }) {
  return (
    <div className="psh-card psh-card-2" style={{ padding: 10, textAlign: 'center' }}>
      <p className="psh-mono" style={{ fontWeight: 800, fontSize: 17, color: col }}>{value}</p>
      <p className="psh-label" style={{ marginTop: 2 }}>{label}</p>
    </div>
  );
}

function JournalForm({ onDone }) {
  const [f, setF] = useState({ symbol: '', objective: 'swing', entry_price: '', exit_price: '', quantity: '', user_thesis: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (!f.symbol.trim()) return toast.error('Enter a ticker.');
    setBusy(true);
    try {
      const { data } = await api.post('/ai/journal', {
        symbol: f.symbol.trim().toUpperCase(), objective: f.objective,
        entry_price: f.entry_price ? Number(f.entry_price) : null,
        exit_price: f.exit_price ? Number(f.exit_price) : null,
        quantity: f.quantity ? Number(f.quantity) : null,
        user_thesis: f.user_thesis || null, notes: f.notes || null,
      });
      if (data.success) { toast.success('Entry saved'); onDone(); }
    } catch (err) { toast.error(err?.response?.data?.message || 'Could not save.'); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="psh-card psh-card-2">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ticker"><input className="psh-input" placeholder="AAPL / GTCO" value={f.symbol} onChange={set('symbol')} /></Field>
        <Field label="Objective">
          <select className="psh-input" style={{ fontFamily: 'var(--sans)' }} value={f.objective} onChange={set('objective')}>
            <option value="swing">Swing trade</option><option value="longterm">Long-term</option>
          </select>
        </Field>
        <Field label="Entry price"><input className="psh-input" type="number" step="any" value={f.entry_price} onChange={set('entry_price')} /></Field>
        <Field label="Exit price"><input className="psh-input" type="number" step="any" value={f.exit_price} onChange={set('exit_price')} /></Field>
        <Field label="Quantity"><input className="psh-input" type="number" step="any" value={f.quantity} onChange={set('quantity')} /></Field>
      </div>
      <Field label="Your thesis (optional)"><input className="psh-input" placeholder="Why you took the trade…" value={f.user_thesis} onChange={set('user_thesis')} /></Field>
      <Field label="Notes (optional)"><input className="psh-input" value={f.notes} onChange={set('notes')} /></Field>
      <button className="psh-btn psh-btn-lg" disabled={busy} style={{ marginTop: 14 }}>{busy ? <span className="psh-spin" /> : <Plus size={16} />}{busy ? 'Saving…' : 'Save entry'}</button>
    </form>
  );
}

function Field({ label, children }) {
  return <label style={{ display: 'block', marginTop: 12 }}><span className="psh-label" style={{ display: 'block', marginBottom: 6 }}>{label}</span>{children}</label>;
}

function Entry({ e, onRemove }) {
  const [review, setReview] = useState(e.review || null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const oc = OUTCOME[e.outcome] || null;

  const getReview = async () => {
    if (review) { setOpen((o) => !o); return; }
    setLoading(true);
    try { const { data } = await api.get(`/ai/journal/${e.id}/review`); if (data.success) { setReview(data.review); setOpen(true); } }
    catch (err) { toast.error(err?.response?.data?.message || 'Could not build the review'); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="psh-card psh-lift">
      <div className="flex items-start justify-between gap-3">
        <div style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/stocks/${e.symbol}`} className="psh-serif psh-t" style={{ fontSize: '1.2rem', fontWeight: 600, textDecoration: 'none' }}>{e.symbol}</Link>
            {e.objective && <span className="psh-badge" style={{ textTransform: 'capitalize' }}>{e.objective}</span>}
            {e.setup && <span className="psh-badge psh-badge-gold" style={{ textTransform: 'capitalize' }}>{String(e.setup).replace(/_/g, ' ')}</span>}
            {oc && <span className="psh-badge" style={{ color: oc.col, borderColor: oc.col }}>{oc.label}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          {e.result_pct != null && <p className="psh-mono" style={{ fontWeight: 800, fontSize: 15, color: e.result_pct >= 0 ? 'var(--green)' : 'var(--red)' }}>{e.result_pct >= 0 ? '+' : ''}{e.result_pct}%</p>}
          <button onClick={() => onRemove(e.id)} className="psh-faint" style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3 }}><Trash2 size={11} /> Delete</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 psh-mono psh-muted" style={{ fontSize: 11.5, marginTop: 10 }}>
        {e.entry_price != null && <span>Entry {e.entry_price}</span>}
        {e.exit_price != null && <span>Exit {e.exit_price}</span>}
        {e.holding_days != null && <span>{e.holding_days}d held</span>}
        {e.realized_pnl != null && <span style={{ color: e.realized_pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>P&L {e.realized_pnl >= 0 ? '+' : ''}{e.realized_pnl}</span>}
      </div>

      {e.user_thesis && <p className="psh-muted" style={{ fontSize: 12.5, marginTop: 10 }}><span className="psh-t" style={{ fontWeight: 600 }}>Your thesis: </span>{e.user_thesis}</p>}

      {e.exit_price != null && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <button onClick={getReview} disabled={loading} className="psh-ghost psh-btn" style={{ fontSize: 12.5, padding: '9px 15px' }}>
            {loading ? <><span className="psh-spin" style={{ borderTopColor: 'var(--accent)' }} /> Reviewing…</> : <><Brain size={13} /> {review ? (open ? 'Hide review' : 'Show review') : 'AI post-trade review'}</>}
          </button>
          <AnimatePresence>
            {open && review && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                <Review review={review} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

function Review({ review }) {
  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {review.summary && <p className="psh-t" style={{ fontSize: 13, lineHeight: 1.5 }}>{review.summary}</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        <RList label="What went well" items={review.what_went_well} icon={CheckCircle2} col="var(--green)" />
        <RList label="What to improve" items={review.what_to_improve} icon={AlertTriangle} col="var(--red)" />
      </div>
      {review.thesis_played_out && (
        <div className="psh-card psh-card-2" style={{ padding: 12 }}>
          <p className="psh-label" style={{ marginBottom: 3 }}>Did the thesis play out?</p>
          <p className="psh-t" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{review.thesis_played_out}</p>
        </div>
      )}
      {review.lesson && (
        <div className="psh-card psh-card-2" style={{ padding: 12, borderLeft: '3px solid var(--accent)' }}>
          <p className="psh-label psh-gold" style={{ marginBottom: 3 }}>The lesson</p>
          <p className="psh-t" style={{ fontSize: 13, lineHeight: 1.5 }}>{review.lesson}</p>
        </div>
      )}
      {review.disclaimer && <p className="psh-faint" style={{ fontSize: 10, fontStyle: 'italic' }}>{review.disclaimer}</p>}
    </div>
  );
}

function RList({ label, items, icon: Icon, col }) {
  if (!Array.isArray(items) || !items.length) return null;
  return (
    <div>
      <p className="psh-label" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, color: col }}><Icon size={12} />{label}</p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((it, i) => <li key={i} className="psh-muted" style={{ display: 'flex', gap: 6, fontSize: 12.5, lineHeight: 1.45 }}><span style={{ color: col, flex: 'none' }}>•</span><span>{it}</span></li>)}
      </ul>
    </div>
  );
}
