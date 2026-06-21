import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Calendar, Clock, Video, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';

export default function VerifyBooking() {
  const [params] = useSearchParams();
  const reference = params.get('reference');
  const demo = params.get('demo') === '1';

  const [state, setState] = useState('loading'); // loading | success | failed
  const [booking, setBooking] = useState(null);

useEffect(() => {
  if (!reference) { setState('failed'); return; }
  const processor = params.get('processor') || 'paystack';
  const endpoint = processor === 'flutterwave'
    ? '/bookings/verify-international'
    : '/bookings/verify';

  api.post(endpoint, { reference })
    .then(({ data }) => {
      if (data.success && data.booking) {
        setBooking(data.booking);
        setState('success');
      } else {
        setState('failed');
      }
    })
    .catch((err) => {
      setState('failed');
      toast.error(err.response?.data?.message || 'Verification failed');
    });
}, [reference, params]);

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {state === 'loading' && (
          <div className="card-soft p-10 text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-ink/60" size={40} />
            <h1 className="font-display text-2xl font-bold">Verifying payment…</h1>
            <p className="text-ink/60 text-sm mt-1">Hold tight, this usually takes a second.</p>
          </div>
        )}

        {state === 'success' && booking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-soft p-10 text-center relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-bull-100 rounded-full blur-2xl" />
            <div className="relative">
              <div className="w-20 h-20 mx-auto bg-bull-500 text-white rounded-full grid place-items-center mb-5">
                <CheckCircle2 size={40} />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-bull-600 mb-2">Booking confirmed</p>
              <h1 className="font-display text-3xl font-black mb-3">See you soon 🎉</h1>
              <p className="text-ink/60 mb-6">
                A confirmation email is on its way to <strong>{booking.email}</strong>.
              </p>

              <div className="bg-cream-warm rounded-2xl p-5 text-left space-y-3 mb-6">
                <Row icon={Calendar} label="Date" value={new Date(booking.session_date).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} />
                <Row icon={Clock} label="Time" value={`${booking.start_time?.slice(0,5)} – ${booking.end_time?.slice(0,5)} (Africa/Lagos)`} />
                {booking.meeting_url && (
                  <Row
                    icon={Video}
                    label="Meeting link"
                    value={<a href={booking.meeting_url} target="_blank" rel="noopener noreferrer" className="text-bull-600 font-semibold hover:underline">Open room →</a>}
                  />
                )}
                <Row icon={() => <span className="text-sm font-mono text-ink/40">#</span>} label="Reference" value={<code className="text-xs">{booking.reference}</code>} />
              </div>

              <Link to="/my-bookings" className="btn-primary w-full">
                View my bookings <ArrowRight size={16}/>
              </Link>
            </div>
          </motion.div>
        )}

        {state === 'failed' && (
          <div className="card-soft p-10 text-center">
            <div className="w-20 h-20 mx-auto bg-bear-500 text-white rounded-full grid place-items-center mb-5">
              <XCircle size={40} />
            </div>
            <h1 className="font-display text-2xl font-black mb-2">Payment not confirmed</h1>
            <p className="text-ink/60 mb-6">We couldn't confirm your payment. If money was taken, please contact support with your reference.</p>
            {reference && <p className="text-xs text-ink/50 mb-4">Reference: <code>{reference}</code></p>}
            <Link to="/book-session" className="btn-primary">Try again</Link>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-sun-300 rounded-xl grid place-items-center shrink-0">
        <Icon size={14} className="text-ink" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink/50 font-semibold uppercase tracking-wider">{label}</p>
        <p className="font-semibold text-sm break-words">{value}</p>
      </div>
    </div>
  );
}
