import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, ArrowUp, Plus, X, Eye, ArrowRight, MessagesSquare,
  BarChart3, Newspaper, HelpCircle, LayoutGrid, Sparkles, ImagePlus, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PremiumBadge from '../components/PremiumBadge';
import { compressImage } from '../lib/compressImage';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'general', label: 'General', icon: MessageCircle },
  { id: 'analysis', label: 'Analysis', icon: BarChart3 },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'help', label: 'Help', icon: HelpCircle },
];

// One-tap conversation starters — clicking opens the composer pre-filled, so
// nobody ever faces a blank page.
const STARTERS = [
  { q: 'What stock are you researching right now?', category: 'general' },
  { q: "Explain dividends to me like I'm 5", category: 'help' },
  { q: 'Is now a good time to start on the NGX?', category: 'general' },
  { q: "What's the best lesson from your worst trade?", category: 'analysis' },
];

const VIBES = ['No judgment', 'No pump groups', 'Just real learners'];

export default function Forum() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState(null); // null = closed; {} or {title,category} = open

  const openCompose = (seed = {}) => setCompose(seed);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/forum/posts${category !== 'all' ? `?category=${category}` : ''}`);
      if (data.success) setPosts(data.posts);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [category]);

  // Opening the forum clears the "new posts" badge in the navbar.
  useEffect(() => {
    api.post('/forum/seen').catch(() => {});
    window.dispatchEvent(new Event('forum-seen'));
  }, []);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-widest text-coral-500">Community</p>
          <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight mt-1">
            The <span className="italic">forum</span>.
          </h1>
          <p className="text-ink/60 mt-1">Ask questions. Share trades. Help others.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {VIBES.map((v) => (
              <span key={v} className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/55 bg-cream-warm border border-ink/5 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-bull-500" /> {v}
              </span>
            ))}
          </div>
        </div>

        {/* Composer teaser — the primary, inviting "post" affordance */}
        <button
          onClick={() => openCompose()}
          className="w-full card-soft p-3.5 sm:p-4 flex items-center gap-3 text-left hover:shadow-lg hover:-translate-y-0.5 transition mb-5 group"
        >
          <div className="w-11 h-11 rounded-full bg-ink text-sun-300 grid place-items-center shrink-0 font-display font-black text-lg">
            {user?.username ? user.username.charAt(0).toUpperCase() : <Plus size={20} />}
          </div>
          <span className="flex-1 min-w-0 text-ink/45 group-hover:text-ink/65 transition truncate">
            {user?.username ? `What's on your mind, ${user.username}?` : "What's on your mind?"}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-ink text-cream rounded-full px-3 sm:px-4 py-2 text-sm font-bold shrink-0">
            <Plus size={15} /> <span className="hidden sm:inline">New discussion</span>
          </span>
        </button>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition ${
                category === c.id ? 'bg-ink text-cream' : 'bg-white text-ink/70 hover:bg-ink/5'
              }`}
            >
              <c.icon size={14} /> {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-ink/5 animate-pulse rounded-2xl" />)}
          </div>
        ) : posts.length ? (
          <>
            <StarterChips openCompose={openCompose} />
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
                      <div className="flex items-center gap-x-2 gap-y-1 mb-1 flex-wrap">
                        <span className="chip bg-ink/5 text-ink/70 capitalize">{p.category || 'general'}</span>
                        {p.has_image && !p.image_thumb && (
                          <span className="chip bg-sun-100 text-sun-600 inline-flex items-center gap-1"><ImagePlus size={11} /> Image</span>
                        )}
                        <span className="text-xs text-ink/40">
                          by <span className="font-semibold text-ink">@{p.username}</span>
                        </span>
                        <PremiumBadge plan={p.plan} />
                        <span className="text-xs text-ink/40">· {new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                      {p.title ? (
                        <>
                          <h3 className="font-display text-xl font-bold mb-1 line-clamp-1">{p.title}</h3>
                          {p.content && <p className="text-sm text-ink/60 line-clamp-2">{p.content}</p>}
                        </>
                      ) : p.content ? (
                        <p className="font-display text-lg font-bold line-clamp-2">{p.content}</p>
                      ) : (
                        <p className="font-display text-lg font-bold text-ink/70 inline-flex items-center gap-1.5"><ImagePlus size={16} /> Shared an image</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-ink/50">
                        <span className="flex items-center gap-1"><MessageCircle size={12} /> {p.comment_count} comments</span>
                        <span className="flex items-center gap-1"><Eye size={12} /> {p.views} views</span>
                      </div>
                    </div>
                    {p.image_thumb && (
                      <div className="shrink-0">
                        <img
                          src={p.image_thumb}
                          alt=""
                          loading="lazy"
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-ink/10"
                        />
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState openCompose={openCompose} />
        )}
      </div>

      <AnimatePresence>
        {compose && <CreateModal seed={compose} onClose={() => setCompose(null)} onCreated={load} />}
      </AnimatePresence>
    </Layout>
  );
}

function StarterChips({ openCompose }) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <span className="text-xs font-bold uppercase tracking-wider text-ink/40 inline-flex items-center gap-1">
        <Sparkles size={12} className="text-coral-500" /> Spark one
      </span>
      {STARTERS.map((s) => (
        <button
          key={s.q}
          onClick={() => openCompose({ title: s.q, category: s.category })}
          className="px-3 py-1.5 rounded-full bg-cream-warm hover:bg-sun-100 text-xs sm:text-sm text-ink/75 font-medium transition border border-ink/5"
        >
          {s.q}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ openCompose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-soft p-8 sm:p-12 text-center"
    >
      <div className="w-16 h-16 mx-auto bg-ink text-sun-300 rounded-2xl grid place-items-center mb-4">
        <MessagesSquare size={28} />
      </div>
      <h2 className="font-display text-2xl sm:text-3xl font-black mb-1.5">Be the first to spark it.</h2>
      <p className="text-ink/60 mb-7 max-w-md mx-auto leading-relaxed">
        No pump groups, no judgment — just real learners figuring out the market together. Pick a prompt and go:
      </p>

      <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
        {STARTERS.map((s, i) => (
          <motion.button
            key={s.q}
            onClick={() => openCompose({ title: s.q, category: s.category })}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="group flex items-center gap-3 p-4 rounded-2xl bg-cream-warm hover:bg-sun-100 border border-ink/5 transition text-sm font-medium"
          >
            <span className="w-8 h-8 rounded-xl bg-ink text-sun-300 grid place-items-center shrink-0">
              <Sparkles size={14} />
            </span>
            <span className="flex-1">{s.q}</span>
            <ArrowRight size={15} className="text-ink/30 group-hover:text-ink group-hover:translate-x-0.5 transition shrink-0" />
          </motion.button>
        ))}
      </div>

      <button onClick={() => openCompose()} className="btn-primary mt-7">
        <Plus size={16} /> Start from scratch
      </button>
    </motion.div>
  );
}

function CreateModal({ seed, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: seed?.title || '',
    content: '',
    category: seed?.category || 'general',
  });
  const [image, setImage] = useState(null); // full compressed data URL
  const [thumb, setThumb] = useState(null); // small preview shown in the feed
  const [imgBusy, setImgBusy] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef(null);
  const prefilled = !!seed?.title;

  // A post just needs at least one of: text, headline, or image.
  const canPost = !!(form.content.trim() || form.title.trim() || image);

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the user re-pick the same file
    if (!file) return;
    setImgBusy(true);
    try {
      const dataUrl = await compressImage(file, { maxDim: 1280, quality: 0.72 });
      if (dataUrl.length > 5_000_000) {
        toast.error('That image is too large even after compressing — try a smaller one.');
      } else {
        // A small thumbnail rides along so the feed can show a preview
        // without loading the full-size image.
        const small = await compressImage(file, { maxDim: 480, quality: 0.6 });
        setImage(dataUrl);
        setThumb(small);
      }
    } catch (err) {
      toast.error(err.message || 'Could not process that image.');
    } finally {
      setImgBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canPost) return;
    setPosting(true);
    try {
      const { data } = await api.post('/forum/posts', {
        title: form.title.trim() || null,
        content: form.content.trim() || null,
        category: form.category,
        image_url: image || null,
        image_thumb: thumb || null,
      });
      if (data.success) {
        toast.success('Posted!');
        onCreated();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post');
    } finally { setPosting(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <motion.form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-cream rounded-3xl max-w-lg w-full max-h-[90vh] overflow-auto"
      >
        <div className="p-5 border-b border-ink/5 flex justify-between items-center sticky top-0 bg-cream z-10">
          <div>
            <h2 className="font-display text-xl font-bold">Share with the community</h2>
            <p className="text-xs text-ink/50">A few words, a question, or just a chart — your call.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-ink/5 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Primary: what you want to say */}
          <textarea
            rows={5}
            autoFocus={prefilled}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="What do you want to share? An idea, a question, an analysis…"
            className="input-field resize-none text-base"
          />

          {/* Optional headline */}
          <input
            maxLength={200}
            autoFocus={!prefilled}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Add a headline (optional)"
            className="input-field"
          />

          {/* Image preview */}
          {image && (
            <div className="relative rounded-2xl overflow-hidden border border-ink/10">
              <img src={image} alt="attachment preview" className="w-full max-h-72 object-contain bg-ink/5" />
              <button
                type="button"
                onClick={() => { setImage(null); setThumb(null); }}
                className="absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-full bg-ink/70 text-cream hover:bg-ink"
                aria-label="Remove image"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} className="hidden" />

          {/* Action row */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={imgBusy}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-cream-warm hover:bg-sun-100 border border-ink/5 text-sm font-semibold text-ink/75 transition disabled:opacity-60"
            >
              {imgBusy ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
              {image ? 'Change image' : 'Add image'}
            </button>

            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2 rounded-full border border-ink/10 bg-white text-sm font-semibold focus:outline-none focus:border-ink/30"
            >
              <option value="general">General</option>
              <option value="analysis">Analysis</option>
              <option value="news">News</option>
              <option value="help">Help</option>
            </select>
          </div>

          <button type="submit" disabled={posting || imgBusy || !canPost} className="btn-primary w-full disabled:opacity-50">
            {posting ? 'Posting…' : 'Post to forum'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
