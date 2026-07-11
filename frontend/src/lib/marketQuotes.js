// Rotating "Tip of the day" lines for the dashboard. Chosen to build the
// confidence to START — learn, practise, then invest without fear. Attributions
// are real, well-known quotes; unattributed lines are StockAcademia's own voice.
// No invented statistics.
export const MARKET_QUOTES = [
  { line: 'Risk comes from not knowing what you are doing.', author: 'Warren Buffett',
    note: 'So you learn first, then invest. That knowledge is your edge.' },
  { line: 'The stock market transfers money from the impatient to the patient.', author: 'Warren Buffett',
    note: 'Confidence is built by staying in, not jumping out.' },
  { line: 'Know what you own, and know why you own it.', author: 'Peter Lynch',
    note: 'Understanding beats guessing. That is the whole point of this place.' },
  { line: 'The best time to start was years ago. The second best time is today.', author: null,
    note: 'Start small, start now. Confidence compounds like money does.' },
  { line: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin',
    note: 'Every lesson here is money in a compounding account.' },
  { line: 'In investing, what is comfortable is rarely profitable.', author: 'Robert Arnott',
    note: 'Small, informed risks are how beginners grow into investors.' },
  { line: 'You get recessions, you have stock market declines. If you do not understand that is going to happen, you are not ready.', author: 'Peter Lynch',
    note: 'Volatility is the price of admission, not a reason to run.' },
  { line: 'Do not look for the needle in the haystack. Just buy the haystack.', author: 'John Bogle',
    note: 'You do not need to be perfect. You need to be consistent.' },
  { line: 'The individual investor should act consistently as an investor, not a speculator.', author: 'Benjamin Graham',
    note: 'Slow and understood beats fast and lucky, every time.' },
  { line: 'Time in the market beats timing the market.', author: null,
    note: 'Consistency, not luck, is what actually builds wealth.' },
  { line: 'Be fearful when others are greedy, and greedy when others are fearful.', author: 'Warren Buffett',
    note: 'Learn to read the crowd instead of following it.' },
  { line: 'The four most dangerous words in investing are: this time it is different.', author: 'John Templeton',
    note: 'History rhymes. Learning it is how you stay calm.' },
  { line: 'Every expert investor was once a beginner who refused to quit.', author: null,
    note: 'You are already doing the hard part: showing up to learn.' },
  { line: 'How many millionaires do you know who became wealthy by investing in savings accounts?', author: 'Robert Allen',
    note: 'Growth needs some risk. Learn to take it wisely, not blindly.' },
];

// Deterministic "tip of the day" index so it changes daily but is stable within
// a day. Callers can still cycle forward for variety.
export function todaysQuoteIndex() {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  return dayOfYear % MARKET_QUOTES.length;
}
