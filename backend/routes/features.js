import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as brokers from '../controllers/brokerController.js';
import * as plan from '../controllers/planController.js';
import * as flw from '../controllers/flutterwaveController.js';
import * as geo from '../controllers/geoController.js';

const router = express.Router();

// Webhooks — no auth required (signature-verified inside controllers)
router.post('/plan/webhook', plan.paystackWebhook);
router.post('/plan/flutterwave-webhook', flw.flutterwaveWebhook);

// Geo detection — no auth required
router.get('/geo', geo.detectGeo);

// Brokers
router.get('/brokers/:symbol', authenticate, brokers.listForSymbol);
router.post('/brokers/track', authenticate, brokers.track);

// Plan management
router.get('/plan', authenticate, plan.getPlan);
router.post('/plan/initialize-upgrade', authenticate, plan.initializeUpgrade);
router.post('/plan/verify-upgrade', authenticate, plan.verifyUpgrade);
router.post('/plan/cancel', authenticate, plan.cancelPremium);

// Flutterwave international plan upgrades
router.post('/plan/initialize-international', authenticate, flw.initializeUpgradeInternational);
router.post('/plan/verify-international', authenticate, flw.verifyUpgradeInternational);

export default router;