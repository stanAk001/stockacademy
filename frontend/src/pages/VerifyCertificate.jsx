import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, CheckCircle2, XCircle, Loader2, Shield } from 'lucide-react';
import Logo from '../components/Logo';
import api from '../services/api';

export default function VerifyCertificate() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/certificates/verify-public/${token}`)
      .then(({ data }) => setData(data))
      .catch(() => setData({ valid: false }))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-ink/5">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Logo />
          <Link to="/" className="text-sm font-semibold text-bull-600 hover:underline">Home</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3 sm:px-6 py-10 sm:py-16">
        <div className="text-center mb-8">
          <Shield className="mx-auto mb-3 text-bull-600" size={36} />
          <p className="text-xs font-bold uppercase tracking-widest text-bull-600 mb-1">Certificate verification</p>
          <h1 className="font-display text-2xl sm:text-4xl font-black">Authenticity check</h1>
        </div>

        {loading ? (
          <div className="card-soft p-8 text-center">
            <Loader2 className="animate-spin mx-auto text-ink/40" size={32} />
            <p className="text-sm text-ink/60 mt-3">Verifying…</p>
          </div>
        ) : data?.valid ? (
          <div className="card-soft p-6 sm:p-10 text-center">
            <CheckCircle2 className="mx-auto mb-4 text-bull-600" size={56} />
            <h2 className="font-display text-2xl sm:text-3xl font-black mb-2">This certificate is genuine.</h2>
            <p className="text-ink/60 mb-6 text-sm sm:text-base">Issued by StockAcademia.</p>

            <div className="bg-cream-warm rounded-2xl p-5 text-left space-y-3">
              <Row label="Recipient" value={data.certificate.full_name} />
              <Row label="Certificate Number" value={data.certificate.certificate_number} mono />
              <Row label="Issued" value={new Date(data.certificate.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
              <Row label="Program" value="Complete Stock Market Education Program" />
            </div>

            <p className="text-xs text-ink/50 mt-6">
              The recipient completed all 6 courses, lessons, and quizzes covering stock market basics, fundamental analysis, technical analysis, risk management, and trading strategies.
            </p>
          </div>
        ) : (
          <div className="card-soft p-8 sm:p-10 text-center">
            <XCircle className="mx-auto mb-4 text-bear-500" size={56} />
            <h2 className="font-display text-2xl sm:text-3xl font-black mb-2">Not a valid certificate</h2>
            <p className="text-ink/60 text-sm">This verification link doesn't match any certificate in our records.</p>
          </div>
        )}

        <div className="text-center mt-8">
          <Link to="/" className="text-sm font-semibold text-bull-600 hover:underline">
            ← Visit StockAcademia
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
      <span className="text-xs sm:text-sm text-ink/60 uppercase tracking-wide font-bold">{label}</span>
      <span className={`text-sm sm:text-base font-semibold ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}