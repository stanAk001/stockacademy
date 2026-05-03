import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/forumController.js';

const router = express.Router();
router.use(authenticate);

router.get('/posts', c.listPosts);
router.get('/posts/:id', c.getPost);
router.post('/posts', c.createPost);
router.post('/posts/:id/comments', c.addComment);
router.post('/posts/:id/vote', c.votePost);

export default router;
