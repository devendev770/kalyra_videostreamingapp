import { Router } from 'express';
import { createStream, getStream, getLiveStreams, endStream, getStreamKey, regenerateStreamKey, getMyStreams } from '../controllers/live.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { liveStreamSchema } from '../validators/index.js';

const router = Router();
router.post('/', authenticate, validate(liveStreamSchema), createStream);
router.get('/active', getLiveStreams);
router.get('/my-streams', authenticate, getMyStreams);
router.get('/stream-key', authenticate, getStreamKey);
router.get('/:id', getStream);
router.post('/:id/end', authenticate, endStream);
router.post('/:id/regenerate-key', authenticate, regenerateStreamKey);

export default router;
