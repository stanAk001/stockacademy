import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Sparkles, ArrowRight, Brain, BarChart3, FileText, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function VerifyUpgrade() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const reference = params.get('reference');
  const processor = params.get('processor') || 'paystack';

  const [state, setState] = useState('loading');
  const [returnTo, setReturnTo] = useState(null);

  useEffect(() => {
    if (!reference) { setState('failed'); return; }
    // SUB_ references are the new pay-first Premium purchases.
    const endpoint = reference.startsWith('SUB_')
      ? '/subscriptions/verify'
      : processor === 'flutterwave'
        ? '/plan/verify-international'
        : '/plan/verify-upgrade';

    api.post(endpoint, { reference })
      .then(({ data }) => {
        if (data.success && data.user) {
          setUser(data.user);
          setReturnTo(data.return_to);
          setState('success');
          if (data.demo) toast('Demo mode — premium activated.', { icon: '🧪' });
        } else {
          setState('failed');
        }
      })
      .catch((err) => {
        setState('failed');
        toast.error(err.response?.data?.message || 'Verification failed');
      });
  }, [reference, processor, setUser]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {state === 'loading' && (
          <div className="card-soft p-12 text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-ink/50" size={40} />
            <h1 className="font-display text-2xl font-bold">Confirming payment…</h1>
            <p className="text-ink/55 text-sm mt-1">This usually takes a couple of seconds.</p>
          </div>
        )}

        {state === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative card-soft p-10 text-center overflow-hidden"
          >
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-sun-300/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-coral-300/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-bull-100 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="w-24 h-24 mx-auto bg-gradient-to-br from-sun-300 to-coral-400 rounded-full grid place-items-center mb-5 shadow-2xl"
              >
                <span className="text-5xl">🎉</span>
              </motion.div>

              <p className="text-xs font-bold uppercase tracking-widest text-coral-500 mb-2">Premium activated</p>
              <h1 className="font-display text-4xl sm:text-5xl font-black mb-3">
                Welcome to <span className="italic text-coral-500">Premium.</span>
              </h1>
              <p className="text-ink/65 max-w-md mx-auto mb-8">
                You now have full access to every feature on the platform.
              </p>

              <div className="bg-cream-warm rounded-3xl p-6 text-left mb-7 max-w-md mx-auto">
                <p className="text-xs font-bold uppercase tracking-widest text-ink/50 mb-3">What's unlocked</p>
                <ul className="space-y-2.5 text-sm">
                  <Item icon={Brain}>AI stock tools: compare, news scanner &amp; portfolio review</Item>
                  <Item icon={BarChart3}>Premium Telegram channel + weekly market digest</Item>
                  <Item icon={FileText}>PDF report downloads</Item>
                  <Item icon={Star}>Unlimited watchlist + price alerts</Item>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {returnTo ? (
                  <Link to={returnTo} className="btn-primary">
                    Continue where you left off <ArrowRight size={16}/>
                  </Link>
                ) : (
                  <Link to="/stocks/AAPL" className="btn-primary">
                    Try analysis on Apple <ArrowRight size={16}/>
                  </Link>
                )}
                <Link to="/rankings" className="btn-ghost">
                  Browse stocks by the numbers
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {state === 'failed' && (
          <div className="card-soft p-10 text-center">
            <div className="w-20 h-20 mx-auto bg-bear-500 text-white rounded-full grid place-items-center mb-5">
              <XCircle size={36} />
            </div>
            <h1 className="font-display text-2xl font-black mb-2">Payment not confirmed</h1>
            <p className="text-ink/60 mb-6 max-w-md mx-auto">
              We couldn't confirm your payment. If money was taken, please contact support with your reference.
              Otherwise, try again — your card was probably just declined.
            </p>
            {reference && <p className="text-xs text-ink/45 mb-5 font-mono">Ref: {reference}</p>}
            <div className="flex justify-center gap-3">
              <Link to="/upgrade" className="btn-primary">Try again</Link>
              <Link to="/dashboard" className="btn-ghost">Back to dashboard</Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Item({ icon: Icon, children }) {
  return (
    <li className="flex items-start gap-2.5">
      <div className="mt-0.5 w-6 h-6 bg-ink text-sun-300 rounded-lg grid place-items-center shrink-0">
        <Icon size={12} />
      </div>
      <span className="font-medium">{children}</span>
    </li>
  );
}