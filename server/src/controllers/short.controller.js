import Video from '../models/Video.js';
import { trackAuthenticView } from './video.controller.js';

export const getShortsFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const shorts = await Video.find({ status: 'published', isShort: true })
      .sort({ createdAt: -1, views: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'username displayName avatar subscriberCount');
    const total = await Video.countDocuments({ status: 'published', isShort: true });
    res.json({ success: true, shorts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

export const getShort = async (req, res, next) => {
  try {
    const short = await Video.findById(req.params.id).populate('userId', 'username displayName avatar subscriberCount');
    if (!short || !short.isShort) return res.status(404).json({ success: false, error: 'Short not found' });
    await trackAuthenticView(req.params.id, req);
    res.json({ success: true, short });
  } catch (error) { next(error); }
};

export const getTrendingShorts = async (req, res, next) => {
  try {
    const shorts = await Video.find({ status: 'published', isShort: true, createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } })
      .sort({ views: -1, likes: -1 }).limit(50).populate('userId', 'username displayName avatar');
    res.json({ success: true, shorts });
  } catch (error) { next(error); }
};
