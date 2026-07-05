import { Router } from 'express';
import { getNotifications, markAsRead, deleteNotification, getUnreadCount } from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();
router.get('/', authenticate, getNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.put('/read', authenticate, markAsRead);
router.delete('/:id', authenticate, deleteNotification);

export default router;
