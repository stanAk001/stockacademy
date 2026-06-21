// shareImage.js — draws a branded StockAcademia "share card" on a canvas and
// shares it (Web Share API on mobile) or downloads it. Programmatic drawing
// (like the PDF report) so output is consistent regardless of page CSS.
//
// spec = {
//   eyebrow: 'AI STOCK COMPARISON',
//   title: 'GTCO vs ZENITH',
//   stats: [{ label: 'GTCO', value: '82', sub: 'Steadier' }, ...]   // optional, up to 3
//   lines: ['Bottom line: …', '…'],                                  // body paragraphs/bullets
//   footer: 'Educational only — not financial advice.',
// }

const COLORS = {
  cream: '#FDF8F0',
  creamWarm: '#FAF1E1',
  ink: '#0F1419',
  inkSoft: '#1A1F26',
  sun: '#FBBF24',
  sun300: '#FCD34D',
  coral: '#FB7185',
  bull: '#10B981',
  muted: 'rgba(15,20,25,0.55)',
};

const W = 1080;
const PAD = 72;
const SERIF = 'Fraunces, Georgia, "Times New Roman", serif';
const SANS = '"Plus Jakarta Sans", system-ui, sans-serif';

function wrap(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateShareCard(spec) {
  // Make sure the brand fonts are ready so canvas can use them.
  try { await (document.fonts?.ready); } catch { /* noop */ }

  const measure = document.createElement('canvas').getContext('2d');
  const contentW = W - PAD * 2;

  // --- layout pass (compute height) ---
  let h = 0;
  const headerH = 132;
  h += headerH + 56;                       // header + gap

  measure.font = `800 64px ${SERIF}`;
  const titleLines = wrap(measure, spec.title, contentW);
  h += titleLines.length * 72 + 24;

  const hasStats = Array.isArray(spec.stats) && spec.stats.length > 0;
  if (hasStats) h += 150 + 28;

  measure.font = `400 30px ${SANS}`;
  const bodyBlocks = (spec.lines || []).map((t) => wrap(measure, t, contentW));
  bodyBlocks.forEach((b) => { h += b.length * 42 + 22; });

  h += 8 + 64;                              // divider + footer
  const H = Math.max(820, Math.round(h));

  // --- draw pass (2x for crispness) ---
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.textBaseline = 'alphabetic';

  // background
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, W, H);

  // header bar
  ctx.fillStyle = COLORS.ink;
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = COLORS.sun300;
  ctx.font = `800 26px ${SANS}`;
  ctx.fillText('★ STOCKACADEMIA', PAD, 56);
  ctx.fillStyle = 'rgba(253,248,240,0.65)';
  ctx.font = `700 22px ${SANS}`;
  ctx.fillText(String(spec.eyebrow || '').toUpperCase(), PAD, 96);

  let y = headerH + 64;

  // title
  ctx.fillStyle = COLORS.ink;
  ctx.font = `800 64px ${SERIF}`;
  titleLines.forEach((l) => { ctx.fillText(l, PAD, y); y += 72; });
  y += 8;

  // stats row
  if (hasStats) {
    const n = Math.min(spec.stats.length, 3);
    const gap = 20;
    const boxW = (contentW - gap * (n - 1)) / n;
    spec.stats.slice(0, n).forEach((s, i) => {
      const x = PAD + i * (boxW + gap);
      ctx.fillStyle = i === 0 ? '#FEF3C7' : COLORS.creamWarm;
      roundRect(ctx, x, y, boxW, 150, 18);
      ctx.fill();
      ctx.fillStyle = COLORS.muted;
      ctx.font = `800 20px ${SANS}`;
      ctx.fillText(String(s.label || '').toUpperCase(), x + 22, y + 38);
      ctx.fillStyle = COLORS.ink;
      ctx.font = `800 56px ${SERIF}`;
      ctx.fillText(String(s.value), x + 22, y + 100);
      if (s.sub) {
        ctx.fillStyle = COLORS.muted;
        ctx.font = `600 22px ${SANS}`;
        ctx.fillText(String(s.sub), x + 22, y + 132);
      }
    });
    y += 150 + 28;
  }

  // body
  ctx.font = `400 30px ${SANS}`;
  bodyBlocks.forEach((blockLines) => {
    ctx.fillStyle = COLORS.ink;
    blockLines.forEach((l) => { ctx.fillText(l, PAD, y); y += 42; });
    y += 22;
  });

  // footer
  y = H - 56;
  ctx.strokeStyle = 'rgba(15,20,25,0.10)';
  ctx.beginPath();
  ctx.moveTo(PAD, y - 24);
  ctx.lineTo(W - PAD, y - 24);
  ctx.stroke();
  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 22px ${SANS}`;
  ctx.fillText(spec.footer || 'Educational only — not financial advice.', PAD, y);
  ctx.fillStyle = COLORS.coral;
  ctx.font = `800 22px ${SANS}`;
  const url = 'stockacademia';
  ctx.fillText(url, W - PAD - ctx.measureText(url).width, y);

  return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png', 0.95));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Share via the Web Share API (great on mobile) or fall back to download.
export async function shareOrDownload(blob, filename) {
  if (!blob) return;
  const file = new File([blob], filename, { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'StockAcademia' });
      return;
    }
  } catch { /* user cancelled or unsupported — fall through to download */ }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
