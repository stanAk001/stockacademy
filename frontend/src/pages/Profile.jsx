import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Save, Zap, Trophy, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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
        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-sun-300 via-coral-300 to-coral-400 rounded-[2rem] p-8 sm:p-10 mb-8 overflow-hidden"
        >
          <div className="absolute -top-4 -right-4 text-ink/10 font-display text-[10rem] font-black leading-none select-none">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} className="w-24 h-24 rounded-full ring-4 ring-ink" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-ink text-cream grid place-items-center font-display text-4xl font-black ring-4 ring-ink">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest">@{user?.username}</p>
              <h1 className="font-display text-3xl sm:text-4xl font-black leading-tight">{user?.full_name || user?.username}</h1>
              <p className="text-ink/70 mt-1 flex items-center gap-1.5 text-sm"><Mail size={14}/> {user?.email}</p>
              <p className="text-xs text-ink/60 mt-1">
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
        <form onSubmit={save} className="card-soft p-7">
          <h2 className="font-display text-2xl font-bold mb-5">Edit profile</h2>
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
        </form>
      </div>
    </Layout>
  );
}

function MiniStat({ icon: Icon, label, value, color, capitalize }) {
  return (
    <div className="card-soft p-4 text-center">
      <div className={`w-10 h-10 ${color} rounded-xl grid place-items-center mx-auto mb-2`}>
        <Icon size={16} className="text-ink" strokeWidth={2.4}/>
      </div>
      <p className={`font-display text-xl font-black ${capitalize ? 'capitalize' : ''}`}>{value}</p>
      <p className="text-xs text-ink/50 font-semibold uppercase tracking-wider">{label}</p>
    </div>
  );
}
