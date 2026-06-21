import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Video, ArrowRight, Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';

const statusColor = {
  confirmed: 'bg-bull-100 text-bull-700',
  completed: 'bg-ink/5 text-ink/60',
  pending: 'bg-sun-100 text-sun-600',
  cancelled: 'bg-coral-300/40 text-bear-500',
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bookings/mine')
      .then(({ data }) => data.success && setBookings(data.bookings))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = bookings.filter((b) => new Date(b.session_date) >= new Date(now.toDateString()) && b.status !== 'cancelled');
  const past = bookings.filter((b) => !upcoming.includes(b));

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-coral-500">Private mentorship</p>
            <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight mt-1">
              My <span className="italic">sessions</span>.
            </h1>
          </div>
          <Link to="/book-session" className="btn-primary self-start">
            <Sparkles size={14} /> Book another
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-ink/5 animate-pulse rounded-2xl" />)}
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-20 text-center">
            <Calendar className="mx-auto mb-3 text-ink/20" size={48} />
            <p className="font-display text-2xl font-bold mb-1">No bookings yet</p>
            <p className="text-ink/60 mb-5">Book your first private mentorship session.</p>
            <Link to="/book-session" className="btn-primary">Book a session</Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <h2 className="font-display text-xl font-bold mb-3">Upcoming</h2>
                <div className="space-y-3 mb-8">
                  {upcoming.map((b, i) => <BookingRow key={b.id} b={b} i={i} />)}
                </div>
              </>
            )}

            {past.length > 0 && (
              <>
                <h2 className="font-display text-xl font-bold mb-3">Past</h2>
                <div className="space-y-3 opacity-80">
                  {past.map((b, i) => <BookingRow key={b.id} b={b} i={i} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function BookingRow({ b, i }) {
  const date = new Date(b.session_date);
  const dateLabel = date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      className="card-soft p-5 flex flex-col sm:flex-row sm:items-center gap-4"
    >
      <div className="w-16 h-16 bg-gradient-to-br from-sun-300 to-coral-300 rounded-2xl grid place-items-center text-2xl shrink-0">
        {b.session_icon || '📈'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-display font-bold text-lg">{b.session_type_name}</h3>
          <span className={`chip ${statusColor[b.status] || 'bg-ink/5 text-ink/60'} capitalize`}>{b.status}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/60">
          <span className="flex items-center gap-1"><Calendar size={12} /> {dateLabel}</span>
          <span className="flex items-center gap-1"><Clock size={12} /> {b.start_time?.slice(0,5)}–{b.end_time?.slice(0,5)}</span>
        </div>
        <p className="text-xs text-ink/40 mt-1 font-mono">Ref: {b.reference}</p>
      </div>
      {b.meeting_url && b.status === 'confirmed' && (
        <a
          href={b.meeting_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary shrink-0"
        >
          <Video size={14} /> Join <ArrowRight size={14}/>
        </a>
      )}
    </motion.div>
  );
}
