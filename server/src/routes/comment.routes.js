import { Router } from 'express';
import { getComments, getReplies, addComment, updateComment, deleteComment, pinComment, heartComment, toggleCommentLike } from '../controllers/comment.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { commentSchema } from '../validators/index.js';

const router = Router();
router.get('/video/:videoId', optionalAuth, getComments);
router.get('/:commentId/replies', optionalAuth, getReplies);
router.post('/video/:videoId', authenticate, validate(commentSchema), addComment);
router.put('/:id', authenticate, updateComment);
router.delete('/:id', authenticate, deleteComment);
router.post('/:id/pin', authenticate, pinComment);
router.post('/:id/heart', authenticate, heartComment);
router.post('/:id/like', authenticate, toggleCommentLike);

export default router;
