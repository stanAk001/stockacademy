import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, Download, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import api from '../services/api';

// Payment callback page — both Paystack and Flutterwave redirect here with
// ?reference=...&processor=... after checkout. We confirm the payment with the
// server (idempotent), then issue + show the certificate.
export default function CertificateVerify() {
  const [params] = useSearchParams();
  const reference = params.get('reference');
  const processor = params.get('processor') || undefined;
  const [status, setStatus] = useState('verifying'); // verifying | done | error
  const [cert, setCert] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!reference) {
      setStatus('error');
      setMessage('No payment reference was found.');
      return;
    }
    (async () => {
      try {
        const { data } = await api.post('/certificates/verify', { reference, processor });
        if (data.success && data.certificate) {
          setCert(data.certificate);
          setStatus('done');
        } else {
          throw new Error(data.message || 'Verification failed.');
        }
      } catch (err) {
        setMessage(err.response?.data?.message || err.message || 'We could not confirm your payment.');
        setStatus('error');
      }
    })();
  }, [reference, processor]);

  const downloadPDF = async () => {
    if (!cert) return;
    try {
      const response = await api.get(`/certificates/download/${cert.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'StockAcademia-Certificate.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-20 text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="animate-spin mx-auto text-ink/40 mb-4" size={36} />
            <h1 className="font-display text-2xl font-black">Confirming your payment…</h1>
            <p className="text-ink/55 mt-2">Hang tight — this only takes a moment.</p>
          </>
        )}

        {status === 'done' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-bull-100 text-bull-600 rounded-full mb-4">
              <CheckCircle2 size={40} strokeWidth={2} />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-black leading-tight">
              You did it, <span className="italic">graduate.</span>
            </h1>
            <p className="text-ink/60 mt-3">
              Your certificate has been issued{cert?.certificate_number ? ` (No. ${cert.certificate_number})` : ''}.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <button onClick={downloadPDF} className="btn-primary"><Download size={18} /> Download certificate</button>
              <Link to="/certificate" className="btn-ghost"><Award size={16} /> View certificate</Link>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-coral-300/30 text-bear-500 rounded-full mb-4">
              <AlertCircle size={40} strokeWidth={2} />
            </div>
            <h1 className="font-display text-2xl font-black">Payment not confirmed</h1>
            <p className="text-ink/60 mt-2 max-w-sm mx-auto">{message}</p>
            <p className="text-xs text-ink/45 mt-2">If you were charged, don't worry — contact support and we'll sort it out.</p>
            <Link to="/certificate" className="btn-primary mt-6">Back to certificate</Link>
          </>
        )}
      </div>
    </Layout>
  );
}
