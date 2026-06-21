import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePremium } from '../middleware/requirePremium.js';
import { submitReview, myReviews } from '../controllers/portfolioReviewController.js';

const router = express.Router();
router.use(authenticate);

// Submitting requires premium; viewing your own does not (so lapsed users can
// still read a past response).
router.post('/submit', requirePremium, submitReview);
router.get('/mine', myReviews);

export default router;
