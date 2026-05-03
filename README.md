# 📈 StockAcademy

> A friendly, full-stack platform for learning the stock market — from "what's a stock?" to reading charts like a pro. Built on PERN (PostgreSQL, Express, React, Node).

## ✨ Features

- **Auth** — Email/password signup & login **or** Google OAuth (one click)
- **Real Stock Analysis Engine** — Quality, Value, Momentum, Risk scores (0-100) for any US or Nigerian stock
- **Coverage** — Real-time US stocks via Finnhub + 30 NGX-listed Nigerian stocks (Dangote, MTN, GTCO, etc.)
- **Smart Rankings** — Sort the universe by any factor for "lazy user" research
- **Stock search** — Type any ticker or company name to get a full analysis report
- **6 Courses · 30+ lessons** — Basics, earning, fundamental analysis, technical analysis, risk, strategies
- **Quizzes with XP rewards** — Gamified progress tracking, achievements, leaderboard
- **Paper trading simulator** — $100,000 virtual cash, live charts, portfolio with P/L
- **Watchlist** — up to 5 stocks on Free, unlimited on Premium
- **Price alerts** — *(Premium)* notify me when a stock hits my target
- **Community forum** — posts, comments, upvotes, categories
- **Affiliate system** — "Buy this stock for real" button routing to Binance / eToro / Deriv / Interactive Brokers / Exness with click tracking
- **Paid 1-on-1 mentorship booking** — 30-min / 1-hour / weekly tiers, Paystack integration, availability resolver, admin dashboard
- **Freemium plans** — clean upgrade flow scaffolded for Paystack or Stripe
- **Fully responsive** — works beautifully on mobile

---

## 📦 Tech Stack

| Layer | Tech |
|---|---|
| Database | PostgreSQL (managed in pgAdmin) |
| Backend | Node.js · Express · ESM (`"type": "module"`) |
| Frontend | React 18 · Vite · Tailwind CSS · Framer Motion · Recharts |
| Stock data | Finnhub API (free tier) for US · manual NGX seed for Nigerian |
| Auth | JWT + bcryptjs · google-auth-library |
| Payments | Paystack (Nigerian Naira native) |
| Styling | Tailwind with custom palette, Fraunces + Plus Jakarta Sans fonts |

---

## 🗂 Project Structure

```
stockacademy/
├── backend/                 # Express API
│   ├── config/db.js         # PostgreSQL pool
│   ├── controllers/         # auth, courses, trading, forum, users,
│   │                        # watchlist, alerts, brokers, signals, plan
│   ├── middleware/auth.js   # JWT auth middleware
│   ├── routes/              # all API routes
│   ├── utils/jwt.js
│   ├── server.js            # Express entry
│   └── .env.example
│
├── database/
│   ├── schema.sql                # Run first in pgAdmin
│   └── migration_01_features.sql # Run second
│
├── frontend/                # Vite + React app
│   ├── src/
│   │   ├── components/      # Navbar, Footer, AboutCreator, BuyThisStockButton, etc.
│   │   ├── pages/           # Landing, Login, Signup, Dashboard, Courses,
│   │   │                    # Lesson, Simulator, Watchlist, Alerts, Pricing,
│   │   │                    # Forum, Profile, Leaderboard
│   │   ├── context/AuthContext.jsx
│   │   ├── services/api.js
│   │   ├── siteConfig.js    # ← EDIT YOUR PERSONAL INFO HERE
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── .env.example
│
└── README.md
```

---

## 🚀 Setup (5 steps)

### 1. Install prerequisites

- [Node.js](https://nodejs.org) v18+
- [PostgreSQL](https://www.postgresql.org/download/) 14+
- [pgAdmin 4](https://www.pgadmin.org/download/)

### 2. Set up the database

Open **pgAdmin**, then:

1. **Create the database**:
   - Right-click "Databases" → Create → Database…
   - Name: `stockacademy` · Owner: `postgres` → Save

2. **Run the schema**:
   - Click the `stockacademy` database → Tools → Query Tool
   - Open `database/schema.sql`, paste the contents, click ▶ Execute

3. **Run the feature migration**:
   - Same Query Tool → open `database/migration_01_features.sql` → Execute

4. **Run the bookings migration**:
   - Same Query Tool → open `database/migration_02_bookings.sql` → Execute

5. **Run the stocks migration** (NEW — adds the analysis engine):
   - Same Query Tool → open `database/migration_03_stocks.sql` → Execute
   - This seeds 30 Nigerian stocks (Dangote Cement, MTN, GTCO, Zenith, Seplat, etc.) and 25 US tickers

You should now see tables: `users`, `courses`, `lessons`, `quizzes`, `portfolios`, `transactions`, `watchlist`, `forum_posts`, `price_alerts`, `brokers`, `affiliate_clicks`, and more.

### 3. Set up Google OAuth (optional but recommended)

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID (type: Web application)
3. **Authorized JavaScript origins**: `http://localhost:5173`
4. **Authorized redirect URIs**: `http://localhost:5173`
5. Copy the **Client ID** and **Client Secret**

### 4. Start the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your values:
#   DB_PASSWORD    — your postgres password
#   JWT_SECRET     — any long random string
#   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — from step 3
npm install
npm run dev
```

API runs at **http://localhost:5000** — open http://localhost:5000/api/health to verify.

### 5. Start the frontend

Open a **second terminal**:

```bash
cd frontend
cp .env.example .env
# Edit .env:
#   VITE_GOOGLE_CLIENT_ID — same Client ID as backend
npm install
npm run dev
```

App opens at **http://localhost:5173** 🎉

---

## 👤 Personalize the "About the maker" section

Open `frontend/src/siteConfig.js` and edit:

```js
export const creator = {
  name: 'Your Name',
  role: 'Full-Stack Developer & Markets Enthusiast',
  tagline: 'I build tools that make learning finance less painful.',
  bio: `Your longer bio here…`,
  photo: '/me.jpg',   // put your photo at frontend/public/me.jpg
  socials: {
    twitter:  'https://twitter.com/you',
    github:   'https://github.com/you',
    linkedin: '',
    email:    'you@example.com',
    website:  '',
  },
  facts: [
    'Built this entire platform on the PERN stack',
    'Self-taught finance nerd',
    'Believes in long-term thinking',
  ],
};
```

- Leave any social empty to hide it.
- Leave `photo: ''` and your initials will show in a styled gradient avatar instead.

---

## 📈 Live stock data (Finnhub)

The platform uses [Finnhub](https://finnhub.io) for real-time US stock data. The free tier gives you 60 API calls per minute — plenty for development and small-scale launch.

**To enable live data:**

1. Sign up at [finnhub.io/register](https://finnhub.io/register)
2. Copy your API key from the dashboard
3. Add to `backend/.env`:
   ```
   FINNHUB_API_KEY=your_key_here
   ```
4. Restart the backend

When the key is set:
- US stock prices come from Finnhub in real time
- The search bar can find any US stock (not just the seeded 25)
- New stocks searched by users are auto-added to the database

Without the key, the app falls back to the manually-seeded prices in the `stocks` table.

## 🔬 The Stock Analysis Engine

Every stock — US or Nigerian — gets analysed across **four factor scores (0-100):**

| Factor | What it measures | Inputs |
|---|---|---|
| **Quality** | Profitability and balance-sheet health | ROE, ROA, margins, debt/equity, current ratio, growth |
| **Value** | Valuation relative to fundamentals | P/E, P/B, P/S, EV/EBITDA, PEG, dividend yield |
| **Momentum** | Recent price strength | 1m / 3m / 6m / 1y returns, 52-week range position |
| **Risk** | Volatility, leverage, liquidity | 30d & 1y vol, beta, max drawdown, leverage, volume |

Plus a **composite score** (average of the four) and an educational thesis describing what the scores mean for that stock.

**Free tier** sees: composite score, four factor scores, top-line labels, and the thesis.

**Premium tier** unlocks:
- Full sub-score breakdown for every input
- Sector peer comparison (5 similar companies side-by-side)
- All raw metrics (every ratio and number behind the scores)
- Unlimited stock lookups

**The Rankings page** (`/rankings`) sorts the entire universe by any factor — perfect for users who want to skip reading reports and just see top-scoring stocks at a glance.

### Updating Nigerian stock prices

NGX data isn't available on free APIs, so Nigerian stock prices are stored in the `stocks` table and need manual updates. Run this in pgAdmin to update prices:

```sql
UPDATE stocks SET last_price = 485.20, prev_close = 480.50, day_change_pct = 0.978
WHERE symbol = 'NGX:DANGCEM';
```

You can also update the deeper metrics (P/E, ROE, volatility, etc.) the same way to keep the analysis engine fresh.

---

## 💰 Adding your affiliate links

The 5 default brokers are seeded with placeholder affiliate URLs. Update them in pgAdmin:

```sql
UPDATE brokers SET affiliate_url = 'https://accounts.binance.com/register?ref=YOUR_CODE' WHERE key = 'binance';
UPDATE brokers SET affiliate_url = 'https://etoro.tw/YOUR_CODE'                          WHERE key = 'etoro';
UPDATE brokers SET affiliate_url = 'https://deriv.com/?t=YOUR_TOKEN'                     WHERE key = 'deriv';
UPDATE brokers SET affiliate_url = 'https://ibkr.com/referral/YOUR_CODE'                 WHERE key = 'ibkr';
UPDATE brokers SET affiliate_url = 'https://one.exness-track.com/a/YOUR_CODE'            WHERE key = 'exness';
```

Every click is stored in the `affiliate_clicks` table — query it any time for analytics.

---

## 🎓 Paid mentorship bookings

The platform includes a full 1-on-1 tutoring booking system at `/book-session` (public landing page for the offer) with three tiers:

| Tier | Duration | Default Price | Who can book |
|---|---|---|---|
| Quick Session | 30 min | ₦5,000 | Anyone |
| Deep Dive | 60 min | ₦10,000 | Anyone |
| Weekly Mentorship | 4 × 60 min | ₦35,000 | Premium users only |

### How the flow works

1. User visits `/book-session`, picks a tier, fills contact info + picks an open slot
2. Backend creates a `pending` booking and initialises a Paystack transaction
3. User redirects to Paystack checkout
4. On success, Paystack redirects back to `/book-session/verify?reference=…`
5. The verify endpoint cross-checks with `GET /transaction/verify/:ref` — **authoritative**
6. A parallel webhook (`POST /api/bookings/webhook`) updates the booking even if the user closes the tab
7. Booking is marked `paid` + `confirmed`, email confirmation is fired, meeting URL attached

### ⚠️ Legal warning — please read

Charging money for stock-market sessions crosses into **regulated investment-advice territory** in most jurisdictions (Nigeria SEC, US SEC/FINRA, UK FCA, EU MiFID II, etc.). Even calling sessions "tutoring" or "education" does not protect you if the conversation drifts into specific buy/sell recommendations on a client's real portfolio.

**Before running paid sessions, at minimum:**
- Check your local financial-services regulator's rules
- Keep sessions strictly educational — teach concepts, not specific trades
- Never guarantee returns or give personalised portfolio advice
- Surface the disclaimers that are already baked into the booking page
- Consider consulting a lawyer before scaling this

Anthropic built the software; what you say in the sessions is entirely on you.

### Setting it up

**1. Run the migration.** In pgAdmin, open `database/migration_02_bookings.sql` → Execute. Creates `session_types`, `tutor_availability`, `bookings` tables and seeds defaults.

**2. Customise availability & pricing in pgAdmin:**

```sql
-- Change your weekly schedule (day 0=Sun, 6=Sat)
DELETE FROM tutor_availability;
INSERT INTO tutor_availability (day_of_week, start_time, end_time) VALUES
 (1, '18:00', '22:00'),   -- Mon evening
 (6, '09:00', '13:00');   -- Sat morning

-- Change session prices (price_kobo is NGN × 100, e.g. 500000 = ₦5,000)
UPDATE session_types SET price_kobo = 700000 WHERE key = 'quick';

-- Disable a tier
UPDATE session_types SET enabled = FALSE WHERE key = 'weekly';
```

**3. Get Paystack keys.** Sign up at [paystack.com](https://paystack.com) → Dashboard → Settings → API Keys. Use **test** keys in development.

**4. Add them to `backend/.env`:**

```
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxx
DEFAULT_MEETING_URL=https://meet.google.com/your-default-room
```

**5. Register the webhook** in Paystack dashboard → Settings → Webhooks:
- URL: `https://yourdomain.com/api/bookings/webhook` (use [ngrok](https://ngrok.com) for local testing)
- Paystack signs requests; the server verifies the `x-paystack-signature` header

**6. Make yourself admin** to access the admin dashboard at `/admin/bookings`. In pgAdmin:

```sql
UPDATE users SET is_admin = TRUE WHERE username = 'your_username';
```

### Demo mode (no Paystack needed)

If `PAYSTACK_SECRET_KEY` is missing, the booking flow still works end-to-end — it just skips the real payment step and marks logged-in users' bookings as paid when they hit the verify page. Useful for development and demos. **Never deploy without real keys.**

### Email confirmations

The email sender is a stub at the bottom of `bookingController.js`. To turn it on:

```bash
cd backend
npm install nodemailer
```

Then uncomment the block in the `sendConfirmationEmail` function and add SMTP credentials to `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=mentorship@yourdomain.com
```

---

## ⭐ Turning on Premium (for testing)

The Pricing page calls `POST /api/plan/activate` — for now it's a demo activator that flips the user's plan to `premium` with a 1-month expiry. For production, wire Paystack or Stripe:

1. Get a Paystack secret key: https://dashboard.paystack.com/#/settings/developer
2. Add `PAYSTACK_SECRET_KEY` to `backend/.env`
3. Uncomment the Paystack stub at the bottom of `backend/controllers/planController.js`
4. Add a webhook in Paystack dashboard → `https://yourdomain.com/api/paystack/webhook`

---

## 🧪 Quick walk-through

1. Register (or sign in with Google)
2. Dashboard → open any course → read a lesson → mark complete → take the quiz
3. Simulator → pick a ticker → buy shares → see portfolio P/L
4. Upgrade to Premium (demo) → Alerts tab + AI Signals unlock
5. Forum → start a discussion → comment on others
6. Leaderboard → see your XP rank

---

## 🛡 Disclaimers

- StockAcademy provides educational analysis and research tools. Investment decisions are yours to make based on your own goals, time horizon, and risk tolerance.
- Affiliate links: we may earn commissions when users sign up through partner brokers — at no extra cost to the user.
- The 1-on-1 mentorship sessions are educational only. Before charging for them at scale, check your local financial-advice regulations (Nigerian SEC, US SEC/FINRA, UK FCA, etc.) — keep sessions strictly educational.
- The "Buy this stock for real" button redirects users to broker affiliate links — commission may be earned at no extra cost to the user.
- AI signals are simple rule-based outputs teaching how technical + fundamental analysis combine — not trading recommendations.

---

## 🧾 License

MIT. Use it, modify it, ship it.
