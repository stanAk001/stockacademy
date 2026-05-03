import { useState } from 'react';
import { Download, Loader2, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

export default function PdfDownloadButton({ analysis, quote, isPremium }) {
  const [busy, setBusy] = useState(false);

  if (!isPremium) {
    return (
      <Link
        to={`/upgrade?return_to=/stocks/${encodeURIComponent(analysis?.symbol || '')}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink/5 text-ink/60 text-xs font-bold hover:bg-ink/10 hover:text-ink transition"
      >
        <Lock size={12}/> Download PDF
      </Link>
    );
  }

  const generate = () => {
    if (!analysis) return;
    setBusy(true);
    try {
      buildPdf(analysis, quote);
      toast.success('Report downloaded');
    } catch (err) {
      console.error(err);
      toast.error('PDF generation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={generate}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ink text-cream text-xs font-bold hover:bg-ink-soft transition disabled:opacity-60"
    >
      {busy ? <><Loader2 size={12} className="animate-spin"/> Generating…</> : <><Download size={12}/> Download PDF</>}
    </button>
  );
}

function fmt(v) {
  if (v == null || !Number.isFinite(parseFloat(v))) return '—';
  return new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(v));
}
function fmtPct(v) {
  if (v == null || !Number.isFinite(parseFloat(v))) return '—';
  return `${(parseFloat(v) * 100).toFixed(1)}%`;
}

function buildPdf(a, q) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  let y = 0;

  const ink = [15, 20, 25];
  const sun = [251, 191, 36];
  const cream = [253, 248, 240];
  const muted = [107, 114, 128];
  const bull = [16, 185, 129];
  const bear = [239, 68, 68];

  // Header
  doc.setFillColor(...ink);
  doc.rect(0, 0, W, 90, 'F');
  doc.setTextColor(...sun);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('STOCKACADEMY', M, 32);
  doc.setTextColor(...cream);
  doc.setFontSize(20);
  doc.text(`${a.symbol}  ·  ${a.name || ''}`, M, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${a.country === 'NG' ? 'NGX' : 'US'} · ${a.sector || '—'} · Generated ${new Date().toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    M, 76
  );

  y = 120;
  doc.setTextColor(...ink);

  // Price
  if (q?.price != null) {
    const symb = a.currency === 'NGN' ? 'NGN ' : '$';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text(`${symb}${fmt(q.price)}`, M, y);
    if (q.change_pct != null) {
      doc.setFontSize(11);
      doc.setTextColor(...(q.change_pct >= 0 ? bull : bear));
      doc.text(`${q.change_pct >= 0 ? '+' : ''}${fmt(q.change_pct)}%`, M + 140, y);
    }
    y += 30;
  }

  // Composite banner
  doc.setFillColor(...ink);
  doc.roundedRect(M, y, W - M * 2, 80, 8, 8, 'F');
  doc.setTextColor(...sun);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPOSITE SCORE', M + 18, y + 22);
  doc.setFontSize(36);
  doc.text(`${a.scores.composite}`, M + 18, y + 60);
  doc.setTextColor(...cream);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('/ 100', M + 80, y + 60);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  const thesisLines = doc.splitTextToSize(`"${a.thesis}"`, W - M * 2 - 180);
  doc.text(thesisLines, M + 180, y + 30);

  y += 110;

  // Factor scores
  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Factor scores', M, y);
  y += 22;

  const factors = [
    { name: 'Quality',  score: a.scores.quality,  label: a.labels.quality,  color: bull },
    { name: 'Value',    score: a.scores.value,    label: a.labels.value,    color: sun },
    { name: 'Momentum', score: a.scores.momentum, label: a.labels.momentum, color: [251, 113, 133] },
    { name: 'Risk',     score: a.scores.risk,     label: a.labels.risk,     color: [134, 239, 172] },
  ];

  factors.forEach((f) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...ink);
    doc.text(f.name, M, y);
    doc.text(`${f.score}`, M + 80, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text(f.label, M + 110, y);

    const barX = W - M - 200;
    const barY = y - 8;
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(barX, barY, 200, 8, 4, 4, 'F');
    doc.setFillColor(...f.color);
    doc.roundedRect(barX, barY, (200 * f.score) / 100, 8, 4, 4, 'F');
    y += 22;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  const footY = doc.internal.pageSize.getHeight() - 30;
  doc.text('Educational analysis. Investment decisions are yours to make.', M, footY);

  doc.save(`${a.symbol}_analysis_${new Date().toISOString().split('T')[0]}.pdf`);
}