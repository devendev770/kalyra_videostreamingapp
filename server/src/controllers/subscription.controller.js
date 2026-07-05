import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { AppError } from '../middlewares/errorHandler.js';
import { sendNotification } from '../sockets/index.js';

// Toggle subscription
export const toggleSubscription = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    if (channelId === req.user._id.toString()) {
      throw new AppError('Cannot subscribe to yourself', 400);
    }

    const channel = await User.findById(channelId);
    if (!channel) throw new AppError('Channel not found', 404);

    const existing = await Subscription.findOne({ subscriberId: req.user._id, channelId });

    if (existing) {
      await Subscription.findByIdAndDelete(existing._id);
      await User.findByIdAndUpdate(channelId, { $inc: { subscriberCount: -1 } });
      return res.json({ success: true, subscribed: false });
    }

    await Subscription.create({ subscriberId: req.user._id, channelId });
    await User.findByIdAndUpdate(channelId, { $inc: { subscriberCount: 1 } });

    // Notify channel owner
    const notification = await Notification.create({
      userId: channelId,
      type: 'subscribe',
      title: 'New Subscriber',
      message: `${req.user.displayName || req.user.username} subscribed to your channel`,
      senderId: req.user._id,
      actionUrl: `/channel/${req.user._id}`,
      thumbnail: req.user.avatar,
    });
    sendNotification(channelId, notification);

    res.json({ success: true, subscribed: true });
  } catch (error) {
    next(error);
  }
};

// Get user subscriptions
export const getSubscriptions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = (page - 1) * limit;

    const subs = await Subscription.find({ subscriberId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('channelId', 'username displayName avatar subscriberCount');

    const total = await Subscription.countDocuments({ subscriberId: req.user._id });

    res.json({
      success: true,
      subscriptions: subs.map((s) => s.channelId).filter(Boolean),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// Get subscription feed (videos from subscribed channels)
export const getSubscriptionFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const subs = await Subscription.find({ subscriberId: req.user._id }).select('channelId');
    const channelIds = subs.map((s) => s.channelId);

    const { default: Video } = await import('../models/Video.js');
    const videos = await Video.find({ userId: { $in: channelIds }, status: 'published', isShort: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username displayName avatar');

    const total = await Video.countDocuments({ userId: { $in: channelIds }, status: 'published', isShort: false });

    res.json({
      success: true,
      videos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// Check subscription status
export const checkSubscription = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const sub = await Subscription.findOne({ subscriberId: req.user._id, channelId });
    res.json({ success: true, subscribed: !!sub });
  } catch (error) {
    next(error);
  }
};
