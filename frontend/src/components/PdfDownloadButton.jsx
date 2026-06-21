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
  doc.text('STOCKACADEMIA', M, 32);
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

  // Key metrics (factual only)
  doc.setTextColor(...ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Key metrics', M, y);
  y += 24;

  const v = a.metrics?.valuation || {};
  const p = a.metrics?.profitability || {};
  const g = a.metrics?.growth || {};
  const b = a.metrics?.balance_sheet || {};
  const r = a.metrics?.risk || {};
  const ret = a.metrics?.returns || {};

  const rows = [
    ['P/E ratio', fmt(v.pe_ratio)],
    ['P/B ratio', fmt(v.pb_ratio)],
    ['Dividend yield', fmtPct(v.dividend_yield)],
    ['Market cap (m)', fmt(v.market_cap_millions)],
    ['ROE', fmtPct(p.roe)],
    ['Net margin', fmtPct(p.net_margin)],
    ['Revenue growth (YoY)', fmtPct(g.revenue_growth_yoy)],
    ['Debt / equity', fmt(b.debt_to_equity)],
    ['1-year return', fmtPct(ret.return_1y)],
    ['1-year volatility', fmtPct(r.volatility_1y)],
  ];

  const colW = (W - M * 2) / 2;
  doc.setFontSize(10);
  rows.forEach((row, idx) => {
    const col = idx % 2;
    const x = M + col * colW;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...muted);
    doc.text(row[0], x, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ink);
    doc.text(String(row[1]), x + colW - 70, y, { align: 'right' });
    if (col === 1) y += 22;
  });
  if (rows.length % 2 === 1) y += 22;

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  const footY = doc.internal.pageSize.getHeight() - 30;
  doc.text('Factual market data, educational only. Verify against another source; investment decisions are yours to make.', M, footY);

  doc.save(`${a.symbol}_analysis_${new Date().toISOString().split('T')[0]}.pdf`);
}