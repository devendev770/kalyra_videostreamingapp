import Video from '../models/Video.js';
import User from '../models/User.js';
import Playlist from '../models/Playlist.js';

/**
 * Try $text search first, fall back to regex if text indexes don't exist.
 */
const searchVideos = async (q, { category, duration, sort, skip, limit }) => {
  const baseFilter = { status: 'published' };
  if (category) baseFilter.category = category;
  if (duration === 'short') baseFilter.duration = { $lt: 240 };
  else if (duration === 'medium') baseFilter.duration = { $gte: 240, $lte: 1200 };
  else if (duration === 'long') baseFilter.duration = { $gt: 1200 };

  // Try $text search first
  try {
    const textFilter = { ...baseFilter, $text: { $search: q } };
    let videoSort = {};
    let projection = {};
    if (sort === 'date') videoSort = { createdAt: -1 };
    else if (sort === 'views') videoSort = { views: -1 };
    else if (sort === 'rating') videoSort = { likes: -1 };
    else {
      videoSort = { score: { $meta: 'textScore' } };
      projection = { score: { $meta: 'textScore' } };
    }

    const videos = await Video.find(textFilter, projection)
      .sort(videoSort).skip(skip).limit(limit)
      .populate('userId', 'username displayName avatar');
    const total = await Video.countDocuments(textFilter);
    return { items: videos, total };
  } catch {
    // Fallback: regex search on title, description, and tags
    const regex = new RegExp(q, 'i');
    const regexFilter = {
      ...baseFilter,
      $or: [
        { title: regex },
        { description: regex },
        { tags: regex },
      ],
    };

    let videoSort = {};
    if (sort === 'date') videoSort = { createdAt: -1 };
    else if (sort === 'views') videoSort = { views: -1 };
    else if (sort === 'rating') videoSort = { likes: -1 };
    else videoSort = { views: -1, createdAt: -1 };

    const videos = await Video.find(regexFilter)
      .sort(videoSort).skip(skip).limit(limit)
      .populate('userId', 'username displayName avatar');
    const total = await Video.countDocuments(regexFilter);
    return { items: videos, total };
  }
};

const searchChannels = async (q, { skip, limit }) => {
  // Try $text search first
  try {
    const textFilter = { $text: { $search: q }, isActive: true };
    const channels = await User.find(textFilter)
      .sort({ subscriberCount: -1 }).skip(skip).limit(limit)
      .select('username displayName avatar subscriberCount bio');
    const total = await User.countDocuments(textFilter);
    return { items: channels, total };
  } catch {
    // Fallback: regex search
    const regex = new RegExp(q, 'i');
    const regexFilter = {
      isActive: true,
      $or: [
        { username: regex },
        { displayName: regex },
      ],
    };
    const channels = await User.find(regexFilter)
      .sort({ subscriberCount: -1 }).skip(skip).limit(limit)
      .select('username displayName avatar subscriberCount bio');
    const total = await User.countDocuments(regexFilter);
    return { items: channels, total };
  }
};

export const search = async (req, res, next) => {
  try {
    const { q, type = 'all', category, sort = 'relevance', duration, page = 1, limit = 20 } = req.query;

    if (!q || !q.trim()) {
      return res.json({ success: true, query: q, videos: { items: [], total: 0 }, channels: { items: [], total: 0 }, playlists: { items: [], total: 0 }, pagination: { page: 1, limit: 20 } });
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);
    const results = {};

    if (type === 'all' || type === 'video') {
      results.videos = await searchVideos(q, { category, duration, sort, skip, limit: parsedLimit });
    }

    if (type === 'all' || type === 'channel') {
      results.channels = await searchChannels(q, { skip, limit: parsedLimit });
    }

    if (type === 'all' || type === 'playlist') {
      const playlists = await Playlist.find({ visibility: 'public', name: new RegExp(q, 'i') })
        .sort({ videoCount: -1 }).skip(skip).limit(parsedLimit)
        .populate('userId', 'username displayName avatar');
      const totalPlaylists = await Playlist.countDocuments({ visibility: 'public', name: new RegExp(q, 'i') });
      results.playlists = { items: playlists, total: totalPlaylists };
    }

    res.json({ success: true, query: q, ...results, pagination: { page: parseInt(page, 10), limit: parsedLimit } });
  } catch (error) { next(error); }
};

export const getSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, suggestions: [] });
    const videos = await Video.find({ status: 'published', title: new RegExp(q, 'i') }).limit(8).select('title');
    const suggestions = videos.map((v) => v.title);
    res.json({ success: true, suggestions });
  } catch (error) { next(error); }
};
