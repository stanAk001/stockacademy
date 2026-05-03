import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ArrowUp, Plus, X, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'news', label: 'News' },
  { id: 'help', label: 'Help' },
];

export default function Forum() {
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/forum/posts${category !== 'all' ? `?category=${category}` : ''}`);
      if (data.success) setPosts(data.posts);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [category]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-coral-500">Community</p>
            <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight mt-1">
              The <span className="italic">forum</span>.
            </h1>
            <p className="text-ink/60 mt-1">Ask questions. Share trades. Help others. No judgment.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary shrink-0 self-start">
            <Plus size={16} /> New discussion
          </button>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                category === c.id ? 'bg-ink text-cream' : 'bg-white text-ink/70 hover:bg-ink/5'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-ink/5 animate-pulse rounded-2xl"/>)}
          </div>
        ) : posts.length ? (
          <div className="space-y-3">
            {posts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link to={`/forum/${p.id}`} className="card-soft p-5 flex gap-4 hover:shadow-lg hover:-translate-y-0.5 transition">
                  <div className="flex flex-col items-center shrink-0 bg-cream-warm rounded-xl px-3 py-2">
                    <ArrowUp size={16} className="text-bull-600" />
                    <span className="font-bold">{p.upvotes}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="chip bg-ink/5 text-ink/70 capitalize">{p.category || 'general'}</span>
                      <span className="text-xs text-ink/40">
                        by <span className="font-semibold text-ink">@{p.username}</span> · {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-bold mb-1 line-clamp-1">{p.title}</h3>
                    <p className="text-sm text-ink/60 line-clamp-2">{p.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-ink/50">
                      <span className="flex items-center gap-1"><MessageCircle size={12}/> {p.comment_count} comments</span>
                      <span className="flex items-center gap-1"><Eye size={12}/> {p.views} views</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="text-6xl mb-3">💬</div>
            <p className="font-display text-2xl font-bold mb-1">Be the first to post</p>
            <p className="text-ink/60 mb-5">Kick off the conversation in this category.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={16}/> Start a discussion
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />}
      </AnimatePresence>
    </Layout>
  );
}

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', content: '', category: 'general' });
  const [posting, setPosting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      const { data } = await api.post('/forum/posts', form);
      if (data.success) {
        toast.success('Posted!');
        onCreated();
        onClose();
      }
    } catch (err) {
      toast.error('Could not post');
    } finally { setPosting(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm grid place-items-center p-4"
    >
      <motion.form
        onSubmit={submit}
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-cream rounded-3xl max-w-lg w-full max-h-[90vh] overflow-auto"
      >
        <div className="p-5 border-b border-ink/5 flex justify-between items-center sticky top-0 bg-cream">
          <h2 className="font-display text-xl font-bold">Start a discussion</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-ink/5 rounded-full">
            <X size={20}/>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Category</label>
            <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} className="input-field">
              <option value="general">General</option>
              <option value="analysis">Analysis</option>
              <option value="news">News</option>
              <option value="help">Help</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Title</label>
            <input
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm({...form, title: e.target.value})}
              placeholder="What's on your mind?"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Your post</label>
            <textarea
              required
              rows={6}
              value={form.content}
              onChange={(e) => setForm({...form, content: e.target.value})}
              placeholder="Share details, context, or a question…"
              className="input-field resize-none"
            />
          </div>
          <button type="submit" disabled={posting} className="btn-primary w-full disabled:opacity-60">
            {posting ? 'Posting…' : 'Post to forum'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
