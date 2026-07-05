import { Router } from 'express';
import { createPost, getPosts, getPost, deletePost, togglePostLike, votePoll } from '../controllers/community.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { communityPostSchema } from '../validators/index.js';

const router = Router();
router.post('/', authenticate, validate(communityPostSchema), createPost);
router.get('/', optionalAuth, getPosts);
router.get('/user/:userId', optionalAuth, getPosts);
router.get('/:id', optionalAuth, getPost);
router.delete('/:id', authenticate, deletePost);
router.post('/:id/like', authenticate, togglePostLike);
router.post('/:id/vote', authenticate, votePoll);

export default router;
