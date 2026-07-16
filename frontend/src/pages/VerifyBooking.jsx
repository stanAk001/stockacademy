import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Calendar, Clock, Video, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';
import usePaymentVerify from '../hooks/usePaymentVerify';

export default function VerifyBooking() {
  const [params] = useSearchParams();
  const reference = params.get('reference');
  const processor = params.get('processor') || 'paystack';
  const endpoint = processor === 'flutterwave' ? '/bookings/verify-international' : '/bookings/verify';

  // Polls until the server confirms — transfers/USSD settle after the redirect.
  const { state, data, error, waited, retry } = usePaymentVerify(endpoint, reference);
  const booking = data?.booking;

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {(state === 'loading' || state === 'confirming') && (
          <div className="card-soft p-10 text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-ink/60" size={40} />
            <h1 className="font-display text-2xl font-bold">Confirming your payment…</h1>
            <p className="text-ink/60 text-sm mt-1 max-w-sm mx-auto">
              {state === 'confirming'
                ? "Bank transfers take a moment to land. Keep this page open, it'll continue on its own."
                : 'Hold tight, this usually takes a second.'}
            </p>
            {waited > 8 && <p className="text-[11px] text-ink/40 mt-3 font-mono">Still checking… {waited}s</p>}
            <p className="text-[11px] text-ink/40 mt-4">Don't refresh or close this tab.</p>
          </div>
        )}

        {state === 'slow' && (
          <div className="card-soft p-10 text-center">
            <div className="w-16 h-16 mx-auto bg-sun-100 text-sun-600 rounded-full grid place-items-center mb-4">
              <Loader2 size={28} />
            </div>
            <h1 className="font-display text-2xl font-black mb-2">Your bank is taking its time</h1>
            <p className="text-ink/60 mb-4 max-w-md mx-auto text-sm leading-relaxed">
              We haven't had confirmation yet. <strong className="text-ink">If the money left your account, nothing is lost</strong> —
              your booking confirms automatically once the payment lands.
            </p>
            {reference && <p className="text-xs text-ink/45 mb-5 font-mono">Ref: {reference}</p>}
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={retry} className="btn-primary text-sm">Check again</button>
              <Link to="/my-bookings" className="btn-ghost text-sm">My bookings</Link>
            </div>
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
            <p className="text-ink/60 mb-6">{error || "We couldn't confirm your payment. If money was taken, please contact support with your reference."}</p>
            {reference && <p className="text-xs text-ink/50 mb-4">Reference: <code>{reference}</code></p>}
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={retry} className="btn-ghost text-sm">Check again</button>
              <Link to="/book-session" className="btn-primary">Try again</Link>
            </div>
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
