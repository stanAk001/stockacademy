import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Logo from '../components/Logo';
import api from '../services/api';
import { useAutoFocus } from '../hooks/useAutoFocus';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const pwRef = useAutoFocus();

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirm) return toast.error('Passwords don\'t match');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      setDone(true);
      toast.success('Password reset! You can sign in now.');
      setTimeout(() => navigate('/login'), 2200);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset your password.');
    } finally {
      setLoading(false);
    }
  };

  // No token in the URL → the link is malformed/expired.
  if (!token) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-180px)] grid place-items-center px-4 py-10">
          <div className="w-full max-w-md text-center">
            <Link to="/" className="inline-block mb-5"><Logo /></Link>
            <div className="card-soft p-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-coral-300/30 text-bear-500 mb-4">
                <AlertCircle size={30} strokeWidth={2.2} />
              </div>
              <h1 className="font-display text-2xl font-black">This link looks broken</h1>
              <p className="text-ink/60 text-sm mt-2">
                The reset link is missing or incomplete. Request a fresh one and we'll send it right over.
              </p>
              <Link to="/forgot-password" className="btn-primary mt-5 inline-flex">Request a new link</Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

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
            <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight">
              {done ? <>You're all <span className="italic">set.</span></> : <>Set a new <span className="italic">password.</span></>}
            </h1>
            <p className="text-ink/60 mt-2 text-sm">
              {done ? 'Taking you to sign in…' : 'Almost there — choose something you\'ll remember.'}
            </p>
          </div>

          <div className="card-soft p-6 sm:p-8">
            {done ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-bull-100 text-bull-600 mb-4">
                  <CheckCircle2 size={30} strokeWidth={2.2} />
                </div>
                <p className="text-sm text-ink/70">Your password has been updated.</p>
                <Link to="/login" className="btn-primary mt-5 inline-flex">Sign in now <ArrowRight size={16} /></Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">New password</label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="text-ink/40"
                      style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
                    />
                    <input
                      ref={pwRef}
                      type={show ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="At least 6 characters"
                      className="input-field"
                      style={{ paddingLeft: '44px', paddingRight: '44px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="text-ink/40 hover:text-ink"
                      style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
                    >
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="text-ink/40"
                      style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
                    />
                    <input
                      type={show ? 'text' : 'password'}
                      required
                      value={form.confirm}
                      onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                      placeholder="Type it again"
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
                    <><Loader2 className="animate-spin" size={16} /> Updating…</>
                  ) : (
                    <>Reset password <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
