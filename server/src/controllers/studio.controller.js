import Video from '../models/Video.js';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import Comment from '../models/Comment.js';
import { cacheGet, cacheSet } from '../config/redis.js';

// Get creator dashboard analytics
export const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const cached = await cacheGet(`studio:analytics:${userId}`);
    if (cached) return res.json({ success: true, ...cached });

    const totalVideos = await Video.countDocuments({ userId, status: { $ne: 'failed' } });
    const videoStats = await Video.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, totalViews: { $sum: '$views' }, totalLikes: { $sum: '$likes' }, totalDuration: { $sum: '$duration' } } },
    ]);
    const stats = videoStats[0] || { totalViews: 0, totalLikes: 0, totalDuration: 0 };
    const subscriberCount = req.user.subscriberCount || 0;

    // Top videos
    const topVideos = await Video.find({ userId, status: 'published' }).sort({ views: -1 }).limit(10).select('title views likes thumbnailUrl createdAt duration');

    // Recent subscribers (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const recentSubs = await Subscription.countDocuments({ channelId: userId, createdAt: { $gte: thirtyDaysAgo } });

    // Comments on user's videos
    const videoIds = await Video.find({ userId }).distinct('_id');
    const totalComments = await Comment.countDocuments({ videoId: { $in: videoIds } });

    // Views by day (last 30 days) - simplified
    const viewsByDay = await Video.aggregate([
      { $match: { userId: req.user._id, status: 'published' } },
      { $project: { views: 1, createdAt: 1, title: 1 } },
      { $sort: { createdAt: -1 } },
      { $limit: 30 },
    ]);

    const result = { totalVideos, totalViews: stats.totalViews, totalLikes: stats.totalLikes, totalWatchTime: stats.totalDuration, subscriberCount, recentSubs, totalComments, topVideos, viewsByDay };
    await cacheSet(`studio:analytics:${userId}`, result, 300);

    res.json({ success: true, ...result });
  } catch (error) { next(error); }
};

// Get creator videos
export const getCreatorVideos = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const status = req.query.status;
    const query = { userId: req.user._id };
    if (status) query.status = status;

    const videos = await Video.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('title thumbnailUrl status views likes commentCount duration createdAt publishAt');
    const total = await Video.countDocuments(query);

    res.json({ success: true, videos, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// Bulk update videos
export const bulkUpdateVideos = async (req, res, next) => {
  try {
    const { videoIds, updates } = req.body;
    const allowedUpdates = ['status', 'category', 'allowComments'];
    const filteredUpdates = {};
    for (const key of allowedUpdates) { if (updates[key] !== undefined) filteredUpdates[key] = updates[key]; }

    await Video.updateMany({ _id: { $in: videoIds }, userId: req.user._id }, filteredUpdates);
    res.json({ success: true, message: `${videoIds.length} videos updated` });
  } catch (error) { next(error); }
};

// Bulk delete videos
export const bulkDeleteVideos = async (req, res, next) => {
  try {
    const { videoIds } = req.body;
    await Video.deleteMany({ _id: { $in: videoIds }, userId: req.user._id });
    res.json({ success: true, message: `${videoIds.length} videos deleted` });
  } catch (error) { next(error); }
};
