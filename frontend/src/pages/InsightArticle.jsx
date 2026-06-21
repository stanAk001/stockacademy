import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Public market-recap article (in-app). body_html is server-generated +
// escaped by the backend, so it's safe to render.
export default function InsightArticle() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [insight, setInsight] = useState(undefined); // undefined=loading, null=not found

  useEffect(() => {
    api.get(`/insights/${encodeURIComponent(slug)}`)
      .then(({ data }) => setInsight(data.insight))
      .catch(() => setInsight(null));
  }, [slug]);

  if (insight === undefined) {
    return <Layout><div className="grid place-items-center py-24"><Loader2 className="animate-spin text-ink/30" /></div></Layout>;
  }
  if (!insight) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-black mb-2">Recap not found</h1>
          <Link to="/insights" className="text-bull-600 font-bold hover:underline">See all recaps →</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <article className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 min-w-0">
        <Link to="/insights" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 hover:text-ink mb-6">
          <ArrowLeft size={15} /> All recaps
        </Link>
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
          {new Date(insight.published_at).toDateString()}
        </p>
        <h1 className="font-display text-[1.9rem] sm:text-4xl font-black leading-[1.1] mt-1 mb-5 break-words">{insight.title}</h1>

        <div
          className="prose-lesson break-words"
          dangerouslySetInnerHTML={{ __html: insight.body_html || '' }}
        />

        {!user && (
          <div className="mt-10 bg-ink text-cream rounded-3xl p-6 sm:p-8 text-center">
            <p className="font-display text-xl sm:text-2xl font-black">Want to actually understand the market?</p>
            <p className="text-cream/70 text-sm mt-1.5 break-words">
              Free courses, $100k paper trading, and AI that even explains in Pidgin, Yorùbá, Hausa &amp; Igbo.
            </p>
            <Link to="/signup" className="btn-secondary mt-5 inline-flex">Start learning free <ArrowRight size={16} /></Link>
          </div>
        )}

        <p className="text-[11px] text-ink/40 mt-8 text-center break-words">
          Educational analysis only — not financial advice. Investment decisions are yours to make.
        </p>
      </article>
    </Layout>
  );
}
