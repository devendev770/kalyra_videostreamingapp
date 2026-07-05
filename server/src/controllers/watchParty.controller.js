import crypto from 'crypto';
import WatchParty from '../models/WatchParty.js';
import { AppError } from '../middlewares/errorHandler.js';
import { getIO } from '../sockets/index.js';

// Create watch party
export const createWatchParty = async (req, res, next) => {
  try {
    const roomCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const party = await WatchParty.create({
      hostId: req.user._id,
      videoId: req.body.videoId,
      title: req.body.title || `${req.user.displayName}'s Watch Party`,
      roomCode,
      maxParticipants: req.body.maxParticipants || 50,
      chatEnabled: req.body.chatEnabled !== false,
      isPublic: req.body.isPublic || false,
      participants: [{ userId: req.user._id, role: 'host' }],
    });

    res.status(201).json({ success: true, party });
  } catch (error) {
    next(error);
  }
};

// Join watch party
export const joinWatchParty = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const party = await WatchParty.findOne({ roomCode, status: { $ne: 'ended' } })
      .populate('videoId', 'title hlsUrl thumbnailUrl duration')
      .populate('hostId', 'username displayName avatar')
      .populate('participants.userId', 'username displayName avatar');

    if (!party) throw new AppError('Watch party not found or has ended', 404);

    if (party.participants.length >= party.maxParticipants) {
      throw new AppError('Watch party is full', 400);
    }

    const alreadyJoined = party.participants.some((p) => p.userId._id.toString() === req.user._id.toString());
    if (!alreadyJoined) {
      party.participants.push({ userId: req.user._id, role: 'viewer' });
      await party.save();
    }

    res.json({ success: true, party });
  } catch (error) {
    next(error);
  }
};

// Leave watch party
export const leaveWatchParty = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const party = await WatchParty.findOne({ roomCode });
    if (!party) throw new AppError('Watch party not found', 404);

    party.participants = party.participants.filter(
      (p) => p.userId.toString() !== req.user._id.toString()
    );
    await party.save();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// End watch party (host only)
export const endWatchParty = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const party = await WatchParty.findOne({ roomCode });
    if (!party) throw new AppError('Watch party not found', 404);
    if (party.hostId.toString() !== req.user._id.toString()) {
      throw new AppError('Only the host can end the party', 403);
    }

    party.status = 'ended';
    await party.save();

    const io = getIO();
    io?.to(`watchparty:${roomCode}`).emit('watchparty:ended');

    res.json({ success: true, message: 'Watch party ended' });
  } catch (error) {
    next(error);
  }
};

// Get active public parties
export const getPublicParties = async (req, res, next) => {
  try {
    const parties = await WatchParty.find({ isPublic: true, status: { $ne: 'ended' } })
      .populate('hostId', 'username displayName avatar')
      .populate('videoId', 'title thumbnailUrl')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, parties });
  } catch (error) {
    next(error);
  }
};
