import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { updateAllUSStocks } from './services/stockFundamentalsUpdater.js';
import { checkPriceAlerts } from './services/alertEngine.js';
import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import tradingRoutes from './routes/trading.js';
import forumRoutes from './routes/forum.js';
import userRoutes from './routes/users.js';
import watchlistRoutes from './routes/watchlist.js';
import alertsRoutes from './routes/alerts.js';
import featureRoutes from './routes/features.js';
import bookingRoutes from './routes/bookings.js';
import stockRoutes from './routes/stocks.js';
import adminRoutes from './routes/admin.js';
import certificateRoutes from './routes/certificateRoutes.js';
import subscriptionRoutes from './routes/subscriptions.js';
import { runAutoRenewals } from './controllers/subscriptionController.js';
import { generateAndBroadcastDigest } from './controllers/aiController.js';
import aiRoutes from './routes/ai.js';
import telegramRoutes from './routes/telegram.js';
import { startTelegramPolling } from './services/telegramService.js';
import portfolioReviewRoutes from './routes/portfolioReviews.js';
import webhookRoutes from './routes/webhooks.js';
import insightsRoutes from './routes/insights.js';
import notificationRoutes from './routes/notifications.js';
import {
  generateDailyRecap, insightsIndexHtml, insightHtml, sitemapXml, robotsTxt,
} from './controllers/insightsController.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Lightweight security headers (no extra dependency). For production, layer on
// `helmet` with a tuned Content-Security-Policy.
app.disable('x-powered-by'); // don't advertise the stack
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');            // no MIME sniffing
  res.setHeader('X-Frame-Options', 'DENY');                      // anti-clickjacking
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Allow the deployed frontend(s) to call the API with credentials (cookies).
// CLIENT_URL may be a comma-separated list (prod URL + Vercel preview URLs);
// trailing slashes are stripped so a stray "/" in the env var can't block CORS.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    // No Origin header = same-origin / non-browser client (curl, health checks) → allow.
    if (!origin) return cb(null, true);
    cb(null, allowedOrigins.includes(origin.replace(/\/+$/, '')));
  },
  credentials: true,
}));
app.use(express.json({ limit: '6mb' })); // headroom for compressed forum image data URLs
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'StockAcademia API', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api', featureRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/portfolio-reviews', portfolioReviewRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/insights', insightsRoutes);

// Public, crawlable SEO pages (real HTML — served by the API host).
app.get('/insights', insightsIndexHtml);
app.get('/insights/:slug', insightHtml);
app.get('/sitemap.xml', sitemapXml);
app.get('/robots.txt', robotsTxt);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Daily at 6am Lagos time — fetch fresh US stock fundamentals from Yahoo Finance
cron.schedule('0 6 * * *', async () => {
  console.log('[cron] Running daily US stock fundamentals update...');
  await updateAllUSStocks();
  // Fresh prices in — check alerts right away.
  const fired = await checkPriceAlerts();
  if (fired) console.log(`[cron] Fired ${fired} price alert(s) after price update`);
}, {
  timezone: 'Africa/Lagos',
});

console.log('📊 Daily US stock fundamentals updater scheduled for 6am Lagos time');

// Every 15 minutes — fire any price alerts whose target was reached (catches
// on-demand US refreshes and manual NGX price updates between daily runs).
cron.schedule('*/15 * * * *', async () => {
  const fired = await checkPriceAlerts();
  if (fired) console.log(`[cron] Fired ${fired} price alert(s)`);
});

// Daily at 7am Lagos time — charge saved cards for users who opted into auto-renew
cron.schedule('0 7 * * *', async () => {
  console.log('[cron] Running daily premium auto-renewals...');
  await runAutoRenewals();
}, {
  timezone: 'Africa/Lagos',
});

// Sunday 8am Lagos time — generate + broadcast the weekly market digest to
// premium members with a linked Telegram.
cron.schedule('0 8 * * 0', async () => {
  console.log('[cron] Generating weekly market digest...');
  try {
    const r = await generateAndBroadcastDigest();
    console.log('[cron] Weekly digest:', r.ok ? `sent to ${r.sent}/${r.recipients}` : `skipped (${r.error})`);
  } catch (e) {
    console.error('[cron] Weekly digest failed:', e.message);
  }
}, {
  timezone: 'Africa/Lagos',
});

// Daily 6:30am Lagos time (after fundamentals refresh) — generate the public
// market recap for SEO/organic traffic.
cron.schedule('30 6 * * *', async () => {
  console.log('[cron] Generating daily market recap...');
  try {
    const r = await generateDailyRecap();
    console.log('[cron] Daily recap:', r.ok ? (r.skipped ? 'already exists' : r.slug) : `skipped (${r.error})`);
  } catch (e) {
    console.error('[cron] Daily recap failed:', e.message);
  }
}, {
  timezone: 'Africa/Lagos',
});

app.listen(PORT, () => {
  console.log(`\n🚀 StockAcademia API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);

  // Local dev: receive Telegram messages via long-polling (no public URL needed).
  // Set TELEGRAM_POLLING=true in .env to enable; leave it off in production (use the webhook).
  if (process.env.TELEGRAM_POLLING === 'true') {
    startTelegramPolling();
  }
});