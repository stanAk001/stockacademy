import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles, Loader2, Brain, BarChart3, Users, FileText, Star, Zap, Shield, Activity, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get('return_to');

  const [planInfo, setPlanInfo] = useState(null);
  const [geo, setGeo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  useEffect(() => {
    api.get('/geo').then(({ data }) => data.success && setGeo(data));
    if (user) {
      api.get('/plan').then(({ data }) => data.success && setPlanInfo(data));
    }
  }, [user]);

  const switchCountry = async (code) => {
    const { data } = await api.get(`/geo?country=${code}`);
    if (data.success) {
      setGeo(data);
      setShowCountryPicker(false);
    }
  };

  const isPremium = user?.plan === 'premium';
  const usingFlutterwave = geo?.processor === 'flutterwave';
  const displayPrice = geo?.display || '₦4,500';

  const upgrade = async () => {
    if (!user) {
      toast('Sign up first to upgrade!', { icon: '👋' });
      navigate('/signup');
      return;
    }
    setLoading(true);
    try {
      const endpoint = usingFlutterwave
        ? '/plan/initialize-international'
        : '/plan/initialize-upgrade';
      const { data } = await api.post(endpoint, {
        return_to: returnTo,
        country: geo?.country,
      });
      if (data.success) {
        if (data.demo) {
          toast('Demo mode — completing instantly', { icon: '🧪' });
          window.location.href = data.demo_verify_url;
          return;
        }
        toast.success('Redirecting to secure payment…');
        window.location.href = data.authorization_url;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start upgrade');
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    if (!confirm('Downgrade to free? You\'ll lose Premium features at the end of your billing period.')) return;
    try {
      await api.post('/plan/cancel');
      toast.success('Downgraded to Free.');
      window.location.reload();
    } catch {
      toast.error('Cancellation failed');
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-coral-500 mb-2">Premium plans</p>
          <h1 className="font-display text-3xl sm:text-6xl font-black leading-tight mb-3">
            Start free.<br/>
            <span className="italic">Upgrade when you're ready.</span>
          </h1>
          <p className="text-ink/65 text-sm sm:text-lg px-2">
            Unlock the full analysis engine, peer comparison, and PDF reports.
          </p>

          {/* Country / currency switcher */}
          {geo && (
            <div className="mt-4 sm:mt-5 inline-flex items-center gap-2 text-[10px] sm:text-xs text-ink/60 flex-wrap justify-center">
              <Globe size={12}/>
              {!showCountryPicker ? (
                <>
                  <span>Showing prices for <strong className="text-ink">{geo.country_name || geo.country}</strong></span>
                  <button onClick={() => setShowCountryPicker(true)} className="text-coral-500 hover:underline font-bold">change</button>
                </>
              ) : (
                <div className="flex gap-1.5 flex-wrap justify-center">
                  <button onClick={() => switchCountry('NG')} className="px-2 sm:px-3 py-1 rounded-full bg-bull-100 text-bull-700 font-bold hover:bg-bull-200 transition">🇳🇬 Nigeria (₦)</button>
                  <button onClick={() => switchCountry('US')} className="px-2 sm:px-3 py-1 rounded-full bg-sun-100 text-sun-600 font-bold hover:bg-sun-200 transition">🌍 International ($)</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {/* FREE */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-soft p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-ink/50">Free</p>
            <p className="font-display text-3xl sm:text-4xl font-black mt-1">{usingFlutterwave ? '$0' : '₦0'}</p>
            <p className="text-xs sm:text-sm text-ink/55 mb-4 sm:mb-5">Everything you need to start learning.</p>
            <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
              <Feature>All 6 courses & lessons with diagrams</Feature>
              <Feature>Quizzes & XP system</Feature>
              <Feature>Paper-trading simulator with $100k</Feature>
              <Feature>Stock analysis (composite score + thesis)</Feature>
              <Feature>Watchlist (up to 5 stocks)</Feature>
              <Feature>Community forum</Feature>
              <Feature>Smart Rankings page</Feature>
            </ul>
            {!isPremium && (
              <button disabled className="mt-5 sm:mt-6 w-full py-2.5 sm:py-3 rounded-full bg-ink/5 text-ink/40 font-semibold text-xs sm:text-sm cursor-default">
                You're on the Free plan
              </button>
            )}
          </motion.div>

          {/* PREMIUM */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="card-soft p-6 sm:p-8 ring-4 ring-ink relative overflow-hidden">
            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-coral-400 to-sun-400 text-ink text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 sm:px-4 py-1 sm:py-1.5 rounded-bl-2xl">
              ⭐ Most popular
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-coral-500">Premium</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="font-display text-3xl sm:text-4xl font-black">{displayPrice}</p>
              <p className="text-xs sm:text-sm text-ink/50 font-semibold">/ month</p>
            </div>
            <p className="text-xs sm:text-sm text-ink/55 mb-4 sm:mb-5">For people who want to research like an analyst.</p>

            <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
              <Feature highlight>Everything in Free</Feature>
              <Feature highlight icon={Brain}>Full Stock Analysis Report — every metric</Feature>
              <Feature highlight icon={BarChart3}>Factor sub-scores (the inputs behind each score)</Feature>
              <Feature highlight icon={Users}>Sector peer comparison</Feature>
              <Feature highlight icon={FileText}>Download analysis as PDF</Feature>
              <Feature highlight icon={Star}>Unlimited watchlist</Feature>
              <Feature highlight icon={Activity}>Unlimited price alerts</Feature>
              <Feature highlight icon={Shield}>Priority mentorship slots</Feature>
            </ul>

            {isPremium ? (
              <div className="mt-5 sm:mt-6 space-y-2">
                <div className="w-full py-2.5 sm:py-3 rounded-full bg-bull-100 text-bull-700 text-center font-bold text-xs sm:text-sm">
                  ⭐ You're a Premium member
                </div>
                {planInfo?.plan_expires_at && (
                  <p className="text-[10px] sm:text-xs text-ink/50 text-center">
                    Renews on {new Date(planInfo.plan_expires_at).toLocaleDateString()}
                  </p>
                )}
                <button onClick={cancel} className="w-full py-2 text-[10px] sm:text-xs text-ink/50 hover:text-bear-500 transition">
                  Cancel Premium
                </button>
              </div>
            ) : (
              <button
                onClick={upgrade}
                disabled={loading || !geo}
                className="mt-5 sm:mt-6 w-full inline-flex items-center justify-center gap-2 py-3 sm:py-4 rounded-full bg-ink text-cream font-bold text-sm sm:text-base hover:bg-ink-soft transition shine disabled:opacity-60"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin"/> Starting…</>
                ) : (
                  <><Sparkles size={16}/> Upgrade now — Pay {displayPrice}</>
                )}
              </button>
            )}

            <p className="text-[10px] sm:text-xs text-ink/45 text-center mt-3">
              {usingFlutterwave
                ? 'Pay with international card · powered by Flutterwave'
                : 'Pay with card · bank · USSD · Opay · mobile money'}
            </p>
          </motion.div>
        </div>

        {/* Trust strip */}
        <div className="max-w-3xl mx-auto mt-8 sm:mt-12 grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div className="p-3 sm:p-5 bg-cream-warm rounded-2xl">
            <Shield className="mx-auto mb-1 sm:mb-2 text-bull-600" size={20}/>
            <p className="text-xs sm:text-sm font-bold">Secure</p>
            <p className="text-[10px] sm:text-xs text-ink/55">{usingFlutterwave ? 'Flutterwave' : 'Paystack'}</p>
          </div>
          <div className="p-3 sm:p-5 bg-cream-warm rounded-2xl">
            <Zap className="mx-auto mb-1 sm:mb-2 text-sun-500" size={20}/>
            <p className="text-xs sm:text-sm font-bold">Instant</p>
            <p className="text-[10px] sm:text-xs text-ink/55">Unlocks immediately</p>
          </div>
          <div className="p-3 sm:p-5 bg-cream-warm rounded-2xl">
            <Check className="mx-auto mb-1 sm:mb-2 text-coral-500" size={20}/>
            <p className="text-xs sm:text-sm font-bold">Cancel anytime</p>
            <p className="text-[10px] sm:text-xs text-ink/55">No contracts</p>
          </div>
        </div>

        <p className="text-[10px] sm:text-xs text-ink/40 mt-8 sm:mt-10 text-center max-w-xl mx-auto leading-relaxed px-2">
          StockAcademy provides educational analysis and research tools. Investment decisions are yours to make.
        </p>
      </div>
    </Layout>
  );
}

function Feature({ children, highlight, icon: Icon }) {
  return (
    <li className="flex items-start gap-2 sm:gap-2.5">
      <div className={`mt-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full grid place-items-center shrink-0 ${
        highlight ? 'bg-ink text-sun-300' : 'bg-bull-100 text-bull-600'
      }`}>
        {Icon ? <Icon size={10} /> : <Check size={10} strokeWidth={3} />}
      </div>
      <span className={highlight ? 'font-medium' : 'text-ink/75'}>{children}</span>
    </li>
  );
}