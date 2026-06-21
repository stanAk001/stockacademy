import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, RotateCcw, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminForum() {
  const { user } = useAuth();
  const [type, setType] = useState('all');
  const [filter, setFilter] = useState('active');
  const [data, setData] = useState({ posts: [], comments: [] });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/admin/forum', { params: { type, filter } })
      .then(({ data }) => data.success && setData(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (user?.is_admin) load(); /* eslint-disable-next-line */ }, [type, filter, user]);

  const moderate = async (kind, id, action) => {
    let reason = null;
    if (action === 'remove') {
      reason = prompt('Reason for removal? (visible only to admins)');
      if (!reason) return;
    }
    try {
      await api.patch(`/admin/forum/${kind}s/${id}`, { action, reason });
      toast.success(action === 'remove' ? 'Removed' : 'Restored');
      load();
    } catch {
      toast.error('Failed');
    }
  };

  if (!user?.is_admin) {
    return <Layout><div className="p-16 text-center"><ShieldCheck className="mx-auto mb-3 text-ink/20" size={48}/><h1 className="font-display text-2xl font-bold">Admin access required</h1></div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/admin" className="text-sm text-ink/55 hover:text-ink mb-3 inline-block">← Admin home</Link>
        <h1 className="font-display text-4xl font-black mb-1">Forum moderation</h1>
        <p className="text-ink/60 mb-6">Review posts and comments. Remove abusive content.</p>

        <div className="flex flex-wrap gap-3 mb-5">
          <div className="flex gap-2">
            {['all', 'posts', 'comments'].map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={`px-4 py-2 rounded-full text-sm font-semibold capitalize ${type === t ? 'bg-ink text-cream' : 'bg-white text-ink/70 hover:bg-ink/5'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {['active', 'removed'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-semibold capitalize ${filter === f ? 'bg-ink text-cream' : 'bg-white text-ink/70 hover:bg-ink/5'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-ink/5 rounded-2xl animate-pulse"/>)}</div>
        ) : (
          <div className="space-y-3">
            {(type === 'all' || type === 'posts') && data.posts?.map((p) => (
              <ContentRow key={`p-${p.id}`} kind="post" item={p} onModerate={moderate}/>
            ))}
            {(type === 'all' || type === 'comments') && data.comments?.map((c) => (
              <ContentRow key={`c-${c.id}`} kind="comment" item={c} onModerate={moderate}/>
            ))}
            {!data.posts?.length && !data.comments?.length && (
              <p className="py-12 text-center text-ink/50 italic">Nothing to show.</p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function ContentRow({ kind, item, onModerate }) {
  return (
    <div className={`card-soft p-4 ${item.is_removed ? 'opacity-60 border-2 border-bear-500/20' : ''}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          <span className={`chip ${kind === 'post' ? 'bg-bull-100 text-bull-700' : 'bg-sun-100 text-sun-600'}`}>{kind}</span>
          <Link to={`/admin/users/${item.author_id}`} className="font-semibold text-sm hover:underline">@{item.username}</Link>
          {item.is_banned && <span className="chip bg-bear-500 text-white text-[10px]">banned user</span>}
          <span className="text-xs text-ink/45">· {new Date(item.created_at).toLocaleString()}</span>
        </div>
        <div className="flex gap-2">
          {item.is_removed ? (
            <button onClick={() => onModerate(kind, item.id, 'restore')} className="px-3 py-1 rounded-full bg-bull-100 text-bull-700 text-xs font-bold">
              <RotateCcw size={11} className="inline mr-0.5"/> Restore
            </button>
          ) : (
            <button onClick={() => onModerate(kind, item.id, 'remove')} className="px-3 py-1 rounded-full bg-bear-500 text-white text-xs font-bold">
              <Trash2 size={11} className="inline mr-0.5"/> Remove
            </button>
          )}
        </div>
      </div>
      {kind === 'post' && item.title && <p className="font-display font-bold text-base mb-1"><Link to={`/forum/${item.id}`} className="hover:underline">{item.title}</Link></p>}
      {kind === 'comment' && <p className="text-xs text-ink/55 mb-1">on: {item.post_title}</p>}
      {item.content && <p className="text-sm text-ink/75 line-clamp-3 whitespace-pre-wrap">{item.content}</p>}
      {kind === 'post' && item.image_preview && (
        <Link to={`/forum/${item.id}`} className="inline-block mt-2" title="Open full post">
          <img
            src={item.image_preview}
            alt="user upload"
            className="max-h-60 rounded-xl border border-ink/10 object-contain bg-ink/5"
          />
        </Link>
      )}
      {item.is_removed && item.removed_reason && (
        <p className="text-xs text-bear-500 mt-2 italic">Removed: "{item.removed_reason}"</p>
      )}
    </div>
  );
}