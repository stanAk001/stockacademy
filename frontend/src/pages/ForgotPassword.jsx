import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Loader2, ArrowRight, MailCheck, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Logo from '../components/Logo';
import api from '../services/api';
import { useAutoFocus } from '../hooks/useAutoFocus';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const emailRef = useAutoFocus();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    setLoading(true);
    try {
      // The API always responds the same way (never reveals if an email exists),
      // so we show the confirmation regardless.
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-180px)] grid place-items-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-5"><Logo /></Link>
            {!sent ? (
              <>
                <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight">
                  Forgot your <span className="italic">password?</span>
                </h1>
                <p className="text-ink/60 mt-2 text-sm">
                  Happens to the best of us. Enter your email and we'll send a reset link.
                </p>
              </>
            ) : (
              <>
                <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight">
                  Check your <span className="italic">inbox.</span>
                </h1>
                <p className="text-ink/60 mt-2 text-sm">
                  If an account exists, a reset link is on its way.
                </p>
              </>
            )}
          </div>

          <div className="card-soft p-6 sm:p-8">
            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Email</label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="text-ink/40"
                      style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
                    />
                    <input
                      ref={emailRef}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input-field"
                      style={{ paddingLeft: '44px' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="animate-spin" size={16} /> Sending…</>
                  ) : (
                    <>Send reset link <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-bull-100 text-bull-600 mb-4">
                  <MailCheck size={30} strokeWidth={2.2} />
                </div>
                <p className="text-sm text-ink/70 leading-relaxed">
                  We've sent a link to <strong className="break-all">{email}</strong>. It's valid for
                  30 minutes and works once. Don't see it? Check your spam folder.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="text-sm font-semibold text-ink/55 hover:text-coral-500 mt-4"
                >
                  Use a different email
                </button>
              </div>
            )}

            <p className="text-xs text-ink/55 text-center mt-5">
              <Link to="/login" className="inline-flex items-center gap-1 font-bold text-ink hover:text-coral-500">
                <ArrowLeft size={13} /> Back to sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
