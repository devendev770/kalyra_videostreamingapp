import { Router } from 'express';
import {
  createRoom, joinRoom, leaveRoom, endRoom,
  getPublicRooms, getRoomByCode,
} from '../controllers/spatialRoom.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.post('/', authenticate, createRoom);
router.get('/public', getPublicRooms);
router.get('/:roomCode', getRoomByCode);
router.post('/join/:roomCode', authenticate, joinRoom);
router.post('/leave/:roomCode', authenticate, leaveRoom);
router.post('/end/:roomCode', authenticate, endRoom);

export default router;
