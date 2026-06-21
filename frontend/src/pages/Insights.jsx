import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Newspaper, ArrowRight, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';

// Public market-recaps index (in-app). The crawlable SEO version is served as
// real HTML by the backend at /insights.
export default function Insights() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get('/insights').then(({ data }) => setItems(data.insights || [])).catch(() => setItems([]));
  }, []);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 min-w-0">
        <div className="mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-ink mb-4">
            <Newspaper className="text-sun-300" size={24} />
          </div>
          <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.15em] text-coral-500 mb-2">Daily insights</p>
          <h1 className="font-display text-[1.9rem] sm:text-5xl font-black leading-[1.05] break-words">
            NGX &amp; US market <span className="italic text-coral-500">recaps.</span>
          </h1>
          <p className="text-ink/65 text-[13px] sm:text-lg mt-2 break-words leading-relaxed">
            A short, beginner-friendly look at what moved each day — and what you can learn from it.
          </p>
        </div>

        {!items ? (
          <div className="grid place-items-center py-16"><Loader2 className="animate-spin text-ink/30" /></div>
        ) : items.length === 0 ? (
          <div className="card-soft p-8 text-center text-ink/55">
            No recaps published yet — check back soon.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it, i) => (
              <motion.div key={it.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/insights/${encodeURIComponent(it.slug)}`} className="block card-soft p-5 hover:shadow-lg hover:-translate-y-0.5 transition group min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink/45">
                    {new Date(it.published_at).toDateString()}
                  </p>
                  <h2 className="font-display text-lg sm:text-xl font-black mt-1 break-words group-hover:text-bull-700 transition">{it.title}</h2>
                  {it.summary && <p className="text-sm text-ink/60 mt-1 break-words">{it.summary}</p>}
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-bull-600 mt-2">Read <ArrowRight size={13} className="group-hover:translate-x-0.5 transition" /></span>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
