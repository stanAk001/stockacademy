import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/forumController.js';

const router = express.Router();
router.use(authenticate);

// Per-user caps so a bot/spammer can't flood the community or the server.
const keyByUser = (req) => String(req.user?.id || req.ip);
const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, limit: 30, keyGenerator: keyByUser,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: "You're posting too fast — take a short break and try again." },
});
const voteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, limit: 150, keyGenerator: keyByUser,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many actions — please slow down.' },
});

router.get('/new-count', c.forumNewCount);
router.post('/seen', c.markForumSeen);

router.get('/posts', c.listPosts);
router.get('/posts/:id', c.getPost);
router.post('/posts', writeLimiter, c.createPost);
router.post('/posts/:id/comments', writeLimiter, c.addComment);
router.post('/posts/:id/vote', voteLimiter, c.votePost);
router.post('/comments/:commentId/vote', voteLimiter, c.voteComment);

export default router;
