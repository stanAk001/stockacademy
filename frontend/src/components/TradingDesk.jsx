import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  Zap, Telescope, Radar, Crosshair, Activity, GitCompare, Newspaper, Send, PieChart, ArrowUpRight,
  Wallet, BookOpen, Compass, NotebookPen,
} from 'lucide-react';

// ============================================================
// TradingDesk — a premium dark "trader's toolkit" screen.
// Self-contained: injects its own fonts + styles (scoped under `.tdesk`).
// Edit TICKER and TOOLS below to change copy. Wire the `to` routes / buttons
// to your app as needed.
// ============================================================

// ---- editable data ---------------------------------------------------------
const TICKER = [
  { sym: 'NVDA', price: '124.30', chg: '+2.1%', up: true },
  { sym: 'AAPL', price: '229.87', chg: '+0.8%', up: true },
  { sym: 'DANGCEM', price: '₦510.00', chg: '+3.4%', up: true },
  { sym: 'TSLA', price: '241.05', chg: '-1.2%', up: false },
  { sym: 'MTNN', price: '₦198.50', chg: '+1.1%', up: true },
  { sym: 'AMD', price: '158.44', chg: '-0.5%', up: false },
  { sym: 'GTCO', price: '₦48.20', chg: '+2.7%', up: true },
  { sym: 'SMCI', price: '52.18', chg: '+4.6%', up: true },
];

// The five grid instruments (03–07). `filter` matches a pill.
const TOOLS = [
  { n: '03', title: 'Opportunity Radar', badge: 'LIVE',     filter: 'Live',    icon: Radar,     to: '/radar',          desc: 'The strongest setups, on one board.', detail: 'DANGCEM · NVDA · SMCI trending', detailTone: 'muted', status: 'Updated 12m ago' },
  { n: '04', title: 'Tracked setups',    badge: 'AUTO',     filter: 'Auto',    icon: Crosshair, to: '/setups',         desc: 'The AI watches & alerts you.',        detail: 'AAPL +2.1% · TSLA watching',    detailTone: 'up',    status: '3 alerts today' },
  { n: '05', title: 'AI Swing Radar',    badge: 'TRADERS',  filter: 'Traders', icon: Activity,  to: '/scout',          desc: 'Entry, targets & risk.',              detail: 'Entry $142 → Target $168',      detailTone: 'up',    status: '6 open ideas' },
  { n: '06', title: 'AI comparison',     badge: 'POPULAR',  filter: 'Popular', icon: GitCompare, to: '/compare-stocks', desc: 'Two tickers, side by side.',          detail: 'NVDA vs AMD · 72 / 28',         detailTone: 'muted', status: 'Most used' },
  { n: '07', title: 'News scanner',      badge: 'FOCUSED',  filter: 'Focused', icon: Newspaper, to: '/news-scanner',   desc: 'Only news that moves price.',         detail: '"Fed signals pause" · 9m',      detailTone: 'muted', status: '14 alerts today' },
  { n: '08', title: 'Positions',         badge: 'MONITOR',  filter: 'Monitor', icon: Wallet,    to: '/positions',      desc: 'We watch your thesis vs the market.', detail: 'Intact · strengthening · weakening', detailTone: 'muted', status: 'Live monitoring' },
  { n: '09', title: 'Investment theses',  badge: 'MONITOR',  filter: 'Monitor', icon: BookOpen,  to: '/theses',         desc: 'We flag when fundamentals shift.',    detail: 'Why did this change?',          detailTone: 'muted', status: 'Checked daily' },
  { n: '10', title: 'Trading journal',    badge: 'LEARN',    filter: 'Monitor', icon: NotebookPen, to: '/journal',      desc: 'Auto-logged trades + your patterns.', detail: 'AI post-trade review',          detailTone: 'muted', status: 'Learns as you trade' },
];

const PILLS = ['All', 'Flagship', 'Live', 'Auto', 'Traders', 'Popular', 'Focused', 'Monitor'];

// ---- small hooks -----------------------------------------------------------
const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useCountUp(target, start, dur = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!start) return undefined;
    if (reduceMotion()) { setV(target); return undefined; }
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, dur]);
  return v;
}

function useClock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const fmt = () => {
      try { return new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Africa/Lagos' }); }
      catch { return new Date().toLocaleTimeString('en-GB', { hour12: false }); }
    };
    setT(fmt());
    const id = setInterval(() => setT(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

// ---- component -------------------------------------------------------------
export default function TradingDesk() {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState('All');
  const clock = useClock();

  const [market, setMarket] = useState('ALL');
  const [stats, setStats] = useState(null);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    api.get('/ai/desk-stats', { params: market !== 'ALL' ? { market } : {} })
      .then(({ data }) => data?.success && setStats(data)).catch(() => {});
  }, [market]);
  const ready = mounted && Boolean(stats);
  const c1 = useCountUp(stats?.setups ?? 0, ready);
  const c2 = useCountUp(stats?.tracked ?? 0, ready, 1400);
  const c3 = useCountUp(stats?.scanned ?? 0, ready, 1600);

  const show = (f) => filter === 'All' || filter === f;
  const liveStatus = { '03': stats ? `${stats.strong} strong` : null, '04': stats ? `${stats.tracked} tracked` : null };

  return (
    <div className="tdesk">
      <style>{CSS}</style>

      {/* ---- Ticker tape ---- */}
      <div className="td-ticker">
        <div className="td-ticker-track">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span className="td-tick" key={i}>
              <b className="td-tick-sym">{t.sym}</b>
              <span className="td-tick-px">{t.price}</span>
              <span className={t.up ? 'td-up' : 'td-down'}>{t.chg}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="td-body">
        {/* ---- Masthead ---- */}
        <div className="td-masthead">
          <div className="td-mast-row">
            <span className="td-premium">PREMIUM</span>
            <span className="td-clock">{clock} <span className="td-mono-dim">WAT</span></span>
            <span className="td-open"><span className="td-dot" /> MARKETS OPEN</span>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
              {[['ALL', 'Both'], ['US', 'US'], ['NG', 'NGX']].map(([id, l]) => (
                <button key={id} onClick={() => setMarket(id)} className={`td-pill ${market === id ? 'is-active' : ''}`}>{l}</button>
              ))}
            </span>
          </div>
          <h1 className="td-h1">The Trading Desk</h1>
          <p className="td-sub">A full desk of AI tools that hunt, rank and watch the market for you — so you spend less time searching and more time trading.</p>

          <div className="td-ribbon">
            <div className="td-cell td-cell-gold">
              <div className="td-cell-num td-gold">{c1}</div>
              <div className="td-cell-lbl">live setups · on the board</div>
            </div>
            <div className="td-cell">
              <div className="td-cell-num td-up">{c2}</div>
              <div className="td-cell-lbl">setups you're tracking</div>
            </div>
            <div className="td-cell">
              <div className="td-cell-num">{c3}</div>
              <div className="td-cell-lbl">stocks analysed · live</div>
            </div>
          </div>
        </div>

        {/* ---- My Market banner ---- */}
        {filter === 'All' && <MyMarketBanner stats={stats} />}

        {/* ---- Filter pills ---- */}
        <div className="td-filters">
          <span className="td-instr">THE INSTRUMENTS <span className="td-gold">/ 09</span></span>
          <div className="td-pills">
            {PILLS.map((p) => (
              <button key={p} className={`td-pill ${filter === p ? 'is-active' : ''}`} onClick={() => setFilter(p)}>{p}</button>
            ))}
          </div>
        </div>

        {/* ---- Spotlight row ---- */}
        {show('Flagship') && (
          <div className="td-spot-grid">
            <PortfolioCard />
            <ScoutCard stats={stats} />
          </div>
        )}

        {/* ---- Tool grid ---- */}
        {TOOLS.some((t) => show(t.filter)) && (
          <div className="td-grid">
            {TOOLS.filter((t) => show(t.filter)).map((t) => <ToolCard key={t.n} t={{ ...t, status: liveStatus[t.n] || t.status }} />)}
          </div>
        )}

        {/* ---- Telegram banner ---- */}
        {filter === 'All' && <TelegramBanner />}
      </div>
    </div>
  );
}

// ---- Spotlight 01: AI Portfolio Analysis ----------------------------------
function PortfolioCard() {
  const [run, setRun] = useState('idle'); // idle | running | done
  const health = run === 'done' ? 85 : 82;
  const meters = run === 'done'
    ? [{ l: 'CONCENTRATION', v: 57 }, { l: 'DIVERSIFICATION', v: 83 }, { l: 'SECTOR RISK', v: 48 }]
    : [{ l: 'CONCENTRATION', v: 62 }, { l: 'DIVERSIFICATION', v: 78 }, { l: 'SECTOR RISK', v: 54 }];

  const runAnalysis = () => {
    if (run === 'running') return;
    setRun('running');
    setTimeout(() => {
      setRun('done');
      setTimeout(() => setRun('idle'), 2400);
    }, 1300);
  };

  return (
    <div className="td-card td-hero">
      <span className="td-topline" />
      <div className="td-card-head">
        <div className="td-ico td-ico-solid"><PieChart size={20} /></div>
        <div className="td-grow">
          <h3 className="td-title">AI Portfolio Analysis</h3>
          <p className="td-desc">Reads your simulator portfolio · nothing to paste</p>
        </div>
        <Ring score={health} />
      </div>

      <div className="td-chartwrap">
        <div className="td-chart-lbl">PORTFOLIO VALUE · 30D <span className="td-up">+12.4%</span></div>
        <Sparkline />
      </div>

      <div className="td-meters">
        {meters.map((m) => <Meter key={m.l} label={m.l} value={m.v} />)}
      </div>

      <div className="td-hero-foot">
        <button className={`td-btn ${run === 'done' ? 'is-done' : ''}`} onClick={runAnalysis} disabled={run === 'running'}>
          {run === 'running' ? <><span className="td-spin" /> Analyzing…</>
            : run === 'done' ? <>Done ✓</>
            : <><Zap size={15} /> Run analysis</>}
        </button>
        <span className="td-foot-note">Last run 2 days ago · <Link to="/portfolio-review" className="td-link">or review real money</Link></span>
      </div>
    </div>
  );
}

// ---- Spotlight 02: AI Stock Scout -----------------------------------------
function ScoutCard({ stats }) {
  const bars = [40, 64, 50, 82, 60, 92];
  const goldIdx = 5;
  return (
    <div className="td-card td-hero">
      <span className="td-topline" />
      <div className="td-card-head">
        <div className="td-ico td-ico-out"><Telescope size={20} /></div>
        <div className="td-grow">
          <div className="td-badge td-badge-out" style={{ marginBottom: 8 }}>FLAGSHIP</div>
          <h3 className="td-title">AI Stock Scout</h3>
        </div>
      </div>
      <p className="td-desc td-desc-lg">Pick a goal — the AI finds, ranks and explains the strongest setups across US &amp; NGX with a transparent quality score.</p>

      <div className="td-bars">
        {bars.map((h, i) => <span key={i} className={`td-bar ${i === goldIdx ? 'is-gold' : ''}`} style={{ height: `${h}%` }} />)}
      </div>

      <div className="td-chips">
        {['DANGCEM', 'NVDA', 'SMCI'].map((s) => (
          <span className="td-chip" key={s}>{s} <span className="td-up">↑</span></span>
        ))}
      </div>

      <div className="td-hero-foot td-foot-simple">
        <Link to="/scout" className="td-link td-link-gold">Open Scout →</Link>
        <span className="td-foot-note">{stats != null ? `${stats.setups} on the board` : ''}</span>
      </div>
    </div>
  );
}

// ---- Grid tool card --------------------------------------------------------
function ToolCard({ t }) {
  const Icon = t.icon;
  return (
    <Link to={t.to} className="td-card td-tool">
      <div className="td-tool-top">
        <span className="td-num">{t.n}</span>
        <div className="td-ico td-ico-out td-ico-sm"><Icon size={17} /></div>
        <span className="td-badge td-badge-out td-grow-r">{t.badge}</span>
      </div>
      <h3 className="td-title td-title-sm">{t.title}</h3>
      <p className="td-desc">{t.desc}</p>
      <div className="td-detail">
        <span className={t.detailTone === 'up' ? 'td-up' : t.detailTone === 'down' ? 'td-down' : 'td-mono-dim'}>{t.detail}</span>
      </div>
      <div className="td-tool-foot">
        <span className="td-link td-link-gold">Open →</span>
        <span className="td-status">{t.status}</span>
      </div>
    </Link>
  );
}

// ---- Telegram banner (08) --------------------------------------------------
// Prominent entry to the personal briefing. Does NOT fetch the briefing (that
// would stamp "last seen" on every desk load) — it just links there.
function MyMarketBanner({ stats }) {
  return (
    <Link to="/my-market" className="td-card td-mm" style={{ textDecoration: 'none' }}>
      <span className="td-topline" />
      <div className="td-mm-left">
        <div className="td-ico td-ico-gold"><Compass size={20} /></div>
        <div className="td-grow">
          <div className="td-tg-titlerow">
            <h3 className="td-title">My Market</h3>
            <span className="td-members"><span className="td-dot" /> YOUR BRIEFING</span>
          </div>
          <p className="td-desc">What changed since your last visit — setups approaching, positions moving, theses shifting, all in one place.</p>
        </div>
      </div>
      <div className="td-mm-right">
        {stats && <span className="td-mm-stat">{stats.strong} strong · {stats.tracked} tracked</span>}
        <span className="td-btn">Open My Market <ArrowUpRight size={15} /></span>
      </div>
    </Link>
  );
}

function TelegramBanner() {
  const [joined, setJoined] = useState(false);
  return (
    <div className="td-card td-tg">
      <span className="td-topline" />
      <div className="td-tg-left">
        <div className="td-ico td-ico-out"><Send size={20} /></div>
        <div className="td-grow">
          <div className="td-tg-titlerow">
            <h3 className="td-title">Premium Telegram</h3>
            <span className="td-members"><span className="td-dot" /> MEMBERS ONLY</span>
          </div>
          <p className="td-desc">Real-time alerts and exclusive setups, the moment they trigger.</p>
          <p className="td-tg-latest">↳ latest: <span className="td-tg-quote">“NVDA breaking out — full note inside”</span> · 3m ago</p>
        </div>
      </div>
      <div className="td-tg-right">
        <button className={`td-btn ${joined ? 'td-btn-out' : ''}`} onClick={() => setJoined(!joined)}>
          {joined ? 'Joined ✓' : 'Join channel'}
        </button>
        <span className="td-tg-count">2,481 members · 12 online</span>
      </div>
    </div>
  );
}

// ---- primitives ------------------------------------------------------------
function Ring({ score }) {
  const r = 30, C = 2 * Math.PI * r;
  const off = C * (1 - score / 100);
  return (
    <div className="td-ring">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--gold)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 36 36)" style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <div className="td-ring-num">{score}</div>
    </div>
  );
}

function Meter({ label, value }) {
  return (
    <div className="td-meter">
      <div className="td-meter-lbl"><span>{label}</span><span className="td-mono-dim">{value}%</span></div>
      <div className="td-meter-track"><span className="td-meter-fill" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function Sparkline() {
  const ref = useRef(null);
  const [len, setLen] = useState(0);
  const pts = '0,66 24,60 48,63 72,52 96,55 120,44 144,47 168,36 192,40 216,28 240,31 264,20 288,15 300,10';
  useEffect(() => {
    if (ref.current) setLen(ref.current.getTotalLength());
  }, []);
  const draw = !reduceMotion();
  return (
    <svg className="td-spark" viewBox="0 0 300 80" preserveAspectRatio="none">
      <defs>
        <linearGradient id="td-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0.22" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts} 300,80 0,80`} fill="url(#td-fill)" />
      <polyline
        ref={ref}
        points={pts}
        fill="none" stroke="var(--gold)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"
        style={draw && len ? { strokeDasharray: len, strokeDashoffset: len, animation: 'td-draw 1.5s ease .3s forwards' } : undefined}
      />
    </svg>
  );
}

// ---- styles (scoped under .tdesk) -----------------------------------------
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
.tdesk{
  --bg:#0E1217; --bg2:#12171E; --card:#161C25; --card2:#1A2029;
  --line:rgba(255,255,255,0.08); --line2:rgba(255,255,255,0.13);
  --gold:#E8B04B; --gold-bright:#F5C868; --gold-dim:rgba(232,176,75,0.14);
  --green:#3FCF8E; --red:#F0675F;
  --text:#E9ECF0; --muted:#8A929C; --faint:#5A626C;
  --serif:'Newsreader',Georgia,serif; --sans:'Manrope',system-ui,sans-serif; --mono:'JetBrains Mono',monospace;
  background:var(--bg); color:var(--text); font-family:var(--sans);
  border-radius:24px; overflow:hidden; box-shadow:0 30px 80px -40px rgba(0,0,0,.8);
  border:1px solid var(--line);
}
.tdesk *{box-sizing:border-box}
.tdesk .td-up{color:var(--green)} .tdesk .td-down{color:var(--red)} .tdesk .td-gold{color:var(--gold)}
.tdesk .td-mono-dim{font-family:var(--mono);color:var(--faint)}
.tdesk .td-grow{min-width:0;flex:1} .tdesk .td-grow-r{margin-left:auto}
.tdesk .td-link{color:var(--muted);text-decoration:none;font-weight:600}
.tdesk .td-link:hover{color:var(--text)}
.tdesk .td-link-gold{color:var(--gold);font-weight:700}
.tdesk .td-link-gold:hover{color:var(--gold-bright)}

/* ticker */
.tdesk .td-ticker{position:relative;background:var(--bg2);border-bottom:1px solid var(--line);overflow:hidden;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.tdesk .td-ticker-track{display:inline-flex;white-space:nowrap;animation:td-scroll 34s linear infinite}
.tdesk .td-tick{display:inline-flex;align-items:center;gap:8px;padding:9px 20px;font-family:var(--mono);font-size:12.5px;border-right:1px solid var(--line)}
.tdesk .td-tick-sym{color:var(--text);font-weight:700} .tdesk .td-tick-px{color:var(--muted)}
@keyframes td-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}

.tdesk .td-body{padding:26px 24px 30px}
@media(min-width:640px){.tdesk .td-body{padding:32px 34px 40px}}

/* masthead */
.tdesk .td-mast-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap;font-family:var(--mono);font-size:12px}
.tdesk .td-premium{color:var(--gold);border:1px solid var(--gold);border-radius:999px;padding:3px 11px;font-weight:700;letter-spacing:.14em;font-size:10.5px}
.tdesk .td-clock{color:var(--text);letter-spacing:.06em;font-variant-numeric:tabular-nums}
.tdesk .td-open{display:inline-flex;align-items:center;gap:7px;color:var(--muted);letter-spacing:.1em;font-size:11px}
.tdesk .td-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 0 0 rgba(63,207,142,.6);animation:td-pulse 2s infinite}
@keyframes td-pulse{0%{box-shadow:0 0 0 0 rgba(63,207,142,.5)}70%{box-shadow:0 0 0 7px rgba(63,207,142,0)}100%{box-shadow:0 0 0 0 rgba(63,207,142,0)}}
.tdesk .td-h1{font-family:var(--serif);font-weight:600;font-size:clamp(2.4rem,6vw,3.8rem);line-height:1.02;letter-spacing:-.02em;margin:16px 0 0}
.tdesk .td-sub{color:var(--muted);font-size:15px;max-width:60ch;margin:12px 0 0;line-height:1.5}

.tdesk .td-ribbon{display:grid;grid-template-columns:repeat(3,1fr);margin-top:22px;border:1px solid var(--line);border-radius:16px;overflow:hidden}
.tdesk .td-cell{padding:16px 18px;border-right:1px solid var(--line)}
.tdesk .td-cell:last-child{border-right:0}
.tdesk .td-cell-gold{background:var(--gold-dim)}
.tdesk .td-cell-num{font-family:var(--serif);font-weight:600;font-size:2rem;line-height:1;font-variant-numeric:tabular-nums}
.tdesk .td-cell-lbl{font-family:var(--mono);font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.09em;margin-top:7px}
@media(max-width:560px){.tdesk .td-cell-num{font-size:1.5rem}.tdesk .td-cell{padding:12px}}

/* filters */
.tdesk .td-filters{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:30px 0 18px}
.tdesk .td-instr{font-family:var(--mono);font-size:11px;letter-spacing:.14em;color:var(--faint);text-transform:uppercase}
.tdesk .td-pills{display:flex;gap:8px;flex-wrap:wrap}
.tdesk .td-pill{font-family:var(--mono);font-size:11.5px;font-weight:600;letter-spacing:.03em;padding:6px 13px;border-radius:999px;border:1px solid var(--line2);background:transparent;color:var(--muted);cursor:pointer;transition:all .15s}
.tdesk .td-pill:hover{color:var(--text);border-color:var(--gold)}
.tdesk .td-pill.is-active{background:var(--gold);border-color:var(--gold);color:#161005;font-weight:700}

/* cards */
.tdesk .td-card{position:relative;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:0 20px 40px -28px rgba(0,0,0,.7);transition:transform .22s,box-shadow .22s,border-color .22s}
.tdesk a.td-card{display:flex;flex-direction:column;text-decoration:none;color:inherit}
.tdesk .td-card:hover{transform:translateY(-4px);box-shadow:0 30px 55px -30px rgba(0,0,0,.8);border-color:var(--line2)}
.tdesk .td-topline{position:absolute;top:0;left:22px;right:22px;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.7}
/* two across at every width — phones get the compact block further down */
.tdesk .td-spot-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
@media(min-width:900px){.tdesk .td-spot-grid{grid-template-columns:1.3fr 1fr;gap:16px}}
.tdesk .td-card-head{display:flex;align-items:flex-start;gap:14px}
.tdesk .td-ico{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;flex:none}
.tdesk .td-ico-solid{background:var(--gold);color:#161005}
.tdesk .td-ico-out{border:1px solid rgba(232,176,75,.4);color:var(--gold);background:var(--gold-dim)}
.tdesk .td-ico-sm{width:38px;height:38px;border-radius:11px}
.tdesk .td-title{font-family:var(--serif);font-weight:600;font-size:1.4rem;line-height:1.1;letter-spacing:-.01em;margin:0}
.tdesk .td-title-sm{font-size:1.15rem;margin-top:14px}
.tdesk .td-desc{color:var(--muted);font-size:13px;line-height:1.45;margin:4px 0 0}
.tdesk .td-desc-lg{font-size:13.5px;margin-top:14px}
.tdesk .td-badge{font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.11em;padding:3px 8px;border-radius:6px}
.tdesk .td-badge-out{border:1px solid var(--line2);color:var(--muted);display:inline-block}

/* portfolio card bits */
.tdesk .td-ring{position:relative;width:72px;height:72px;flex:none}
.tdesk .td-ring-num{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--serif);font-weight:600;font-size:1.4rem;color:var(--gold)}
.tdesk .td-chartwrap{margin-top:18px}
.tdesk .td-chart-lbl{font-family:var(--mono);font-size:10px;letter-spacing:.09em;color:var(--faint);text-transform:uppercase;display:flex;gap:10px;align-items:center;margin-bottom:8px}
.tdesk .td-spark{width:100%;height:74px;display:block}
.tdesk .td-meters{margin-top:18px;display:flex;flex-direction:column;gap:11px}
.tdesk .td-meter-lbl{display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;letter-spacing:.06em;color:var(--muted);margin-bottom:5px}
.tdesk .td-meter-track{height:5px;border-radius:999px;background:rgba(255,255,255,0.06);overflow:hidden}
.tdesk .td-meter-fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--gold),var(--gold-bright));transition:width .8s cubic-bezier(.4,0,.2,1)}
.tdesk .td-hero-foot{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:20px}
.tdesk .td-foot-simple{justify-content:space-between;margin-top:16px}
.tdesk .td-foot-note{font-size:12px;color:var(--faint)}
@keyframes td-draw{to{stroke-dashoffset:0}}

/* scout card */
.tdesk .td-bars{display:flex;align-items:flex-end;gap:8px;height:66px;margin-top:18px}
.tdesk .td-bar{flex:1;border-radius:4px 4px 0 0;background:rgba(255,255,255,0.1)}
.tdesk .td-bar.is-gold{background:var(--gold)}
.tdesk .td-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
.tdesk .td-chip{font-family:var(--mono);font-size:11.5px;font-weight:600;color:var(--text);border:1px solid var(--line2);border-radius:8px;padding:5px 10px}

/* buttons */
.tdesk .td-btn{display:inline-flex;align-items:center;gap:8px;font-family:var(--sans);font-weight:700;font-size:13.5px;padding:10px 18px;border-radius:11px;border:1px solid var(--gold);background:var(--gold);color:#161005;cursor:pointer;transition:all .18s;white-space:nowrap}
.tdesk .td-btn:hover{background:var(--gold-bright);transform:translateY(-1px)}
.tdesk .td-btn:disabled{cursor:default;opacity:.9;transform:none}
.tdesk .td-btn.is-done{background:var(--green);border-color:var(--green);color:#04140c}
.tdesk .td-btn-out{background:transparent;color:var(--gold)}
.tdesk .td-spin{width:13px;height:13px;border-radius:50%;border:2px solid rgba(22,16,5,.35);border-top-color:#161005;animation:td-spin .7s linear infinite}
@keyframes td-spin{to{transform:rotate(360deg)}}

/* tool grid */
.tdesk .td-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px}
@media(min-width:900px){.tdesk .td-grid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:16px}}
.tdesk .td-tool-top{display:flex;align-items:center;gap:11px}
.tdesk .td-num{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--faint)}
.tdesk .td-detail{margin-top:12px;background:var(--bg2);border:1px solid var(--line);border-radius:9px;padding:9px 11px;font-family:var(--mono);font-size:11.5px}
.tdesk .td-tool-foot{display:flex;align-items:center;justify-content:space-between;margin-top:14px}
.tdesk .td-status{font-family:var(--mono);font-size:10.5px;color:var(--faint)}

/* telegram */
.tdesk .td-tg{margin-top:16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;justify-content:space-between}
.tdesk .td-tg-left{display:flex;align-items:flex-start;gap:14px;min-width:0;flex:1}
.tdesk .td-tg-titlerow{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.tdesk .td-members{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;color:var(--gold);border:1px solid rgba(232,176,75,.4);border-radius:999px;padding:3px 9px}
.tdesk .td-members .td-dot{background:var(--gold);box-shadow:0 0 0 0 rgba(232,176,75,.5);animation:td-pulse-gold 2s infinite}
@keyframes td-pulse-gold{0%{box-shadow:0 0 0 0 rgba(232,176,75,.5)}70%{box-shadow:0 0 0 6px rgba(232,176,75,0)}100%{box-shadow:0 0 0 0 rgba(232,176,75,0)}}
.tdesk .td-tg-latest{font-family:var(--mono);font-size:12px;color:var(--muted);margin:10px 0 0}
.tdesk .td-tg-quote{color:var(--text)}
.tdesk .td-tg-right{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.tdesk .td-tg-count{font-family:var(--mono);font-size:11px;color:var(--faint)}
@media(max-width:620px){.tdesk .td-tg-right{align-items:stretch;width:100%}.tdesk .td-tg-right .td-btn{justify-content:center}}

/* my market banner */
.tdesk .td-mm{margin-top:16px;display:flex;align-items:center;gap:20px;flex-wrap:wrap;justify-content:space-between;border-color:rgba(232,176,75,.35);transition:border-color .2s,transform .2s}
.tdesk .td-mm:hover{border-color:var(--gold);transform:translateY(-2px)}
.tdesk .td-mm-left{display:flex;align-items:flex-start;gap:14px;min-width:0;flex:1}
.tdesk .td-ico-gold{background:var(--gold);color:#161005}
.tdesk .td-mm-right{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.tdesk .td-mm-stat{font-family:var(--mono);font-size:11.5px;color:var(--muted);white-space:nowrap}
@media(max-width:620px){.tdesk .td-mm-right{width:100%;justify-content:space-between}}

/* ---- phones: two cards per row, so everything shrinks to match ---- */
@media(max-width:700px){
  .tdesk .td-body{padding:18px 12px 22px}
  .tdesk .td-card{padding:13px;border-radius:15px}
  .tdesk .td-topline{left:13px;right:13px}
  .tdesk .td-card-head{gap:9px;flex-wrap:wrap}
  /* In a half-width column the icon + score ring leave the title ~70px and it
     breaks one letter per line. Put them on their own row and give the title
     the full width underneath. */
  .tdesk .td-hero .td-grow{flex-basis:100%;order:3}
  .tdesk .td-hero .td-ring{margin-left:auto}
  .tdesk .td-ico{width:34px;height:34px;border-radius:10px}
  .tdesk .td-ico svg{width:16px;height:16px}
  .tdesk .td-ico-sm{width:30px;height:30px;border-radius:9px}
  .tdesk .td-title{font-size:1.02rem;line-height:1.15}
  .tdesk .td-title-sm{font-size:.94rem;margin-top:10px}
  .tdesk .td-desc{font-size:11.5px;line-height:1.35}
  .tdesk .td-desc-lg{font-size:11.5px;margin-top:10px}
  .tdesk .td-badge{font-size:8px;padding:2px 6px;letter-spacing:.08em}
  .tdesk .td-num{font-size:10px}
  .tdesk .td-tool-top{gap:7px}
  .tdesk .td-detail{margin-top:9px;padding:7px 8px;font-size:9.5px;border-radius:8px;overflow:hidden;text-overflow:ellipsis}
  .tdesk .td-tool-foot{margin-top:10px;gap:6px}
  .tdesk .td-link-gold{font-size:12px}
  .tdesk .td-status{font-size:9px}
  .tdesk .td-foot-note{font-size:9.5px}
  /* portfolio card internals */
  .tdesk .td-ring{width:46px;height:46px}
  .tdesk .td-ring svg{width:46px;height:46px}
  .tdesk .td-ring-num{font-size:.95rem}
  .tdesk .td-chartwrap{margin-top:12px}
  .tdesk .td-chart-lbl{font-size:8.5px;gap:6px;margin-bottom:5px}
  .tdesk .td-spark{height:46px}
  .tdesk .td-meters{margin-top:12px;gap:8px}
  .tdesk .td-meter-lbl{font-size:8.5px;margin-bottom:4px}
  .tdesk .td-hero-foot{margin-top:12px;gap:8px}
  .tdesk .td-btn{font-size:12px;padding:8px 12px;border-radius:9px;width:100%;justify-content:center}
  /* scout card internals */
  .tdesk .td-bars{height:42px;gap:5px;margin-top:12px}
  .tdesk .td-chips{gap:5px;margin-top:10px}
  .tdesk .td-chip{font-size:9.5px;padding:3px 6px;border-radius:6px}
}

@media(prefers-reduced-motion:reduce){
  .tdesk .td-ticker-track{animation:none}
  .tdesk .td-dot,.tdesk .td-members .td-dot{animation:none}
}
`;
