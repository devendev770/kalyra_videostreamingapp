import User from '../models/User.js';
import Video from '../models/Video.js';
import WatchHistory from '../models/WatchHistory.js';
import WatchLater from '../models/WatchLater.js';
import Subscription from '../models/Subscription.js';
import { AppError } from '../middlewares/errorHandler.js';
import { uploadAvatar, uploadBanner, deleteImage } from '../config/cloudinary.js';
import fs from 'fs';

// Get profile
export const getProfile = async (req, res, next) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};

// Update profile
export const updateProfile = async (req, res, next) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// Upload avatar
export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No image file provided', 400);
    const user = await User.findById(req.user._id);

    if (user.avatarPublicId) await deleteImage(user.avatarPublicId);

    const result = await uploadAvatar(req.file.path);
    user.avatar = result.url;
    user.avatarPublicId = result.publicId;
    await user.save();

    fs.unlinkSync(req.file.path);

    res.json({ success: true, avatar: result.url });
  } catch (error) {
    next(error);
  }
};

// Upload banner
export const updateBanner = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No image file provided', 400);
    const user = await User.findById(req.user._id);

    if (user.bannerPublicId) await deleteImage(user.bannerPublicId);

    const result = await uploadBanner(req.file.path);
    user.banner = result.url;
    user.bannerPublicId = result.publicId;
    await user.save();

    fs.unlinkSync(req.file.path);

    res.json({ success: true, banner: result.url });
  } catch (error) {
    next(error);
  }
};

// Get channel page
export const getChannel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select(
      'username displayName avatar banner bio subscriberCount totalViews channelDescription channelLinks createdAt'
    );

    if (!user) throw new AppError('Channel not found', 404);

    const videos = await Video.find({ userId: id, status: 'published' })
      .sort({ createdAt: -1 })
      .limit(30)
      .select('title thumbnailUrl originalUrl hlsUrl views duration createdAt likes');

    const totalVideos = await Video.countDocuments({ userId: id, status: 'published' });

    let isSubscribed = false;
    if (req.user) {
      const sub = await Subscription.findOne({ subscriberId: req.user._id, channelId: id });
      isSubscribed = !!sub;
    }

    res.json({
      success: true,
      channel: {
        ...user.toJSON(),
        videos,
        totalVideos,
        isSubscribed,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get watch history
export const getHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const history = await WatchHistory.find({ userId: req.user._id })
      .sort({ watchedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'videoId',
        select: 'title thumbnailUrl originalUrl hlsUrl duration views userId createdAt',
        populate: { path: 'userId', select: 'username avatar displayName' },
      });

    const total = await WatchHistory.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      history: history.map((h) => ({ ...h.videoId?.toJSON(), progress: h.progress, watchedAt: h.watchedAt })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// Clear history
export const clearHistory = async (req, res, next) => {
  try {
    await WatchHistory.deleteMany({ userId: req.user._id });
    res.json({ success: true, message: 'Watch history cleared' });
  } catch (error) {
    next(error);
  }
};

// Toggle watch later
export const toggleWatchLater = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const existing = await WatchLater.findOne({ userId: req.user._id, videoId });

    if (existing) {
      await WatchLater.findByIdAndDelete(existing._id);
      return res.json({ success: true, added: false, message: 'Removed from Watch Later' });
    }

    await WatchLater.create({ userId: req.user._id, videoId });
    res.json({ success: true, added: true, message: 'Added to Watch Later' });
  } catch (error) {
    next(error);
  }
};

// Get watch later
export const getWatchLater = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const items = await WatchLater.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'videoId',
        select: 'title thumbnailUrl originalUrl hlsUrl duration views userId createdAt',
        populate: { path: 'userId', select: 'username avatar displayName' },
      });

    const total = await WatchLater.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      videos: items.map((i) => i.videoId).filter(Boolean),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};
