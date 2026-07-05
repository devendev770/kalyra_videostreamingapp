import { Router } from 'express';
import { getProfile, updateProfile, updateAvatar, updateBanner, getChannel, getHistory, clearHistory, toggleWatchLater, getWatchLater } from '../controllers/user.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { updateProfileSchema } from '../validators/index.js';
import { uploadImage } from '../middlewares/upload.js';

const router = Router();

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, validate(updateProfileSchema), updateProfile);
router.put('/avatar', authenticate, uploadImage.single('avatar'), updateAvatar);
router.put('/banner', authenticate, uploadImage.single('banner'), updateBanner);
router.get('/history', authenticate, getHistory);
router.delete('/history', authenticate, clearHistory);
router.post('/watch-later/:videoId', authenticate, toggleWatchLater);
router.get('/watch-later', authenticate, getWatchLater);
router.get('/:id/channel', optionalAuth, getChannel);

export default router;
