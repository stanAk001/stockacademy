import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as c from '../controllers/alertsController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', c.list);
router.post('/', c.premiumOnly, c.create);
router.delete('/:id', c.remove);

export default router;
