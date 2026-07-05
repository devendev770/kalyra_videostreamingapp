import { Router } from 'express';
import { initUpload, uploadChunk as uploadChunkCtrl, completeUpload, uploadDirect, getVideo, updateVideo, deleteVideo, getVideoStatus, getFeed, getTrending, getByCategory, toggleLike, saveProgress, importYouTubeVideo } from '../controllers/video.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { videoSchema } from '../validators/index.js';
import { uploadVideo, uploadChunk } from '../middlewares/upload.js';

const router = Router();

router.get('/feed', optionalAuth, getFeed);
router.get('/trending', getTrending);
router.get('/category/:category', getByCategory);

router.post('/upload/init', authenticate, initUpload);
router.post('/upload/chunk', authenticate, uploadChunk.single('chunk'), uploadChunkCtrl);
router.post('/upload/complete', authenticate, completeUpload);
router.post('/upload', authenticate, uploadVideo.single('video'), uploadDirect);
router.post('/import-youtube', authenticate, importYouTubeVideo);

router.get('/:id', optionalAuth, getVideo);
router.get('/:id/status', authenticate, getVideoStatus);
router.put('/:id', authenticate, validate(videoSchema), updateVideo);
router.delete('/:id', authenticate, deleteVideo);
router.post('/:id/like', authenticate, toggleLike);
router.post('/:id/progress', authenticate, saveProgress);

export default router;
