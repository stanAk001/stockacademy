import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { isPushSupported, permissionState, enablePush } from '../lib/push';

// The soft-ask card. We NEVER trigger the browser permission prompt on load —
// only after the user clicks Enable. If they've dismissed it or already decided
// (granted/denied), we stay out of the way.
const DISMISS_KEY = 'sa_push_dismissed';

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    const dismissed = (() => { try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } })();
    // Only prompt when the browser is still undecided and they haven't dismissed.
    if (permissionState() === 'default' && !dismissed) setShow(true);
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode */ }
    setShow(false);
  };

  const enable = async () => {
    setBusy(true);
    try {
      await enablePush();
      toast.success('Notifications on — we’ll ping you when it matters.');
      setShow(false);
    } catch (e) {
      const msg = {
        unsupported: 'This device doesn’t support web notifications.',
        unconfigured: 'Notifications aren’t switched on for the server yet.',
        denied: 'You blocked notifications. You can re-enable them in your browser’s site settings.',
      }[e.message] || 'Could not enable notifications.';
      toast.error(msg);
      if (e.message === 'denied' || e.message === 'unsupported') dismiss();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          className="card-soft p-5 mb-6 relative overflow-hidden"
        >
          <button onClick={dismiss} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-ink/5 text-ink/40" aria-label="Dismiss">
            <X size={16} />
          </button>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-ink grid place-items-center shrink-0">
              <Bell size={18} className="text-sun-300" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-black leading-tight">Don’t miss what moves the market</h3>
              <p className="text-[13px] text-ink/60 mt-1 mb-3">Get a nudge — even when the app is closed — when:</p>
              <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] text-ink/70 mb-4">
                {['A swing setup is confirmed', 'A monitored stock changes', 'An AI opportunity appears', 'A price alert triggers'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5"><Check size={12} className="text-bull-600 shrink-0" /> {t}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button onClick={enable} disabled={busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-cream text-sm font-bold hover:bg-ink-soft transition disabled:opacity-60">
                  <Bell size={14} /> {busy ? 'Enabling…' : 'Enable notifications'}
                </button>
                <button onClick={dismiss} className="px-4 py-2 rounded-full text-sm font-bold text-ink/55 hover:bg-ink/5 transition">
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
