import { Router } from 'express';
import { getAnalytics, getCreatorVideos, bulkUpdateVideos, bulkDeleteVideos } from '../controllers/studio.controller.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = Router();
router.use(authenticate, authorize('user', 'creator', 'admin'));
router.get('/analytics', getAnalytics);
router.get('/videos', getCreatorVideos);
router.put('/videos/bulk', bulkUpdateVideos);
router.delete('/videos/bulk', bulkDeleteVideos);

export default router;
