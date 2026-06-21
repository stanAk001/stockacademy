import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.username || !form.email || !form.password) {
      return toast.error('Please fill in all required fields');
    }
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      await signup(form);
      toast.success('Welcome to StockAcademia! 🎉');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      const status = err.response?.status;

      if (status === 409 && msg.toLowerCase().includes('email')) {
        toast.success('Looks like you already have an account!', {
          icon: '👋',
          duration: 4000,
        });
        setTimeout(() => {
          navigate(`/login?email=${encodeURIComponent(form.email)}&existing=1`);
        }, 800);
        return;
      }

      if (status === 409 && msg.toLowerCase().includes('username')) {
        toast.error('That username is taken — try another one.');
        setLoading(false);
        return;
      }

      toast.error(msg || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (response) => {
    setLoading(true);
    try {
      await googleLogin(response.credential);
      toast.success('Welcome to StockAcademia! 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  // Reusable icon style — guaranteed positioning
  const iconLeftStyle = {
    position: 'absolute',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    zIndex: 1,
  };

  const iconRightStyle = {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 1,
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
              Start <span className="italic">learning.</span>
            </h1>
            <p className="text-ink/60 mt-2 text-sm">
              Create your free account in 30 seconds.
            </p>
          </div>

          <div className="card-soft p-6 sm:p-8">
            <div className="mb-5 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => toast.error('Google sign-in failed')}
                theme="outline"
                size="large"
                text="signup_with"
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
                <label className="block text-sm font-semibold mb-1.5">Full name</label>
                <div className="relative">
                  <User size={16} className="text-ink/40" style={iconLeftStyle} />
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="Jane Doe"
                    className="input-field"
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Username</label>
                <div className="relative">
                  <span className="text-ink/40 text-sm font-medium" style={iconLeftStyle}>@</span>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    placeholder="janedoe"
                    className="input-field"
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
                <p className="text-[11px] text-ink/45 mt-1">Letters, numbers, and underscores only.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={16} className="text-ink/40" style={iconLeftStyle} />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="input-field"
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="text-ink/40" style={iconLeftStyle} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="At least 6 characters"
                    className="input-field"
                    style={{ paddingLeft: '44px', paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-ink/40 hover:text-ink"
                    style={iconRightStyle}
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
                  <><Loader2 className="animate-spin" size={16} /> Creating account…</>
                ) : (
                  <>Create account <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <p className="text-xs text-ink/55 text-center mt-5">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-ink hover:text-coral-500">
                Sign in
              </Link>
            </p>
          </div>

          <p className="text-[11px] text-ink/45 text-center mt-5 max-w-sm mx-auto leading-relaxed">
            By creating an account, you agree to use StockAcademia for educational research only.
          </p>
        </motion.div>
      </div>
    </Layout>
  );
}