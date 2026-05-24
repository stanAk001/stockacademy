import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { updateAllUSStocks } from './services/stockFundamentalsUpdater.js';
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

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'StockAcademy API', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/users', userRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api', featureRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/admin', adminRoutes);

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
}, {
  timezone: 'Africa/Lagos',
});

console.log('📊 Daily US stock fundamentals updater scheduled for 6am Lagos time');

app.listen(PORT, () => {
  console.log(`\n🚀 StockAcademy API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);
});