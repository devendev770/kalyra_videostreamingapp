import { Router } from 'express';
import { toggleSubscription, getSubscriptions, getSubscriptionFeed, checkSubscription } from '../controllers/subscription.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();
router.post('/:channelId', authenticate, toggleSubscription);
router.get('/', authenticate, getSubscriptions);
router.get('/feed', authenticate, getSubscriptionFeed);
router.get('/check/:channelId', authenticate, checkSubscription);

export default router;
