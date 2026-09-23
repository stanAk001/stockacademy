// ============================================================
// indicators.js — deterministic technical-analysis engine.
//
// Pure functions, no I/O, no AI. Given a daily candle series it computes the
// indicators the swing layer reasons on, then classifies a setup and scores its
// quality with a TRANSPARENT factor breakdown (every point traces to a named
// metric — see the 2.0 plan, Decision 1). The AI layer interprets this output;
// it never invents these numbers.
//
// Market-aware by construction: NGX history is close-only, so anything needing
// high/low/volume (ATR, relative volume) returns null there instead of a guess.
//
// Candle shape (ascending by date): { date, open?, high?, low?, close, volume? }
// ============================================================

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const round = (v, dp = 2) => (isNum(v) ? +v.toFixed(dp) : null);
const last = (arr) => (arr.length ? arr[arr.length - 1] : null);

// ---- moving averages -------------------------------------------------------

// Simple moving average of the last `period` values. null if not enough data.
export function sma(values, period) {
  if (values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

// Full EMA series, seeded with the SMA of the first `period` values (standard).
// Returning the whole series lets MACD take an EMA-of-an-EMA cleanly.
export function emaSeries(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function ema(values, period) {
  const s = emaSeries(values, period);
  return s.length ? last(s) : null;
}

// ---- RSI (Wilder's smoothing) ---------------------------------------------

export function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  // First average = simple mean of the first `period` changes.
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  // Then Wilder-smooth across the rest.
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ---- MACD (12,26,9) --------------------------------------------------------

export function macd(closes, fast = 12, slow = 26, signalPeriod = 9) {
  if (closes.length < slow + signalPeriod) return null;
  const emaFast = emaSeries(closes, fast);
  const emaSlow = emaSeries(closes, slow);
  // MACD line only exists where both EMAs do.
  const line = [];
  for (let i = slow - 1; i < closes.length; i++) {
    if (isNum(emaFast[i]) && isNum(emaSlow[i])) line.push(emaFast[i] - emaSlow[i]);
  }
  const signalArr = emaSeries(line, signalPeriod);
  const macdLine = last(line);
  const signal = last(signalArr);
  if (!isNum(macdLine) || !isNum(signal)) return null;
  return { macd: macdLine, signal, histogram: macdLine - signal };
}

// ---- ATR (Wilder) — needs high/low ----------------------------------------

export function atr(candles, period = 14) {
  const usable = candles.filter((c) => isNum(c.high) && isNum(c.low) && isNum(c.close));
  if (usable.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < usable.length; i++) {
    const h = usable[i].high;
    const l = usable[i].low;
    const pc = usable[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let a = trs.slice(0, period).reduce((x, y) => x + y, 0) / period;
  for (let i = period; i < trs.length; i++) a = (a * (period - 1) + trs[i]) / period;
  return a;
}

// ---- volume & structure ----------------------------------------------------

// Relative volume: latest bar vs its trailing 20-bar average (excludes latest).
export function relativeVolume(candles, period = 20) {
  const vols = candles.map((c) => c.volume).filter(isNum);
  if (vols.length < period + 1) return null;
  const latest = vols[vols.length - 1];
  const base = vols.slice(-period - 1, -1);
  const avg = base.reduce((a, b) => a + b, 0) / base.length;
  return avg > 0 ? latest / avg : null;
}

// Nearest swing support/resistance from local pivots over the lookback window.
// A pivot low/high is a bar lower/higher than the `w` bars on both sides.
export function supportResistance(candles, lookback = 60, w = 3) {
  const win = candles.slice(-lookback);
  const highs = win.map((c) => (isNum(c.high) ? c.high : c.close));
  const lows = win.map((c) => (isNum(c.low) ? c.low : c.close));
  const price = last(candles).close;
  const pivotHighs = [];
  const pivotLows = [];
  for (let i = w; i < win.length - w; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - w; j <= i + w; j++) {
      if (j === i) continue;
      if (highs[j] >= highs[i]) isHigh = false;
      if (lows[j] <= lows[i]) isLow = false;
    }
    if (isHigh) pivotHighs.push(highs[i]);
    if (isLow) pivotLows.push(lows[i]);
  }
  // Support = highest pivot low still below price; resistance = lowest pivot high above.
  const support = pivotLows.filter((v) => v < price).sort((a, b) => b - a)[0]
    ?? Math.min(...lows);
  const resistance = pivotHighs.filter((v) => v > price).sort((a, b) => a - b)[0]
    ?? Math.max(...highs);
  return { support, resistance };
}

// ---- aggregate -------------------------------------------------------------

// Compute the full technical snapshot from a candle series. Fields that need
// data this market doesn't provide come back null — callers must handle that.
export function computeTechnicals(candles) {
  const clean = (candles || [])
    .filter((c) => isNum(c.close))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (clean.length < 30) return { ok: false, reason: 'insufficient_history', bars: clean.length };

  const closes = clean.map((c) => c.close);
  const price = last(closes);
  const hasOHLC = clean.some((c) => isNum(c.high) && isNum(c.low));
  const hasVolume = clean.some((c) => isNum(c.volume) && c.volume > 0);

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const macdVal = macd(closes);
  const window52 = closes.slice(-252);
  const high52 = Math.max(...window52);
  const low52 = Math.min(...window52);
  const range20High = Math.max(...closes.slice(-20));
  const atrVal = hasOHLC ? atr(clean) : null;

  // Golden/death cross in the last ~5 bars (only if we have both long MAs).
  let cross = null;
  if (closes.length >= 205) {
    const s50prev = sma(closes.slice(0, -5), 50);
    const s200prev = sma(closes.slice(0, -5), 200);
    if (isNum(sma50) && isNum(sma200) && isNum(s50prev) && isNum(s200prev)) {
      if (s50prev <= s200prev && sma50 > sma200) cross = 'golden';
      else if (s50prev >= s200prev && sma50 < sma200) cross = 'death';
    }
  }

  return {
    ok: true,
    bars: clean.length,
    price: round(price, 4),
    has_ohlc: hasOHLC,
    has_volume: hasVolume,
    sma20: round(sma20, 4),
    sma50: round(sma50, 4),
    sma200: round(sma200, 4),
    ema20: round(ema(closes, 20), 4),
    rsi14: round(rsi(closes), 2),
    macd: macdVal ? { macd: round(macdVal.macd, 4), signal: round(macdVal.signal, 4), histogram: round(macdVal.histogram, 4) } : null,
    atr14: round(atrVal, 4),
    atr_pct: isNum(atrVal) && price ? round((atrVal / price) * 100, 2) : null,
    relative_volume: round(relativeVolume(clean), 2),
    high_52w: round(high52, 4),
    low_52w: round(low52, 4),
    pct_from_52w_high: round(((price - high52) / high52) * 100, 2),
    range_position: round(((price - low52) / (high52 - low52)) * 100, 1), // 0=low, 100=high
    range20_high: round(range20High, 4),
    ...supportResistance(clean),
    ma_cross: cross,
    trend: trendLabel(price, sma50, sma200),
  };
}

function trendLabel(price, sma50, sma200) {
  if (!isNum(sma50)) return 'unknown';
  if (isNum(sma200)) {
    if (price > sma50 && sma50 > sma200) return 'bullish';
    if (price < sma50 && sma50 < sma200) return 'bearish';
    return 'sideways';
  }
  return price > sma50 ? 'bullish' : 'bearish';
}

// ---- setup classification --------------------------------------------------

// Identify the dominant swing setup, or 'none'. Never forces a setup — the
// brief is explicit that "no actionable setup" is a valid, honest answer.
export function classifySetup(t) {
  if (!t.ok) return { setup: 'none', reason: 'Not enough price history to read a setup.' };
  const price = t.price;
  const near = (a, b, pct) => isNum(a) && isNum(b) && Math.abs(a - b) / b <= pct;

  // Breakout: pushing through the recent ceiling, ideally on heavy volume.
  if (isNum(t.range20_high) && price >= t.range20_high * 0.995) {
    const confirmed = t.relative_volume == null || t.relative_volume >= 1.3;
    return {
      setup: 'breakout',
      reason: confirmed
        ? 'Price is breaking above its recent range' + (t.relative_volume ? ` on ${t.relative_volume}x volume.` : '.')
        : 'Price is testing the top of its recent range but volume has not confirmed yet.',
    };
  }
  // Pullback: healthy uptrend dipping back toward a moving average, momentum cooling not breaking.
  if (t.trend === 'bullish' && isNum(t.sma20) && near(price, t.sma20, 0.04) && isNum(t.rsi14) && t.rsi14 >= 40 && t.rsi14 <= 60) {
    return { setup: 'pullback', reason: 'An uptrend is pulling back toward its 20-day average with momentum resetting — a potential continuation entry.' };
  }
  // Trend continuation: cleanly stacked above the MAs with positive MACD.
  if (t.trend === 'bullish' && t.macd && t.macd.histogram > 0 && isNum(t.sma50) && price > t.sma50) {
    return { setup: 'trend_continuation', reason: 'Price is trending above its moving averages with positive momentum.' };
  }
  // Support bounce: near a defined support in a non-broken structure.
  if (isNum(t.support) && near(price, t.support, 0.03) && t.trend !== 'bearish') {
    return { setup: 'support_bounce', reason: 'Price is testing a support level that has held before.' };
  }
  return { setup: 'none', reason: 'No high-quality setup right now — structure and momentum are not aligned.' };
}

// ---- transparent setup-quality score --------------------------------------

// Score 0-100 from named factors. Decision 1 (2.0 plan): NO black-box number —
// every point is attributed so the UI can show "why 82?". Returns the total AND
// the factor list.
export function scoreSetup(t, setup) {
  if (!t.ok || setup === 'none') {
    return { score: null, factors: [], note: 'No setup to score.' };
  }
  const factors = [];
  const add = (label, points, detail) => factors.push({ label, points, detail });

  // Trend alignment — up to 25
  if (t.trend === 'bullish') add('Trend', 25, 'Price above the 50 & 200-day averages');
  else if (t.trend === 'sideways') add('Trend', 12, 'Mixed — price between key averages');
  else add('Trend', 4, 'Downtrend — countertrend, higher risk');

  // Momentum (RSI + MACD) — up to 25
  let mom = 0;
  const mdetail = [];
  if (isNum(t.rsi14)) {
    if (t.rsi14 >= 50 && t.rsi14 <= 68) { mom += 14; mdetail.push(`RSI ${t.rsi14} (healthy)`); }
    else if (t.rsi14 > 68) { mom += 7; mdetail.push(`RSI ${t.rsi14} (extended)`); }
    else if (t.rsi14 >= 40) { mom += 10; mdetail.push(`RSI ${t.rsi14} (resetting)`); }
    else { mom += 4; mdetail.push(`RSI ${t.rsi14} (weak)`); }
  }
  if (t.macd) {
    if (t.macd.histogram > 0) { mom += 11; mdetail.push('MACD positive'); }
    else { mom += 3; mdetail.push('MACD negative'); }
  }
  add('Momentum', mom, mdetail.join(', ') || 'No momentum data');

  // Volume confirmation — up to 20 (unavailable on close-only markets)
  if (t.relative_volume == null) add('Volume', 10, 'Volume data not available on this market — neutral');
  else if (t.relative_volume >= 1.5) add('Volume', 20, `${t.relative_volume}x average — strong confirmation`);
  else if (t.relative_volume >= 1.1) add('Volume', 14, `${t.relative_volume}x average — mild confirmation`);
  else add('Volume', 6, `${t.relative_volume}x average — no confirmation`);

  // Structure — up to 15 (room to resistance / above support)
  let struct = 8;
  let sdetail = 'Neutral structure';
  if (isNum(t.range_position)) {
    if (t.range_position < 85) { struct = 13; sdetail = `${t.range_position}% of 52w range — room to run`; }
    else { struct = 6; sdetail = `${t.range_position}% of 52w range — near highs`; }
  }
  add('Structure', struct, sdetail);

  // Risk penalty — down to -15 for wide ATR / stretched from highs
  let penalty = 0;
  const pdetail = [];
  if (isNum(t.atr_pct) && t.atr_pct > 5) { penalty -= 10; pdetail.push(`ATR ${t.atr_pct}% (volatile)`); }
  else if (isNum(t.atr_pct) && t.atr_pct > 3) { penalty -= 5; pdetail.push(`ATR ${t.atr_pct}% (moderate)`); }
  if (isNum(t.rsi14) && t.rsi14 > 75) { penalty -= 5; pdetail.push('RSI overbought'); }
  if (penalty < 0) add('Risk', penalty, pdetail.join(', '));

  const raw = factors.reduce((a, f) => a + f.points, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return { score, factors };
}

// One-call convenience: candles → { technicals, setup, quality }.
export function analyzeCandles(candles) {
  const technicals = computeTechnicals(candles);
  const { setup, reason } = classifySetup(technicals);
  const quality = scoreSetup(technicals, setup);
  return { technicals, setup, setup_reason: reason, quality };
}

// ---- market regime (deterministic breadth read) ---------------------------
//
// We don't store an index series, so we read the MARKET'S OWN breadth from the
// technicals we already compute: how many names are trending up, average RSI,
// how many show a setup. That's a solid, cheap proxy for "what kind of market is
// this?" — no extra feed, no AI. Rows: [{ trend, rsi14, setup }].
export function marketRegime(rows) {
  const known = rows.filter((r) => r.trend && r.trend !== 'unknown');
  if (known.length < 5) {
    return { label: 'unknown', note: 'Not enough data yet to read market conditions.', breadth: null, sample: known.length };
  }
  const n = known.length;
  const bullish = known.filter((r) => r.trend === 'bullish').length;
  const bearish = known.filter((r) => r.trend === 'bearish').length;
  const rsis = rows.map((r) => r.rsi14).filter((v) => typeof v === 'number' && Number.isFinite(v));
  const avgRsi = rsis.length ? rsis.reduce((a, b) => a + b, 0) / rsis.length : null;
  const withSetup = rows.filter((r) => r.setup && r.setup !== 'none').length;

  const bullPct = Math.round((bullish / n) * 100);
  const bearPct = Math.round((bearish / n) * 100);
  const setupPct = rows.length ? Math.round((withSetup / rows.length) * 100) : 0;

  let label;
  let note;
  if (bullPct >= 55 && (avgRsi == null || avgRsi >= 50)) {
    label = 'bullish';
    note = 'Breadth is positive — most names are trending up. Conditions favour trend-following and breakout setups.';
  } else if (bearPct >= 55 || (avgRsi != null && avgRsi < 40)) {
    label = 'bearish';
    note = 'Breadth is weak — be selective. Favour strong relative strength over breakouts, and keep risk tight.';
  } else {
    label = 'sideways';
    note = 'Choppy, mixed conditions — setups are hit-and-miss. Demand higher quality and tighter risk than usual.';
  }
  return {
    label, note,
    breadth: { bullish_pct: bullPct, bearish_pct: bearPct, avg_rsi: avgRsi != null ? round(avgRsi, 1) : null, setups_pct: setupPct },
    sample: n,
  };
}

// ---- smart-watchlist insight (deterministic per-symbol read) ---------------
// A plain-language status for one watched stock, straight from its technicals.
// Cheap enough to compute on every watchlist load. { status, headline, tone }.
export function watchlistInsight(t) {
  if (!t || !t.trend) return { status: 'no_data', headline: 'No read yet — technicals are still being computed.', tone: 'ink' };
  const q = t.quality_score;
  const hasSetup = t.setup && t.setup !== 'none';
  const rsi = t.rsi14;
  const setupName = hasSetup ? String(t.setup).replace('_', ' ') : null;

  if (hasSetup && typeof q === 'number' && q >= 70) {
    return { status: 'strong_setup', headline: `Strong ${setupName} setup forming (quality ${q}).`, tone: 'bull' };
  }
  if (hasSetup) {
    return { status: 'approaching_setup', headline: `A ${setupName} setup is developing — worth a closer look.`, tone: 'bull' };
  }
  if (t.trend === 'bullish' && typeof rsi === 'number' && rsi > 75) {
    return { status: 'extended', headline: 'Uptrend intact but overbought — it may need to cool off before continuing.', tone: 'ink' };
  }
  if (t.trend === 'bullish') {
    return { status: 'healthy_uptrend', headline: 'Healthy uptrend — momentum is holding up.', tone: 'bull' };
  }
  if (t.trend === 'bearish') {
    return { status: 'weakening', headline: 'Trend is down and momentum is weak — patience here.', tone: 'bear' };
  }
  return { status: 'neutral', headline: 'No clear signal right now — sitting in a range.', tone: 'ink' };
}

// ---- VWAP + multi-timeframe (spec §6) ---------------------------------------
//
// VWAP needs high/low/volume, which only the US (Yahoo) feed has. NGX is daily
// close-only, so every function here returns null / "not available" there
// instead of inventing a number.

// Volume-weighted average price over the last `bars` candles, using the typical
// price (H+L+C)/3. A rolling window needs a handful of bars (`minBars`) to mean
// anything; a session VWAP is valid from its first traded bar.
export function vwap(candles, bars = 20, minBars = Math.min(bars, 5)) {
  const w = (candles || [])
    .filter((c) => isNum(c.close) && isNum(c.high) && isNum(c.low) && isNum(c.volume) && c.volume > 0)
    .slice(-bars);
  if (!w.length || w.length < minBars) return null;
  let pv = 0;
  let v = 0;
  for (const c of w) { pv += ((c.high + c.low + c.close) / 3) * c.volume; v += c.volume; }
  return v ? round(pv / v, 4) : null;
}

// Intraday VWAP anchored to the start of the latest session that has traded.
// Before the open (or on a partial bar with no volume yet) we fall back to the
// previous session rather than reporting nothing.
export function sessionVwap(candles) {
  if (!candles?.length) return null;
  const days = [...new Set(candles.map((c) => String(c.date).slice(0, 10)))].sort();
  for (let i = days.length - 1; i >= 0; i--) {
    const session = candles.filter((c) => String(c.date).slice(0, 10) === days[i]);
    const v = vwap(session, session.length, 1);
    if (v != null) return v;
  }
  return null;
}

// Merge consecutive bars into groups of `size` (e.g. 1H → 4H). A group never
// spans two trading days, so a 4H bar is always within one session.
export function aggregateCandles(candles, size) {
  const out = [];
  let bucket = [];
  let day = null;
  const flush = () => {
    if (!bucket.length) return;
    out.push({
      date: bucket[0].date,
      open: bucket[0].open,
      high: Math.max(...bucket.map((b) => b.high)),
      low: Math.min(...bucket.map((b) => b.low)),
      close: bucket[bucket.length - 1].close,
      volume: bucket.reduce((s, b) => s + (b.volume || 0), 0),
    });
    bucket = [];
  };
  for (const c of candles || []) {
    const d = String(c.date).slice(0, 10);
    if (d !== day) { flush(); day = d; }
    bucket.push(c);
    if (bucket.length === size) flush();
  }
  flush();
  return out;
}

// One timeframe's read from computeTechnicals() output plus an optional VWAP.
// bias: +1 trending up, -1 trending down, 0 sideways/unknown.
export function frameRead(t, vwapVal = null) {
  if (!t?.ok) return { available: false };
  const h = t.macd?.histogram;
  return {
    available: true,
    price: t.price,
    trend: t.trend,
    rsi14: t.rsi14,
    macd_histogram: isNum(h) ? h : null,
    momentum: isNum(h) ? (h > 0 ? 'rising' : 'falling') : 'unknown',
    vwap: isNum(vwapVal) ? vwapVal : null,
    above_vwap: isNum(vwapVal) ? t.price > vwapVal : null,
    bias: t.trend === 'bullish' ? 1 : t.trend === 'bearish' ? -1 : 0,
  };
}

// Line the timeframes up: weekly = macro trend, daily = primary setup,
// 4H = entry structure, 1H = confirmation. Deterministic; the AI only explains it.
export function multiTimeframe(frames) {
  const order = ['1wk', '1d', '4h', '1h'];
  const avail = order.filter((tf) => frames?.[tf]?.available);
  if (avail.length < 2) {
    return {
      alignment: 'insufficient', available: avail.length, bullish: 0, bearish: 0,
      note: 'Only one timeframe has enough data, so there is nothing to line up.',
      confirmation: null, lower_confirmed: null,
    };
  }
  const up = (tf) => frames[tf]?.available && frames[tf].bias > 0;
  const down = (tf) => frames[tf]?.available && frames[tf].bias < 0;
  const bullish = avail.filter(up).length;
  const bearish = avail.filter(down).length;

  let alignment;
  let note;
  if (bullish === avail.length) {
    alignment = 'aligned_bullish';
    note = 'Every timeframe is trending up. The higher and lower frames agree.';
  } else if (bearish === avail.length) {
    alignment = 'aligned_bearish';
    note = 'Every timeframe is trending down. A long setup here goes against the trend on all of them.';
  } else if (up('1wk') && up('1d')) {
    alignment = 'pullback_in_uptrend';
    note = 'Weekly and daily trends are up while the shorter frames dip: a pullback inside an uptrend.';
  } else if (down('1wk') && bullish > 0) {
    alignment = 'counter_trend';
    note = 'Shorter frames are rising against a falling weekly trend. Any long here is counter-trend.';
  } else {
    alignment = 'mixed';
    note = 'The timeframes disagree, so conditions are choppy. Waiting for them to line up is reasonable.';
  }

  // What the lowest available frame needs to show before the setup is confirmed.
  const low = frames['1h']?.available ? '1h' : frames['4h']?.available ? '4h' : null;
  let confirmation = null;
  let lowerConfirmed = null;
  if (low) {
    const f = frames[low];
    const label = low.toUpperCase();
    const parts = [];
    if (isNum(f.vwap)) parts.push(`${label} price holding above its VWAP (${f.vwap.toFixed(2)})`);
    parts.push(`${label} momentum (MACD) turning up`);
    confirmation = parts.join(' and ');
    // With VWAP: momentum turning up while price holds above it. Without VWAP,
    // momentum alone is too weak a signal, so the frame's trend must be up too.
    lowerConfirmed = f.momentum === 'rising' && (isNum(f.vwap) ? f.above_vwap === true && f.bias >= 0 : f.bias > 0);
  }

  return { alignment, note, available: avail.length, bullish, bearish, confirmation, lower_confirmed: lowerConfirmed };
}

// ---- swing entry plan (deterministic — the AI never sets these levels) -----
//
// Given the technicals and the classified setup, derive a long-biased trade
// PLAN from real structure: an entry zone, the level that invalidates the idea,
// and structure-based targets, all sized by ATR. This is analysis, not advice —
// a scenario with a defined risk, not a promise. Returns null when there's no
// setup to plan around.
//
// ATR is the risk unit. On close-only markets (NGX) ATR is absent, so we fall
// back to a volatility proxy (a % of price) and flag `approximate: true`.
export function buildSwingPlan(t, setup) {
  if (!t.ok || setup === 'none') return null;
  const price = t.price;
  if (!isNum(price)) return null;

  const approximate = !isNum(t.atr14);
  const atr = isNum(t.atr14) ? t.atr14 : price * ((isNum(t.atr_pct) ? t.atr_pct : 4) / 100);
  const support = isNum(t.support) ? t.support : price - 2 * atr;
  const resistance = isNum(t.resistance) ? t.resistance : price + 2 * atr;

  let entryLow;
  let entryHigh;
  let invalidation;
  let trigger;

  if (setup === 'breakout') {
    const ceil = isNum(t.range20_high) ? t.range20_high : resistance;
    entryLow = ceil;
    entryHigh = ceil + 0.3 * atr;
    invalidation = Math.min(ceil - 1.0 * atr, support);
    trigger = `A daily close above ${round(ceil)}${t.has_volume ? ' on above-average volume' : ''} confirms the breakout.`;
  } else if (setup === 'pullback') {
    const anchor = isNum(t.sma20) ? t.sma20 : price;
    entryLow = Math.max(support, anchor - 0.5 * atr);
    entryHigh = anchor + 0.25 * atr;
    invalidation = support - 1.0 * atr;
    trigger = `A bounce off the ${round(entryLow)}–${round(entryHigh)} zone that closes back above ${round(anchor)} confirms the pullback is holding.`;
  } else if (setup === 'support_bounce') {
    entryLow = support;
    entryHigh = support + 0.5 * atr;
    invalidation = support - 1.0 * atr;
    trigger = `Price holding ${round(support)} and closing green confirms buyers are defending support.`;
  } else { // trend_continuation
    entryLow = price - 0.3 * atr;
    entryHigh = price + 0.3 * atr;
    const floor = isNum(t.sma50) ? t.sma50 : support;
    invalidation = Math.min(floor - 0.5 * atr, support);
    trigger = `Continued strength above ${round(Math.max(floor, entryLow))} keeps the trend intact.`;
  }

  const entryMid = (entryLow + entryHigh) / 2;
  // Guard bad geometry — invalidation must sit below the entry.
  if (!isNum(invalidation) || invalidation >= entryMid) invalidation = entryMid - 1.2 * atr;
  const riskUnit = entryMid - invalidation;

  // Targets from structure first (next resistance), then risk multiples.
  const targets = [];
  if (isNum(resistance) && resistance > entryMid + 0.3 * riskUnit) {
    targets.push({ level: round(resistance), r_multiple: round((resistance - entryMid) / riskUnit, 2), basis: 'Next resistance' });
  }
  targets.push({ level: round(entryMid + 2 * riskUnit), r_multiple: 2, basis: '2R measured move' });
  if (targets.length < 2) targets.push({ level: round(entryMid + 3 * riskUnit), r_multiple: 3, basis: '3R measured move' });

  const firstTarget = targets[0].level;
  const rr = round((firstTarget - entryMid) / riskUnit, 2);

  return {
    bias: 'long',
    entry_low: round(entryLow),
    entry_high: round(entryHigh),
    trigger,
    invalidation: round(invalidation),
    targets,
    risk_reward: rr,           // to the first target
    risk_unit: round(riskUnit),
    atr_used: round(atr),
    approximate,               // true when ATR was proxied (close-only market)
  };
}
