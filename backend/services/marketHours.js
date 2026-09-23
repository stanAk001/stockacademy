// ============================================================
// marketHours.js — exchange trading hours (spec §28).
//
// Yahoo's intraday feed includes pre-market and after-hours bars, mostly with
// zero volume. Indicators on those bars (RSI, MACD, 4H grouping) are noise, and
// the "current price" becomes a pre-market quote. So intraday series are cut to
// the regular session. Times are read in the exchange's own zone so daylight
// saving is handled by Intl, not by hard-coded UTC offsets.
// ============================================================

const US_TZ = 'America/New_York';
const US_OPEN_MIN = 9 * 60 + 30; // 09:30
const US_CLOSE_MIN = 16 * 60;    // 16:00 (a bar starting at the close is after-hours)

const usClock = new Intl.DateTimeFormat('en-US', {
  timeZone: US_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
});

// Minutes since midnight, New York time. Some engines print midnight as "24".
function nyMinutes(date) {
  const [h, m] = usClock.format(new Date(date)).split(':').map(Number);
  return (h % 24) * 60 + m;
}

// Does a bar that STARTS at `date` fall inside the US regular session?
export function isUsRegularSession(date) {
  const mins = nyMinutes(date);
  return mins >= US_OPEN_MIN && mins < US_CLOSE_MIN;
}

// Keep only regular-session bars from an intraday series.
export function filterUsRegularSession(candles) {
  return (candles || []).filter((c) => isUsRegularSession(c.date));
}
