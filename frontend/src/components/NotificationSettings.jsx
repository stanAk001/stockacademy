import { useEffect, useState } from 'react';
import { Bell, Loader2, Smartphone, Send, Mail, MonitorSmartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { isPushSupported, permissionState, enablePush, disablePush, isSubscribed } from '../lib/push';

const CATEGORY_LABEL = {
  trading: 'Price & setup alerts',
  ai: 'AI Swing Radar',
  portfolio: 'Portfolio',
  market: 'Market updates',
  news: 'News',
  product: 'Product & announcements',
};
const CHANNELS = [
  { key: 'in_app', label: 'In-app', icon: MonitorSmartphone },
  { key: 'push', label: 'Push', icon: Smartphone },
  { key: 'telegram', label: 'Telegram', icon: Send },
  { key: 'email', label: 'Email', icon: Mail },
];

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState(null);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    api.get('/notifications/preferences').then(({ data }) => data.success && setPrefs(data.preferences)).catch(() => setPrefs([]));
    isSubscribed().then(setPushOn);
  }, []);

  const toggle = async (category, key, value) => {
    setPrefs((p) => p.map((row) => (row.category === category ? { ...row, [key]: value } : row)));
    const row = prefs.find((r) => r.category === category);
    try {
      await api.put('/notifications/preferences', { ...row, [key]: value });
    } catch {
      toast.error('Could not save that preference');
      api.get('/notifications/preferences').then(({ data }) => data.success && setPrefs(data.preferences));
    }
  };

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushOn) { await disablePush(); setPushOn(false); toast('Push turned off on this device', { icon: '🔕' }); }
      else { await enablePush(); setPushOn(true); toast.success('Push on for this device'); }
    } catch (e) {
      const msg = { unsupported: 'This device doesn’t support push.', unconfigured: 'Push isn’t configured on the server yet.', denied: 'Notifications are blocked — enable them in your browser settings.' }[e.message] || 'Could not change push.';
      toast.error(msg);
    } finally { setPushBusy(false); }
  };

  return (
    <div className="card-soft p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Bell size={18} className="text-ink" />
        <h3 className="font-display text-xl font-black">Notifications</h3>
      </div>
      <p className="text-sm text-ink/55 mb-5">Choose what reaches you, and where.</p>

      {/* Per-device push switch */}
      {isPushSupported() && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-cream-warm mb-5">
          <div className="min-w-0">
            <p className="font-bold text-sm flex items-center gap-1.5"><Smartphone size={14} /> Push on this device</p>
            <p className="text-[11px] text-ink/50 mt-0.5">
              {permissionState() === 'denied' ? 'Blocked in your browser — enable in site settings.' : 'Works even when StockAcademia is closed.'}
            </p>
          </div>
          <button onClick={togglePush} disabled={pushBusy || permissionState() === 'denied'}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition disabled:opacity-50 ${pushOn ? 'bg-bull-600 text-white' : 'bg-ink text-cream hover:bg-ink-soft'}`}>
            {pushBusy ? <Loader2 size={13} className="animate-spin" /> : pushOn ? 'On' : 'Turn on'}
          </button>
        </div>
      )}

      {!prefs ? (
        <div className="py-8 text-center"><Loader2 className="animate-spin mx-auto text-ink/40" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="text-ink/45 text-[11px] uppercase tracking-wide">
                <th className="text-left font-bold py-2">Category</th>
                {CHANNELS.map((c) => (
                  <th key={c.key} className="font-bold py-2 px-1 text-center">
                    <span className="inline-flex flex-col items-center gap-0.5"><c.icon size={13} />{c.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prefs.map((row) => (
                <tr key={row.category} className="border-t border-ink/5">
                  <td className="py-2.5 font-semibold text-ink/80">{CATEGORY_LABEL[row.category] || row.category}</td>
                  {CHANNELS.map((c) => (
                    <td key={c.key} className="py-2.5 px-1 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(row[c.key])}
                        onChange={(e) => toggle(row.category, c.key, e.target.checked)}
                        className="w-4 h-4 accent-bull-600 cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
