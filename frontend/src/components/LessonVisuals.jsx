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
 * 6. STOCK OWNERSHIP — company divided into share-slices
 * ========================================================== */
const StockOwnership = () => (
  <figure className="my-8">
    <svg viewBox="0 0 600 340" className="w-full max-w-xl mx-auto">
      <rect x="0" y="0" width="600" height="340" fill={COLORS.cream} rx="12" />
      <text x="300" y="34" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        One company, divided into shares
      </text>

      <g transform="translate(220, 185)">
        {Array.from({ length: 20 }).map((_, i) => {
          const a0 = (i / 20) * 2 * Math.PI - Math.PI / 2;
          const a1 = ((i + 1) / 20) * 2 * Math.PI - Math.PI / 2;
          const r = 105;
          const x0 = Math.cos(a0) * r, y0 = Math.sin(a0) * r;
          const x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r;
          const isYou = i === 0;
          return (
            <path
              key={i}
              d={`M0,0 L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`}
              fill={isYou ? COLORS.sun : COLORS.bullLight}
              stroke={COLORS.cream}
              strokeWidth="2"
            />
          );
        })}
        <circle cx="0" cy="0" r="105" fill="none" stroke={COLORS.ink} strokeWidth="2" />
      </g>

      <line x1="370" y1="110" x2="300" y2="130" stroke={COLORS.ink} strokeWidth="1.5" />
      <text x="380" y="106" fontSize="12" fontWeight="700" fill={COLORS.ink}>Your 1 share</text>
      <text x="380" y="124" fontSize="11" fill={COLORS.ink} opacity="0.65">a real slice of</text>
      <text x="380" y="138" fontSize="11" fill={COLORS.ink} opacity="0.65">the whole business</text>

      <text x="300" y="320" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        Own 1 of 20 slices = you own 5% of the company.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      A stock is one slice of a whole company. More slices = a bigger piece of the business.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 7. MARKET FLOW — buyer / exchange / seller
 * ========================================================== */
const MarketFlow = () => (
  <figure className="my-8">
    <svg viewBox="0 0 700 280" className="w-full max-w-3xl mx-auto">
      <defs>
        <marker id="mfArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={COLORS.ink} />
        </marker>
      </defs>
      <rect x="0" y="0" width="700" height="280" fill={COLORS.cream} rx="12" />
      <text x="350" y="34" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        How a trade actually happens
      </text>

      {/* Buyer */}
      <g transform="translate(40, 90)">
        <rect x="0" y="0" width="150" height="110" rx="12" fill={COLORS.bullLight} stroke={COLORS.bull} strokeWidth="2" />
        <text x="75" y="44" textAnchor="middle" fontSize="30">🙋</text>
        <text x="75" y="74" textAnchor="middle" fontSize="13" fontWeight="700" fill={COLORS.ink}>BUYER</text>
        <text x="75" y="92" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.7">"I'll pay ₦50"</text>
      </g>

      {/* Exchange */}
      <g transform="translate(275, 80)">
        <rect x="0" y="0" width="150" height="130" rx="12" fill={COLORS.ink} />
        <text x="75" y="44" textAnchor="middle" fontSize="28">🏛️</text>
        <text x="75" y="74" textAnchor="middle" fontSize="13" fontWeight="700" fill={COLORS.cream}>THE EXCHANGE</text>
        <text x="75" y="92" textAnchor="middle" fontSize="9" fill={COLORS.sun}>matches buyers</text>
        <text x="75" y="106" textAnchor="middle" fontSize="9" fill={COLORS.sun}>with sellers</text>
      </g>

      {/* Seller */}
      <g transform="translate(510, 90)">
        <rect x="0" y="0" width="150" height="110" rx="12" fill={COLORS.bearLight} stroke={COLORS.bear} strokeWidth="2" />
        <text x="75" y="44" textAnchor="middle" fontSize="30">🙆</text>
        <text x="75" y="74" textAnchor="middle" fontSize="13" fontWeight="700" fill={COLORS.ink}>SELLER</text>
        <text x="75" y="92" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.7">"I'll sell at ₦50"</text>
      </g>

      {/* Arrows */}
      <g stroke={COLORS.ink} strokeWidth="2" fill="none">
        <path d="M195,145 L270,145" markerEnd="url(#mfArrow)" />
        <path d="M505,145 L430,145" markerEnd="url(#mfArrow)" />
      </g>

      <text x="350" y="250" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        A price only happens when a buyer and a seller agree on the same number.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      The stock exchange is a giant matchmaker — it pairs people who want to buy with people who want to sell.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 8. BID / ASK / SPREAD — the price ladder
 * ========================================================== */
const BidAskSpread = () => (
  <figure className="my-8">
    <svg viewBox="0 0 560 300" className="w-full max-w-lg mx-auto">
      <rect x="0" y="0" width="560" height="300" fill={COLORS.cream} rx="12" />
      <text x="280" y="34" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        Bid, Ask & the Spread
      </text>

      {/* Ask box (seller side) */}
      <rect x="150" y="60" width="260" height="56" rx="8" fill={COLORS.bearLight} stroke={COLORS.bear} strokeWidth="2" />
      <text x="280" y="84" textAnchor="middle" fontSize="12" fontWeight="700" fill={COLORS.bear}>ASK — ₦51.00</text>
      <text x="280" y="102" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.7">lowest price a seller will accept</text>

      {/* Spread gap */}
      <rect x="150" y="124" width="260" height="48" rx="8" fill={COLORS.sunLight} stroke={COLORS.sun} strokeWidth="2" strokeDasharray="5 3" />
      <text x="280" y="146" textAnchor="middle" fontSize="12" fontWeight="700" fill={COLORS.ink}>SPREAD = ₦1.00</text>
      <text x="280" y="163" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.7">the gap between the two</text>

      {/* Bid box (buyer side) */}
      <rect x="150" y="180" width="260" height="56" rx="8" fill={COLORS.bullLight} stroke={COLORS.bull} strokeWidth="2" />
      <text x="280" y="204" textAnchor="middle" fontSize="12" fontWeight="700" fill={COLORS.bull}>BID — ₦50.00</text>
      <text x="280" y="222" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.7">highest price a buyer will pay</text>

      <text x="280" y="270" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        A narrow spread = easy to trade. A wide spread = costly to trade.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      The bid is what buyers offer, the ask is what sellers want, and the spread is the gap between them.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 9. ORDER TYPES — market vs limit
 * ========================================================== */
const OrderTypes = () => (
  <figure className="my-8">
    <svg viewBox="0 0 700 290" className="w-full max-w-3xl mx-auto">
      <rect x="0" y="0" width="700" height="290" fill={COLORS.cream} rx="12" />

      {/* Market order */}
      <g transform="translate(30, 30)">
        <rect x="0" y="0" width="300" height="230" rx="12" fill="#FFFFFF" stroke={COLORS.ink} strokeWidth="1.5" />
        <text x="150" y="34" textAnchor="middle" fontFamily="serif" fontSize="15" fontWeight="800" fill={COLORS.ink}>MARKET ORDER</text>
        <text x="150" y="56" textAnchor="middle" fontSize="11" fill={COLORS.ink} opacity="0.7">"Buy NOW, whatever the price"</text>
        <text x="150" y="110" textAnchor="middle" fontSize="40">⚡</text>
        <text x="150" y="150" textAnchor="middle" fontSize="11" fontWeight="600" fill={COLORS.bull}>✓ Instant — fills immediately</text>
        <text x="150" y="172" textAnchor="middle" fontSize="11" fontWeight="600" fill={COLORS.bear}>✗ You don't control the exact price</text>
        <text x="150" y="206" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.6">Best when speed matters most.</text>
      </g>

      {/* Limit order */}
      <g transform="translate(370, 30)">
        <rect x="0" y="0" width="300" height="230" rx="12" fill="#FFFFFF" stroke={COLORS.ink} strokeWidth="1.5" />
        <text x="150" y="34" textAnchor="middle" fontFamily="serif" fontSize="15" fontWeight="800" fill={COLORS.ink}>LIMIT ORDER</text>
        <text x="150" y="56" textAnchor="middle" fontSize="11" fill={COLORS.ink} opacity="0.7">"Only buy if price hits ₦48"</text>
        <text x="150" y="110" textAnchor="middle" fontSize="40">🎯</text>
        <text x="150" y="150" textAnchor="middle" fontSize="11" fontWeight="600" fill={COLORS.bull}>✓ You control the exact price</text>
        <text x="150" y="172" textAnchor="middle" fontSize="11" fontWeight="600" fill={COLORS.bear}>✗ May never fill if price never gets there</text>
        <text x="150" y="206" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.6">Best when price matters most.</text>
      </g>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      A market order trades speed for price control. A limit order trades certainty for a better price.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 10. CAPITAL GAIN — buy low, sell high
 * ========================================================== */
const CapitalGain = () => (
  <figure className="my-8">
    <svg viewBox="0 0 680 320" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="680" height="320" fill={COLORS.cream} rx="12" />
      <text x="340" y="34" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        How a capital gain works
      </text>

      {/* price line rising */}
      <polyline
        points="80,230 160,220 240,200 320,205 400,170 480,150 560,120 600,100"
        fill="none" stroke={COLORS.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />

      {/* Buy point */}
      <circle cx="160" cy="220" r="9" fill={COLORS.bull} stroke={COLORS.ink} strokeWidth="2" />
      <text x="160" y="252" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.bull}>BUY</text>
      <text x="160" y="268" textAnchor="middle" fontSize="11" fill={COLORS.ink} opacity="0.7">at ₦100</text>

      {/* Sell point */}
      <circle cx="560" cy="120" r="9" fill={COLORS.coral} stroke={COLORS.ink} strokeWidth="2" />
      <text x="560" y="104" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.coral}>SELL</text>
      <text x="560" y="90" textAnchor="middle" fontSize="11" fill={COLORS.ink} opacity="0.7">at ₦160</text>

      {/* Gain bracket */}
      <line x1="620" y1="120" x2="620" y2="220" stroke={COLORS.bull} strokeWidth="2" />
      <line x1="615" y1="120" x2="625" y2="120" stroke={COLORS.bull} strokeWidth="2" />
      <line x1="615" y1="220" x2="625" y2="220" stroke={COLORS.bull} strokeWidth="2" />
      <text x="635" y="165" fontSize="13" fontWeight="800" fill={COLORS.bull}>+₦60</text>
      <text x="635" y="182" fontSize="10" fill={COLORS.ink} opacity="0.65">capital</text>
      <text x="635" y="195" fontSize="10" fill={COLORS.ink} opacity="0.65">gain</text>

      <text x="340" y="300" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        A capital gain is simply the profit: sell price minus buy price.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      Buy a share, hold it while the business grows, sell it for more — the difference is your capital gain.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 11. DIVIDEND FLOW — company profit shared with shareholders
 * ========================================================== */
const DividendFlow = () => (
  <figure className="my-8">
    <svg viewBox="0 0 680 300" className="w-full max-w-2xl mx-auto">
      <defs>
        <marker id="divArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={COLORS.bull} />
        </marker>
      </defs>
      <rect x="0" y="0" width="680" height="300" fill={COLORS.cream} rx="12" />
      <text x="340" y="34" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        Where a dividend comes from
      </text>

      {/* Company */}
      <g transform="translate(60, 90)">
        <rect x="0" y="0" width="170" height="120" rx="12" fill={COLORS.ink} />
        <text x="85" y="44" textAnchor="middle" fontSize="28">🏢</text>
        <text x="85" y="74" textAnchor="middle" fontSize="12" fontWeight="700" fill={COLORS.cream}>THE COMPANY</text>
        <text x="85" y="92" textAnchor="middle" fontSize="9" fill={COLORS.sun}>makes a profit</text>
      </g>

      {/* Profit split */}
      <g transform="translate(280, 80)">
        <rect x="0" y="0" width="150" height="60" rx="10" fill={COLORS.sunLight} stroke={COLORS.sun} strokeWidth="2" />
        <text x="75" y="26" textAnchor="middle" fontSize="10" fontWeight="700" fill={COLORS.ink}>KEPT to grow</text>
        <text x="75" y="44" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.7">reinvested in business</text>

        <rect x="0" y="78" width="150" height="60" rx="10" fill={COLORS.bullLight} stroke={COLORS.bull} strokeWidth="2" />
        <text x="75" y="104" textAnchor="middle" fontSize="10" fontWeight="700" fill={COLORS.bull}>PAID OUT</text>
        <text x="75" y="122" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.7">as dividends</text>
      </g>

      {/* Shareholder */}
      <g transform="translate(490, 90)">
        <rect x="0" y="0" width="150" height="120" rx="12" fill={COLORS.bullLight} stroke={COLORS.bull} strokeWidth="2" />
        <text x="75" y="44" textAnchor="middle" fontSize="28">🙋</text>
        <text x="75" y="74" textAnchor="middle" fontSize="12" fontWeight="700" fill={COLORS.ink}>YOU</text>
        <text x="75" y="92" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.7">receive cash</text>
      </g>

      {/* Arrows */}
      <path d="M232,150 L278,140" fill="none" stroke={COLORS.ink} strokeWidth="2" markerEnd="url(#divArrow)" />
      <path d="M432,148 L488,150" fill="none" stroke={COLORS.bull} strokeWidth="2.5" markerEnd="url(#divArrow)" />

      <text x="340" y="278" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        A dividend is your share of the company''s profit, paid to you in cash.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      Profitable companies often split earnings: some is reinvested, some is paid to shareholders as dividends.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 12. COMPOUNDING — the snowball growth curve
 * ========================================================== */
const Compounding = () => (
  <figure className="my-8">
    <svg viewBox="0 0 680 320" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="680" height="320" fill={COLORS.cream} rx="12" />
      <text x="340" y="34" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        Compounding: slow start, steep finish
      </text>

      {/* axes */}
      <line x1="70" y1="260" x2="620" y2="260" stroke={COLORS.ink} strokeWidth="1.5" />
      <line x1="70" y1="60" x2="70" y2="260" stroke={COLORS.ink} strokeWidth="1.5" />

      {/* straight line — saving without growth */}
      <line x1="70" y1="260" x2="620" y2="200" stroke={COLORS.ash} strokeWidth="2" strokeDasharray="5 4" />
      <text x="500" y="195" fontSize="10" fill={COLORS.ash} fontWeight="600">Simple saving</text>

      {/* compounding curve */}
      <path
        d="M70,260 Q280,250 400,210 Q520,165 620,75"
        fill="none" stroke={COLORS.bull} strokeWidth="3.5" strokeLinecap="round"
      />
      <text x="470" y="120" fontSize="11" fill={COLORS.bull} fontWeight="700">Compounding</text>

      {/* year markers */}
      <g fontFamily="ui-sans-serif, system-ui" fontSize="10" fill={COLORS.ink} opacity="0.6" textAnchor="middle">
        <text x="70" y="278">Year 0</text>
        <text x="345" y="278">Year 15</text>
        <text x="620" y="278">Year 30</text>
      </g>

      {/* highlight the steep part */}
      <circle cx="620" cy="75" r="7" fill={COLORS.sun} stroke={COLORS.ink} strokeWidth="2" />

      <text x="340" y="305" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        Your gains start earning their own gains — growth accelerates over time.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      Compounding feels slow at first, then accelerates. The longer you stay invested, the steeper the curve.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 13. TOTAL RETURN — capital gain + dividends combined
 * ========================================================== */
const TotalReturn = () => (
  <figure className="my-8">
    <svg viewBox="0 0 600 300" className="w-full max-w-lg mx-auto">
      <rect x="0" y="0" width="600" height="300" fill={COLORS.cream} rx="12" />
      <text x="300" y="34" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        Total Return = two sources of profit
      </text>

      {/* Stacked bar */}
      <g transform="translate(220, 70)">
        {/* dividends portion */}
        <rect x="0" y="110" width="160" height="60" fill={COLORS.bull} rx="4" />
        <text x="80" y="146" textAnchor="middle" fontSize="12" fontWeight="700" fill="#FFFFFF">Dividends</text>

        {/* capital gain portion */}
        <rect x="0" y="0" width="160" height="105" fill={COLORS.sun} rx="4" />
        <text x="80" y="56" textAnchor="middle" fontSize="12" fontWeight="700" fill={COLORS.ink}>Capital gain</text>

        {/* total bracket */}
        <line x1="180" y1="0" x2="180" y2="170" stroke={COLORS.ink} strokeWidth="2" />
        <line x1="175" y1="0" x2="185" y2="0" stroke={COLORS.ink} strokeWidth="2" />
        <line x1="175" y1="170" x2="185" y2="170" stroke={COLORS.ink} strokeWidth="2" />
        <text x="195" y="80" fontSize="13" fontWeight="800" fill={COLORS.ink}>TOTAL</text>
        <text x="195" y="98" fontSize="13" fontWeight="800" fill={COLORS.ink}>RETURN</text>
      </g>

      <text x="300" y="280" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        Your real profit is the price gain AND the dividends — added together.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      Total return counts both ways a stock pays you: the rising price and the dividends received.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 14. INCOME STATEMENT — the waterfall from revenue to profit
 * ========================================================== */
const IncomeStatement = () => (
  <figure className="my-8">
    <svg viewBox="0 0 640 340" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="640" height="340" fill={COLORS.cream} rx="12" />
      <text x="320" y="34" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        Income Statement: from revenue down to profit
      </text>

      {/* Bars shrinking downward like a waterfall */}
      <g fontFamily="ui-sans-serif, system-ui">
        {/* Revenue */}
        <rect x="120" y="60" width="400" height="38" rx="4" fill={COLORS.bull} />
        <text x="320" y="84" textAnchor="middle" fontSize="12" fontWeight="700" fill="#FFFFFF">REVENUE — total sales (₦100)</text>

        {/* minus COGS */}
        <rect x="120" y="110" width="300" height="38" rx="4" fill={COLORS.sun} />
        <text x="270" y="134" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.ink}>Gross Profit (₦60)</text>
        <text x="445" y="134" fontSize="9" fill={COLORS.bear} fontWeight="600">− cost of goods</text>

        {/* minus operating costs */}
        <rect x="120" y="160" width="200" height="38" rx="4" fill={COLORS.coral} />
        <text x="220" y="184" textAnchor="middle" fontSize="11" fontWeight="700" fill="#FFFFFF">Operating Profit (₦35)</text>
        <text x="345" y="184" fontSize="9" fill={COLORS.bear} fontWeight="600">− running costs</text>

        {/* minus tax/interest = net */}
        <rect x="120" y="210" width="120" height="38" rx="4" fill={COLORS.ink} />
        <text x="180" y="234" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.sun}>Net Profit (₦22)</text>
        <text x="265" y="234" fontSize="9" fill={COLORS.bear} fontWeight="600">− tax &amp; interest</text>
      </g>

      <text x="320" y="290" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        Each step subtracts a cost. What survives at the bottom is the real profit.
      </text>
      <text x="320" y="312" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.ink}>
        Top line = Revenue. Bottom line = Net Profit.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      An income statement is a staircase: start with all sales, subtract costs step by step, and see what profit remains.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 15. THREE STATEMENTS — income / balance sheet / cash flow
 * ========================================================== */
const ThreeStatements = () => (
  <figure className="my-8">
    <svg viewBox="0 0 700 280" className="w-full max-w-3xl mx-auto">
      <rect x="0" y="0" width="700" height="280" fill={COLORS.cream} rx="12" />
      <text x="350" y="34" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        The three financial statements
      </text>

      {/* Income statement */}
      <g transform="translate(40, 70)">
        <rect x="0" y="0" width="190" height="150" rx="12" fill={COLORS.bullLight} stroke={COLORS.bull} strokeWidth="2" />
        <text x="95" y="40" textAnchor="middle" fontSize="30">📈</text>
        <text x="95" y="74" textAnchor="middle" fontSize="12" fontWeight="800" fill={COLORS.ink}>INCOME STATEMENT</text>
        <text x="95" y="98" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.7">Did it make a profit?</text>
        <text x="95" y="118" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.6">Revenue, costs, net profit</text>
      </g>

      {/* Balance sheet */}
      <g transform="translate(255, 70)">
        <rect x="0" y="0" width="190" height="150" rx="12" fill={COLORS.sunLight} stroke={COLORS.sun} strokeWidth="2" />
        <text x="95" y="40" textAnchor="middle" fontSize="30">⚖️</text>
        <text x="95" y="74" textAnchor="middle" fontSize="12" fontWeight="800" fill={COLORS.ink}>BALANCE SHEET</text>
        <text x="95" y="98" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.7">What does it own &amp; owe?</text>
        <text x="95" y="118" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.6">Assets, liabilities, equity</text>
      </g>

      {/* Cash flow */}
      <g transform="translate(470, 70)">
        <rect x="0" y="0" width="190" height="150" rx="12" fill={COLORS.bearLight} stroke={COLORS.coral} strokeWidth="2" />
        <text x="95" y="40" textAnchor="middle" fontSize="30">💵</text>
        <text x="95" y="74" textAnchor="middle" fontSize="12" fontWeight="800" fill={COLORS.ink}>CASH FLOW</text>
        <text x="95" y="98" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.7">Is real cash coming in?</text>
        <text x="95" y="118" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.6">Cash in vs cash out</text>
      </g>

      <text x="350" y="258" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        Read all three together — each answers a different question about the business.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      Every public company publishes these three reports. Together they tell the full financial story.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 16. P/E RATIO — price tag vs earnings
 * ========================================================== */
const PERatio = () => (
  <figure className="my-8">
    <svg viewBox="0 0 660 300" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="660" height="300" fill={COLORS.cream} rx="12" />
      <text x="330" y="34" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        P/E Ratio — how many years of profit you pay for
      </text>

      {/* Cheap stock */}
      <g transform="translate(70, 70)">
        <rect x="0" y="0" width="220" height="160" rx="12" fill="#FFFFFF" stroke={COLORS.bull} strokeWidth="2" />
        <text x="110" y="36" textAnchor="middle" fontSize="13" fontWeight="800" fill={COLORS.bull}>LOWER P/E</text>
        <text x="110" y="76" textAnchor="middle" fontSize="34" fontWeight="800" fill={COLORS.ink}>P/E = 8</text>
        <text x="110" y="104" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.7">Price ₦80 ÷ Earnings ₦10</text>
        <text x="110" y="130" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.7">"Paying 8 years of profit"</text>
        <text x="110" y="148" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.55">Often cheaper — but check why</text>
      </g>

      {/* Expensive stock */}
      <g transform="translate(370, 70)">
        <rect x="0" y="0" width="220" height="160" rx="12" fill="#FFFFFF" stroke={COLORS.coral} strokeWidth="2" />
        <text x="110" y="36" textAnchor="middle" fontSize="13" fontWeight="800" fill={COLORS.coral}>HIGHER P/E</text>
        <text x="110" y="76" textAnchor="middle" fontSize="34" fontWeight="800" fill={COLORS.ink}>P/E = 40</text>
        <text x="110" y="104" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.7">Price ₦400 ÷ Earnings ₦10</text>
        <text x="110" y="130" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.7">"Paying 40 years of profit"</text>
        <text x="110" y="148" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.55">Pricey — only worth it if growth is fast</text>
      </g>

      <text x="330" y="270" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        P/E = share price ÷ earnings per share. It is a clue, never a verdict on its own.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      The P/E ratio shows how expensive a stock is relative to the profit it makes.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 17. CASH vs PROFIT — why they are not the same
 * ========================================================== */
const CashVsProfit = () => (
  <figure className="my-8">
    <svg viewBox="0 0 660 290" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="660" height="290" fill={COLORS.cream} rx="12" />
      <text x="330" y="34" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        Profit on paper vs cash in hand
      </text>

      {/* Profit side */}
      <g transform="translate(60, 70)">
        <rect x="0" y="0" width="240" height="150" rx="12" fill={COLORS.sunLight} stroke={COLORS.sun} strokeWidth="2" />
        <text x="120" y="40" textAnchor="middle" fontSize="30">📝</text>
        <text x="120" y="72" textAnchor="middle" fontSize="12" fontWeight="800" fill={COLORS.ink}>PROFIT (on paper)</text>
        <text x="120" y="98" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.75">"We sold ₦1m of goods"</text>
        <text x="120" y="120" textAnchor="middle" fontSize="9" fill={COLORS.bear} opacity="0.8">…but customers haven''t paid yet</text>
      </g>

      {/* Cash side */}
      <g transform="translate(360, 70)">
        <rect x="0" y="0" width="240" height="150" rx="12" fill={COLORS.bullLight} stroke={COLORS.bull} strokeWidth="2" />
        <text x="120" y="40" textAnchor="middle" fontSize="30">💰</text>
        <text x="120" y="72" textAnchor="middle" fontSize="12" fontWeight="800" fill={COLORS.ink}>CASH (real money)</text>
        <text x="120" y="98" textAnchor="middle" fontSize="10" fill={COLORS.ink} opacity="0.75">Money actually in the bank</text>
        <text x="120" y="120" textAnchor="middle" fontSize="9" fill={COLORS.bull} opacity="0.85">This is what pays bills &amp; survives</text>
      </g>

      <text x="330" y="262" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        A company can show "profit" yet run out of cash. Cash is the harder, more honest number.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      Profit is an accounting figure. Cash flow is real money. Smart investors check both.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 18. ECONOMIC MOAT — a business protected like a castle
 * ========================================================== */
const EconomicMoat = () => (
  <figure className="my-8">
    <svg viewBox="0 0 600 320" className="w-full max-w-lg mx-auto">
      <rect x="0" y="0" width="600" height="320" fill={COLORS.cream} rx="12" />
      <text x="300" y="34" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        An economic moat protects a business
      </text>

      {/* Moat ring */}
      <ellipse cx="300" cy="185" rx="200" ry="95" fill="none" stroke={COLORS.bull} strokeWidth="14" strokeOpacity="0.35" />
      <text x="300" y="295" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.bull}>THE MOAT — keeps competitors out</text>

      {/* Castle */}
      <g transform="translate(240, 120)">
        <rect x="0" y="40" width="120" height="80" fill={COLORS.ink} />
        <rect x="0" y="20" width="22" height="22" fill={COLORS.ink} />
        <rect x="49" y="20" width="22" height="22" fill={COLORS.ink} />
        <rect x="98" y="20" width="22" height="22" fill={COLORS.ink} />
        <rect x="45" y="78" width="30" height="42" fill={COLORS.sun} />
        <text x="60" y="14" textAnchor="middle" fontSize="20">🏰</text>
      </g>
      <text x="300" y="170" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.cream}>THE BUSINESS</text>

      {/* Attackers kept out */}
      <text x="70" y="190" textAnchor="middle" fontSize="22">⚔️</text>
      <text x="70" y="212" textAnchor="middle" fontSize="9" fill={COLORS.bear} fontWeight="600">competitors</text>
      <text x="530" y="190" textAnchor="middle" fontSize="22">⚔️</text>
      <text x="530" y="212" textAnchor="middle" fontSize="9" fill={COLORS.bear} fontWeight="600">competitors</text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      A moat is any lasting advantage — a strong brand, lower costs, a network — that keeps rivals from stealing profits.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 19. TREND STRUCTURE — higher highs vs lower lows
 * ========================================================== */
const TrendStructure = () => (
  <figure className="my-8">
    <svg viewBox="0 0 700 300" className="w-full max-w-3xl mx-auto">
      <rect x="0" y="0" width="700" height="300" fill={COLORS.cream} rx="12" />
      <text x="350" y="32" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        How to read a trend
      </text>

      {/* Uptrend */}
      <g transform="translate(20, 50)">
        <text x="155" y="14" textAnchor="middle" fontSize="12" fontWeight="700" fill={COLORS.bull}>UPTREND — higher highs &amp; higher lows</text>
        <polyline
          points="20,160 60,110 90,135 130,80 160,105 200,50 230,75 280,30"
          fill="none" stroke={COLORS.bull} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="60" cy="110" r="4" fill={COLORS.bull} />
        <circle cx="130" cy="80" r="4" fill={COLORS.bull} />
        <circle cx="200" cy="50" r="4" fill={COLORS.bull} />
        <circle cx="90" cy="135" r="4" fill={COLORS.ink} />
        <circle cx="160" cy="105" r="4" fill={COLORS.ink} />
        <text x="200" y="42" fontSize="9" fill={COLORS.bull} fontWeight="700" textAnchor="middle">higher high</text>
        <text x="160" y="122" fontSize="9" fill={COLORS.ink} opacity="0.7" textAnchor="middle">higher low</text>
      </g>

      {/* Downtrend */}
      <g transform="translate(370, 50)">
        <text x="155" y="14" textAnchor="middle" fontSize="12" fontWeight="700" fill={COLORS.bear}>DOWNTREND — lower highs &amp; lower lows</text>
        <polyline
          points="20,40 60,90 90,65 130,120 160,95 200,150 230,125 280,170"
          fill="none" stroke={COLORS.bear} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="60" cy="90" r="4" fill={COLORS.bear} />
        <circle cx="130" cy="120" r="4" fill={COLORS.bear} />
        <circle cx="200" cy="150" r="4" fill={COLORS.bear} />
        <circle cx="90" cy="65" r="4" fill={COLORS.ink} />
        <circle cx="160" cy="95" r="4" fill={COLORS.ink} />
        <text x="90" y="56" fontSize="9" fill={COLORS.ink} opacity="0.7" textAnchor="middle">lower high</text>
        <text x="200" y="166" fontSize="9" fill={COLORS.bear} fontWeight="700" textAnchor="middle">lower low</text>
      </g>

      <text x="350" y="285" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        A trend is just a staircase: stepping up, stepping down, or going sideways.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      An uptrend makes higher highs and higher lows. A downtrend makes lower highs and lower lows.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 20. VOLUME — bars under price showing conviction
 * ========================================================== */
const VolumeBars = () => (
  <figure className="my-8">
    <svg viewBox="0 0 680 320" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="680" height="320" fill={COLORS.cream} rx="12" />
      <text x="340" y="32" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        Volume = how many people are trading
      </text>

      {/* Price line */}
      <polyline
        points="60,150 130,130 200,140 270,90 340,100 410,70 480,140 550,150 610,120"
        fill="none" stroke={COLORS.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <text x="60" y="60" fontSize="10" fill={COLORS.ink} opacity="0.6" fontWeight="600">Price</text>

      {/* Big move with big volume — highlighted */}
      <circle cx="410" cy="70" r="9" fill="none" stroke={COLORS.bull} strokeWidth="2" />
      <text x="410" y="50" textAnchor="middle" fontSize="9" fill={COLORS.bull} fontWeight="700">strong move</text>

      {/* Volume bars */}
      <g>
        {[
          { x: 60,  h: 30, big: false },
          { x: 130, h: 38, big: false },
          { x: 200, h: 26, big: false },
          { x: 270, h: 60, big: true },
          { x: 340, h: 34, big: false },
          { x: 410, h: 78, big: true },
          { x: 480, h: 30, big: false },
          { x: 550, h: 22, big: false },
          { x: 610, h: 40, big: false },
        ].map((b, i) => (
          <rect key={i} x={b.x - 14} y={270 - b.h} width="28" height={b.h}
            fill={b.big ? COLORS.bull : COLORS.ash} fillOpacity={b.big ? 0.85 : 0.45} rx="2" />
        ))}
      </g>
      <line x1="40" y1="270" x2="640" y2="270" stroke={COLORS.ink} strokeWidth="1.5" />
      <text x="60" y="292" fontSize="10" fill={COLORS.ink} opacity="0.6" fontWeight="600">Volume</text>

      <text x="410" y="306" textAnchor="middle" fontSize="10" fill={COLORS.bull} fontWeight="700">tall bar = strong conviction</text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      A price move on high volume has real conviction behind it. The same move on low volume is weak and easily reversed.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 21. RSI — overbought / oversold meter
 * ========================================================== */
const RSIMeter = () => (
  <figure className="my-8">
    <svg viewBox="0 0 600 300" className="w-full max-w-lg mx-auto">
      <rect x="0" y="0" width="600" height="300" fill={COLORS.cream} rx="12" />
      <text x="300" y="32" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        RSI — a 0 to 100 momentum gauge
      </text>

      {/* The bar */}
      <defs>
        <linearGradient id="rsiGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={COLORS.bull} />
          <stop offset="50%" stopColor={COLORS.sun} />
          <stop offset="100%" stopColor={COLORS.bear} />
        </linearGradient>
      </defs>
      <rect x="80" y="120" width="440" height="44" rx="8" fill="url(#rsiGrad)" />

      {/* Zone markers */}
      <line x1="80" y1="110" x2="80" y2="174" stroke={COLORS.ink} strokeWidth="1.5" />
      <line x1="212" y1="110" x2="212" y2="174" stroke={COLORS.ink} strokeWidth="1.5" />
      <line x1="388" y1="110" x2="388" y2="174" stroke={COLORS.ink} strokeWidth="1.5" />
      <line x1="520" y1="110" x2="520" y2="174" stroke={COLORS.ink} strokeWidth="1.5" />

      <text x="80" y="104" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.ink}>0</text>
      <text x="212" y="104" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.ink}>30</text>
      <text x="388" y="104" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.ink}>70</text>
      <text x="520" y="104" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.ink}>100</text>

      {/* Labels under */}
      <text x="146" y="200" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.bull}>OVERSOLD</text>
      <text x="146" y="216" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.65">below 30</text>
      <text x="300" y="200" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.ink}>NEUTRAL</text>
      <text x="300" y="216" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.65">30 – 70</text>
      <text x="454" y="200" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.bear}>OVERBOUGHT</text>
      <text x="454" y="216" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.65">above 70</text>

      <text x="300" y="262" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.6">
        ⚠️ "Overbought" does NOT mean "sell now." Strong stocks can stay overbought for a long time.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      RSI hints whether a stock has moved up or down very fast recently — a clue about momentum, not a buy/sell command.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 22. BREAKOUT — price escaping a level
 * ========================================================== */
const Breakout = () => (
  <figure className="my-8">
    <svg viewBox="0 0 680 300" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="680" height="300" fill={COLORS.cream} rx="12" />
      <text x="340" y="32" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        A breakout — price escaping resistance
      </text>

      {/* Resistance line */}
      <line x1="50" y1="110" x2="630" y2="110" stroke={COLORS.bear} strokeWidth="2" strokeDasharray="6 4" />
      <text x="58" y="102" fontSize="10" fontWeight="700" fill={COLORS.bear}>Resistance — repeatedly rejected here</text>

      {/* Price tests the level several times, then breaks out */}
      <polyline
        points="50,200 110,118 150,180 220,116 270,190 340,114 390,175 440,112 470,95 530,70 580,85 630,55"
        fill="none" stroke={COLORS.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />

      {/* Rejection circles */}
      <circle cx="110" cy="118" r="9" fill="none" stroke={COLORS.bear} strokeWidth="2" />
      <circle cx="220" cy="116" r="9" fill="none" stroke={COLORS.bear} strokeWidth="2" />
      <circle cx="340" cy="114" r="9" fill="none" stroke={COLORS.bear} strokeWidth="2" />

      {/* Breakout point */}
      <circle cx="470" cy="95" r="11" fill={COLORS.sun} stroke={COLORS.ink} strokeWidth="2" />
      <text x="470" y="78" textAnchor="middle" fontSize="11" fontWeight="800" fill={COLORS.bull}>BREAKOUT ↑</text>
      <text x="540" y="50" fontSize="9" fill={COLORS.bull} fontWeight="700">price escapes &amp; runs</text>

      <text x="340" y="275" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        A breakout that holds — ideally on high volume — can signal a new move. But false breakouts are common.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      A breakout is when price finally pushes through a level it was stuck under. Strong volume makes it more believable.
    </figcaption>
  </figure>
);
/* ==========================================================
 * 23. POSITION SIZING — never bet too much on one trade
 * ========================================================== */
const PositionSizing = () => (
  <figure className="my-8">
    <svg viewBox="0 0 640 300" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="640" height="300" fill={COLORS.cream} rx="12" />
      <text x="320" y="34" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        Position sizing — how much to put in one stock
      </text>

      {/* Whole portfolio bar */}
      <text x="60" y="78" fontSize="11" fontWeight="700" fill={COLORS.ink}>Your whole portfolio (₦100,000)</text>
      <rect x="60" y="88" width="520" height="44" rx="6" fill={COLORS.ash} fillOpacity="0.35" stroke={COLORS.ink} strokeWidth="1" />

      {/* Safe single position */}
      <rect x="60" y="88" width="52" height="44" rx="6" fill={COLORS.bull} />
      <text x="86" y="115" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFFFF">10%</text>
      <text x="86" y="152" textAnchor="middle" fontSize="9" fill={COLORS.bull} fontWeight="700">One stock</text>
      <text x="86" y="166" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.6">safer slice</text>

      {/* Danger position */}
      <text x="320" y="210" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.bear}>❌ Putting it ALL in one stock</text>
      <rect x="60" y="222" width="520" height="40" rx="6" fill={COLORS.bear} fillOpacity="0.8" />
      <text x="320" y="247" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFFFF">100% in one stock — one bad call wipes you out</text>

      <text x="320" y="284" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        Keeping each position small means no single mistake can destroy you.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      Position sizing decides how much of your money goes into any one stock. Small slices survive mistakes.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 24. STOP LOSS — a pre-set exit to cap the damage
 * ========================================================== */
const StopLoss = () => (
  <figure className="my-8">
    <svg viewBox="0 0 660 300" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="660" height="300" fill={COLORS.cream} rx="12" />
      <text x="330" y="32" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        A stop-loss caps how much you can lose
      </text>

      {/* Buy line */}
      <line x1="60" y1="90" x2="600" y2="90" stroke={COLORS.ink} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="66" y="84" fontSize="10" fontWeight="700" fill={COLORS.ink}>You buy here — ₦100</text>

      {/* Stop-loss line */}
      <line x1="60" y1="190" x2="600" y2="190" stroke={COLORS.bear} strokeWidth="2" />
      <text x="66" y="184" fontSize="10" fontWeight="700" fill={COLORS.bear}>Stop-loss set here — ₦90 (sell automatically)</text>

      {/* Price path that falls */}
      <polyline
        points="120,90 180,75 240,110 300,130 360,160 410,190"
        fill="none" stroke={COLORS.ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Triggered point */}
      <circle cx="410" cy="190" r="9" fill={COLORS.bear} stroke={COLORS.ink} strokeWidth="2" />
      <text x="430" y="194" fontSize="10" fontWeight="700" fill={COLORS.bear}>SOLD — loss stopped at 10%</text>

      {/* What could have happened */}
      <polyline
        points="410,190 470,225 530,250 580,265"
        fill="none" stroke={COLORS.ash} strokeWidth="2" strokeDasharray="5 4" />
      <text x="500" y="285" fontSize="9" fill={COLORS.ash} fontWeight="600" textAnchor="middle">…where it went without a stop</text>

      <text x="330" y="62" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        You decide your maximum loss in advance — before emotion takes over.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      A stop-loss is a price where you have decided, in advance, to sell and accept a small loss.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 25. DIVERSIFICATION — don't put all eggs in one basket
 * ========================================================== */
const Diversification = () => (
  <figure className="my-8">
    <svg viewBox="0 0 660 310" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="660" height="310" fill={COLORS.cream} rx="12" />
      <text x="330" y="32" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        Diversification — spread the risk
      </text>

      {/* One basket */}
      <g transform="translate(70, 60)">
        <text x="110" y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.bear}>❌ One basket</text>
        <ellipse cx="110" cy="120" rx="90" ry="36" fill={COLORS.bear} fillOpacity="0.18" stroke={COLORS.bear} strokeWidth="2" />
        <text x="110" y="100" textAnchor="middle" fontSize="34">🥚🥚🥚</text>
        <text x="110" y="170" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.7">Drop it — everything breaks</text>
      </g>

      {/* Many baskets */}
      <g transform="translate(360, 60)">
        <text x="120" y="14" textAnchor="middle" fontSize="11" fontWeight="700" fill={COLORS.bull}>✅ Many baskets</text>
        <ellipse cx="40" cy="80" rx="34" ry="20" fill={COLORS.bull} fillOpacity="0.18" stroke={COLORS.bull} strokeWidth="2" />
        <text x="40" y="86" textAnchor="middle" fontSize="16">🥚</text>
        <ellipse cx="120" cy="80" rx="34" ry="20" fill={COLORS.bull} fillOpacity="0.18" stroke={COLORS.bull} strokeWidth="2" />
        <text x="120" y="86" textAnchor="middle" fontSize="16">🥚</text>
        <ellipse cx="200" cy="80" rx="34" ry="20" fill={COLORS.bull} fillOpacity="0.18" stroke={COLORS.bull} strokeWidth="2" />
        <text x="200" y="86" textAnchor="middle" fontSize="16">🥚</text>
        <ellipse cx="80" cy="140" rx="34" ry="20" fill={COLORS.bull} fillOpacity="0.18" stroke={COLORS.bull} strokeWidth="2" />
        <text x="80" y="146" textAnchor="middle" fontSize="16">🥚</text>
        <ellipse cx="160" cy="140" rx="34" ry="20" fill={COLORS.bull} fillOpacity="0.18" stroke={COLORS.bull} strokeWidth="2" />
        <text x="160" y="146" textAnchor="middle" fontSize="16">🥚</text>
        <text x="120" y="180" textAnchor="middle" fontSize="9" fill={COLORS.ink} opacity="0.7">Drop one — the rest are safe</text>
      </g>

      <text x="330" y="280" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.55">
        Spreading money across many stocks and sectors means no single failure ruins you.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      Diversification spreads your money so one company''s collapse can''t take down your whole portfolio.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 26. RISK-REWARD RATIO — is the trade worth it?
 * ========================================================== */
const RiskReward = () => (
  <figure className="my-8">
    <svg viewBox="0 0 600 300" className="w-full max-w-lg mx-auto">
      <rect x="0" y="0" width="600" height="300" fill={COLORS.cream} rx="12" />
      <text x="300" y="32" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        Risk vs Reward — weigh both sides
      </text>

      {/* Risk bar */}
      <text x="80" y="110" fontSize="11" fontWeight="700" fill={COLORS.bear}>RISK</text>
      <rect x="150" y="92" width="100" height="34" rx="5" fill={COLORS.bear} />
      <text x="200" y="114" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFFFF">₦10 down</text>

      {/* Reward bar */}
      <text x="80" y="180" fontSize="11" fontWeight="700" fill={COLORS.bull}>REWARD</text>
      <rect x="150" y="162" width="300" height="34" rx="5" fill={COLORS.bull} />
      <text x="300" y="184" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFFFF">₦30 up</text>

      {/* Ratio */}
      <text x="300" y="240" textAnchor="middle" fontSize="14" fontWeight="800" fill={COLORS.ink}>
        Risk-Reward = 1 : 3
      </text>
      <text x="300" y="266" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.6">
        Risking ₦10 to possibly make ₦30 — a favourable trade.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      Before any trade, compare what you could lose against what you could gain. Favour trades where reward outweighs risk.
    </figcaption>
  </figure>
);

/* ==========================================================
 * 27. EMOTION CYCLE — fear and greed through the market
 * ========================================================== */
const EmotionCycle = () => (
  <figure className="my-8">
    <svg viewBox="0 0 680 320" className="w-full max-w-2xl mx-auto">
      <rect x="0" y="0" width="680" height="320" fill={COLORS.cream} rx="12" />
      <text x="340" y="32" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="800" fill={COLORS.ink}>
        The emotional rollercoaster of investing
      </text>

      {/* Price curve — rise then fall */}
      <path d="M60,230 Q180,90 340,70 Q500,90 620,250"
        fill="none" stroke={COLORS.ink} strokeWidth="2.5" strokeLinecap="round" />

      {/* Emotion markers */}
      <circle cx="120" cy="190" r="6" fill={COLORS.bull} />
      <text x="120" y="178" textAnchor="middle" fontSize="9" fill={COLORS.ink} fontWeight="600">Optimism</text>

      <circle cx="340" cy="70" r="7" fill={COLORS.bear} />
      <text x="340" y="58" textAnchor="middle" fontSize="10" fill={COLORS.bear} fontWeight="800">GREED 🤑 — "buy more!"</text>
      <text x="340" y="92" textAnchor="middle" fontSize="8" fill={COLORS.ink} opacity="0.6">danger: buying at the top</text>

      <circle cx="560" cy="200" r="7" fill={COLORS.bear} />
      <text x="560" y="225" textAnchor="middle" fontSize="10" fill={COLORS.bear} fontWeight="800">FEAR 😱 — "sell now!"</text>
      <text x="560" y="240" textAnchor="middle" fontSize="8" fill={COLORS.ink} opacity="0.6">danger: selling at the bottom</text>

      <text x="340" y="298" textAnchor="middle" fontSize="11" fontStyle="italic" fill={COLORS.ink} opacity="0.6">
        Most people feel greediest at the top and most fearful at the bottom — the exact opposite of good timing.
      </text>
    </svg>
    <figcaption className="text-xs text-ink/55 text-center italic mt-2">
      Emotions push investors to buy high (greed) and sell low (fear). Recognising the cycle is how you resist it.
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
  'stock-ownership': StockOwnership,
  'market-flow': MarketFlow,
  'bid-ask-spread': BidAskSpread,
  'order-types': OrderTypes,
  'capital-gain': CapitalGain,
  'dividend-flow': DividendFlow,
  'compounding': Compounding,
  'total-return': TotalReturn,
  'income-statement': IncomeStatement,
  'three-statements': ThreeStatements,
  'pe-ratio': PERatio,
  'cash-vs-profit': CashVsProfit,
  'economic-moat': EconomicMoat,
  'trend-structure': TrendStructure,
  'volume-bars': VolumeBars,
  'rsi-meter': RSIMeter,
  'breakout': Breakout,
  'position-sizing': PositionSizing,
  'stop-loss': StopLoss,
  'diversification': Diversification,
  'risk-reward': RiskReward,
  'emotion-cycle': EmotionCycle,
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