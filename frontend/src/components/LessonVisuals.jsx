// ============================================================
// Lesson Visuals — hand-authored SVG diagrams
// All original artwork. No external dependencies, no licensing risk.
// Add new diagrams here and reference them in lesson markdown
// using the syntax: [[visual:diagram-id]]
// ============================================================

const COLORS = {
  bull: '#10B981',      // green
  bullLight: '#D1FAE5',
  bear: '#EF4444',      // red
  bearLight: '#FEE2E2',
  ink: '#0F1419',
  cream: '#FDF8F0',
  sun: '#FBBF24',
  sunLight: '#FEF3C7',
  coral: '#FB7185',
  ash: '#9CA3AF',
};

/* ==========================================================
 * 1. CANDLE ANATOMY — labelled bullish vs bearish candle
 * ========================================================== */
const CandleAnatomy = () => (
  <figure className="my-8">
    <svg viewBox="0 0 600 320" className="w-full max-w-2xl mx-auto">
      <defs>
        <marker id="arrowDark" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={COLORS.ink} />
        </marker>
      </defs>

      {/* Background grid */}
      <g stroke={COLORS.ink} strokeOpacity="0.05" strokeWidth="1">
        {[60, 110, 160, 210, 260].map((y) => <line key={y} x1="0" y1={y} x2="600" y2={y} />)}
      </g>

      {/* ---- BULLISH CANDLE ---- */}
      <g transform="translate(170, 30)">
        {/* Upper wick */}
        <line x1="0" y1="0" x2="0" y2="40" stroke={COLORS.ink} strokeWidth="2" />
        {/* Body */}
        <rect x="-22" y="40" width="44" height="120" fill={COLORS.bull} rx="3" />
        {/* Lower wick */}
        <line x1="0" y1="160" x2="0" y2="220" stroke={COLORS.ink} strokeWidth="2" />

        {/* Labels */}
        <g fontFamily="ui-sans-serif, system-ui" fontSize="11" fill={COLORS.ink} fontWeight="600">
          {/* High label */}
          <line x1="-50" y1="0" x2="-25" y2="0" stroke={COLORS.ink} markerEnd="url(#arrowDark)" />
          <text x="-55" y="4" textAnchor="end">High</text>
          {/* Close (top of green body since price went up) */}
          <line x1="-50" y1="40" x2="-25" y2="40" stroke={COLORS.ink} markerEnd="url(#arrowDark)" />
          <text x="-55" y="44" textAnchor="end">Close</text>
          {/* Open (bottom of green body) */}
          <line x1="-50" y1="160" x2="-25" y2="160" stroke={COLORS.ink} markerEnd="url(#arrowDark)" />
          <text x="-55" y="164" textAnchor="end">Open</text>
          {/* Low */}
          <line x1="-50" y1="220" x2="-25" y2="220" stroke={COLORS.ink} markerEnd="url(#arrowDark)" />
          <text x="-55" y="224" textAnchor="end">Low</text>

          {/* Body label */}
          <line x1="25" y1="100" x2="50" y2="100" stroke={COLORS.ink} markerEnd="url(#arrowDark)" />
          <text x="55" y="104">Body</text>
          {/* Wick label */}
          <line x1="10" y1="20" x2="50" y2="20" stroke={COLORS.ink} markerEnd="url(#arrowDark)" />
          <text x="55" y="24">Wick</text>
        </g>

        <text x="0" y="260" textAnchor="middle" fontFamily="serif" fontSize="14" fontWeight="700" fill={COLORS.bull}>BULLISH (Close ↑ Open)</text>
      </g>

      {/* ---- BEARISH CANDLE ---- */}
      <g transform="translate(450, 30)">
        <line x1="0" y1="0" x2="0" y2="40" stroke={COLORS.ink} strokeWidth="2" />
        <rect x="-22" y="40" width="44" height="120" fill={COLORS.bear} rx="3" />
        <line x1="0" y1="160" x2="0" y2="220" stroke={COLORS.ink} strokeWidth="2" />

        <g fontFamily="ui-sans-serif, system-ui" fontSize="11" fill={COLORS.ink} fontWeight="600">
          {/* On a red candle, OPEN is at the top, CLOSE at the bottom */}
          <line x1="25" y1="0" x2="50" y2="0" stroke={COLORS.ink} markerEnd="url(#arrowDark)" />
          <text x="55" y="4">High</text>
          <line x1="25" y1="40" x2="50" y2="40" stroke={COLORS.ink} markerEnd="url(#arrowDark)" />
          <text x="55" y="44">Open</text>
          <line x1="25" y1="160" x2="50" y2="160" stroke={COLORS.ink} markerEnd="url(#arrowDark)" />
          <text x="55" y="164">Close</text>
          <line x1="25" y1="220" x2="50" y2="220" stroke={COLORS.ink} markerEnd="url(#arrowDark)" />
          <text x="55" y="224">Low</text>
        </g>

        <text x="0" y="260" textAnchor="middle" fontFamily="serif" fontSize="14" fontWeight="700" fill={COLORS.bear}>BEARISH (Close ↓ Open)</text>
      </g>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      Anatomy of a candlestick. Notice that on a bearish (red) candle, open and close are flipped.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 2. CANDLE PATTERNS — hammer, shooting star, doji, engulfing
 * ========================================================== */
const CandlePatterns = () => {
  const Candle = ({ x, bodyTop, bodyBottom, wickTop, wickBottom, color }) => (
    <g>
      <line x1={x} y1={wickTop} x2={x} y2={wickBottom} stroke={COLORS.ink} strokeWidth="1.5" />
      <rect x={x - 9} y={bodyTop} width="18" height={bodyBottom - bodyTop} fill={color} rx="2" />
    </g>
  );

  return (
    <figure className="my-8">
      <svg viewBox="0 0 720 240" className="w-full max-w-3xl mx-auto">
        {/* HAMMER */}
        <g transform="translate(0, 0)">
          <Candle x={50} bodyTop={40} bodyBottom={70} wickTop={40} wickBottom={170} color={COLORS.bull} />
          <text x="50" y="200" textAnchor="middle" fontFamily="serif" fontSize="13" fontWeight="700">Hammer</text>
          <text x="50" y="220" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.6">Bullish reversal</text>
        </g>

        {/* SHOOTING STAR */}
        <g transform="translate(170, 0)">
          <Candle x={50} bodyTop={120} bodyBottom={150} wickTop={20} wickBottom={150} color={COLORS.bear} />
          <text x="50" y="200" textAnchor="middle" fontFamily="serif" fontSize="13" fontWeight="700">Shooting star</text>
          <text x="50" y="220" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.6">Bearish reversal</text>
        </g>

        {/* DOJI */}
        <g transform="translate(340, 0)">
          <line x1="50" y1="40" x2="50" y2="160" stroke={COLORS.ink} strokeWidth="1.5" />
          <line x1="35" y1="100" x2="65" y2="100" stroke={COLORS.ink} strokeWidth="3.5" />
          <text x="50" y="200" textAnchor="middle" fontFamily="serif" fontSize="13" fontWeight="700">Doji</text>
          <text x="50" y="220" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.6">Indecision</text>
        </g>

        {/* BULLISH ENGULFING */}
        <g transform="translate(510, 0)">
          {/* small red */}
          <Candle x={35} bodyTop={70} bodyBottom={120} wickTop={60} wickBottom={130} color={COLORS.bear} />
          {/* big green that engulfs */}
          <Candle x={70} bodyTop={50} bodyBottom={140} wickTop={40} wickBottom={150} color={COLORS.bull} />
          <text x="52" y="200" textAnchor="middle" fontFamily="serif" fontSize="13" fontWeight="700">Bullish engulfing</text>
          <text x="52" y="220" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.6">Strong reversal up</text>
        </g>
      </svg>
      <figcaption className="text-xs text-ink/55 text-center italic mt-2">
        Four classic candlestick patterns. Each tells a different story about buyer/seller pressure.
      </figcaption>
    </figure>
  );
};

/* ==========================================================
 * 3. BULL VS BEAR MARKET — trendline visualization
 * ========================================================== */
const BullVsBear = () => (
  <figure className="my-8">
    <svg viewBox="0 0 720 280" className="w-full max-w-3xl mx-auto">
      {/* BULL */}
      <g transform="translate(20, 20)">
        <rect x="0" y="0" width="320" height="200" fill={COLORS.bullLight} rx="12" />
        <text x="160" y="30" textAnchor="middle" fontFamily="serif" fontSize="18" fontWeight="800" fill={COLORS.bull}>🐂 BULL MARKET</text>
        <text x="160" y="48" textAnchor="middle" fontSize="11" fill={COLORS.ink} opacity="0.7">Sustained uptrend, optimism, rising prices</text>

        {/* Trendline going up with peaks/valleys but higher highs */}
        <polyline
          points="20,170 50,160 80,140 110,150 140,120 170,130 200,100 230,110 260,80 290,90 300,70"
          fill="none" stroke={COLORS.bull} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        />
        {/* Trendline guide */}
        <line x1="20" y1="180" x2="300" y2="80" stroke={COLORS.bull} strokeOpacity="0.4" strokeWidth="2" strokeDasharray="4 4" />
        {/* Up arrow */}
        <text x="305" y="78" fontSize="22" fill={COLORS.bull}>↗</text>
      </g>

      {/* BEAR */}
      <g transform="translate(380, 20)">
        <rect x="0" y="0" width="320" height="200" fill={COLORS.bearLight} rx="12" />
        <text x="160" y="30" textAnchor="middle" fontFamily="serif" fontSize="18" fontWeight="800" fill={COLORS.bear}>🐻 BEAR MARKET</text>
        <text x="160" y="48" textAnchor="middle" fontSize="11" fill={COLORS.ink} opacity="0.7">Sustained downtrend, pessimism, falling prices</text>

        <polyline
          points="20,80 50,90 80,110 110,100 140,130 170,120 200,150 230,140 260,170 290,160 300,180"
          fill="none" stroke={COLORS.bear} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        />
        <line x1="20" y1="70" x2="300" y2="170" stroke={COLORS.bear} strokeOpacity="0.4" strokeWidth="2" strokeDasharray="4 4" />
        <text x="305" y="184" fontSize="22" fill={COLORS.bear}>↘</text>
      </g>

      <text x="360" y="265" textAnchor="middle" fontSize="12" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        A market is "bull" when prices trend up over weeks/months, "bear" when they trend down.
      </text>
    </svg>
  </figure>
);

/* ==========================================================
 * 4. SUPPORT & RESISTANCE
 * ========================================================== */
const SupportResistance = () => (
  <figure className="my-8">
    <svg viewBox="0 0 720 320" className="w-full max-w-3xl mx-auto">
      <rect x="0" y="0" width="720" height="320" fill={COLORS.cream} rx="12" />

      {/* Resistance line */}
      <line x1="40" y1="80" x2="680" y2="80" stroke={COLORS.bear} strokeWidth="2" strokeDasharray="6 4" />
      <text x="690" y="85" fontSize="11" fontWeight="700" fill={COLORS.bear}>Resistance</text>

      {/* Support line */}
      <line x1="40" y1="240" x2="680" y2="240" stroke={COLORS.bull} strokeWidth="2" strokeDasharray="6 4" />
      <text x="690" y="245" fontSize="11" fontWeight="700" fill={COLORS.bull}>Support</text>

      {/* Price action zigzagging between support and resistance */}
      <polyline
        points="40,160 100,90 140,140 200,82 250,170 320,235 380,170 440,85 490,160 560,238 620,180 680,90"
        fill="none" stroke={COLORS.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />

      {/* Bounce annotation */}
      <circle cx="320" cy="235" r="14" fill="none" stroke={COLORS.bull} strokeWidth="2" />
      <text x="320" y="280" textAnchor="middle" fontSize="11" fill={COLORS.bull} fontWeight="700">↑ Bounces off support</text>

      <circle cx="200" cy="82" r="14" fill="none" stroke={COLORS.bear} strokeWidth="2" />
      <text x="200" y="55" textAnchor="middle" fontSize="11" fill={COLORS.bear} fontWeight="700">↓ Rejected at resistance</text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      Price tends to bounce off support (a floor) and get rejected at resistance (a ceiling) until one of them finally breaks.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 5. MOVING AVERAGE CROSSOVER — golden cross / death cross
 * ========================================================== */
const MACrossover = () => (
  <figure className="my-8">
    <svg viewBox="0 0 720 280" className="w-full max-w-3xl mx-auto">
      <rect x="0" y="0" width="720" height="280" fill={COLORS.cream} rx="12" />

      {/* Price line (gray, jittery) */}
      <polyline
        points="20,180 60,160 100,170 140,140 180,150 220,120 260,130 300,100 340,110 380,90 420,80 460,75 500,80 540,70 580,60"
        fill="none" stroke={COLORS.ash} strokeWidth="1.5" strokeOpacity="0.6"
      />

      {/* 50-day MA (smooth, blue/coral) */}
      <path
        d="M20,200 Q120,190 220,160 Q320,130 420,105 Q520,85 580,75"
        fill="none" stroke={COLORS.coral} strokeWidth="3" strokeLinecap="round"
      />
      {/* 200-day MA (smoother, ink) */}
      <path
        d="M20,210 Q150,205 280,185 Q400,160 520,130 Q580,118 600,110"
        fill="none" stroke={COLORS.ink} strokeWidth="3" strokeLinecap="round"
      />

      {/* Cross point - golden cross */}
      <circle cx="298" cy="175" r="8" fill={COLORS.sun} stroke={COLORS.ink} strokeWidth="2" />
      <text x="298" y="155" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.bull}>⭐ Golden Cross</text>
      <text x="298" y="245" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.6">50-MA crosses above 200-MA</text>

      {/* Legend */}
      <g transform="translate(40, 30)" fontFamily="ui-sans-serif, system-ui" fontSize="11">
        <line x1="0" y1="0" x2="20" y2="0" stroke={COLORS.coral} strokeWidth="3" />
        <text x="26" y="4" fontWeight="600">50-day MA</text>
        <line x1="100" y1="0" x2="120" y2="0" stroke={COLORS.ink} strokeWidth="3" />
        <text x="126" y="4" fontWeight="600">200-day MA</text>
        <line x1="220" y1="0" x2="240" y2="0" stroke={COLORS.ash} strokeWidth="1.5" />
        <text x="246" y="4" opacity="0.7">Price</text>
      </g>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      A <strong>golden cross</strong> is when the 50-day moving average crosses above the 200-day. The opposite is a <strong>death cross</strong>.
    </figcaption>
  </figure>
);

/* ==========================================================
 * Registry — add new diagrams here
 * ========================================================== */
export const VISUALS = {
  'candle-anatomy': CandleAnatomy,
  'candle-patterns': CandlePatterns,
  'bull-vs-bear': BullVsBear,
  'support-resistance': SupportResistance,
  'ma-crossover': MACrossover,
};

/* ==========================================================
 * Visual renderer — looks up by ID and renders or shows a fallback
 * ========================================================== */
export function LessonVisual({ id }) {
  const Component = VISUALS[id];
  if (!Component) {
    return (
      <div className="my-6 p-5 bg-coral-300/20 rounded-2xl text-sm text-bear-500">
        Diagram <code className="font-mono">{id}</code> not found.
      </div>
    );
  }
  return <Component />;
}
