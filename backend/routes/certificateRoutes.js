import express from 'express';
import {
  checkEligibility,
  saveLegalName,
  initialize,
  verifyPayment,
  myCertificates,
  downloadCertificate,
  verifyPublic,
} from '../controllers/certificateController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Authenticated routes
router.get('/eligibility', authenticate, checkEligibility);
router.post('/save-name', authenticate, saveLegalName);
router.post('/initialize', authenticate, initialize);
router.post('/verify', authenticate, verifyPayment);
router.get('/my', authenticate, myCertificates);
router.get('/download/:id', authenticate, downloadCertificate);

// Public route (no auth — anyone can verify a certificate)
router.get('/verify-public/:token', verifyPublic);

export default router;