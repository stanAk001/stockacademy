import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, X, RefreshCw, Heart, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { track } from '../lib/analytics';

// ============================================================
// MembershipBanner — the in-app side of the Premium lifecycle.
//
//   ending_soon     → "Your Premium ends in N days", what it's watching for you,
//                     Renew, and one tap to turn on auto-renew (card on file)
//   grace / lapsed  → "Your Premium has ended — full access until …", Renew
//   recently_lapsed → "Welcome back — your setups are saved", See Premium
//
// Reads GET /subscriptions (state comes from services/membership.js). Hidden on
// the pricing page (it has its own renewal note) and when auto-renew already
// covers it. Dismissible: ending-soon / welcome-back stay hidden for that
// period; the "ended" banner comes back the next day while access is at risk.
// ============================================================

const SHOW = new Set(['ending_soon', 'grace', 'lapsed', 'recently_lapsed']);
const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const readLS = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

// "3 setups, 2 positions and 1 investment thesis" (or null when there's nothing)
function whatItWatches(k) {
  if (!k) return null;
  const parts = [];
  if (k.setups) parts.push(plural(k.setups, 'setup'));
  if (k.positions) parts.push(plural(k.positions, 'position'));
  if (k.theses) parts.push(plural(k.theses, 'investment thesis', 'investment theses'));
  if (k.watchlist) parts.push(plural(k.watchlist, 'watched stock'));
  if (!parts.length) return null;
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export default function MembershipBanner() {
  const { user, refreshUser } = useAuth();
  const { pathname } = useLocation();
  const [s, setS] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/subscriptions')
    .then(({ data }) => {
      if (!data?.success) return;
      setS(data);
      // The lifecycle job may have moved them to Free (or they just renewed):
      // keep the rest of the app's view of their plan in step.
      if (user && data.plan && data.plan !== user.plan) refreshUser();
    })
    .catch(() => {});

  useEffect(() => {
    if (!user) { setS(null); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.plan]);

  const atRisk = s?.state === 'grace' || s?.state === 'lapsed';
  const today = new Date().toISOString().slice(0, 10);
  const key = s ? `sa_mb_${s.state}_${s.access_ends_at || ''}${atRisk ? `_${today}` : ''}` : null;
  useEffect(() => { setDismissed(Boolean(key && readLS(key))); }, [key]);

  if (!user || !s || !SHOW.has(s.state) || dismissed) return null;
  if (pathname.startsWith('/pricing') || pathname.startsWith('/upgrade')) return null;
  if (s.state === 'ending_soon' && s.auto_renew) return null; // auto-renew has it covered

  const watches = whatItWatches(s.keeping);
  const days = Math.max(1, s.days_left || 1);
  const cfg = {
    ending_soon: {
      tone: 'bg-sun-100 border-sun-300 text-ink', icon: Clock, cta: 'Renew now',
      title: `Your Premium ends in ${plural(days, 'day')} (${fmt(s.access_ends_at)}).`,
      body: `${watches ? `It's watching ${watches} for you. ` : ''}Renew now: your new period starts when this one ends, so you lose nothing.`,
    },
    grace: {
      tone: 'bg-coral-300/25 border-coral-400/40 text-ink', icon: Clock, cta: 'Renew now',
      title: 'Your Premium has ended.',
      body: `You keep full access until ${fmt(s.grace_ends_at)}. ${watches ? `Renew to keep your ${watches} monitored.` : 'Renew by then and nothing stops.'}`,
    },
    lapsed: {
      tone: 'bg-coral-300/25 border-coral-400/40 text-ink', icon: Clock, cta: 'Renew now',
      title: 'Your Premium has ended.',
      body: `${watches ? `Your ${watches} are saved. ` : ''}Renew to switch Premium back on.`,
    },
    recently_lapsed: {
      tone: 'bg-ink border-ink text-cream', icon: Heart, cta: 'See Premium',
      title: 'Welcome back.',
      body: `${watches ? `Your ${watches} are saved. ` : 'Everything you set up is saved. '}Renew any time to switch monitoring and alerts back on.`,
    },
  }[s.state];
  const Icon = cfg.icon;
  const dark = s.state === 'recently_lapsed';

  const turnOnAutoRenew = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/subscriptions/auto-renew', { enabled: true });
      if (data?.success) { toast.success(data.message || 'Auto-renew is on. You won’t lose Premium.'); await load(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not turn on auto-renew');
    } finally { setBusy(false); }
  };

  const dismiss = () => { if (key) writeLS(key, '1'); setDismissed(true); };

  return (
    <div className={`border-b ${cfg.tone}`} role="status">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-start sm:items-center gap-3 flex-wrap sm:flex-nowrap">
        <Icon size={18} className={`shrink-0 mt-0.5 sm:mt-0 ${dark ? 'text-sun-300' : 'text-coral-500'}`} />
        <p className="text-[13px] sm:text-sm leading-snug flex-1 min-w-0">
          <span className="font-bold">{cfg.title}</span>{' '}
          <span className={dark ? 'text-cream/75' : 'text-ink/70'}>{cfg.body}</span>
        </p>
        <div className="flex items-center gap-2 shrink-0 ml-7 sm:ml-0">
          {s.state === 'ending_soon' && s.can_auto_renew && !s.auto_renew && (
            <button onClick={turnOnAutoRenew} disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border border-ink/15 hover:bg-ink/5 transition disabled:opacity-60">
              <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> Turn on auto-renew
            </button>
          )}
          <Link to="/pricing" onClick={() => track('upgrade_clicked', { surface: 'membership_banner', state: s.state })}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition ${
              dark ? 'bg-sun-300 text-ink hover:bg-sun-400' : 'bg-ink text-cream hover:bg-ink-soft'
            }`}>
            <Sparkles size={12} /> {cfg.cta}
          </Link>
          <button onClick={dismiss} aria-label="Dismiss"
            className={`p-1 rounded-full transition ${dark ? 'text-cream/50 hover:text-cream' : 'text-ink/40 hover:text-ink'}`}>
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
