import { useEffect, useState } from 'react';
import api from '../services/api';

const POLL_MS = 3000;
const GIVE_UP_MS = 3 * 60 * 1000; // bank transfers can take a couple of minutes

// Polls a payment-verify endpoint until the server confirms, so the user never
// has to click anything after paying. A single check would falsely report
// failure for a transfer/USSD that's still settling (the server answers 202
// { pending: true } for those).
//
// state: 'loading' | 'confirming' | 'success' | 'slow' | 'failed'
export default function usePaymentVerify(endpoint, reference) {
  const [state, setState] = useState('loading');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [waited, setWaited] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!endpoint || !reference) {
      setState('failed');
      setError('Missing payment reference.');
      return undefined;
    }

    const startedAt = Date.now();
    let cancelled = false;
    let timer;

    const check = async () => {
      try {
        const res = await api.post(endpoint, { reference });
        if (cancelled) return;
        const d = res.data;

        if (d.success) { setData(d); setState('success'); return; }

        if (d.pending) {
          if (Date.now() - startedAt > GIVE_UP_MS) { setState('slow'); return; }
          setState('confirming');
          setWaited(Math.round((Date.now() - startedAt) / 1000));
          timer = setTimeout(check, POLL_MS);
          return;
        }

        setState('failed');
        setError(d.message || 'Payment was not successful.');
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        // A dropped connection or server hiccup isn't a failed payment.
        if ((!status || status >= 500) && Date.now() - startedAt < GIVE_UP_MS) {
          setState('confirming');
          setWaited(Math.round((Date.now() - startedAt) / 1000));
          timer = setTimeout(check, POLL_MS);
          return;
        }
        setState('failed');
        setError(err.response?.data?.message || 'Verification failed.');
      }
    };

    check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [endpoint, reference, attempt]);

  const retry = () => { setWaited(0); setError(''); setState('loading'); setAttempt((a) => a + 1); };

  return { state, data, error, waited, retry };
}
