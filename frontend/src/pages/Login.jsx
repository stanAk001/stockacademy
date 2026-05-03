import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const existingAccount = searchParams.get('existing') === '1';
  const prefilledEmail = searchParams.get('email');

  useEffect(() => {
    if (prefilledEmail) {
      setForm((f) => ({ ...f, identifier: prefilledEmail }));
    }
  }, [prefilledEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) {
      return toast.error('Please enter your email/username and password');
    }
    setLoading(true);
    try {
      await login(form);
      toast.success('Welcome back! 👋');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (response) => {
    setLoading(true);
    try {
      await googleLogin(response.credential);
      toast.success('Welcome back! 👋');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
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
            <Link to="/" className="inline-block mb-5">
              <Logo />
            </Link>
            <h1 className="font-display text-4xl sm:text-5xl font-black leading-tight">
              Welcome <span className="italic">back.</span>
            </h1>
            <p className="text-ink/60 mt-2 text-sm">
              Sign in to keep learning.
            </p>
          </div>

          <div className="card-soft p-6 sm:p-8">
            {existingAccount && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-4 bg-sun-100 border-l-4 border-sun-400 rounded-r-2xl flex items-start gap-3"
              >
                <div className="text-2xl">👋</div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Welcome back!</p>
                  <p className="text-xs text-ink/65 mt-0.5">
                    You already have an account
                    {prefilledEmail && (
                      <> with <strong className="break-all">{prefilledEmail}</strong></>
                    )}.
                    Just enter your password to sign in.
                  </p>
                </div>
              </motion.div>
            )}

            <div className="mb-5 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => toast.error('Google sign-in failed')}
                theme="outline"
                size="large"
                text="signin_with"
                shape="pill"
                width="320"
              />
            </div>

            <div className="flex items-center gap-3 my-5 text-xs text-ink/45 font-bold uppercase tracking-widest">
              <div className="flex-1 h-px bg-ink/10" />
              or
              <div className="flex-1 h-px bg-ink/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Email or username</label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="text-ink/40"
                    style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
                  />
                  <input
                    type="text"
                    required
                    value={form.identifier}
                    onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                    placeholder="you@example.com or @username"
                    className="input-field"
                    style={{ paddingLeft: '44px' }}
                    autoFocus={existingAccount}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold">Password</label>
                </div>
                <div className="relative">
                  <Lock
                    size={16}
                    className="text-ink/40"
                    style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Your password"
                    className="input-field"
                    style={{ paddingLeft: '44px', paddingRight: '44px' }}
                    autoFocus={existingAccount && !!prefilledEmail}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-ink/40 hover:text-ink"
                    style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 className="animate-spin" size={16} /> Signing in…</>
                ) : (
                  <>Sign in <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <p className="text-xs text-ink/55 text-center mt-5">
              Don't have an account?{' '}
              <Link to="/signup" className="font-bold text-ink hover:text-coral-500">
                Sign up free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}