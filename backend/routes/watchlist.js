import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/watchlistController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', c.list);
router.post('/', c.add);
router.delete('/:symbol', c.remove);

export default router;
