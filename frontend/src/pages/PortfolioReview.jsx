import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardCheck, Loader2, Clock, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import ToolHero from '../components/ui/ToolHero';
import PremiumLock from '../components/ui/PremiumLock';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const MIN_NOTES = 20;

export default function PortfolioReview() {
  const { user } = useAuth();
  const isPremium = user?.plan === 'premium';

  const [data, setData] = useState(null);     // { reviews, can_submit, next_eligible }
  const [portfolio, setPortfolio] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get('/portfolio-reviews/mine')
      .then(({ data }) => setData(data))
      .catch(() => {});

  useEffect(() => { if (isPremium) load(); }, [isPremium]);

  const submit = async () => {
    if (!portfolio.trim()) return toast('Paste your portfolio first', { icon: '✍️' });
    if (notes.trim().length < MIN_NOTES) return toast(`Add a bit more detail (${MIN_NOTES}+ chars)`, { icon: '✍️' });
    setBusy(true);
    try {
      const { data: res } = await api.post('/portfolio-reviews/submit', {
        portfolio_snapshot: { raw_text: portfolio.trim() },
        user_notes: notes.trim(),
      });
      if (res.success) {
        toast.success('Submitted for review');
        setPortfolio(''); setNotes('');
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit');
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = data?.can_submit !== false;
  const nextEligible = data?.next_eligible ? new Date(data.next_eligible) : null;
  const daysLeft = nextEligible ? Math.max(0, Math.ceil((nextEligible - new Date()) / 86400000)) : 0;

  return (
    <Layout>
      <div className="overflow-x-hidden">
        <div className="max-w-2xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header */}
          <ToolHero
            icon={ClipboardCheck}
            eyebrow="Premium · personal review"
            title="A human looks at"
            accent="your money."
            subtitle="Once a quarter, submit your real portfolio and a mentor writes back with honest, personal feedback. Not a bot — a person. Educational only, never financial advice."
          />

          {!isPremium ? (
            <PremiumLock
              icon={ClipboardCheck}
              title="Get a human to review your portfolio"
              message="Premium members submit their real holdings once a quarter and get written feedback from a mentor."
            />
          ) : (
            <>
              {/* Submit */}
              <div className="card-soft p-5 sm:p-6 mb-7 min-w-0">
                <h2 className="font-display text-lg sm:text-xl font-black mb-3">Submit your portfolio</h2>

                {!canSubmit && (
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-cream-warm mb-4 min-w-0">
                    <Clock size={16} className="text-sun-600 shrink-0 mt-0.5" />
                    <p className="text-[13px] sm:text-sm text-ink/70 break-words">
                      You've used your review this quarter. You can submit again in{' '}
                      <strong className="text-ink">{daysLeft} {daysLeft === 1 ? 'day' : 'days'}</strong>
                      {nextEligible ? ` (on ${nextEligible.toLocaleDateString()})` : ''}.
                    </p>
                  </div>
                )}

                <label className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
                  Your portfolio
                </label>
                <textarea
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  disabled={!canSubmit}
                  rows={5}
                  placeholder={'Paste your holdings, amounts, and any context. e.g.\n- 40% MTNN\n- 25% GTCO\n- 20% Dangote Cement\n- 15% cash\nMostly long-term, started this year.'}
                  className="input-field text-sm mt-1 disabled:opacity-50"
                />

                <label className="text-[11px] font-bold uppercase tracking-wider text-ink/45 mt-4 block">
                  What would you like feedback on?
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!canSubmit}
                  rows={3}
                  placeholder="e.g. Am I too concentrated in telecoms? Should I hold more cash given my goals?"
                  className="input-field text-sm mt-1 disabled:opacity-50"
                />
                <p className={`text-[11px] mt-1 ${notes.trim().length >= MIN_NOTES ? 'text-bull-600' : 'text-ink/45'}`}>
                  {notes.trim().length}/{MIN_NOTES} characters minimum
                </p>

                <button
                  onClick={submit}
                  disabled={busy || !canSubmit || notes.trim().length < MIN_NOTES || !portfolio.trim()}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-ink text-cream font-bold text-sm sm:text-base hover:bg-ink-soft transition shine disabled:opacity-50"
                >
                  {busy
                    ? <><Loader2 size={16} className="animate-spin" /> Submitting…</>
                    : <><ClipboardCheck size={16} /> Submit for review</>}
                </button>
                <p className="text-[11px] text-ink/45 text-center mt-2">One review per quarter · you'll be notified when it's ready.</p>
              </div>

              {/* My reviews */}
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-ink/45 mb-3">My reviews</p>
                {!data ? (
                  <div className="grid place-items-center py-10"><Loader2 className="animate-spin text-ink/30" /></div>
                ) : data.reviews.length === 0 ? (
                  <div className="card-soft p-6 text-center text-sm text-ink/55">No reviews yet — submit your first above.</div>
                ) : (
                  <div className="space-y-3">
                    {data.reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ReviewCard({ review }) {
  const [open, setOpen] = useState(review.status === 'reviewed');
  const reviewed = review.status === 'reviewed';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-soft p-4 sm:p-5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] sm:text-xs text-ink/50">{new Date(review.submitted_at).toLocaleDateString()}</p>
        <span className={`chip text-[10px] ${reviewed ? 'bg-bull-100 text-bull-700' : 'bg-sun-100 text-sun-600'}`}>
          {reviewed ? 'Reviewed' : 'Pending'}
        </span>
      </div>

      <p className="text-sm text-ink/75 mt-1.5 break-words"><span className="font-semibold text-ink">You asked:</span> {review.user_notes}</p>

      {reviewed && review.admin_response && (
        <div className="mt-3 pt-3 border-t border-ink/5">
          <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-bull-700">Mentor's response</span>
            <ChevronDown size={16} className={`shrink-0 text-ink/40 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <p className="text-sm text-ink/80 mt-2 break-words leading-relaxed whitespace-pre-line">{review.admin_response}</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
