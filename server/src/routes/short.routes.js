import { Router } from 'express';
import { getShortsFeed, getShort, getTrendingShorts } from '../controllers/short.controller.js';
import { optionalAuth } from '../middlewares/auth.js';

const router = Router();
router.get('/feed', getShortsFeed);
router.get('/trending', getTrendingShorts);
router.get('/:id', optionalAuth, getShort);

export default router;
