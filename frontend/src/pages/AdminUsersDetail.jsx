import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Trophy, Calendar, MessagesSquare, Wallet, Ban, Sparkles, ShieldCheck, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminUserDetail() {
  const { user: me } = useAuth();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get(`/admin/users/${id}`)
      .then(({ data }) => data.success && setData(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (me?.is_admin) load(); /* eslint-disable-next-line */ }, [id, me]);

  const act = async (action, reason) => {
    try {
      await api.patch(`/admin/users/${id}`, { action, reason });
      toast.success(`Done`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  if (!me?.is_admin) {
    return <Layout><div className="p-16 text-center"><ShieldCheck className="mx-auto mb-3 text-ink/20" size={48}/><h1 className="font-display text-2xl font-bold">Admin access required</h1></div></Layout>;
  }

  if (loading) return <Layout><div className="max-w-4xl mx-auto p-10"><div className="h-32 bg-ink/5 rounded-3xl animate-pulse"/></div></Layout>;
  if (!data) return <Layout><div className="p-10 text-center text-ink/60">User not found</div></Layout>;

  const { user, stats, bookings, posts, comments } = data;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/admin/users" className="text-sm text-ink/55 hover:text-ink mb-3 inline-block">← Back to users</Link>

        {/* Header */}
        <div className="card-soft p-6 mb-5">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sun-400 to-coral-400 grid place-items-center text-ink font-bold text-2xl">
              {user.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-black">{user.username}</h1>
                {user.is_admin && <span className="chip bg-ink text-sun-300">⭐ Admin</span>}
                {user.plan === 'premium' && <span className="chip bg-coral-300/40 text-coral-500">Premium</span>}
                {user.is_banned && <span className="chip bg-bear-500 text-white">Banned</span>}
              </div>
              <p className="text-ink/60 text-sm">{user.full_name || ''}</p>
              <p className="text-xs text-ink/50">{user.email} · joined {new Date(user.created_at).toLocaleDateString()}</p>
              {user.last_login_at && (
                <p className="text-xs text-ink/50">Last login: {new Date(user.last_login_at).toLocaleString()}</p>
              )}
              {user.is_banned && user.banned_reason && (
                <p className="text-xs text-bear-500 mt-1 italic">Banned: "{user.banned_reason}"</p>
              )}
            </div>
          </div>

          {/* Actions */}
          {parseInt(id) !== me.id && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-ink/5">
              {user.plan === 'premium' ? (
                <button onClick={() => act('revoke_premium')} className="btn-ghost text-sm">Revoke premium</button>
              ) : (
                <button onClick={() => act('grant_premium')} className="btn-primary text-sm bg-gradient-to-r from-coral-400 to-sun-400 text-ink"><Sparkles size={14}/>Grant premium</button>
              )}
              {user.is_banned ? (
                <button onClick={() => act('unban')} className="px-4 py-2 rounded-full bg-bull-100 text-bull-700 text-sm font-bold"><UserCheck size={14} className="inline mr-1"/>Unban</button>
              ) : !user.is_admin && (
                <button onClick={() => {
                  const reason = prompt('Reason for banning?');
                  if (reason) act('ban', reason);
                }} className="px-4 py-2 rounded-full bg-bear-500 text-white text-sm font-bold"><Ban size={14} className="inline mr-1"/>Ban user</button>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Stat icon={Trophy} label="XP" value={user.total_xp || 0}/>
          <Stat icon={Calendar} label="Lessons" value={stats.lessons_completed}/>
          <Stat icon={MessagesSquare} label="Quizzes passed" value={stats.quizzes_passed}/>
          <Stat icon={Wallet} label="Trades" value={stats.total_trades}/>
        </div>

        {/* Activity timeline */}
        <div className="grid lg:grid-cols-2 gap-5">
          <Section title={`Bookings (${bookings.length})`}>
            {bookings.length === 0 ? <Empty/> : bookings.map((b) => (
              <div key={b.id} className="py-2 border-b border-ink/5 last:border-0 text-sm">
                <p className="font-semibold">{b.session_type}</p>
                <p className="text-xs text-ink/55">{new Date(b.session_date).toLocaleDateString()} · <span className="capitalize">{b.status}</span> · {b.payment_status}</p>
              </div>
            ))}
          </Section>
          <Section title={`Forum posts (${posts.length})`}>
            {posts.length === 0 ? <Empty/> : posts.map((p) => (
              <div key={p.id} className="py-2 border-b border-ink/5 last:border-0 text-sm">
                <Link to={`/forum/${p.id}`} className="font-semibold hover:underline">{p.title}</Link>
                <p className="text-xs text-ink/55">{new Date(p.created_at).toLocaleDateString()} {p.is_removed && <span className="text-bear-500">· removed</span>}</p>
              </div>
            ))}
          </Section>
          <Section title={`Comments (${comments.length})`}>
            {comments.length === 0 ? <Empty/> : comments.map((c) => (
              <div key={c.id} className="py-2 border-b border-ink/5 last:border-0 text-sm">
                <p className="line-clamp-2">{c.is_removed ? <em className="text-bear-500">[removed]</em> : c.content}</p>
                <p className="text-xs text-ink/55 mt-0.5">on post #{c.post_id}</p>
              </div>
            ))}
          </Section>
        </div>
      </div>
    </Layout>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="card-soft p-4 text-center">
      <Icon size={16} className="mx-auto text-ink/40 mb-1"/>
      <p className="text-xs uppercase tracking-wider text-ink/50 font-bold">{label}</p>
      <p className="font-display text-2xl font-black mt-0.5">{value}</p>
    </div>
  );
}
function Section({ title, children }) {
  return <div className="card-soft p-5"><h3 className="font-display text-lg font-bold mb-2">{title}</h3>{children}</div>;
}
function Empty() { return <p className="text-sm text-ink/45 italic py-2">Nothing yet</p>; }