import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award, Download, Loader2, Sparkles, Check, X, CheckCircle2, 
  AlertCircle, Crown, FileText, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Certificate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [paying, setPaying] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/certificates/eligibility');
      if (data.success) {
        setData(data);
        setFullName(data.user_name || '');
      }
    } catch (err) {
      toast.error('Failed to load certificate info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveName = async () => {
    if (fullName.trim().length < 3) {
      toast.error('Enter your full legal name');
      return;
    }
    setSavingName(true);
    try {
      const { data } = await api.post('/certificates/save-name', { full_name_legal: fullName });
      if (data.success) {
        toast.success('Name saved');
        load();
      }
    } catch (err) {
      toast.error('Failed to save name');
    } finally {
      setSavingName(false);
    }
  };

  const getCertificate = async () => {
    if (!fullName.trim()) {
      toast.error('Please set your legal name first');
      return;
    }
    setPaying(true);
    try {
      const { data } = await api.post('/certificates/initialize');
      if (data.success) {
        if (data.free) {
          toast.success('🎉 Your certificate has been issued!');
          load();
        } else {
          toast('Redirecting to payment…');
          window.location.href = data.authorization_url;
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start');
    } finally {
      setPaying(false);
    }
  };

  const downloadPDF = async (certId) => {
    try {
      const response = await api.get(`/certificates/download/${certId}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `StockAcademy-Certificate.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Certificate downloaded!');
    } catch (err) {
      toast.error('Download failed');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
          <Loader2 className="animate-spin mx-auto text-ink/40" size={32} />
        </div>
      </Layout>
    );
  }

  if (!data) return null;

  // === USER ALREADY OWNS CERTIFICATE ===
  if (data.already_owns) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-bull-100 text-bull-600 rounded-full mb-4">
              <Award size={40} strokeWidth={2} />
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-black leading-tight">
              You did it,<br/>
              <span className="italic">graduate.</span>
            </h1>
            <p className="text-ink/60 mt-3 text-sm sm:text-lg">Your StockAcademy certificate is ready.</p>
          </div>

          <div className="card-soft p-6 sm:p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-coral-500 mb-2">Certificate Issued</p>
            <p className="font-display text-2xl sm:text-3xl font-black mb-1">{data.certificate.full_name}</p>
            <p className="text-sm text-ink/60 mb-1">Cert No. {data.certificate.certificate_number}</p>
            <p className="text-xs text-ink/40 mb-6">
              Issued on {new Date(data.certificate.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>

            <button
              onClick={() => downloadPDF(data.certificate.id)}
              className="btn-primary mb-3 w-full sm:w-auto"
            >
              <Download size={18} /> Download Certificate PDF
            </button>

            <div className="mt-4 pt-4 border-t border-ink/10">
              <p className="text-xs text-ink/50 mb-2">Verification link (share to prove authenticity):</p>
              <code className="text-[10px] sm:text-xs bg-cream-warm rounded-lg px-3 py-2 inline-block break-all">
                {window.location.origin}/verify/{data.certificate.verification_token}
              </code>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/dashboard" className="text-sm font-semibold text-bull-600 hover:underline">
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // === USER NOT ELIGIBLE YET ===
  if (!data.eligible) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-ink/5 text-ink/40 rounded-full mb-4">
              <Award size={40} strokeWidth={2} />
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-black leading-tight">
              Almost there.
            </h1>
            <p className="text-ink/60 mt-3 text-sm sm:text-lg">Complete every lesson and quiz to earn your certificate.</p>
          </div>

          <div className="card-soft p-6 sm:p-8 mb-6">
            <div className="space-y-5">
              <ProgressBar
                label="Lessons completed"
                current={data.completion.completed_lessons}
                total={data.completion.total_lessons}
              />
              <ProgressBar
                label="Quizzes passed"
                current={data.completion.passed_quizzes}
                total={data.completion.total_quizzes}
              />
            </div>

            <div className="mt-6 p-4 bg-cream-warm rounded-2xl">
              <p className="text-sm text-ink/70">
                <strong>{data.completion.progress_pct}% complete.</strong>{' '}
                Once you finish every lesson and pass every quiz, your certificate becomes available.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link to="/courses" className="btn-primary">
              Continue learning <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // === ELIGIBLE — READY TO PURCHASE ===
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-sun-300 to-coral-300 rounded-full mb-4">
            <Sparkles size={40} strokeWidth={2} className="text-ink" />
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-black leading-tight">
            You've completed<br/>
            <span className="italic">the entire program.</span>
          </h1>
          <p className="text-ink/60 mt-3 text-sm sm:text-lg">Time to claim your StockAcademy Graduate certificate.</p>
        </div>

        {/* Certificate preview card */}
        <div className="bg-ink text-cream rounded-3xl p-6 sm:p-8 mb-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-sun-300/15 rounded-full blur-3xl" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-widest text-sun-300 mb-2">What you'll receive</p>
            <h2 className="font-display text-2xl sm:text-3xl font-black mb-4">A professional PDF certificate</h2>

            <ul className="space-y-2 text-sm sm:text-base text-cream/80 mb-6">
              <li className="flex items-start gap-2"><Check size={16} className="text-bull-400 mt-0.5 shrink-0" /> Your full legal name in elegant typography</li>
              <li className="flex items-start gap-2"><Check size={16} className="text-bull-400 mt-0.5 shrink-0" /> Unique certificate number</li>
              <li className="flex items-start gap-2"><Check size={16} className="text-bull-400 mt-0.5 shrink-0" /> Public verification URL (share on LinkedIn or CV)</li>
              <li className="flex items-start gap-2"><Check size={16} className="text-bull-400 mt-0.5 shrink-0" /> Landscape A4 PDF — print-ready</li>
              <li className="flex items-start gap-2"><Check size={16} className="text-bull-400 mt-0.5 shrink-0" /> Lifetime download from your account</li>
            </ul>

            <div className="bg-cream/5 border border-cream/10 rounded-xl p-4">
              <p className="text-xs text-cream/60 mb-1">Pricing</p>
              {data.pricing.is_premium ? (
                <p className="font-display text-2xl font-black flex items-center gap-2">
                  <Crown size={20} className="text-sun-300" /> Free with Premium
                </p>
              ) : (
                <p className="font-display text-3xl font-black">₦{data.pricing.price_ngn.toLocaleString()}</p>
              )}
              {!data.pricing.is_premium && (
                <p className="text-xs text-cream/50 mt-1">
                  Or upgrade to <Link to="/pricing" className="text-sun-300 underline">Premium</Link> to get it free + monthly access to advanced features.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Name input */}
        <div className="card-soft p-5 sm:p-6 mb-6">
          <label className="block">
            <span className="text-sm font-bold text-ink/80 block mb-2">
              Your full legal name (this appears on the certificate)
            </span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Hammed Ademola Olamilekan"
              className="input-field"
            />
            <p className="text-xs text-ink/50 mt-2">
              ⚠️ Type it carefully — the name on your PDF is permanent. Use the same name that's on your CV / LinkedIn.
            </p>
          </label>

          <button
            onClick={saveName}
            disabled={savingName || fullName.trim().length < 3}
            className="mt-3 px-4 py-2 rounded-full bg-ink/5 text-ink text-sm font-bold hover:bg-ink/10 disabled:opacity-50"
          >
            {savingName ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
            Save name
          </button>
        </div>

        {/* Get certificate button */}
        <div className="text-center">
          <button
            onClick={getCertificate}
            disabled={paying || !fullName.trim() || fullName.trim().length < 3}
            className="btn-primary w-full sm:w-auto text-base sm:text-lg px-8 py-4 disabled:opacity-50"
          >
            {paying ? (
              <><Loader2 size={18} className="animate-spin" /> Starting…</>
            ) : data.pricing.is_premium ? (
              <><Crown size={18} /> Claim my free certificate</>
            ) : (
              <><Award size={18} /> Get certificate — ₦{data.pricing.price_ngn.toLocaleString()}</>
            )}
          </button>
          <p className="text-xs text-ink/50 mt-3">One-time payment · instant download · lifetime access</p>
        </div>
      </div>
    </Layout>
  );
}

function ProgressBar({ label, current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const done = current === total && total > 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">{label}</span>
        <span className={`text-sm font-mono font-bold ${done ? 'text-bull-600' : 'text-ink/60'}`}>
          {done && <CheckCircle2 size={14} className="inline mr-1" />}
          {current}/{total}
        </span>
      </div>
      <div className="h-2 bg-cream-warm rounded-full overflow-hidden">
        <div
          className={`h-full ${done ? 'bg-bull-400' : 'bg-sun-300'} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}