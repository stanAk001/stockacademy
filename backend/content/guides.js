// ============================================================
// guides.js — evergreen educational guides for the public /learn pages (§40).
//
// Written by hand, not generated: each guide answers a real search question with
// concrete steps and honest caveats. No hype, no promises. This is education,
// not advice. Rendered server-side by seoController (guideHtml / guideIndexHtml).
//
// Conventions:
//   - `html` is trusted, hand-written markup (p, ul, ol, li, strong, a).
//   - Links to the app use the {{APP}} token; the renderer swaps in the
//     canonical URL. Links to other public pages (/learn/..., screeners) are
//     relative, because they're served from the same host as the guides.
//   - `related` lists other guide slugs; a test checks they all exist.
//   - `updated` is the last content review date (YYYY-MM-DD).
// ============================================================

export const GUIDES = [
  // --------------------------------------------------------------------------
  {
    slug: 'how-to-analyze-a-stock',
    title: 'How to Analyze a Stock: A Step-by-Step Guide',
    description: 'A practical process for analyzing any stock: understand the business, check profits and debt, judge the price, read the trend, and write down the risks.',
    intro: 'Analyzing a stock is less about finding one magic number and more about answering a few questions in order. Here is a process you can repeat for any company, on the US market or the NGX.',
    readMins: 7,
    updated: '2026-09-10',
    sections: [
      {
        h2: 'Step 1: Understand the business first',
        html: `<p>Before you look at a single ratio, be able to answer three questions in plain words: <strong>what does the company sell, who pays for it, and why do they choose this company over a competitor?</strong></p>
<p>If you can't explain how the company makes money in two sentences, you're not ready to judge whether its share price is fair. Read the "about" section of its annual report and its most recent results announcement. Note what could disrupt the business: new competitors, regulation, a change in customer habits, or dependence on one big customer.</p>`,
      },
      {
        h2: 'Step 2: Check profitability and growth',
        html: `<p>A good business turns sales into profit, and ideally grows both over time. Look at:</p>
<ul>
<li><strong>Revenue growth</strong>: are sales rising year after year, or flat?</li>
<li><strong>Net margin</strong>: how much of each unit of sales ends up as profit.</li>
<li><strong>Return on equity (ROE)</strong>: how much profit the company earns on the money shareholders have put in. See our <a href="/learn/how-to-evaluate-roe">guide to ROE</a>.</li>
<li><strong>Earnings growth</strong>: whether profit per share is rising.</li>
</ul>
<p>Look at several years, not one. The direction matters more than a single figure: a margin that has fallen three years in a row tells you more than one strong year.</p>`,
      },
      {
        h2: 'Step 3: Check the balance sheet',
        html: `<p>Debt makes good years better and bad years much worse. Two quick checks:</p>
<ul>
<li><strong>Debt-to-equity</strong>: how much the company has borrowed compared with what shareholders own. Higher means more financial risk.</li>
<li><strong>Current ratio</strong>: short-term assets divided by short-term liabilities. Below 1 can mean the company may struggle to pay near-term bills.</li>
</ul>
<p>Banks are the exception: borrowing and lending is their business, so their debt levels always look high. Judge banks on capital strength, loan quality and ROE instead.</p>`,
      },
      {
        h2: 'Step 4: Judge the price you are paying',
        html: `<p>A great company can still be a poor investment if you overpay. Compare the stock's valuation with similar companies and with its own history:</p>
<ul>
<li><strong>P/E ratio</strong>: price relative to earnings. See <a href="/learn/how-to-evaluate-pe-ratio">how to evaluate P/E</a>.</li>
<li><strong>P/B ratio</strong>: price relative to the company's book value. Useful for banks and asset-heavy firms.</li>
<li><strong>Dividend yield</strong>: the yearly dividend as a percentage of the price.</li>
</ul>
<p>Cheap can be cheap for a reason. A low P/E on a company whose profits are shrinking is not a bargain; it may be a warning.</p>`,
      },
      {
        h2: 'Step 5: Read the trend',
        html: `<p>Fundamentals tell you what a business is worth over time. The price chart tells you what the market is doing with it right now. A quick read:</p>
<ul>
<li>Is the price above or below its <strong>50-day and 200-day moving averages</strong>? Above both usually means an uptrend.</li>
<li>Is momentum (for example <strong>RSI</strong>) rising or fading?</li>
<li>Where is the price compared with its 52-week high and low?</li>
</ul>
<p>Even long-term investors benefit here: buying a strong business while it is still falling hard often means waiting a long time to break even. Our <a href="/learn/fundamental-vs-technical-analysis">fundamental vs technical analysis guide</a> explains how the two fit together.</p>`,
      },
      {
        h2: 'Step 6: Write down your thesis and your exit',
        html: `<p>Finish with two short written notes:</p>
<ol>
<li><strong>Your thesis</strong>: why you think this stock is worth owning, in one or two sentences.</li>
<li><strong>What would prove you wrong</strong>: for example, "margins fall below 15%" or "the price closes below its 200-day average".</li>
</ol>
<p>This is the most skipped step and the most useful. It turns a vague feeling into a plan, and it tells you in advance when to sell instead of deciding in a panic.</p>`,
      },
      {
        h2: 'How StockAcademia helps',
        html: `<p>Every public stock page shows the key fundamentals and a technical read side by side. With a free account you can get a plain-English AI snapshot of any stock, and with Premium you can track your written thesis: we snapshot the fundamentals and tell you, with the exact numbers, when something material changes. <a href="{{APP}}/signup">Start free</a>.</p>`,
      },
    ],
    faqs: [
      ['How long does it take to analyze a stock?', 'A first pass using the steps above takes 30 to 60 minutes once you know where to look. Reading a full annual report takes longer, and is worth doing before you invest a meaningful amount.'],
      ['What is the single most important number?', 'There isn\'t one. Each ratio answers a different question. Profitability, debt, growth and valuation together give a far more reliable picture than any single figure.'],
      ['Do I need a finance background to analyze stocks?', 'No. You need to understand a handful of ratios and be disciplined about writing down your reasoning. The steps in this guide cover the essentials.'],
    ],
    related: ['fundamental-vs-technical-analysis', 'how-to-evaluate-pe-ratio', 'how-to-evaluate-roe', 'how-to-build-a-stock-watchlist'],
  },

  // --------------------------------------------------------------------------
  {
    slug: 'fundamental-vs-technical-analysis',
    title: 'Fundamental vs Technical Analysis Explained',
    description: 'What fundamental and technical analysis each tell you, where each one fails, and how swing traders and long-term investors can combine them sensibly.',
    intro: 'Fundamental analysis asks "what is this business worth?" Technical analysis asks "what is the market doing with its price right now?" They answer different questions, which is exactly why using both helps.',
    readMins: 6,
    updated: '2026-09-10',
    sections: [
      {
        h2: 'Fundamental analysis: the business',
        html: `<p>Fundamental analysis studies the company itself: revenue, profit, margins, debt, cash and the competitive position. The goal is to estimate what the business is worth and compare that with the share price.</p>
<p><strong>Strengths:</strong> it grounds your decision in real economic results, and over years share prices tend to follow earnings.</p>
<p><strong>Weaknesses:</strong> it says little about timing. A stock can stay "undervalued" for a long time, and financial statements are published only a few times a year, so they can be out of date.</p>`,
      },
      {
        h2: 'Technical analysis: the price',
        html: `<p>Technical analysis studies price and volume: trends, moving averages, momentum, support and resistance. It assumes that what buyers and sellers are doing now contains useful information.</p>
<p><strong>Strengths:</strong> it helps with timing and with risk control. A chart shows you a clear level where your idea is proven wrong, so you can set a stop.</p>
<p><strong>Weaknesses:</strong> signals fail often, especially in choppy markets, and a chart knows nothing about whether the business is healthy.</p>`,
      },
      {
        h2: 'Which one should you use?',
        html: `<p>It depends on your holding period:</p>
<ul>
<li><strong>Long-term investors</strong> (holding for years) should lead with fundamentals, and use the trend mainly to avoid buying into a heavy, ongoing decline.</li>
<li><strong>Swing traders</strong> (holding days to weeks) lead with technicals, because over a few weeks the price is driven by supply, demand and news more than by annual profits. A quick fundamental check still helps avoid companies with serious problems.</li>
</ul>`,
      },
      {
        h2: 'How to combine them',
        html: `<p>A simple, practical combination:</p>
<ol>
<li>Use fundamentals to decide <strong>what</strong> is worth owning: profitable, growing, not over-borrowed.</li>
<li>Use technicals to decide <strong>when</strong> and <strong>where your risk is</strong>: buy when the trend is supportive, and define the price that would invalidate the idea.</li>
<li>Re-check both over time. A thesis can break because the business weakens, or because the price action says the market no longer agrees.</li>
</ol>`,
      },
      {
        h2: 'A worked example',
        html: `<p>Here is an illustration (a hypothetical company, not a real stock) of the two methods disagreeing, and how each type of investor might handle it.</p>
<p><strong>The fundamentals look good.</strong> Revenue has grown for five years in a row, ROE has held steady around 18%, debt is modest, and the P/E is below similar companies. On the business alone, it looks worth owning.</p>
<p><strong>The chart says "not yet".</strong> After a broad market sell-off, the price is below a falling 50-day moving average and still making lower lows.</p>
<ul>
<li>A <strong>long-term investor</strong> might start with a small position, or wait until the price stops falling and reclaims its 50-day average, then add. The business case hasn't changed, but there's no need to buy the whole position into a falling trend.</li>
<li>A <strong>swing trader</strong> would usually skip it for now. There is no uptrend to trade with.</li>
</ul>
<p>If the price later climbs back above its 50-day average on rising volume, both methods now agree, and both investors have a clearer reason to act. Each would also know what would prove them wrong: for the investor, a fall in margins or ROE; for the trader, a close back below the recent low.</p>`,
      },
      {
        h2: 'See both on one page',
        html: `<p>Each <a href="/ngx-stock-screener">NGX</a> and <a href="/us-stock-screener">US</a> stock page on StockAcademia shows the fundamentals and a technical read together, so you can apply both in one place. For setups ranked by a transparent quality score, see the <a href="/swing-trading-screener">swing trading screener</a>.</p>`,
      },
    ],
    faqs: [
      ['Is technical analysis reliable?', 'No indicator works all the time. Technical analysis is most useful for managing risk and timing, not for predicting prices with certainty. Treat every signal as a probability, and always define where you would exit if you are wrong.'],
      ['Do professional investors use technical analysis?', 'Many do, alongside fundamentals. Long-term funds lean on fundamentals; short-term traders lean on price action. Plenty of professionals use a mix.'],
    ],
    related: ['how-to-analyze-a-stock', 'best-indicators-for-swing-trading', 'how-to-find-undervalued-stocks'],
  },

  // --------------------------------------------------------------------------
  {
    slug: 'how-to-evaluate-pe-ratio',
    title: 'How to Evaluate a P/E Ratio (Without Being Fooled)',
    description: 'What the price-to-earnings ratio means, how to compare it properly, when a low P/E is a trap, and why P/E means nothing for loss-making companies.',
    intro: 'The P/E ratio is the most quoted valuation number there is, and one of the easiest to misread. Here is what it actually tells you and how to use it well.',
    readMins: 6,
    updated: '2026-09-10',
    sections: [
      {
        h2: 'What P/E means',
        html: `<p><strong>P/E = share price ÷ earnings per share (EPS).</strong></p>
<p>A P/E of 10 means you are paying 10 units of currency for every 1 unit of yearly profit per share. Another way to see it: if profits stayed flat, it would take about 10 years of earnings to "earn back" the price.</p>
<p>The inverse, EPS ÷ price, is the <strong>earnings yield</strong>. A P/E of 10 is an earnings yield of 10%, which is handy for comparing a stock with, say, a savings or bond rate.</p>`,
      },
      {
        h2: 'Trailing vs forward P/E',
        html: `<ul>
<li><strong>Trailing P/E</strong> uses the last 12 months of actual earnings. It's based on facts but looks backwards.</li>
<li><strong>Forward P/E</strong> uses analysts' estimates of next year's earnings. It looks ahead but depends on forecasts that can be wrong.</li>
</ul>
<p>Always check which one you are looking at before comparing two stocks.</p>`,
      },
      {
        h2: 'Compare like with like',
        html: `<p>A P/E is only meaningful in comparison:</p>
<ul>
<li><strong>Against peers in the same sector.</strong> Fast-growing technology companies usually trade on higher P/Es than banks or cement makers. Comparing across sectors tells you little.</li>
<li><strong>Against the stock's own history.</strong> A company trading well below its usual P/E may be out of favour, or its outlook may genuinely have worsened.</li>
<li><strong>Against its growth.</strong> The PEG ratio (P/E ÷ earnings growth rate) adjusts for growth: a P/E of 30 with 30% growth can be more reasonable than a P/E of 12 with no growth.</li>
</ul>`,
      },
      {
        h2: 'When a low P/E is a trap',
        html: `<p>A low P/E can mean the market expects profits to fall. Watch for:</p>
<ul>
<li><strong>Peak-cycle earnings.</strong> Cyclical businesses (commodities, some industrials) often look cheapest right at the top of their cycle, just before profits drop.</li>
<li><strong>One-off gains.</strong> A property sale or currency gain can inflate one year's earnings and make the P/E look artificially low. Check whether profit came from normal operations.</li>
<li><strong>Shrinking business.</strong> If revenue and margins are falling, a low P/E may still be too high.</li>
</ul>`,
      },
      {
        h2: 'When P/E doesn\'t work at all',
        html: `<p>If a company makes a loss, its EPS is negative and the P/E is meaningless. Many data sites show "N/A" or leave it blank. For loss-making or early-stage companies, look at revenue growth, the price-to-sales ratio and how long the company's cash will last.</p>
<p>In markets with high inflation, including Nigeria in recent years, reported earnings can rise simply because prices are rising. Compare earnings growth with inflation to see whether the business is really growing.</p>`,
      },
      {
        h2: 'Check P/E on real stocks',
        html: `<p>Every stock page on StockAcademia shows the P/E alongside profitability, growth and debt, so you can judge it in context. The <a href="/fundamental-stock-screener">fundamental screener</a> helps you compare companies side by side.</p>`,
      },
    ],
    faqs: [
      ['What is a good P/E ratio?', 'There is no universal "good" number. A P/E is only useful compared with similar companies, the stock\'s own history and its expected growth.'],
      ['Is a high P/E bad?', 'Not necessarily. A high P/E often reflects strong expected growth. It does mean expectations are high, so disappointing results can hit the price harder.'],
      ['Why is the P/E missing for some stocks?', 'Usually because the company made a loss, so earnings per share are negative and the ratio isn\'t meaningful.'],
    ],
    related: ['how-to-find-undervalued-stocks', 'how-to-evaluate-roe', 'how-to-analyze-a-stock'],
  },

  // --------------------------------------------------------------------------
  {
    slug: 'how-to-evaluate-roe',
    title: 'How to Evaluate Return on Equity (ROE)',
    description: 'What ROE measures, how to tell a genuinely profitable business from one boosted by debt, and how to compare ROE across banks, industrials and consumer firms.',
    intro: 'Return on equity tells you how well a company turns shareholders\' money into profit. It\'s one of the best quick tests of business quality, as long as you know what can distort it.',
    readMins: 6,
    updated: '2026-09-10',
    sections: [
      {
        h2: 'What ROE measures',
        html: `<p><strong>ROE = net profit ÷ shareholders' equity.</strong></p>
<p>If a company has 100 in shareholders' equity and earns 20 in profit this year, its ROE is 20%. Put simply: for every 100 that shareholders have in the business, it generated 20 of profit.</p>
<p>A business that sustains a high ROE for many years usually has something competitors find hard to copy: a strong brand, low costs, a network, or a protected position.</p>`,
      },
      {
        h2: 'Consistency beats one good year',
        html: `<p>Look at ROE over five years if you can. A steady 18% every year is usually more impressive than 35% one year and 5% the next. A falling ROE is an early warning that competition or costs are eating into profits, even if revenue is still growing.</p>`,
      },
      {
        h2: 'The debt trap: when high ROE is misleading',
        html: `<p>ROE can be pushed up by borrowing. Debt reduces shareholders' equity relative to total assets, so the same profit produces a higher ROE, along with much higher risk.</p>
<p>A useful way to see where ROE comes from is the <strong>DuPont breakdown</strong>:</p>
<p><strong>ROE = net margin × asset turnover × financial leverage</strong></p>
<ul>
<li>High ROE from <strong>strong margins</strong> or <strong>efficient use of assets</strong> is healthy.</li>
<li>High ROE mostly from <strong>leverage</strong> (heavy debt) is fragile.</li>
</ul>
<p>Always read ROE next to debt-to-equity. Also watch for companies that have shrunk their equity through large share buybacks or accumulated losses: that can make ROE look high or even meaningless.</p>`,
      },
      {
        h2: 'Compare within the same industry',
        html: `<ul>
<li><strong>Banks</strong> naturally run with high leverage, so compare a bank's ROE only with other banks, and check its capital strength and loan quality too.</li>
<li><strong>Asset-heavy businesses</strong> such as cement, telecoms or oil need huge investment, which tends to lower ROE.</li>
<li><strong>Asset-light businesses</strong> such as software or consumer brands can reach high ROE with little capital.</li>
</ul>
<p>In a high-inflation economy, compare ROE with inflation. A 20% ROE is less impressive when inflation is running at a similar level, because the real return is small.</p>`,
      },
      {
        h2: 'ROE on StockAcademia',
        html: `<p>ROE is shown on every stock page next to net margin and debt-to-equity, so you can run the checks above at a glance. The <a href="/fundamental-stock-screener">fundamental screener</a> ranks stocks by ROE. If you track a long-term thesis in the app, we flag it when a company's ROE moves materially from where it was when you started. <a href="{{APP}}/signup">Create a free account</a>.</p>`,
      },
    ],
    faqs: [
      ['What is a good ROE?', 'Many investors treat a steady ROE above about 15% as a sign of a quality business, but it varies a lot by industry. Consistency and how the ROE is achieved matter more than the headline number.'],
      ['What is the difference between ROE and ROA?', 'ROA (return on assets) divides profit by total assets, including what\'s funded by debt. Because it ignores how the assets are financed, ROA is less flattered by borrowing than ROE.'],
      ['Can ROE be negative?', 'Yes. If the company makes a loss, ROE is negative. If shareholders\' equity itself is negative, the ratio stops being meaningful.'],
    ],
    related: ['how-to-evaluate-pe-ratio', 'how-to-analyze-a-stock', 'how-to-find-undervalued-stocks'],
  },

  // --------------------------------------------------------------------------
  {
    slug: 'how-to-find-undervalued-stocks',
    title: 'How to Find Undervalued Stocks (and Avoid Value Traps)',
    description: 'A realistic approach to finding undervalued stocks: screen on valuation and quality together, check why a stock is cheap, and demand a margin of safety.',
    intro: 'An undervalued stock is one trading below what the business is reasonably worth. Finding one isn\'t about the lowest P/E on a list. It\'s about being cheap and good at the same time, and understanding why the market disagrees with you.',
    readMins: 7,
    updated: '2026-09-10',
    sections: [
      {
        h2: 'Screen for cheap and good together',
        html: `<p>Start with a screen that combines valuation with quality, so you don't just collect cheap, weak companies:</p>
<ul>
<li><strong>Valuation</strong>: P/E or P/B below the sector average.</li>
<li><strong>Quality</strong>: ROE that has been solid for several years, positive earnings.</li>
<li><strong>Safety</strong>: manageable debt-to-equity.</li>
</ul>
<p>The <a href="/fundamental-stock-screener">fundamental screener</a> is a good starting point. Treat the result as a list of candidates to research, not a list to buy.</p>`,
      },
      {
        h2: 'Ask why it is cheap',
        html: `<p>The market is often right about bad news. For each candidate, find the reason it's cheap:</p>
<ul>
<li><strong>Temporary problem</strong>: a one-off cost, a bad quarter, a sector-wide sell-off, or simply being ignored. These can be real opportunities.</li>
<li><strong>Permanent problem</strong>: a shrinking market, lost competitiveness, a heavy debt load, or regulatory damage. These are value traps.</li>
</ul>
<p>Read recent results and news. If you can't identify why the stock is cheap, you haven't finished your research.</p>`,
      },
      {
        h2: 'Estimate a fair value, roughly',
        html: `<p>You don't need a complex model. Two simple cross-checks:</p>
<ol>
<li><strong>Peer multiple</strong>: if similar companies trade on a P/E of 12 and this one earns 5 per share, a price around 60 is a rough reference point.</li>
<li><strong>Its own history</strong>: if the company has usually traded on a P/E of 15 and now trades on 8 with no clear deterioration, the gap is worth investigating.</li>
</ol>
<p>Treat any estimate as a range, not a precise number.</p>`,
      },
      {
        h2: 'Demand a margin of safety',
        html: `<p>Because your estimate can be wrong, only buy when the price is well below your fair value range. That gap, the <strong>margin of safety</strong>, protects you if the future turns out worse than you expected. The less certain the business, the bigger the margin you should require.</p>`,
      },
      {
        h2: 'Watch for signs the market is starting to agree',
        html: `<p>Undervalued stocks can stay undervalued for a long time. Signs that the gap may start to close include improving results, rising dividends, share buybacks, and a price trend that turns up (for example, the price reclaiming its 200-day moving average). Using the trend as a timing filter can save you from holding a cheap stock that keeps getting cheaper.</p>`,
      },
    ],
    faqs: [
      ['What is a value trap?', 'A stock that looks cheap on ratios like P/E but stays cheap, or gets cheaper, because the business is genuinely deteriorating.'],
      ['Are undervalued stocks less risky?', 'Not automatically. A low price can reduce how much you stand to lose if you\'re right about the business, but a company in real trouble can keep falling.'],
      ['How long does it take for an undervalued stock to recover?', 'There\'s no set time. It can take months or years, and sometimes it never happens. That\'s why the reason for the discount and the margin of safety matter.'],
    ],
    related: ['how-to-evaluate-pe-ratio', 'how-to-evaluate-roe', 'fundamental-vs-technical-analysis'],
  },

  // --------------------------------------------------------------------------
  {
    slug: 'best-indicators-for-swing-trading',
    title: 'The Best Indicators for Swing Trading (and How to Use Them)',
    description: 'The handful of technical indicators swing traders actually rely on: moving averages, RSI, MACD, volume, ATR and VWAP, with what each tells you and common mistakes.',
    intro: 'You don\'t need a chart covered in indicators. Most swing traders rely on a small set that answers four questions: which way is the trend, how strong is the momentum, is volume confirming it, and where should the stop go?',
    readMins: 8,
    updated: '2026-09-10',
    sections: [
      {
        h2: 'Moving averages: the trend',
        html: `<p>A moving average smooths out daily noise so you can see the direction of the trend.</p>
<ul>
<li><strong>20-day</strong>: short-term trend, useful for pullback entries.</li>
<li><strong>50-day</strong>: the medium-term trend most swing traders watch.</li>
<li><strong>200-day</strong>: the long-term trend. Price above the 200-day is generally considered a long-term uptrend.</li>
</ul>
<p>A common rule of thumb: favour long trades when price is above a rising 50-day average, and be careful when it is below a falling one.</p>`,
      },
      {
        h2: 'RSI: momentum and stretch',
        html: `<p>The Relative Strength Index (RSI, usually 14 periods) moves between 0 and 100. Readings above 70 are often called "overbought" and below 30 "oversold".</p>
<p><strong>Common mistake:</strong> treating 70 as an automatic sell signal. In strong uptrends RSI can stay above 70 for weeks. A more useful read for swing trading: in an uptrend, a pullback that brings RSI back to the 40–50 area and then turns up is often a better entry than chasing a high reading.</p>`,
      },
      {
        h2: 'MACD: momentum turning',
        html: `<p>MACD compares a fast and a slow exponential moving average (typically 12 and 26 periods) with a 9-period signal line. When the MACD line crosses above its signal line, or the histogram turns from negative to positive, momentum is improving.</p>
<p>MACD lags price, so it's better as <strong>confirmation</strong> than as an early signal. It also gives many false signals in sideways markets.</p>`,
      },
      {
        h2: 'Volume: is the move real?',
        html: `<p>Volume shows how many shares changed hands. A breakout on volume well above average (for example, 1.5 times the 20-day average) is more convincing than one on thin volume. Pullbacks on light volume, followed by rising volume as price turns back up, are a classic healthy pattern.</p>
<p>On thinly traded markets, including many NGX stocks, volume readings can be erratic, so treat them with more caution.</p>`,
      },
      {
        h2: 'ATR: sizing your stop',
        html: `<p>Average True Range (ATR) measures how much a stock typically moves in a day. It doesn't give buy or sell signals; it helps you set sensible stops.</p>
<p>A stop placed just a few cents below your entry on a stock that moves 3% a day will be hit by normal noise. Many traders place stops about 1.5 to 2 times ATR away from entry, below a clear support level, and size the position so that being stopped out costs a fixed, small share of their account.</p>`,
      },
      {
        h2: 'VWAP: the intraday reference',
        html: `<p>The volume-weighted average price (VWAP) is the average price paid during the session, weighted by volume. Price holding above VWAP suggests buyers are in control that day. Swing traders use it on 1-hour charts to confirm entries: for example, waiting for the price to hold above VWAP before acting on a daily setup.</p>
<p>VWAP needs intraday volume data, so it isn't available where only daily closing prices are published.</p>`,
      },
      {
        h2: 'Putting them together',
        html: `<ol>
<li><strong>Trend</strong>: price above a rising 50-day average.</li>
<li><strong>Setup</strong>: a pullback toward support or the 20-day average, with RSI cooling toward 40–50.</li>
<li><strong>Confirmation</strong>: momentum turning up (MACD) and volume picking up.</li>
<li><strong>Risk</strong>: stop below support, about 1.5–2× ATR away, and a target that is at least twice the risk.</li>
</ol>
<p>StockAcademia's <a href="/swing-trading-screener">swing screener</a> applies checks like these across US and NGX stocks and shows the named factors behind each setup's quality score. The AI Swing Radar in the app adds a weekly, daily, 4-hour and 1-hour read.</p>`,
      },
    ],
    faqs: [
      ['What is the single best indicator for swing trading?', 'There isn\'t one. Moving averages for trend, plus one momentum indicator and volume, cover most of what matters. More indicators often means more conflicting signals.'],
      ['What timeframe should swing traders use?', 'Most use the daily chart for the main setup, the weekly chart for the bigger trend, and a 1-hour or 4-hour chart to fine-tune entries.'],
      ['Do indicators work on NGX stocks?', 'Trend and momentum indicators work on closing prices, so they can be used on NGX stocks. Indicators that need intraday highs, lows or volume, such as ATR and VWAP, are less reliable or unavailable when only daily closes are published.'],
    ],
    related: ['how-to-screen-stocks-for-swing-trading', 'fundamental-vs-technical-analysis', 'how-to-build-a-stock-watchlist'],
  },

  // --------------------------------------------------------------------------
  {
    slug: 'how-to-screen-stocks-for-swing-trading',
    title: 'How to Screen Stocks for Swing Trading',
    description: 'A repeatable screening routine for swing traders: filter for liquidity and trend, look for clean setups, rank by quality and risk/reward, and plan every trade.',
    intro: 'Swing trading starts with finding the right handful of stocks, not staring at hundreds of charts. A good screen narrows the market to stocks that are liquid, trending and near a clear entry.',
    readMins: 6,
    updated: '2026-09-10',
    sections: [
      {
        h2: 'Filter 1: liquidity',
        html: `<p>Only trade stocks you can get in and out of easily. Filter out stocks with low average daily volume or very wide price gaps between trades. On the NGX this matters a lot: many smaller stocks trade rarely, so a stop may not fill anywhere near your level. Favour the more actively traded names.</p>`,
      },
      {
        h2: 'Filter 2: trend',
        html: `<p>Most swing setups work best in the direction of the trend. A simple filter for long trades:</p>
<ul>
<li>Price above the 50-day moving average.</li>
<li>The 50-day average above the 200-day average.</li>
</ul>
<p>This one filter removes a large share of stocks that are more likely to keep falling.</p>`,
      },
      {
        h2: 'Filter 3: a recognisable setup',
        html: `<p>From the trending list, look for stocks near a clear entry:</p>
<ul>
<li><strong>Pullback</strong>: price easing back toward support or its 20-day average in an uptrend.</li>
<li><strong>Breakout</strong>: price pushing through a well-tested resistance level on rising volume.</li>
<li><strong>Consolidation</strong>: a tight range after a strong move, which often comes before the next leg.</li>
</ul>
<p>If you can't point to the setup in a few seconds, skip the stock.</p>`,
      },
      {
        h2: 'Rank by quality and risk/reward',
        html: `<p>For each remaining stock, work out:</p>
<ul>
<li><strong>Entry</strong>: where the setup triggers.</li>
<li><strong>Invalidation</strong>: the price that proves the idea wrong, usually just below support.</li>
<li><strong>Target</strong>: the next resistance level.</li>
</ul>
<p>Divide the distance to the target by the distance to the stop. Many traders only take setups with at least 2:1 reward to risk. Rank what's left and keep the best few.</p>`,
      },
      {
        h2: 'Check the market and the calendar',
        html: `<p>Before acting, check the wider market. When most stocks are falling, even good setups fail more often. Also check for upcoming earnings or dividend dates: a results announcement can gap the price straight through your stop.</p>`,
      },
      {
        h2: 'Make it a routine',
        html: `<p>Run the screen at the same time each day or week, add the best candidates to a <a href="/learn/how-to-build-a-stock-watchlist">watchlist</a> with their trigger levels, and act only when price reaches your level. The <a href="/swing-trading-screener">StockAcademia swing screener</a> does the trend and setup filtering for you across US and NGX stocks, and the app can monitor setups you track and alert you as they approach entry or invalidate.</p>`,
      },
    ],
    faqs: [
      ['How many stocks should a swing trading screen return?', 'Aim for a short list, around 5 to 15 names. If your screen returns dozens, tighten the filters.'],
      ['How often should I run a swing trading screen?', 'Daily or a few times a week is typical. Setups develop over days, so there\'s no need to scan every hour.'],
      ['What is a good risk/reward ratio?', 'Many swing traders require at least 2:1, meaning the potential gain is at least twice the potential loss. That lets you be profitable even if fewer than half of your trades work.'],
    ],
    related: ['best-indicators-for-swing-trading', 'how-to-build-a-stock-watchlist', 'fundamental-vs-technical-analysis'],
  },

  // --------------------------------------------------------------------------
  {
    slug: 'how-to-analyze-ngx-stocks',
    title: 'How to Analyze NGX Stocks: A Guide for Nigerian Investors',
    description: 'How to research Nigerian Exchange stocks: getting started, the key ratios, dividends, liquidity, and adjusting your analysis for inflation and the naira.',
    intro: 'The core of stock analysis is the same everywhere, but the Nigerian market has its own features, from thin trading in many stocks to high inflation and dividend-focused investors. Here is how to adapt your analysis.',
    readMins: 8,
    updated: '2026-09-10',
    sections: [
      {
        h2: 'Getting set up',
        html: `<p>To buy NGX-listed shares you need an account with a licensed stockbroker, which also gives you a CSCS account where your shares are held. The market is regulated by the Securities and Exchange Commission (SEC) Nigeria. Check that any broker or investment app you use is properly registered before sending money.</p>`,
      },
      {
        h2: 'Know the market\'s structure',
        html: `<p>The NGX is dominated by a small number of large companies, particularly banks, telecoms, cement, consumer goods and oil and gas. A handful of very large stocks can move the whole index. Many smaller companies trade only occasionally.</p>
<p><strong>Liquidity is a real risk.</strong> In thinly traded stocks you may not be able to sell quickly at the price you see. Check how often and how much a stock trades before buying, and be wary of prices that jump on very small volume.</p>
<p>The NGX also limits how far most stocks can move in a single day, so big news can take several sessions to be fully reflected in the price.</p>`,
      },
      {
        h2: 'The ratios that matter most here',
        html: `<ul>
<li><strong>Dividend yield and payout history.</strong> Many Nigerian investors buy for income. Check whether the company has paid dividends consistently and whether earnings comfortably cover them. Dividends are generally subject to withholding tax.</li>
<li><strong>P/E and P/B.</strong> Especially useful for banks. Compare banks with other banks.</li>
<li><strong>ROE.</strong> Nigerian banks often report high ROE; judge it alongside their capital strength and loan quality.</li>
<li><strong>Debt and currency exposure.</strong> Companies that borrow in foreign currency or import raw materials can see profits hit hard when the naira weakens.</li>
</ul>`,
      },
      {
        h2: 'Adjust for inflation and the naira',
        html: `<p>Nigeria has experienced high inflation in recent years. That changes how you read the numbers:</p>
<ul>
<li>Revenue and profit can rise simply because prices are rising. Compare growth with inflation to see real growth.</li>
<li>A stock that rose 20% in a year when inflation was higher still lost purchasing power.</li>
<li>Foreign-currency losses or gains can swing reported profit. Look for how much of a year's result came from currency effects rather than the core business.</li>
</ul>`,
      },
      {
        h2: 'Use results and dividend season',
        html: `<p>NGX companies publish quarterly and full-year results, and many announce dividends with their full-year numbers. Read the results announcement itself, not just the headline profit: check revenue, margins, finance costs and any one-off items. Corporate actions such as rights issues and bonus shares change the share count, so check for them before comparing per-share figures over time.</p>`,
      },
      {
        h2: 'Technical analysis on the NGX',
        html: `<p>Trend and momentum tools based on closing prices, such as moving averages and RSI, can be applied to NGX stocks. Tools that need intraday highs, lows or volume are less reliable where that data is limited. Be cautious with chart signals on stocks that trade rarely: a single trade can move the price and create a false pattern.</p>`,
      },
      {
        h2: 'Research NGX stocks on StockAcademia',
        html: `<p>The <a href="/ngx-stock-screener">NGX stock screener</a> lists Nigerian stocks with valuation, dividend yield and market cap, and the <a href="/ngx-dividend-stocks">NGX dividend stocks</a> page ranks them by yield. Each stock page shows the fundamentals and a trend read. In the app you can analyse NGX stocks in English, Pidgin, Yorùbá, Hausa or Igbo. <a href="{{APP}}/signup">Start free</a>.</p>`,
      },
    ],
    faqs: [
      ['How do I start investing in NGX stocks?', 'Open an account with a licensed stockbroker, who will set up your CSCS account. You can then fund the account and place buy orders through the broker or its app.'],
      ['Are NGX dividend stocks a good investment?', 'They can be part of an income strategy, but a high yield alone isn\'t enough. Check that earnings cover the dividend, that payments have been consistent, and how the share price has held up after inflation.'],
      ['Why do some NGX stock prices barely move?', 'Many smaller NGX stocks trade infrequently. With few trades, the price can stay unchanged for days, then jump when a trade happens. That low liquidity is a risk worth weighing.'],
    ],
    related: ['how-to-analyze-a-stock', 'how-to-analyze-us-stocks', 'how-to-evaluate-roe'],
  },

  // --------------------------------------------------------------------------
  {
    slug: 'how-to-analyze-us-stocks',
    title: 'How to Analyze US Stocks: Filings, Earnings and Data',
    description: 'How to research US-listed stocks: where to find reliable filings, how to read earnings season, the ratios that matter, and currency risk for investors outside the US.',
    intro: 'US markets offer deep data and thousands of liquid stocks. That makes research easier in some ways and noisier in others. Here\'s how to focus on what matters.',
    readMins: 7,
    updated: '2026-09-10',
    sections: [
      {
        h2: 'Use the official filings',
        html: `<p>US-listed companies file standard reports with the Securities and Exchange Commission (SEC), all free on the SEC's EDGAR database:</p>
<ul>
<li><strong>10-K</strong>: the annual report, with full financial statements and a detailed "risk factors" section.</li>
<li><strong>10-Q</strong>: quarterly updates.</li>
<li><strong>8-K</strong>: announcements of major events, such as acquisitions or leadership changes.</li>
</ul>
<p>The 10-K's business overview and risk factors are the best place to understand how a company makes money and what its management says could go wrong.</p>`,
      },
      {
        h2: 'Read earnings season carefully',
        html: `<p>US companies report results every quarter, and share prices often move sharply on the day. What moves the price is usually <strong>results compared with expectations</strong>, plus the company's outlook ("guidance"), not the raw profit number. A company can report record profit and still fall if investors expected more.</p>
<p>If you trade short term, know when a stock reports. Holding through earnings means accepting the risk of a large overnight gap.</p>`,
      },
      {
        h2: 'The ratios that matter',
        html: `<ul>
<li><strong>Revenue and earnings growth</strong>: the main driver for many US growth stocks.</li>
<li><strong>Margins</strong>: gross and net, and their direction over time.</li>
<li><strong>P/E and PEG</strong>: valuation relative to growth. See <a href="/learn/how-to-evaluate-pe-ratio">how to evaluate P/E</a>.</li>
<li><strong>Free cash flow</strong>: the cash left after running and investing in the business. Profits without cash are a warning sign.</li>
<li><strong>Share count</strong>: heavy stock-based pay can dilute existing shareholders over time.</li>
</ul>`,
      },
      {
        h2: 'Trading hours and liquidity',
        html: `<p>The regular US session runs from 9:30am to 4:00pm New York time. Pre-market and after-hours trading exist but are much thinner, so prices there can be misleading. Large US stocks are highly liquid, which makes it easier to use stops and to enter and exit at the price you expect.</p>`,
      },
      {
        h2: 'Currency risk for investors outside the US',
        html: `<p>If you invest from Nigeria or elsewhere, your return depends on both the stock and the exchange rate. A weaker naira increases the naira value of US holdings, while a stronger naira reduces it. Also check the fees and foreign-exchange rates your platform charges, which can take a meaningful share of returns on small amounts.</p>`,
      },
      {
        h2: 'Research US stocks on StockAcademia',
        html: `<p>The <a href="/us-stock-screener">US stock screener</a> lists stocks by valuation, growth and dividend yield, and every stock page shows the fundamentals and technical read. Premium members get an AI Swing Radar with weekly-to-1-hour timeframe analysis and entry plans for US stocks. <a href="{{APP}}/signup">Create a free account</a>.</p>`,
      },
    ],
    faqs: [
      ['Where can I find a US company\'s financial statements?', 'On the SEC\'s EDGAR database, free of charge. The annual 10-K and quarterly 10-Q reports contain the full financial statements.'],
      ['Why did a stock fall after reporting good results?', 'Prices react to results compared with what investors expected, and to the company\'s outlook. Good results that miss expectations, or weak guidance, can push a price down.'],
      ['Can I buy US stocks from Nigeria?', 'Yes, through platforms and brokers that offer access to US markets. Check that the provider is properly regulated, and understand its fees and exchange rates.'],
    ],
    related: ['how-to-analyze-a-stock', 'how-to-analyze-ngx-stocks', 'how-to-evaluate-pe-ratio'],
  },

  // --------------------------------------------------------------------------
  {
    slug: 'how-to-build-a-stock-watchlist',
    title: 'How to Build a Stock Watchlist That Works',
    description: 'How to build a focused stock watchlist: how many stocks to follow, what to write down for each, how to set trigger levels and alerts, and when to remove a stock.',
    intro: 'A watchlist turns scattered ideas into a plan. Done well, it means you act on your own research at your own price, instead of reacting to whatever is moving today.',
    readMins: 5,
    updated: '2026-09-10',
    sections: [
      {
        h2: 'Keep it short',
        html: `<p>Most people follow too many stocks. A list of 10 to 20 companies you understand is easier to keep up with than 80 you barely know. If you hold a mix of long-term investments and swing trades, keep them in separate lists, because they need different kinds of attention.</p>`,
      },
      {
        h2: 'Write down why each stock is there',
        html: `<p>For every stock, note in a sentence:</p>
<ul>
<li><strong>Why it's on the list</strong>: "quality bank trading below its usual P/B" or "pullback forming in an uptrend".</li>
<li><strong>What you're waiting for</strong>: a price level, a results announcement, or a technical signal.</li>
<li><strong>What would make you drop it</strong>: for example, a dividend cut or a break below support.</li>
</ul>
<p>Without these notes, a watchlist is just a list of tickers.</p>`,
      },
      {
        h2: 'Set trigger levels and alerts',
        html: `<p>Decide the price at which you would act, and set a price alert there. This stops you watching screens all day and helps you avoid buying on impulse. For swing trades, note the entry, stop and target in advance. For long-term holdings, note the price range where you would add more.</p>`,
      },
      {
        h2: 'Review on a schedule',
        html: `<p>Once a week is enough for most people. For each stock, ask: has anything changed in the business or the chart? Is it still worth watching? Remove stocks whose story has broken, and add new candidates from your <a href="/learn/how-to-screen-stocks-for-swing-trading">screening routine</a>. A watchlist that never changes usually means you've stopped reviewing it.</p>`,
      },
      {
        h2: 'Common watchlist mistakes',
        html: `<ul>
<li><strong>Adding a stock because of a tip or a trending post.</strong> If you can't write down your own reason for watching it, you won't know what to do when it moves.</li>
<li><strong>Never removing anything.</strong> Stocks whose story has broken stay on the list and crowd out better ideas. Removing a stock is a decision too.</li>
<li><strong>Watching the price, not the reason.</strong> A stock falling 10% matters less than whether the thing you were waiting for, such as improving margins or a clean breakout, is still on track.</li>
<li><strong>Acting before your trigger.</strong> Buying because a stock "looks like it's about to move", before it reaches the level you set, defeats the purpose of having a plan.</li>
<li><strong>Setting alerts on everything.</strong> Too many alerts turn into noise you ignore. Keep them for the few levels where you would actually act.</li>
</ul>`,
      },
      {
        h2: 'A smarter watchlist on StockAcademia',
        html: `<p>The StockAcademia watchlist doesn't just list prices. It shows what's happening with each stock: whether a setup you're tracking is approaching entry, whether a long-term thesis is strengthening or weakening, or whether the fundamentals stand out. You also get alerts when something meaningful changes. <a href="{{APP}}/signup">Start free</a>.</p>`,
      },
    ],
    faqs: [
      ['How many stocks should be on a watchlist?', 'For most individual investors, 10 to 20 is manageable. Enough for choice, few enough to follow properly.'],
      ['Should I buy every stock on my watchlist?', 'No. A watchlist is a list of candidates. You act only when a stock reaches the price or condition you set in advance.'],
      ['How often should I update my watchlist?', 'A weekly review works well: remove stocks whose story has changed and add new candidates from your research.'],
    ],
    related: ['how-to-screen-stocks-for-swing-trading', 'how-to-analyze-a-stock', 'best-indicators-for-swing-trading'],
  },
];

export const getGuide = (slug) => GUIDES.find((g) => g.slug === slug) || null;
