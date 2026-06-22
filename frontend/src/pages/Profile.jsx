import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { User, Mail, Save, Zap, Trophy, Wallet, Send, Check, Loader2, Languages, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LANGS, getLang, setLang } from '../lib/lang';

const LEVELS = [
  { id: 'beginner', label: 'Beginner', emoji: '🌱' },
  { id: 'intermediate', label: 'Intermediate', emoji: '📈' },
  { id: 'advanced', label: 'Advanced', emoji: '🏆' },
];

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    bio: user?.bio || '',
    experience_level: user?.experience_level || 'beginner',
  });
  const [saving, setSaving] = useState(false);
  const [aiLang, setAiLang] = useState(getLang());

  const isPremium = user?.plan === 'premium';
  const initial = (user?.username || user?.full_name || '?').charAt(0).toUpperCase();

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch('/users/profile', form);
      if (data.success) {
        setUser(data.user);
        toast.success('Profile updated');
      }
    } catch {
      toast.error('Update failed');
    } finally { setSaving(false); }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Hero — solid ink, no gradient wash */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] bg-ink text-cream p-7 sm:p-10 mb-5 grain-overlay"
        >
          <div className="absolute -top-8 -right-3 font-display text-[11rem] sm:text-[13rem] font-black leading-none text-cream/[0.05] select-none pointer-events-none">
            {initial}
          </div>
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} className="w-24 h-24 rounded-full object-cover ring-4 ring-sun-300/40 shrink-0" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-sun-300 text-ink grid place-items-center font-display text-4xl font-black ring-4 ring-cream/10 shrink-0">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-widest text-sun-300">@{user?.username}</span>
                {isPremium ? (
                  <span className="inline-flex items-center gap-1 bg-sun-300 text-ink text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    <Crown size={11} className="fill-ink" /> Premium
                  </span>
                ) : (
                  <span className="bg-cream/10 text-cream/75 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">Member</span>
                )}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-black leading-tight break-words">{user?.full_name || user?.username}</h1>
              <p className="text-cream/70 mt-1.5 flex items-center gap-1.5 text-sm break-all"><Mail size={14} className="shrink-0" /> {user?.email}</p>
              <p className="text-xs text-cream/45 mt-1">
                Signed in with {user?.auth_provider === 'google' ? 'Google' : 'email & password'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <MiniStat icon={Zap} label="XP" value={user?.total_xp ?? 0} color="bg-sun-300"/>
          <MiniStat icon={Wallet} label="Virtual cash" value={`$${Number(user?.virtual_balance || 0).toLocaleString()}`} color="bg-bull-400"/>
          <MiniStat icon={Trophy} label="Level" value={user?.experience_level || 'beginner'} color="bg-coral-300" capitalize/>
        </div>

        {/* Edit form */}
        <motion.form
          onSubmit={save}
          initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="card-soft p-6 sm:p-7"
        >
          <SectionHeader icon={User} title="Edit profile" subtitle="How you show up across StockAcademia." />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5">Full name</label>
              <input
                type="text"
                className="input-field"
                value={form.full_name}
                onChange={(e) => setForm({...form, full_name: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5">Bio</label>
              <textarea
                rows={3}
                className="input-field resize-none"
                placeholder="A short description about you…"
                value={form.bio}
                onChange={(e) => setForm({...form, bio: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Experience level</label>
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map((l) => (
                  <button
                    type="button"
                    key={l.id}
                    onClick={() => setForm({...form, experience_level: l.id})}
                    className={`p-3 rounded-2xl border-2 font-semibold transition ${
                      form.experience_level === l.id
                        ? 'border-ink bg-ink text-cream'
                        : 'border-ink/10 hover:border-ink/30 bg-white'
                    }`}
                  >
                    <div className="text-2xl">{l.emoji}</div>
                    <div className="text-sm mt-1">{l.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              <Save size={16}/> {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </motion.form>

        {/* Language for AI answers */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="card-soft p-6 sm:p-7 mt-5"
        >
          <SectionHeader icon={Languages} title="Language for AI answers" subtitle="The tutor, stock comparison, news scanner & portfolio AI reply in this language — change anytime." />
          <div className="flex flex-wrap gap-2">
            {LANGS.map((l) => (
              <button
                type="button"
                key={l.code}
                onClick={() => { setLang(l.code); setAiLang(l.code); toast.success(`AI will answer in ${l.label}`); }}
                className={`px-4 py-2 rounded-2xl border-2 font-semibold text-sm transition ${
                  aiLang === l.code ? 'border-ink bg-ink text-cream' : 'border-ink/10 hover:border-ink/30 bg-white'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink/45 mt-3">
            🇳🇬 Yes — the AI explains in Pidgin, Yorùbá, Hausa and Igbo. You can also switch it inside the tutor on any lesson.
          </p>
        </motion.div>

        {/* Telegram alerts — Premium only */}
        <div className="mt-5">
          {isPremium ? <TelegramConnect /> : <TelegramUpsell />}
        </div>
      </div>
    </Layout>
  );
}

// Non-premium users see why Telegram alerts are worth upgrading for, with a
// direct path to the upgrade page (the connect feature itself is Premium-only).
function TelegramUpsell() {
  return (
    <div className="card-soft p-7 mt-6">
      <div className="flex items-start gap-2.5">
        <div className="w-10 h-10 rounded-2xl bg-[#229ED9] text-white grid place-items-center shrink-0">
          <Send size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-2xl font-bold leading-tight">Telegram alerts</h2>
            <span className="chip bg-sun-300 text-ink inline-flex items-center gap-1 shrink-0"><Crown size={12} /> Premium</span>
          </div>
          <p className="text-sm text-ink/55">Price alerts &amp; updates delivered to your phone on Telegram — even when you're off the site.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cream-warm rounded-2xl p-4">
        <p className="text-sm text-ink/70">Connecting Telegram is a Premium feature. Upgrade to get alerts straight to your phone.</p>
        <Link to="/upgrade" className="btn-primary shrink-0">
          <Crown size={16} /> Upgrade
        </Link>
      </div>
    </div>
  );
}

// Connect a user's Telegram so price alerts & Premium updates reach their phone,
// even off-site. Uses the link-code flow with a one-tap deep link.
function TelegramConnect() {
  const [linked, setLinked] = useState(null); // null = loading
  const [code, setCode] = useState(null);     // { code, bot }
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    api.get('/telegram/status')
      .then(({ data }) => setLinked(Boolean(data.linked)))
      .catch(() => setLinked(false));
    return () => clearInterval(pollRef.current);
  }, []);

  const startPolling = () => {
    clearInterval(pollRef.current);
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries += 1;
      try {
        const { data } = await api.get('/telegram/status');
        if (data.linked) {
          clearInterval(pollRef.current);
          setLinked(true);
          setCode(null);
          toast.success('Telegram connected! 🎉');
        }
      } catch { /* ignore */ }
      if (tries > 40) clearInterval(pollRef.current); // give up after ~2 min
    }, 3000);
  };

  const connect = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/telegram/link-code');
      if (data.success) {
        setCode({ code: data.code, bot: data.bot_username });
        startPolling();
      }
    } catch {
      toast.error('Could not start linking. Please try again.');
    } finally { setBusy(false); }
  };

  const disconnect = async () => {
    try {
      await api.post('/telegram/unlink');
      clearInterval(pollRef.current);
      setLinked(false);
      setCode(null);
      toast.success('Telegram disconnected');
    } catch { toast.error('Could not disconnect'); }
  };

  const deepLink = code?.bot ? `https://t.me/${code.bot}?start=${code.code}` : null;

  return (
    <div className="card-soft p-7 mt-6">
      <div className="flex items-start gap-2.5">
        <div className="w-10 h-10 rounded-2xl bg-[#229ED9] text-white grid place-items-center shrink-0">
          <Send size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl font-bold leading-tight">Telegram alerts</h2>
          <p className="text-sm text-ink/55">Get price alerts &amp; Premium updates on your phone — even when you're not on the site.</p>
        </div>
        {linked && (
          <span className="chip bg-bull-100 text-bull-700 inline-flex items-center gap-1 shrink-0"><Check size={12} /> Connected</span>
        )}
      </div>

      {linked === null ? (
        <p className="text-sm text-ink/40 mt-4 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Checking…</p>
      ) : linked ? (
        <div className="mt-4 flex items-center justify-between gap-3 bg-cream-warm rounded-2xl p-4">
          <p className="text-sm text-ink/70">Connected — alerts arrive in your Telegram instantly.</p>
          <button onClick={disconnect} className="text-sm font-bold text-bear-500 hover:underline shrink-0">Disconnect</button>
        </div>
      ) : code ? (
        <div className="mt-4 space-y-3">
          {deepLink && (
            <a href={deepLink} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#229ED9] text-white font-bold hover:brightness-110 transition">
              <Send size={16} /> Open Telegram to finish
            </a>
          )}
          <p className="text-sm text-ink/55 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Waiting for you to confirm in Telegram…
          </p>
          <div className="text-xs text-ink/50 bg-cream-warm rounded-xl p-3 leading-relaxed">
            {deepLink ? 'Didn’t open? ' : ''}Open{' '}
            {code.bot ? (
              <a href={`https://t.me/${code.bot}`} target="_blank" rel="noopener noreferrer" className="font-bold text-[#229ED9] hover:underline">@{code.bot}</a>
            ) : 'the StockAcademia bot'}
            {' '}and send <code className="font-mono font-bold text-ink">/link {code.code}</code>
            <span className="block mt-1 text-ink/40">This code expires in 15 minutes.</span>
          </div>
        </div>
      ) : (
        <button onClick={connect} disabled={busy}
          className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#229ED9] text-white font-bold hover:brightness-110 transition disabled:opacity-60">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Connect Telegram
        </button>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-10 h-10 rounded-2xl bg-ink text-sun-300 grid place-items-center shrink-0">
        <Icon size={18} strokeWidth={2.3} />
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-xl font-bold leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-ink/55 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color, capitalize }) {
  return (
    <div className="card-soft p-4 sm:p-5 text-center hover:shadow-lg hover:-translate-y-0.5 transition">
      <div className={`w-11 h-11 ${color} rounded-2xl grid place-items-center mx-auto mb-2.5`}>
        <Icon size={18} className="text-ink" strokeWidth={2.4}/>
      </div>
      <p className={`font-display text-xl sm:text-2xl font-black leading-none ${capitalize ? 'capitalize' : ''}`}>{value}</p>
      <p className="text-[11px] text-ink/50 font-bold uppercase tracking-wider mt-1.5">{label}</p>
    </div>
  );
}
