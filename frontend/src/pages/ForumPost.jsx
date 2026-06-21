import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, Reply, Send, Eye, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PremiumBadge, { premiumRing } from '../components/PremiumBadge';
import { timeAgo } from '../lib/timeAgo';

function Avatar({ url, name, plan, size = 'w-9 h-9', text = 'text-sm' }) {
  return url ? (
    <img src={url} alt="" className={`${size} rounded-full object-cover shrink-0 ${premiumRing(plan)}`} />
  ) : (
    <div className={`${size} rounded-full bg-gradient-to-br from-sun-400 to-coral-400 grid place-items-center font-bold ${text} text-ink shrink-0 ${premiumRing(plan)}`}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
}

export default function ForumPost() {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
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

  // Optimistic like toggles — instant feedback, reload only if the call fails.
  const votePost = async () => {
    setPost((p) => ({ ...p, liked: !p.liked, upvotes: p.upvotes + (p.liked ? -1 : 1) }));
    try { await api.post(`/forum/posts/${id}/vote`); }
    catch { toast.error('Could not update like'); load(); }
  };

  const voteComment = async (cid) => {
    setComments((cs) => cs.map((c) => (c.id === cid ? { ...c, liked: !c.liked, upvotes: c.upvotes + (c.liked ? -1 : 1) } : c)));
    try { await api.post(`/forum/comments/${cid}/vote`); }
    catch { toast.error('Could not update like'); load(); }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const { data } = await api.post(`/forum/posts/${id}/comments`, { content: comment });
      if (data.success) { setComment(''); load(); }
    } catch { toast.error('Could not post comment'); }
  };

  const submitReply = async (parentId) => {
    if (!replyText.trim()) return;
    try {
      const { data } = await api.post(`/forum/posts/${id}/comments`, { content: replyText, parent_comment_id: parentId });
      if (data.success) { setReplyText(''); setReplyTo(null); load(); }
    } catch { toast.error('Could not post reply'); }
  };

  if (loading) return <Layout><div className="p-20 text-center text-ink/50">Loading…</div></Layout>;
  if (!post) return <Layout><div className="p-20 text-center text-ink/50">Post not found.</div></Layout>;

  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const repliesOf = (cid) => comments.filter((c) => c.parent_comment_id === cid);

  const CommentRow = ({ c, isReply }) => (
    <div className="flex gap-2.5">
      <Avatar url={c.avatar_url} name={c.username} plan={c.plan} size={isReply ? 'w-7 h-7' : 'w-9 h-9'} text="text-xs" />
      <div className="flex-1 min-w-0">
        <div className="bg-cream-warm rounded-2xl rounded-tl-sm px-3.5 py-2.5 inline-block max-w-full">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-sm">@{c.username}</span>
            <PremiumBadge plan={c.plan} size={13} />
            <span className="text-xs text-ink/40">· {timeAgo(c.created_at)}</span>
          </div>
          <p className="text-sm text-ink/85 whitespace-pre-wrap break-words mt-0.5">{c.content}</p>
        </div>
        <div className="flex items-center gap-4 mt-1 ml-1">
          <button
            onClick={() => voteComment(c.id)}
            className={`flex items-center gap-1 text-xs font-bold transition ${c.liked ? 'text-coral-500' : 'text-ink/45 hover:text-ink'}`}
          >
            <Heart size={14} className={c.liked ? 'fill-coral-500' : ''} /> {c.upvotes > 0 ? c.upvotes : 'Like'}
          </button>
          {!isReply && (
            <button
              onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(''); }}
              className="flex items-center gap-1 text-xs font-bold text-ink/45 hover:text-ink transition"
            >
              <Reply size={14} /> Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link to="/forum" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/60 hover:text-ink mb-6">
          <ArrowLeft size={16} /> Back to forum
        </Link>

        <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-soft p-7">
          <div className="flex items-center gap-2 mb-3">
            <span className="chip bg-ink/5 text-ink/70 capitalize">{post.category || 'general'}</span>
            <span className="text-xs text-ink/40">{timeAgo(post.created_at)}</span>
          </div>

          {post.title && (
            <h1 className="font-display text-3xl sm:text-4xl font-black leading-tight mb-4">{post.title}</h1>
          )}

          <div className="flex items-center gap-3 mb-6">
            <Avatar url={post.avatar_url} name={post.username} plan={post.plan} size="w-10 h-10" />
            <div>
              <p className="font-bold text-sm flex items-center gap-1.5">@{post.username} <PremiumBadge plan={post.plan} /></p>
              <p className="text-xs text-ink/50">{post.full_name}</p>
            </div>
          </div>

          {post.content && (
            <p className="text-lg leading-relaxed text-ink/80 whitespace-pre-wrap">{post.content}</p>
          )}

          {post.image_url && (
            <img src={post.image_url} alt="attachment" className="mt-4 w-full rounded-2xl border border-ink/10 max-h-[600px] object-contain bg-ink/5" />
          )}

          <div className="flex items-center gap-3 mt-6 pt-5 border-t border-ink/5">
            <button
              onClick={votePost}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition ${post.liked ? 'bg-coral-500 text-cream' : 'bg-cream-warm hover:bg-coral-300/30 text-ink'}`}
            >
              <Heart size={16} className={post.liked ? 'fill-cream' : ''} /> {post.upvotes} {post.upvotes === 1 ? 'like' : 'likes'}
            </button>
            <span className="text-sm text-ink/50 flex items-center gap-1"><MessageCircle size={14} /> {comments.length}</span>
            <span className="text-sm text-ink/50 flex items-center gap-1"><Eye size={14} /> {post.views}</span>
          </div>
        </motion.article>

        {/* Comments */}
        <section className="mt-8">
          <h2 className="font-display text-2xl font-bold mb-4">
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </h2>

          {/* Composer */}
          <form onSubmit={submitComment} className="card-soft p-4 mb-6">
            <div className="flex gap-3">
              <Avatar url={user?.avatar_url} name={user?.username} plan={user?.plan} size="w-9 h-9" />
              <div className="flex-1 min-w-0">
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment…"
                  className="input-field resize-none text-sm"
                />
                <div className="flex justify-end mt-2">
                  <button type="submit" disabled={!comment.trim()} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                    <Send size={14} /> Comment
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Threads */}
          {topLevel.length === 0 ? (
            <div className="text-center text-ink/45 py-10">
              <MessageCircle size={28} className="mx-auto mb-2 text-ink/20" />
              No comments yet — be the first to reply.
            </div>
          ) : (
            <div className="space-y-5">
              {topLevel.map((c) => (
                <div key={c.id}>
                  <CommentRow c={c} isReply={false} />

                  {/* Replies */}
                  {repliesOf(c.id).length > 0 && (
                    <div className="ml-5 sm:ml-12 mt-3 space-y-3 border-l-2 border-ink/5 pl-3 sm:pl-4">
                      {repliesOf(c.id).map((r) => <CommentRow key={r.id} c={r} isReply />)}
                    </div>
                  )}

                  {/* Inline reply composer */}
                  <AnimatePresence>
                    {replyTo === c.id && (
                      <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={(e) => { e.preventDefault(); submitReply(c.id); }}
                        className="ml-5 sm:ml-12 mt-2 flex gap-2 overflow-hidden"
                      >
                        <input
                          autoFocus
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Reply to @${c.username}…`}
                          className="input-field text-sm flex-1 min-w-0 py-2"
                        />
                        <button type="submit" disabled={!replyText.trim()} className="shrink-0 w-10 h-10 grid place-items-center rounded-2xl bg-ink text-cream hover:bg-ink-soft transition disabled:opacity-50" aria-label="Send reply">
                          <Send size={15} />
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
