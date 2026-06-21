import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Plus, X, TrendingUp, TrendingDown, Sparkles, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import EmptyState from '../components/ui/EmptyState';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Watchlist() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [prices, setPrices] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/watchlist');
      if (data.success) {
        setList(data.watchlist);
        const priceMap = {};
        await Promise.all(data.watchlist.map(async (item) => {
          try {
            const { data: q } = await api.get(`/trading/quote/${item.symbol}`);
            if (q.success) priceMap[item.symbol] = q;
          } catch {}
        }));
        setPrices(priceMap);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = async (symbol) => {
    try {
      await api.delete(`/watchlist/${symbol}`);
      toast.success('Removed from watchlist');
      load();
    } catch { toast.error('Could not remove'); }
  };

  const isPremium = user?.plan === 'premium';

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-sun-600">Your stocks</p>
            <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight mt-1">
              The <span className="italic">watchlist</span>.
            </h1>
            <p className="text-ink/60 mt-1">
              {isPremium ? 'Track unlimited stocks.' : `Free plan: ${list.length}/5 stocks.`}
            </p>
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary shrink-0 self-start">
            <Plus size={16} /> Add stock
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-ink/5 animate-pulse rounded-2xl" />)}
          </div>
        ) : list.length ? (
          <div className="space-y-3">
            {list.map((item, i) => {
              const p = prices[item.symbol];
              const up = p?.change >= 0;
              return (
                <motion.div
                  key={item.symbol}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-soft p-5 flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-sun-300 rounded-2xl grid place-items-center shrink-0">
                    <Star size={18} className="text-ink" fill="currentColor" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-lg font-mono">{item.symbol}</p>
                    <p className="text-sm text-ink/60 truncate">{item.company_name || p?.name}</p>
                    {item.note && <p className="text-xs text-ink/50 italic mt-0.5 truncate">"{item.note}"</p>}
                  </div>
                  {p && (
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold">${p.price?.toFixed(2)}</p>
                      <p className={`text-xs font-bold font-mono flex items-center justify-end gap-1 ${up ? 'text-bull-600' : 'text-bear-500'}`}>
                        {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {p.change >= 0 ? '+' : ''}{p.changePercent?.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => remove(item.symbol)}
                    className="p-2 rounded-full hover:bg-bear-500/10 text-ink/40 hover:text-bear-500 transition shrink-0"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              );
            })}

            {!isPremium && list.length >= 5 && (
              <div className="card-soft p-6 text-center bg-gradient-to-r from-sun-100 to-coral-300/30">
                <Sparkles className="mx-auto mb-2 text-coral-500" size={24} />
                <p className="font-display text-xl font-bold mb-1">You've hit the free limit</p>
                <p className="text-ink/60 text-sm mb-4">Upgrade to Premium for unlimited watchlist tracking.</p>
                <Link to="/upgrade" className="btn-primary bg-gradient-to-r from-coral-400 to-sun-400 text-ink">
                  Upgrade to Premium
                </Link>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={Star}
            title="No stocks yet"
            message="Add your first stock to keep an eye on it."
          >
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={16} /> Add stock
            </button>
          </EmptyState>
        )}
      </div>

      <AnimatePresence>
        {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdded={load} />}
      </AnimatePresence>
    </Layout>
  );
}

function AddModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ symbol: '', note: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: q } = await api.get(`/trading/quote/${form.symbol.toUpperCase()}`);
      const { data } = await api.post('/watchlist', {
        symbol: form.symbol.toUpperCase(),
        company_name: q.name,
        note: form.note,
      });
      if (data.success) {
        toast.success('Added to watchlist');
        onAdded();
        onClose();
      }
    } catch (err) {
      if (err.response?.data?.upgrade) toast.error(err.response.data.message);
      else toast.error(err.response?.data?.message || 'Could not add');
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
          <h2 className="font-display text-xl font-bold">Add to watchlist</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-ink/5 rounded-full">
            <X size={20}/>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Ticker symbol</label>
            <input
              required
              maxLength={10}
              value={form.symbol}
              onChange={(e) => setForm({...form, symbol: e.target.value.toUpperCase()})}
              placeholder="e.g. AAPL, TSLA"
              className="input-field uppercase font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Note (optional)</label>
            <input
              value={form.note}
              onChange={(e) => setForm({...form, note: e.target.value})}
              placeholder="Why are you watching this?"
              className="input-field"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-60">
            {saving ? 'Adding…' : 'Add to watchlist'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
