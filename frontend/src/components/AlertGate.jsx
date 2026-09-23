import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, BellRing, X, Check, Smartphone, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { isPushSupported, permissionState, enablePush, isSubscribed } from '../lib/push';

// ============================================================
// AlertGate — "can an alert actually reach this person's phone?"
//
// Monitoring is only useful if the alert finds you. This sits on top of every
// monitoring screen and says exactly what is wrong and what to tap:
//
//   never asked   → one button, which triggers the browser prompt
//   blocked       → the browser will NEVER re-prompt, so we show the exact
//                   steps for that browser instead of a dead button
//   other device  → allowed on the laptop but not here: turn it on here too
//   iOS browser   → web push needs the app on the Home Screen first
//   ready         → nothing (or a quiet "alerts on" line)
//
// Snoozed, never permanently dismissed: someone who is still tracking stocks
// with no way to be alerted should be asked again later.
// ============================================================

const SNOOZE_KEY = 'sa_alertgate_snooze';
const SNOOZE_DAYS = 5;

const snoozedUntil = () => {
  try { return Number(localStorage.getItem(SNOOZE_KEY) || 0); } catch { return 0; }
};
const snooze = () => {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 864e5)); } catch { /* private mode */ }
};

const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

// Unblocking lives in browser chrome, which no script can open. The next best
// thing is telling them precisely where it is on the device they're holding.
function unblockSteps() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const android = /Android/i.test(ua);
  if (isIOS()) {
    return ['Open the iPhone Settings app', 'Scroll down and tap Safari (or Chrome)', 'Tap Notifications and allow them for this site'];
  }
  if (android) {
    return ['Tap the lock icon next to the web address above', 'Tap Permissions, then Notifications', 'Switch Notifications to Allow, then reload this page'];
  }
  return ['Click the icon on the left of the web address above', 'Find Notifications in the list', 'Set it to Allow, then reload this page'];
}

export default function AlertGate({ what = 'the stocks you track', variant = 'light', className = '' }) {
  const [state, setState] = useState('loading'); // loading|ready|ask|blocked|other-device|ios-install|off
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);       // "show me how" expander
  const [devices, setDevices] = useState(0);

  const evaluate = useCallback(async () => {
    if (!isPushSupported()) {
      // iOS only exposes push once the site is installed to the Home Screen.
      setState(isIOS() && !isStandalone() ? 'ios-install' : 'off');
      return;
    }
    let configured = true;
    let deviceCount = 0;
    try {
      const { data } = await api.get('/push/status');
      configured = data?.configured !== false;
      deviceCount = data?.devices || 0;
    } catch { /* not signed in, or offline — fall back to browser state */ }
    setDevices(deviceCount);
    if (!configured) { setState('off'); return; }

    const perm = permissionState();
    const here = await isSubscribed();
    if (perm === 'granted' && here) setState('ready');
    else if (perm === 'denied') setState('blocked');
    else if (perm === 'granted' && !here) setState('ask');       // allowed, just not subscribed yet
    else if (deviceCount > 0) setState('other-device');          // another device gets them
    else setState('ask');
  }, []);

  useEffect(() => { evaluate(); }, [evaluate]);

  const turnOn = async () => {
    setBusy(true);
    try {
      await enablePush();
      toast.success('Phone alerts on — we’ll ping you the moment something moves.');
      await evaluate();
    } catch (e) {
      const msg = {
        unsupported: 'This browser can’t do web notifications.',
        unconfigured: 'Notifications aren’t switched on for the server yet.',
        denied: 'Notifications are blocked for this site — the steps below fix it.',
      }[e.message] || 'Could not turn on notifications.';
      toast.error(msg);
      if (e.message === 'denied') { setState('blocked'); setOpen(true); }
      else await evaluate();
    } finally {
      setBusy(false);
    }
  };

  const hide = () => { snooze(); setState('ready'); };

  // Nothing to say: already working, unsupported, or snoozed.
  if (state === 'loading' || state === 'ready' || state === 'off') return null;
  if (Date.now() < snoozedUntil()) return null;

  // Two skins: cream pages, and the dark premium panels (PremiumShell).
  const dark = variant === 'dark';
  const tone = dark
    ? {
        ring: state === 'blocked' ? 'ring-bear-500/40' : 'ring-sun-400/30',
        bg: 'bg-cream/[0.06]',
        icon: state === 'blocked' ? BellOff : BellRing,
        iconBg: state === 'blocked' ? 'bg-bear-500' : 'bg-sun-300',
        iconFg: state === 'blocked' ? 'text-cream' : 'text-ink',
        title: 'text-cream', body: 'text-cream/65', soft: 'text-cream/45',
        btn: 'bg-sun-300 text-ink hover:bg-sun-400', ghost: 'text-cream/60 hover:bg-cream/10',
        step: 'bg-sun-300 text-ink', stepText: 'text-cream/75', link: 'text-sun-300',
      }
    : {
        ring: state === 'blocked' ? 'ring-bear-500/30' : 'ring-sun-400/40',
        bg: state === 'blocked' ? 'bg-coral-300/20' : 'bg-sun-100',
        icon: state === 'blocked' ? BellOff : BellRing,
        iconBg: state === 'blocked' ? 'bg-bear-500' : 'bg-ink',
        iconFg: 'text-sun-300',
        title: 'text-ink', body: 'text-ink/65', soft: 'text-ink/45',
        btn: 'bg-ink text-cream hover:bg-ink-soft', ghost: 'text-ink/55 hover:bg-ink/5',
        step: 'bg-ink text-cream', stepText: 'text-ink/75', link: 'text-bull-600',
      };
  const Icon = tone.icon;

  const copy = {
    ask: {
      title: 'Get alerted on your phone',
      body: `We watch ${what} around the clock. Turn on notifications and we’ll tell you the moment a price, entry or target is hit — you won’t have to open this page to find out.`,
    },
    'other-device': {
      title: 'Your alerts go to another device',
      body: `Notifications are on somewhere else, but not on this one. Turn them on here too so ${what} can reach you wherever you are.`,
    },
    blocked: {
      title: 'Notifications are blocked',
      body: `Your browser is blocking alerts for StockAcademia, so nothing about ${what} can reach you. It takes three taps to fix — your browser won’t ask again on its own.`,
    },
    'ios-install': {
      title: 'Add StockAcademia to your Home Screen',
      body: 'On iPhone, alerts only work once the app is on your Home Screen. Tap the Share button, then “Add to Home Screen”, and open it from there.',
    },
  }[state];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
        className={`relative rounded-2xl ring-1 ${tone.ring} ${tone.bg} p-4 sm:p-5 mb-5 ${className}`}
      >
        <button onClick={hide} className={`absolute top-2.5 right-2.5 p-1.5 rounded-full ${tone.ghost}`} aria-label="Remind me later">
          <X size={15} />
        </button>

        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`w-10 h-10 rounded-xl ${tone.iconBg} grid place-items-center shrink-0`}>
            <Icon size={17} className={tone.iconFg} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className={`font-display text-base sm:text-lg font-black leading-tight pr-6 ${tone.title}`}>{copy.title}</h3>
            <p className={`text-[12.5px] sm:text-[13.5px] mt-1 leading-relaxed ${tone.body}`}>{copy.body}</p>

            {state === 'ask' && (
              <ul className={`grid grid-cols-2 gap-x-3 gap-y-1 text-[11.5px] sm:text-[12.5px] mt-3 ${tone.stepText}`}>
                {['Target or entry hit', 'Setup confirmed', 'Price alert triggered', 'Your thesis changes'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5"><Check size={11} className="text-bull-600 shrink-0" /> {t}</li>
                ))}
              </ul>
            )}

            {/* the fix, for browsers that will never prompt again */}
            {(state === 'blocked' || state === 'ios-install') && (
              <div className="mt-3">
                <button
                  onClick={() => setOpen((v) => !v)}
                  className={`inline-flex items-center gap-1 text-[12.5px] font-bold hover:underline ${tone.title}`}
                >
                  Show me how <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <ol className="mt-2 space-y-1.5">
                    {(state === 'ios-install'
                      ? ['Tap the Share button at the bottom of Safari', 'Choose “Add to Home Screen”', 'Open StockAcademia from your Home Screen, then turn on alerts']
                      : unblockSteps()
                    ).map((s, i) => (
                      <li key={s} className={`flex items-start gap-2 text-[12.5px] ${tone.stepText}`}>
                        <span className={`w-4 h-4 rounded-full ${tone.step} text-[9px] font-black grid place-items-center shrink-0 mt-0.5`}>{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3.5">
              {(state === 'ask' || state === 'other-device') && (
                <button
                  onClick={turnOn}
                  disabled={busy}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold transition disabled:opacity-60 ${tone.btn}`}
                >
                  <Bell size={14} /> {busy ? 'Turning on…' : 'Turn on phone alerts'}
                </button>
              )}
              {state === 'blocked' && (
                <button
                  onClick={turnOn}
                  disabled={busy}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold transition disabled:opacity-60 ${tone.btn}`}
                >
                  <Bell size={14} /> I’ve allowed it — try again
                </button>
              )}
              <button onClick={hide} className={`px-3 py-2 rounded-full text-[13px] font-bold transition ${tone.ghost}`}>
                Not now
              </button>
              {devices > 0 && state !== 'blocked' && (
                <span className={`inline-flex items-center gap-1 text-[11.5px] ${tone.soft}`}>
                  <Smartphone size={12} /> {devices} device{devices > 1 ? 's' : ''} receiving alerts
                </span>
              )}
            </div>

            {/* If the browser won't play along, Telegram still reaches the phone. */}
            {(state === 'blocked' || state === 'ios-install') && (
              <p className={`text-[12px] mt-2.5 ${tone.body}`}>
                Rather not use browser notifications?{' '}
                <Link to="/profile" className={`font-bold hover:underline ${tone.link}`}>Link Telegram</Link>{' '}
                and the same alerts reach you there.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
