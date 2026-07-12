import { Router } from 'express';
import {
  getCanvas, getCanvasById, addAsset, getInkBalance,
} from '../controllers/dreamscape.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.get('/room/:roomId', getCanvas);
router.get('/:id', getCanvasById);
router.post('/room/:roomId/asset', authenticate, addAsset);
router.get('/room/:roomId/ink', authenticate, getInkBalance);

export default router;
