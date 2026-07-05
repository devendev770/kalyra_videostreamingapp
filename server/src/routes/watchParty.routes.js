import { Router } from 'express';
import { createWatchParty, joinWatchParty, leaveWatchParty, endWatchParty, getPublicParties } from '../controllers/watchParty.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { watchPartySchema } from '../validators/index.js';

const router = Router();
router.post('/', authenticate, validate(watchPartySchema), createWatchParty);
router.get('/public', getPublicParties);
router.post('/join/:roomCode', authenticate, joinWatchParty);
router.post('/leave/:roomCode', authenticate, leaveWatchParty);
router.post('/end/:roomCode', authenticate, endWatchParty);

export default router;
