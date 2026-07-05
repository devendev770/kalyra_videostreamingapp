import LiveStream from '../models/LiveStream.js';
import { AppError } from '../middlewares/errorHandler.js';

// Create live stream
export const createStream = async (req, res, next) => {
  try {
    const existing = await LiveStream.findOne({ userId: req.user._id, status: { $in: ['idle', 'live'] } });
    if (existing) throw new AppError('You already have an active stream', 400);

    const stream = await LiveStream.create({
      userId: req.user._id,
      title: req.body.title,
      description: req.body.description || '',
      category: req.body.category || 'other',
      chatEnabled: req.body.chatEnabled !== false,
      dvrEnabled: req.body.dvrEnabled !== false,
      tags: req.body.tags || [],
    });

    res.status(201).json({
      success: true,
      stream,
      rtmpUrl: `rtmp://localhost:${process.env.NMS_RTMP_PORT || 1935}/live`,
      streamKey: stream.streamKey,
    });
  } catch (error) {
    next(error);
  }
};

// Get stream by ID
export const getStream = async (req, res, next) => {
  try {
    const stream = await LiveStream.findById(req.params.id)
      .populate('userId', 'username displayName avatar subscriberCount');
    if (!stream) throw new AppError('Stream not found', 404);
    res.json({ success: true, stream });
  } catch (error) {
    next(error);
  }
};

// Get active live streams (idle + live)
export const getLiveStreams = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const streams = await LiveStream.find({ status: { $in: ['idle', 'live'] } })
      .sort({ status: 1, viewerCount: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'username displayName avatar');

    const total = await LiveStream.countDocuments({ status: { $in: ['idle', 'live'] } });
    res.json({ success: true, streams, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
};

// End stream
export const endStream = async (req, res, next) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    if (!stream) throw new AppError('Stream not found', 404);
    if (stream.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    stream.status = 'ended';
    stream.endedAt = new Date();
    await stream.save();

    res.json({ success: true, message: 'Stream ended' });
  } catch (error) {
    next(error);
  }
};

// Get stream key (creator only)
export const getStreamKey = async (req, res, next) => {
  try {
    const stream = await LiveStream.findOne({ userId: req.user._id, status: { $in: ['idle', 'live'] } });
    if (!stream) throw new AppError('No active stream found', 404);
    res.json({ success: true, streamKey: stream.streamKey, rtmpUrl: `rtmp://localhost:${process.env.NMS_RTMP_PORT || 1935}/live` });
  } catch (error) {
    next(error);
  }
};

// Regenerate stream key
export const regenerateStreamKey = async (req, res, next) => {
  try {
    const stream = await LiveStream.findById(req.params.id);
    if (!stream) throw new AppError('Stream not found', 404);
    if (stream.userId.toString() !== req.user._id.toString()) throw new AppError('Not authorized', 403);

    const crypto = await import('crypto');
    stream.streamKey = crypto.randomBytes(20).toString('hex');
    await stream.save();

    res.json({ success: true, streamKey: stream.streamKey });
  } catch (error) {
    next(error);
  }
};

// Get user's past streams
export const getMyStreams = async (req, res, next) => {
  try {
    const streams = await LiveStream.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, streams });
  } catch (error) {
    next(error);
  }
};
