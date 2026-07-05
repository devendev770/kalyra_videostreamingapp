import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import Video from '../models/Video.js';
import WatchHistory from '../models/WatchHistory.js';
import Like from '../models/Like.js';
import { AppError } from '../middlewares/errorHandler.js';
import { videoQueue } from '../jobs/videoProcessor.js';
import { cacheGet, cacheSet, cacheDel, redis } from '../config/redis.js';
import { CHUNKS_DIR, TEMP_DIR } from '../middlewares/upload.js';

export const trackAuthenticView = async (videoId, req) => {
  try {
    let key;
    if (req.user) {
      key = `view:${videoId}:user:${req.user._id}`;
    } else {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      key = `view:${videoId}:ip:${ip}`;
    }

    const alreadyViewed = await redis.get(key);
    if (!alreadyViewed) {
      await redis.set(key, '1', 'EX', 86400); // 24 hours TTL
      await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error tracking view:', error);
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    return true;
  }
};

// Initialize chunk upload
export const initUpload = async (req, res, next) => {
  try {
    const { title, fileName, fileSize, totalChunks, isShort } = req.body;
    const uploadId = uuidv4();

    const video = await Video.create({
      userId: req.user._id,
      title: title || 'Untitled Video',
      uploadId,
      totalChunks: parseInt(totalChunks, 10),
      fileSize: parseInt(fileSize, 10),
      mimeType: path.extname(fileName).replace('.', 'video/'),
      isShort: isShort === 'true' || isShort === true,
      status: 'uploading',
    });

    res.status(201).json({
      success: true,
      uploadId,
      videoId: video._id,
    });
  } catch (error) {
    next(error);
  }
};

// Upload chunk
export const uploadChunk = async (req, res, next) => {
  try {
    const { uploadId, chunkIndex, totalChunks } = req.body;

    if (!req.file) throw new AppError('No chunk data provided', 400);

    const video = await Video.findOne({ uploadId });
    if (!video) throw new AppError('Upload session not found', 404);

    video.chunksReceived = (video.chunksReceived || 0) + 1;
    await video.save();

    res.json({
      success: true,
      chunkIndex: parseInt(chunkIndex, 10),
      received: video.chunksReceived,
      total: parseInt(totalChunks, 10),
    });
  } catch (error) {
    next(error);
  }
};

// Complete upload — merge chunks and start processing
export const completeUpload = async (req, res, next) => {
  try {
    const { uploadId } = req.body;
    const video = await Video.findOne({ uploadId });
    if (!video) throw new AppError('Upload session not found', 404);

    // Merge chunks
    const chunkDir = path.join(CHUNKS_DIR, uploadId);
    const outputPath = path.join(TEMP_DIR, `${video._id}.mp4`);
    const writeStream = fs.createWriteStream(outputPath);

    for (let i = 0; i < video.totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${i}`);
      if (!fs.existsSync(chunkPath)) {
        throw new AppError(`Missing chunk ${i}`, 400);
      }
      const data = fs.readFileSync(chunkPath);
      writeStream.write(data);
    }
    writeStream.end();

    await new Promise((resolve) => writeStream.on('finish', resolve));

    // Clean up chunks
    fs.rmSync(chunkDir, { recursive: true, force: true });

    // Build original URL for immediate playback
    const videoUrl = `/uploads/temp/${video._id}.mp4`;

    // Add to processing queue
    await videoQueue.add({
      videoId: video._id.toString(),
      filePath: outputPath,
      userId: video.userId.toString(),
    });

    video.originalUrl = videoUrl;
    video.status = 'published';
    await video.save();

    res.json({
      success: true,
      videoId: video._id,
      message: 'Upload complete. Video is live. Processing HLS quality formats in background.',
    });
  } catch (error) {
    next(error);
  }
};

// Direct single-file upload
export const uploadDirect = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No video file provided', 400);

    const hasFFmpeg = !!process.env.FFMPEG_PATH;

    // Build the video URL for serving the uploaded file
    const videoUrl = `/uploads/temp/${req.file.filename}`;

    const video = await Video.create({
      userId: req.user._id,
      title: req.body.title || 'Untitled Video',
      description: req.body.description || '',
      category: req.body.category || 'other',
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      originalUrl: videoUrl,
      isShort: req.body.isShort === 'true' || req.body.isShort === true,
      status: 'published', // Publish immediately for instant viewing
    });

    if (hasFFmpeg) {
      // Full processing pipeline: transcode to HLS, extract thumbnails, etc.
      await videoQueue.add({
        videoId: video._id.toString(),
        filePath: req.file.path,
        userId: req.user._id.toString(),
      });
    }

    res.status(201).json({
      success: true,
      videoId: video._id,
      message: 'Upload complete. Video is live. Processing HLS quality formats in background.',
    });
  } catch (error) {
    next(error);
  }
};

// Get video by ID
export const getVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ===== TEMPORARY DIAGNOSTIC LOG =====
    console.log(`\n[getVideo] Fetching video ID: ${id}`);
    console.log(`[getVideo] MongoDB connection state: ${(await import('mongoose')).default.connection.readyState}`);
    // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    // ===== END DIAGNOSTIC LOG =====

    const cached = await cacheGet(`video:${id}`);
    if (cached && !req.user) return res.json({ success: true, video: cached });

    const video = await Video.findById(id)
      .populate('userId', 'username displayName avatar subscriberCount');

    // ===== TEMPORARY DIAGNOSTIC LOG =====
    if (video) {
      console.log(`[getVideo] Found video: "${video.title}"`);
      console.log(`[getVideo] videoSource: ${video.videoSource}`);
      console.log(`[getVideo] originalUrl: ${video.originalUrl}`);
      console.log(`[getVideo] hlsUrl: ${video.hlsUrl || '(none)'}`);
      console.log(`[getVideo] status: ${video.status}`);
    } else {
      console.log(`[getVideo] VIDEO NOT FOUND in database for ID: ${id}`);
    }
    // ===== END DIAGNOSTIC LOG =====

    if (!video) throw new AppError('Video not found', 404);
    if (video.status === 'private' && (!req.user || video.userId._id.toString() !== req.user._id.toString())) {
      throw new AppError('Video not found', 404);
    }

    // Track authentic view
    await trackAuthenticView(id, req);

    // Track watch history
    if (req.user) {
      await WatchHistory.findOneAndUpdate(
        { userId: req.user._id, videoId: id },
        { watchedAt: new Date() },
        { upsert: true, new: true }
      );
    }

    // Check if user liked
    let userLikeStatus = null;
    let isSubscribed = false;
    if (req.user) {
      const like = await Like.findOne({ userId: req.user._id, targetId: id, targetType: 'video' });
      userLikeStatus = like?.type || null;
      const { default: Subscription } = await import('../models/Subscription.js');
      const sub = await Subscription.findOne({ subscriberId: req.user._id, channelId: video.userId._id });
      isSubscribed = !!sub;
    }

    const videoData = { ...video.toJSON(), userLikeStatus, isSubscribed };
    if (!req.user) await cacheSet(`video:${id}`, videoData, 60);

    res.json({ success: true, video: videoData });
  } catch (error) {
    next(error);
  }
};

// Update video
export const updateVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);
    if (!video) throw new AppError('Video not found', 404);
    if (video.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    const allowedUpdates = [
      'title', 'description', 'category', 'tags', 'status',
      'allowComments', 'ageRestricted', 'publishAt', 'chapters', 'thumbnailUrl',
    ];
    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const updated = await Video.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    await cacheDel(`video:${id}`);

    res.json({ success: true, video: updated });
  } catch (error) {
    next(error);
  }
};

// Delete video
export const deleteVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);
    if (!video) throw new AppError('Video not found', 404);
    if (video.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    await Video.findByIdAndDelete(id);
    await cacheDel(`video:${id}`);

    res.json({ success: true, message: 'Video deleted' });
  } catch (error) {
    next(error);
  }
};

// Get processing status
export const getVideoStatus = async (req, res, next) => {
  try {
    const video = await Video.findById(req.params.id).select('status processingProgress processingError');
    if (!video) throw new AppError('Video not found', 404);
    res.json({ success: true, status: video.status, progress: video.processingProgress, error: video.processingError });
  } catch (error) {
    next(error);
  }
};

// Home feed
export const getFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = { status: 'published', isShort: false };
    const videos = await Video.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username displayName avatar')
      .select('title thumbnailUrl originalUrl hlsUrl duration views likes createdAt category');

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      videos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// Trending
export const getTrending = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const cached = await cacheGet(`trending:${page}`);
    if (cached) return res.json({ success: true, ...cached });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const videos = await Video.aggregate([
      { $match: { status: 'published', isShort: false, createdAt: { $gte: sevenDaysAgo } } },
      {
        $addFields: {
          trendScore: {
            $divide: [
              { $add: [{ $multiply: ['$views', 1] }, { $multiply: ['$likes', 3] }] },
              { $pow: [{ $add: [{ $divide: [{ $subtract: [new Date(), '$createdAt'] }, 3600000] }, 2] }, 1.5] },
            ],
          },
        },
      },
      { $sort: { trendScore: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userId' },
      },
      { $unwind: '$userId' },
      {
        $project: {
          title: 1, thumbnailUrl: 1, originalUrl: 1, hlsUrl: 1, duration: 1, views: 1, likes: 1,
          createdAt: 1, category: 1, trendScore: 1,
          'userId.username': 1, 'userId.displayName': 1, 'userId.avatar': 1, 'userId._id': 1,
        },
      },
    ]);

    const result = { videos, pagination: { page, limit } };
    await cacheSet(`trending:${page}`, result, 300);

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

// Category videos
export const getByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const videos = await Video.find({ status: 'published', category, isShort: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'username displayName avatar');

    const total = await Video.countDocuments({ status: 'published', category, isShort: false });

    res.json({
      success: true,
      videos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// Like/dislike video
export const toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'like' or 'dislike'

    const existing = await Like.findOne({ userId: req.user._id, targetId: id, targetType: 'video' });

    if (existing) {
      if (existing.type === type) {
        // Respond immediately, run DB writes in background
        Like.findByIdAndDelete(existing._id).catch(() => {});
        Video.findByIdAndUpdate(id, { $inc: { [type === 'like' ? 'likes' : 'dislikes']: -1 } }).catch(() => {});
        return res.json({ success: true, action: 'removed', type });
      } else {
        const oldType = existing.type;
        existing.type = type;
        existing.save().catch(() => {});
        Video.findByIdAndUpdate(id, {
          $inc: {
            [oldType === 'like' ? 'likes' : 'dislikes']: -1,
            [type === 'like' ? 'likes' : 'dislikes']: 1,
          },
        }).catch(() => {});
        return res.json({ success: true, action: 'switched', type });
      }
    }

    Like.create({ userId: req.user._id, targetId: id, targetType: 'video', type }).catch(() => {});
    Video.findByIdAndUpdate(id, { $inc: { [type === 'like' ? 'likes' : 'dislikes']: 1 } }).catch(() => {});

    res.json({ success: true, action: 'added', type });
  } catch (error) {
    next(error);
  }
};

// Save watch progress
export const saveProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;

    await WatchHistory.findOneAndUpdate(
      { userId: req.user._id, videoId: id },
      { progress, watchedAt: new Date() },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Helper for fetch with abort timeout
const fetchWithTimeout = async (url, options = {}, timeout = 4000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

// Helper to fetch YouTube duration from the watch page
const fetchYouTubeDuration = async (videoUrl) => {
  try {
    const res = await fetchWithTimeout(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, 4000);
    if (!res.ok) return 0;
    const html = await res.text();
    
    // Look for approxDurationMs or lengthSeconds in page source JSON configs
    const approxDurationMatch = html.match(/"approxDurationMs"\s*:\s*"(\d+)"/);
    if (approxDurationMatch) {
      return Math.round(parseInt(approxDurationMatch[1], 10) / 1000);
    }
    
    const lengthSecondsMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
    if (lengthSecondsMatch) {
      return parseInt(lengthSecondsMatch[1], 10);
    }
    
    return 0;
  } catch (error) {
    console.error('Error fetching YouTube duration:', error);
    return 0;
  }
};

// Import YouTube video metadata
export const importYouTubeVideo = async (req, res, next) => {
  try {
    const { youtubeUrl, title: customTitle, description, category, tags, isShort } = req.body;

    if (!youtubeUrl) {
      throw new AppError('YouTube URL is required', 400);
    }

    // Extract Video ID to check validity
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
    const match = youtubeUrl.match(regExp);
    const youtubeId = match ? match[1] : null;

    if (!youtubeId) {
      throw new AppError('Invalid YouTube URL', 400);
    }

    // Fetch metadata from oEmbed
    let oembedData = {};
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`;
      const oembedRes = await fetchWithTimeout(oembedUrl, {}, 4000);
      if (oembedRes.ok) {
        oembedData = await oembedRes.json();
      }
    } catch (err) {
      console.error('oEmbed fetch failed:', err);
    }

    // Extract duration from page
    const duration = await fetchYouTubeDuration(youtubeUrl);

    const videoTitle = customTitle || oembedData.title || 'YouTube Video';
    const thumbnailUrl = oembedData.thumbnail_url || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

    const video = await Video.create({
      userId: req.user._id,
      title: videoTitle,
      description: description || '',
      category: category || 'other',
      tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [],
      originalUrl: youtubeUrl,
      thumbnailUrl,
      duration,
      videoSource: 'youtube',
      status: 'published',
      isShort: !!isShort,
    });

    res.status(201).json({
      success: true,
      videoId: video._id,
      video,
      message: 'YouTube video imported successfully',
    });
  } catch (error) {
    next(error);
  }
};

