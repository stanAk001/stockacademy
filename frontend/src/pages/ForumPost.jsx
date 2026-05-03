import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUp, Send, Eye, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';

export default function ForumPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get(`/forum/posts/${id}`);
      if (data.success) {
        setPost(data.post);
        setComments(data.comments);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const vote = async () => {
    try {
      await api.post(`/forum/posts/${id}/vote`);
      load();
    } catch { toast.error('Could not vote'); }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const { data } = await api.post(`/forum/posts/${id}/comments`, { content: comment });
      if (data.success) {
        setComment('');
        toast.success('Comment posted');
        load();
      }
    } catch { toast.error('Could not post comment'); }
  };

  if (loading) return <Layout><div className="p-20 text-center">Loading…</div></Layout>;
  if (!post) return <Layout><div className="p-20 text-center">Post not found.</div></Layout>;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/forum" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/60 hover:text-ink mb-6">
          <ArrowLeft size={16} /> Back to forum
        </Link>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-soft p-7"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="chip bg-ink/5 text-ink/70 capitalize">{post.category || 'general'}</span>
            <span className="text-xs text-ink/40">{new Date(post.created_at).toLocaleString()}</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-black leading-tight mb-4">{post.title}</h1>

          <div className="flex items-center gap-3 mb-6">
            {post.avatar_url ? (
              <img src={post.avatar_url} alt="" className="w-10 h-10 rounded-full"/>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sun-400 to-coral-400 grid place-items-center font-bold">
                {post.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-bold text-sm">@{post.username}</p>
              <p className="text-xs text-ink/50">{post.full_name}</p>
            </div>
          </div>

          <p className="text-lg leading-relaxed text-ink/80 whitespace-pre-wrap">{post.content}</p>

          <div className="flex items-center gap-4 mt-6 pt-5 border-t border-ink/5">
            <button onClick={vote} className="flex items-center gap-2 px-4 py-2 rounded-full bg-cream-warm hover:bg-bull-100 font-semibold text-sm">
              <ArrowUp size={16}/> {post.upvotes} upvotes
            </button>
            <span className="text-sm text-ink/50 flex items-center gap-1"><Eye size={14}/> {post.views} views</span>
            <span className="text-sm text-ink/50 flex items-center gap-1"><MessageCircle size={14}/> {comments.length} comments</span>
          </div>
        </motion.article>

        {/* Comments */}
        <section className="mt-8">
          <h2 className="font-display text-2xl font-bold mb-4">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </h2>

          <form onSubmit={submitComment} className="card-soft p-4 mb-5">
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts…"
              className="input-field resize-none"
            />
            <div className="flex justify-end mt-3">
              <button type="submit" disabled={!comment.trim()} className="btn-primary disabled:opacity-50">
                <Send size={14}/> Post comment
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="card-soft p-5">
                <div className="flex items-center gap-2 mb-2">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="w-8 h-8 rounded-full"/>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-400 to-bull-400 grid place-items-center text-xs font-bold">
                      {c.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-bold text-sm">@{c.username}</span>
                  <span className="text-xs text-ink/40">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-ink/80 whitespace-pre-wrap">{c.content}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
