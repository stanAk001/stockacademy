import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, ShoppingCart, X, ShieldAlert } from 'lucide-react';
import api from '../services/api';

export default function BuyThisStockButton({ symbol, className = '' }) {
  const [open, setOpen] = useState(false);
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    if (brokers.length > 0) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/brokers/${symbol}`);
      if (data.success) setBrokers(data.brokers);
    } finally { setLoading(false); }
  };

  const handleClick = (broker) => {
    api.post('/brokers/track', { broker_id: broker.id, symbol }).catch(() => {});
    window.open(broker.affiliate_url, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`btn-primary bg-gradient-to-r from-bull-500 to-bull-600 hover:from-bull-600 hover:to-bull-700 ${className}`}
      >
        <ShoppingCart size={16} /> Buy {symbol} for real
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm grid place-items-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-cream rounded-3xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-5 border-b border-ink/5 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-bull-600">Choose your broker</p>
                  <h2 className="font-display text-2xl font-bold">Buy {symbol}</h2>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 hover:bg-ink/5 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-3">
                {loading ? (
                  [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-ink/5 animate-pulse rounded-2xl" />)
                ) : brokers.length === 0 ? (
                  <p className="text-center text-ink/60 py-8">No brokers available for this asset type.</p>
                ) : (
                  brokers.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => handleClick(b)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-ink/5 hover:border-ink hover:bg-cream-warm transition text-left group`}
                    >
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${b.color} grid place-items-center text-2xl shrink-0`}>
                        {b.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-lg">{b.name}</p>
                        <p className="text-xs text-ink/60 truncate">{b.description}</p>
                      </div>
                      <ExternalLink size={16} className="text-ink/40 group-hover:text-ink group-hover:translate-x-0.5 transition shrink-0" />
                    </button>
                  ))
                )}

                <div className="mt-4 p-4 bg-sun-100 rounded-2xl flex gap-3">
                  <ShieldAlert size={18} className="text-sun-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-ink/70 leading-relaxed">
                    We may earn commissions when users sign up through partner links — at no extra cost to you.
                    Nothing here is financial advice. Do your own research before investing.
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
