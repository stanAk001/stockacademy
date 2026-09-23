import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Loader2, ArrowLeft, Users, Newspaper, Radio, Bell, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminBroadcast() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [digestBusy, setDigestBusy] = useState(false);
  const [digest, setDigest] = useState(null);

  if (user && !user.is_admin) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-black mb-2">Admins only</h1>
          <Link to="/dashboard" className="text-bull-600 font-bold hover:underline">Back to dashboard</Link>
        </div>
      </Layout>
    );
  }

  const send = async () => {
    if (!message.trim()) return toast('Write a message first', { icon: '✍️' });
    if (!confirm('Send this to all premium members with a linked Telegram?')) return;
    setBusy(true);
    setResult(null);
    try {
      const { data } = await api.post('/admin/broadcast-telegram', { message: message.trim() });
      if (data.success) {
        setResult(data);
        toast.success(`Sent to ${data.sent}/${data.recipients}`);
        setMessage('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed');
    } finally { setBusy(false); }
  };

  const sendDigest = async () => {
    if (!confirm('Generate this week\'s market digest and send it to all premium members with a linked Telegram?')) return;
    setDigestBusy(true);
    setDigest(null);
    try {
      const { data } = await api.post('/admin/send-digest');
      if (data.success) {
        setDigest(data);
        toast.success(`Digest sent to ${data.sent}/${data.recipients}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate the digest (check OPENAI_API_KEY).');
    } finally { setDigestBusy(false); }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link to="/admin" className="text-sm text-ink/50 hover:text-ink inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Admin hub
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-bull-400 grid place-items-center">
            <Radio size={20} className="text-ink" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-black">Broadcast</h1>
            <p className="text-sm text-ink/55">Reach users across in-app, push and Telegram.</p>
          </div>
        </div>

        <MultiChannelBroadcast />

        <h2 className="font-display text-lg font-black mt-8 mb-3 flex items-center gap-2"><Send size={16} /> Telegram-only broadcast</h2>
        <div className="card-soft p-6">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={3000}
            placeholder="e.g. This week's premium watchlist: 3 NGX stocks showing strong momentum…"
            className="input-field text-sm"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-ink/40">{message.length}/3000 · only active premium + linked users receive it</span>
            <button onClick={send} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-cream text-sm font-bold hover:bg-ink-soft transition disabled:opacity-60">
              {busy ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send broadcast</>}
            </button>
          </div>

          {result && (
            <div className="mt-4 p-4 rounded-2xl bg-cream-warm flex items-center gap-4 text-sm">
              <Users size={18} className="text-ink/50" />
              <span><strong>{result.recipients}</strong> recipients</span>
              <span className="text-bull-700"><strong>{result.sent}</strong> sent</span>
              {result.failed > 0 && <span className="text-bear-500"><strong>{result.failed}</strong> failed</span>}
            </div>
          )}
        </div>

        {/* Weekly market digest */}
        <div className="card-soft p-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-sun-300 grid place-items-center shrink-0">
                <Newspaper size={18} className="text-ink" />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg font-black leading-tight">Weekly market digest</h2>
                <p className="text-sm text-ink/55 break-words">Auto-sends every Sunday 8am. Generate &amp; send now to preview.</p>
              </div>
            </div>
            <button onClick={sendDigest} disabled={digestBusy} className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-cream text-sm font-bold hover:bg-ink-soft transition disabled:opacity-60">
              {digestBusy ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Send size={14} /> Generate &amp; send now</>}
            </button>
          </div>

          {digest && (
            <div className="mt-4">
              <div className="p-4 rounded-2xl bg-cream-warm text-sm text-ink/80 whitespace-pre-line break-words leading-relaxed">{digest.preview}</div>
              <p className="text-[11px] text-ink/50 mt-2">Sent to <strong>{digest.sent}</strong> of <strong>{digest.recipients}</strong> linked premium members.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

const AUDIENCES = [
  { id: 'all', label: 'All users' },
  { id: 'premium', label: 'Premium' },
  { id: 'free', label: 'Free' },
  { id: 'push', label: 'Push-enabled' },
  { id: 'swing', label: 'Swing traders' },
  { id: 'longterm', label: 'Long-term investors' },
];
const CHANNELS = [
  { id: 'in_app', label: 'In-app', icon: Bell },
  { id: 'push', label: 'Push', icon: Smartphone },
  { id: 'telegram', label: 'Telegram', icon: Send },
];

function MultiChannelBroadcast() {
  const [audience, setAudience] = useState('all');
  const [channels, setChannels] = useState(['in_app']);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const toggleCh = (id) => setChannels((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const send = async () => {
    if (!body.trim()) return toast('Write a message first', { icon: '✍️' });
    if (!channels.length) return toast('Pick at least one channel', { icon: '📡' });
    if (!confirm(`Send to "${AUDIENCES.find((a) => a.id === audience).label}" via ${channels.join(', ')}?`)) return;
    setBusy(true); setResult(null);
    try {
      const { data } = await api.post('/admin/broadcast', {
        audience, channels, title: title.trim() || null, body: body.trim(), deep_link: deepLink.trim() || null,
      });
      if (data.success) { setResult(data); toast.success(`Delivered to ${data.recipients} recipients`); setBody(''); setTitle(''); setDeepLink(''); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Broadcast failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="card-soft p-6">
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/45 mb-1">Audience</label>
          <div className="flex flex-wrap gap-1.5">
            {AUDIENCES.map((a) => (
              <button key={a.id} onClick={() => setAudience(a.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${audience === a.id ? 'bg-ink text-cream' : 'bg-cream-warm text-ink/60 hover:text-ink'}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-ink/45 mb-1">Channels</label>
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map((c) => (
              <button key={c.id} onClick={() => toggleCh(c.id)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition ${channels.includes(c.id) ? 'bg-bull-600 text-white' : 'bg-cream-warm text-ink/60 hover:text-ink'}`}>
                <c.icon size={12} /> {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160}
        placeholder="Title (optional — shown on push & Telegram)" className="input-field text-sm mb-2" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={3000}
        placeholder="Your announcement…" className="input-field text-sm" />
      <input value={deepLink} onChange={(e) => setDeepLink(e.target.value)}
        placeholder="Deep link (optional, e.g. /radar)" className="input-field text-sm mt-2 font-mono" />

      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-ink/40">{body.length}/3000</span>
        <button onClick={send} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-cream text-sm font-bold hover:bg-ink-soft transition disabled:opacity-60">
          {busy ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Radio size={14} /> Send broadcast</>}
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 rounded-2xl bg-cream-warm flex items-center gap-4 text-sm">
          <Users size={18} className="text-ink/50" />
          <span>Audience <strong>{result.audience}</strong></span>
          <span className="text-bull-700"><strong>{result.recipients}</strong> reached</span>
          <span className="text-ink/50">via {result.channels?.join(', ')}</span>
        </div>
      )}
    </div>
  );
}
