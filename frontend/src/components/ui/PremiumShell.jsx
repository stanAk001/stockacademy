import { useEffect, useState } from 'react';

// ============================================================
// PremiumShell — the shared premium look for every tool page.
// A dark charcoal panel with a single gold accent, Newsreader/Manrope/JetBrains
// Mono type, a hairline gold top-edge, and a hero (eyebrow · title · subtitle ·
// icon · optional right-side motif). Children render on the dark surface and use
// the `.psh-*` utility classes below. Each page passes its own `accent` (a CSS
// color) and `motif` so pages feel distinct while staying one family.
// ============================================================
export default function PremiumShell({
  icon: Icon,
  eyebrow,
  title,
  accent,          // gold accent word in the headline
  subtitle,
  motif,           // optional right-side decorative node
  accentColor = '#E8B04B',
  children,
  wide = false,
}) {
  return (
    <div className="psh" style={{ '--accent': accentColor }}>
      <PshStyle />
      <div className={`psh-wrap ${wide ? 'psh-wide' : ''}`}>
        <div className="psh-panel">
          <span className="psh-topline" />
          <div className="psh-hero">
            <div className="psh-hero-main">
              {(Icon || eyebrow) && (
                <div className="psh-hero-top">
                  {Icon && <div className="psh-ico"><Icon size={22} strokeWidth={2.1} /></div>}
                  {eyebrow && <span className="psh-eyebrow">{eyebrow}</span>}
                </div>
              )}
              <h1 className="psh-h1">{title}{accent ? <> <span className="psh-accent">{accent}</span></> : null}</h1>
              {subtitle && <p className="psh-sub">{subtitle}</p>}
            </div>
            {motif && <div className="psh-hero-motif" aria-hidden="true">{motif}</div>}
          </div>
          <div className="psh-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

// A tidy animated bars motif pages can reuse in the hero.
export function BarsMotif({ color = 'var(--accent)', heights = [40, 66, 52, 84, 60, 92, 74] }) {
  return (
    <div className="psh-barsmotif">
      {heights.map((h, i) => <span key={i} style={{ height: `${h}%`, background: color, opacity: 0.35 + (i / heights.length) * 0.6 }} />)}
    </div>
  );
}

// A live WAT clock chip for the hero.
export function DeskClock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const f = () => { try { return new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Africa/Lagos' }); } catch { return new Date().toLocaleTimeString('en-GB', { hour12: false }); } };
    setT(f()); const id = setInterval(() => setT(f()), 1000); return () => clearInterval(id);
  }, []);
  return <span className="psh-clock">{t} <span className="psh-dim">WAT</span></span>;
}

function PshStyle() {
  return <style>{CSS}</style>;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,ital,wght@6..72,0,400;6..72,0,500;6..72,0,600;6..72,1,500;6..72,1,600&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
.psh{
  --bg:#0E1217; --bg2:#12171E; --card:#161C25; --card2:#1A2029; --raise:#1E2530;
  --line:rgba(255,255,255,0.08); --line2:rgba(255,255,255,0.14);
  --accent:#E8B04B; --accent-bright:#F5C868; --accent-dim:rgba(232,176,75,0.14);
  --green:#3FCF8E; --red:#F0675F;
  --text:#E9ECF0; --muted:#8A929C; --faint:#5A626C;
  --serif:'Newsreader',Georgia,serif; --sans:'Manrope',system-ui,sans-serif; --mono:'JetBrains Mono',monospace;
  font-family:var(--sans);
}
.psh *{box-sizing:border-box}
.psh-wrap{max-width:960px;margin:0 auto;padding:14px 12px 40px}
.psh-wrap.psh-wide{max-width:1120px}
@media(min-width:640px){.psh-wrap{padding:22px 20px 56px}}
.psh-panel{position:relative;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:24px;overflow:hidden;box-shadow:0 40px 90px -50px rgba(0,0,0,.85)}
.psh-topline{position:absolute;top:0;left:0;right:0;height:1.5px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:.85}
.psh-content{padding:0 20px 26px}
@media(min-width:640px){.psh-content{padding:0 34px 36px}}

/* hero */
.psh-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:30px 20px 22px}
@media(min-width:640px){.psh-hero{padding:38px 34px 26px}}
.psh-hero-main{min-width:0;max-width:60ch}
.psh-hero-top{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.psh-ico{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;background:var(--accent);color:#161005;flex:none;box-shadow:0 10px 22px -10px var(--accent)}
.psh-eyebrow{font-family:var(--mono);font-size:11.5px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
.psh-h1{font-family:var(--serif);font-weight:500;font-size:clamp(2rem,5.5vw,3.4rem);line-height:1.02;letter-spacing:-.02em;margin:0;text-wrap:balance}
.psh-accent{font-style:italic;color:var(--accent)}
.psh-sub{color:var(--muted);font-size:15px;line-height:1.5;margin:14px 0 0;max-width:56ch}
.psh-hero-motif{flex:none;align-self:stretch;display:flex;align-items:flex-end;opacity:.9}
@media(max-width:720px){.psh-hero-motif{display:none}}
.psh-barsmotif{display:flex;align-items:flex-end;gap:6px;height:88px;width:150px}
.psh-barsmotif span{flex:1;border-radius:4px 4px 0 0}

/* type + color helpers */
.psh-up{color:var(--green)} .psh-down{color:var(--red)} .psh-gold{color:var(--accent)}
.psh-dim{color:var(--faint)} .psh-t{color:var(--text)} .psh-muted{color:var(--muted)} .psh-faint{color:var(--faint)}
.psh-bull{color:var(--green)} .psh-bear{color:var(--red)}
.psh-label{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
.psh-clock{font-family:var(--mono);font-size:12px;letter-spacing:.06em;color:var(--text);font-variant-numeric:tabular-nums}
.psh-serif{font-family:var(--serif)}
.psh-mono{font-family:var(--mono)}

/* surfaces */
.psh-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px}
.psh-card-2{background:var(--bg2)}
.psh-raise{background:var(--raise)}
.psh-lift{transition:transform .22s,box-shadow .22s,border-color .22s}
.psh-lift:hover{transform:translateY(-4px);box-shadow:0 28px 50px -30px rgba(0,0,0,.8);border-color:var(--line2)}

/* controls */
.psh-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;font-family:var(--sans);font-weight:700;font-size:14px;padding:12px 22px;border-radius:13px;border:1px solid var(--accent);background:var(--accent);color:#161005;cursor:pointer;transition:all .18s;white-space:nowrap}
.psh-btn:hover:not(:disabled){background:var(--accent-bright);transform:translateY(-1px)}
.psh-btn:disabled{opacity:.65;cursor:default}
.psh-btn-lg{width:100%;padding:15px 24px;font-size:15px}
.psh-ghost{background:transparent;border:1px solid var(--line2);color:var(--text)}
.psh-ghost:hover:not(:disabled){border-color:var(--accent);color:var(--accent);background:transparent}
.psh-input{width:100%;font-family:var(--mono);font-size:15px;color:var(--text);background:var(--bg2);border:1px solid var(--line2);border-radius:13px;padding:13px 15px;outline:none;transition:border-color .15s}
.psh-input::placeholder{color:var(--faint)}
.psh-input:focus{border-color:var(--accent)}
.psh-select{font-family:var(--sans);font-size:13px;color:var(--text);background:var(--bg2);border:1px solid var(--line2);border-radius:10px;padding:8px 12px;outline:none}

/* segmented objective cards */
.psh-seg{display:grid;gap:10px}
.psh-seg-item{text-align:left;background:var(--bg2);border:1px solid var(--line);border-radius:15px;padding:15px;cursor:pointer;transition:all .18s}
.psh-seg-item:hover{border-color:var(--line2)}
.psh-seg-item.is-active{background:var(--accent);border-color:var(--accent)}
.psh-seg-item.is-active .psh-seg-t,.psh-seg-item.is-active .psh-seg-d{color:#161005}
.psh-seg-t{font-weight:700;font-size:15px;display:block}
.psh-seg-d{font-size:12px;color:var(--muted);margin-top:2px;display:block}

/* small toggle pills */
.psh-toggle{font-family:var(--sans);font-size:12.5px;font-weight:700;padding:8px 14px;border-radius:999px;border:1px solid var(--line2);background:transparent;color:var(--muted);cursor:pointer;transition:all .15s}
.psh-toggle:hover{color:var(--text)}
.psh-toggle.is-on{background:var(--accent);border-color:var(--accent);color:#161005}

/* chips + badges */
.psh-chip{font-family:var(--mono);font-size:11.5px;font-weight:600;color:var(--text);background:var(--bg2);border:1px solid var(--line2);border-radius:8px;padding:5px 10px;cursor:pointer;transition:all .15s}
.psh-chip:hover{border-color:var(--accent);color:var(--accent)}
.psh-badge{font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:3px 8px;border-radius:6px;border:1px solid var(--line2);color:var(--muted)}
.psh-badge-gold{border-color:rgba(232,176,75,.4);color:var(--accent);background:var(--accent-dim)}
.psh-badge-green{border-color:rgba(63,207,142,.4);color:var(--green);background:rgba(63,207,142,.12)}

.psh-link{color:var(--muted);text-decoration:none;font-weight:600}
.psh-link:hover{color:var(--text)}
.psh-link-gold{color:var(--accent);font-weight:700}
.psh-link-gold:hover{color:var(--accent-bright)}

.psh-divider{height:1px;background:var(--line);border:0;margin:0}
.psh-spin{width:15px;height:15px;border-radius:50%;border:2px solid rgba(22,16,5,.35);border-top-color:#161005;animation:psh-spin .7s linear infinite;display:inline-block}
@keyframes psh-spin{to{transform:rotate(360deg)}}
.psh-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 0 rgba(63,207,142,.6);animation:psh-pulse 2s infinite;display:inline-block}
@keyframes psh-pulse{0%{box-shadow:0 0 0 0 rgba(63,207,142,.5)}70%{box-shadow:0 0 0 7px rgba(63,207,142,0)}100%{box-shadow:0 0 0 0 rgba(63,207,142,0)}}

/* meters + bars reused across pages */
.psh-meter-track{height:6px;border-radius:999px;background:rgba(255,255,255,0.07);overflow:hidden}
.psh-meter-fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--accent),var(--accent-bright));transition:width .8s cubic-bezier(.4,0,.2,1)}

@media(prefers-reduced-motion:reduce){.psh-dot{animation:none}.psh-spin{animation-duration:1.4s}}
`;
