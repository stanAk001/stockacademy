import { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateShareCard, shareOrDownload } from '../lib/shareImage';

// Renders a branded share-card image from `spec` and shares/downloads it.
// `filename` defaults to a timestamped png.
export default function ShareButton({ spec, filename, label = 'Share', className = '' }) {
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    setBusy(true);
    try {
      const blob = await generateShareCard(spec);
      await shareOrDownload(blob, filename || `stockacademia-${Date.now()}.png`);
    } catch (err) {
      console.error(err);
      toast.error('Could not create the share image.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-cream-warm text-ink/70 text-xs font-bold hover:bg-ink hover:text-cream transition disabled:opacity-60 ${className}`}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />} {label}
    </button>
  );
}
