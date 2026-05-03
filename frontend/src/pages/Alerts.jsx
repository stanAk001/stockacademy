import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, X, Lock, Trash2, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Alerts() {
  const { user } = useAuth();
  const isPremium = user?.plan === 'premium';
  const [alerts, setAlerts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/alerts');
      if (data.success) setAlerts(data.alerts);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      toast.success('Alert deleted');
      load();
    } catch { toast.error('Could not delete'); }
  };

  if (!isPremium) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="card-soft p-10 text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-coral-300/40 rounded-full blur-2xl" />
            <div className="relative">
              <div className="w-20 h-20 mx-auto bg-ink text-sun-300 rounded-3xl grid place-items-center mb-5">
                <Lock size={32} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-coral-500 mb-2">Premium feature</p>
              <h1 className="font-display text-4xl font-black mb-3">Price Alerts</h1>
              <p className="text-ink/60 max-w-md mx-auto mb-6">
                Get notified the moment a stock hits your target price. Never miss a trade setup again.
              </p>
              <Link to="/upgrade" className="btn-primary bg-gradient-to-r from-coral-400 to-sun-400 text-ink">
                <Sparkles size={16} /> Upgrade to Premium
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-coral-500">Premium</p>
            <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight mt-1">
              Price <span className="italic">alerts</span>.
            </h1>
            <p className="text-ink/60 mt-1">Notify me when a stock hits my target price.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary shrink-0 self-start">
            <Plus size={16} /> New alert
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-ink/5 animate-pulse rounded-2xl" />)}
          </div>
        ) : alerts.length ? (
          <div className="space-y-3">
            {alerts.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-soft p-5 flex items-center gap-4"
              >
                <div className={`w-12 h-12 rounded-2xl grid place-items-center shrink-0 ${
                  a.direction === 'above' ? 'bg-bull-100 text-bull-600' : 'bg-coral-300/40 text-bear-500'
                }`}>
                  {a.direction === 'above' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-lg">
                    <span className="font-mono">{a.symbol}</span>
                    <span className="text-ink/60 font-sans font-normal text-sm ml-2">
                      goes {a.direction} ${parseFloat(a.target_price).toFixed(2)}
                    </span>
                  </p>
                  {a.note && <p className="text-xs text-ink/50 italic truncate">"{a.note}"</p>}
                  <p className="text-xs text-ink/40 mt-0.5">
                    {a.triggered ? '🎯 Triggered' : 'Watching…'}
                  </p>
                </div>
                <button
                  onClick={() => remove(a.id)}
                  className="p-2 rounded-full hover:bg-bear-500/10 text-ink/40 hover:text-bear-500 transition shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <Bell className="mx-auto mb-3 text-ink/20" size={48} />
            <p className="font-display text-2xl font-bold mb-1">No alerts yet</p>
            <p className="text-ink/60 mb-5">Create your first price alert.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={16} /> New alert
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && <AlertModal onClose={() => setShowCreate(false)} onCreated={load} />}
      </AnimatePresence>
    </Layout>
  );
}

function AlertModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ symbol: '', target_price: '', direction: 'above', note: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: q } = await api.get(`/trading/quote/${form.symbol.toUpperCase()}`);
      const { data } = await api.post('/alerts', {
        symbol: form.symbol.toUpperCase(),
        company_name: q.name,
        target_price: parseFloat(form.target_price),
        direction: form.direction,
        note: form.note,
      });
      if (data.success) {
        toast.success('Alert created');
        onCreated();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create');
    } finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm grid place-items-center p-4"
    >
      <motion.form
        onSubmit={submit}
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-cream rounded-3xl max-w-md w-full"
      >
        <div className="p-5 border-b border-ink/5 flex justify-between">
          <h2 className="font-display text-xl font-bold">Create price alert</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-ink/5 rounded-full">
            <X size={20}/>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Ticker</label>
            <input
              required
              value={form.symbol}
              onChange={(e) => setForm({...form, symbol: e.target.value.toUpperCase()})}
              placeholder="AAPL"
              className="input-field uppercase font-mono font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm({...form, direction: 'above'})}
              className={`p-3 rounded-2xl border-2 font-semibold ${
                form.direction === 'above' ? 'border-ink bg-ink text-cream' : 'border-ink/10'
              }`}
            >
              <ArrowUp size={18} className="inline mr-1"/> Goes above
            </button>
            <button
              type="button"
              onClick={() => setForm({...form, direction: 'below'})}
              className={`p-3 rounded-2xl border-2 font-semibold ${
                form.direction === 'below' ? 'border-ink bg-ink text-cream' : 'border-ink/10'
              }`}
            >
              <ArrowDown size={18} className="inline mr-1"/> Goes below
            </button>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Target price ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.target_price}
              onChange={(e) => setForm({...form, target_price: e.target.value})}
              placeholder="200.00"
              className="input-field font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Note (optional)</label>
            <input
              value={form.note}
              onChange={(e) => setForm({...form, note: e.target.value})}
              placeholder="Why this price?"
              className="input-field"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
            {saving ? 'Creating…' : 'Create alert'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
