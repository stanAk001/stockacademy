import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Loader2, Send, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminPortfolioReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const load = () => {
    setLoading(true);
    api.get('/admin/portfolio-reviews', { params: filter ? { status: filter } : {} })
      .then(({ data }) => setReviews(data.reviews || []))
      .catch(() => toast.error('Could not load reviews'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filter]);

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

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link to="/admin" className="text-sm text-ink/50 hover:text-ink inline-flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Admin hub
        </Link>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-sun-300 grid place-items-center">
            <ClipboardCheck size={20} className="text-ink" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-black">Portfolio reviews</h1>
            <p className="text-sm text-ink/55">Reply to premium members' review requests.</p>
          </div>
        </div>

        <div className="inline-flex p-1 rounded-full bg-cream-warm border border-ink/10 mb-6">
          {[['pending', 'Pending'], ['reviewed', 'Reviewed'], ['', 'All']].map(([val, label]) => (
            <button
              key={label}
              onClick={() => setFilter(val)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition ${filter === val ? 'bg-ink text-cream' : 'text-ink/55 hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-ink/30" /></div>
        ) : reviews.length === 0 ? (
          <p className="text-ink/50 py-12 text-center">No {filter || ''} reviews.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => <ReviewCard key={r.id} review={r} onDone={load} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}

const MIN_RESPONSE = 50;

function ReviewCard({ review, onDone }) {
  const [response, setResponse] = useState(review.admin_response || '');
  const [busy, setBusy] = useState(false);
  const done = review.status === 'reviewed';
  const tooShort = response.trim().length < MIN_RESPONSE;

  const submit = async () => {
    if (tooShort) return toast(`Write at least ${MIN_RESPONSE} characters`, { icon: '✍️' });
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/portfolio-reviews/${review.id}/respond`, {
        admin_response: response.trim(),
        status: 'reviewed',
      });
      if (data.success) { toast.success('Response sent'); onDone(); }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally { setBusy(false); }
  };

  return (
    <div className="card-soft p-5 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <p className="font-bold break-words">{review.full_name || review.username} <span className="text-ink/40 font-normal">· {review.email}</span></p>
          <p className="text-[11px] text-ink/45">{new Date(review.submitted_at).toLocaleString()}</p>
        </div>
        <span className={`chip text-[10px] ${done ? 'bg-bull-100 text-bull-700' : 'bg-sun-100 text-sun-600'}`}>{done ? 'Reviewed' : 'Pending'}</span>
      </div>

      <p className="text-sm text-ink/75 mb-2 break-words"><strong>Question:</strong> {review.user_notes}</p>

      <Snapshot snapshot={review.portfolio_snapshot} />

      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        rows={4}
        placeholder="Your written review for this member — be specific and constructive…"
        className="input-field text-sm"
      />
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <span className={`text-[11px] ${tooShort ? 'text-ink/45' : 'text-bull-600'}`}>
          {response.trim().length}/{MIN_RESPONSE} min
        </span>
        <button
          onClick={submit}
          disabled={busy || tooShort}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-cream text-xs font-bold hover:bg-ink-soft transition disabled:opacity-50"
        >
          {busy ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : <><Send size={13} /> {done ? 'Update response' : 'Mark reviewed & send'}</>}
        </button>
      </div>
    </div>
  );
}

// Render the portfolio snapshot cleanly: pasted text as a readable block,
// structured holdings as formatted JSON.
function Snapshot({ snapshot }) {
  if (!snapshot) return null;
  const rawText = !Array.isArray(snapshot) && typeof snapshot === 'object' ? snapshot.raw_text : null;
  const count = Array.isArray(snapshot) ? snapshot.length : null;
  return (
    <details className="mb-3" open>
      <summary className="text-xs font-bold text-ink/50 cursor-pointer">
        Portfolio{count != null ? ` (${count} holdings)` : ''}
      </summary>
      {rawText ? (
        <pre className="mt-2 bg-cream-warm rounded-xl p-3 text-[12px] sm:text-[13px] whitespace-pre-wrap break-words font-sans text-ink/80">{rawText}</pre>
      ) : (
        <pre className="mt-2 bg-cream-warm rounded-xl p-3 text-[11px] overflow-x-auto">{JSON.stringify(snapshot, null, 2)}</pre>
      )}
    </details>
  );
}
