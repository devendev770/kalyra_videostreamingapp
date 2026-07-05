import { Router } from 'express';
import { createPlaylist, getUserPlaylists, getPlaylist, updatePlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist } from '../controllers/playlist.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { playlistSchema } from '../validators/index.js';

const router = Router();
router.post('/', authenticate, validate(playlistSchema), createPlaylist);
router.get('/me', authenticate, getUserPlaylists);
router.get('/user/:userId', optionalAuth, getUserPlaylists);
router.get('/:id', optionalAuth, getPlaylist);
router.put('/:id', authenticate, validate(playlistSchema), updatePlaylist);
router.delete('/:id', authenticate, deletePlaylist);
router.post('/:id/videos', authenticate, addToPlaylist);
router.delete('/:id/videos/:videoId', authenticate, removeFromPlaylist);

export default router;
