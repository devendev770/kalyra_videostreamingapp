import crypto from 'crypto';
import SpatialRoom from '../models/SpatialRoom.js';
import DreamscapeCanvas from '../models/DreamscapeCanvas.js';
import { AppError } from '../middlewares/errorHandler.js';
import { getIO } from '../sockets/index.js';

// Random avatar colors
const AVATAR_COLORS = [
  '#c9a048', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6',
  '#f97316', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e',
];

// Create spatial room
export const createRoom = async (req, res, next) => {
  try {
    const roomCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const room = await SpatialRoom.create({
      hostId: req.user._id,
      title: req.body.title || `${req.user.displayName}'s Space`,
      description: req.body.description || '',
      roomCode,
      videoId: req.body.videoId || null,
      maxParticipants: req.body.maxParticipants || 100,
      isPublic: req.body.isPublic !== false,
      category: req.body.category || 'hangout',
      tags: req.body.tags || [],
      participants: [{
        userId: req.user._id,
        x: 0.5,
        y: 0.5,
        color,
        role: 'host',
      }],
    });

    // Create a linked dreamscape canvas
    const canvas = await DreamscapeCanvas.create({
      roomId: room._id,
      roomType: 'SpatialRoom',
      title: `Canvas: ${room.title}`,
      inkLedger: [{ userId: req.user._id, inkRemaining: 200, totalEarned: 200 }],
    });

    room.canvasId = canvas._id;
    await room.save();

    await room.populate('hostId', 'username displayName avatar');

    res.status(201).json({ success: true, room });
  } catch (error) {
    next(error);
  }
};

// Join spatial room
export const joinRoom = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const room = await SpatialRoom.findOne({ roomCode, status: { $ne: 'ended' } })
      .populate('hostId', 'username displayName avatar')
      .populate('participants.userId', 'username displayName avatar')
      .populate('videoId', 'title hlsUrl originalUrl thumbnailUrl duration');

    if (!room) throw new AppError('Spatial room not found or has ended', 404);
    if (room.participants.length >= room.maxParticipants) {
      throw new AppError('Room is full', 400);
    }

    const alreadyJoined = room.participants.some(
      (p) => p.userId._id.toString() === req.user._id.toString()
    );

    if (!alreadyJoined) {
      const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      // Spawn in a random position around the edges
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.25 + Math.random() * 0.15;
      room.participants.push({
        userId: req.user._id,
        x: 0.5 + Math.cos(angle) * radius,
        y: 0.5 + Math.sin(angle) * radius,
        color,
        role: 'viewer',
      });
      await room.save();

      // Add ink allocation to canvas
      if (room.canvasId) {
        await DreamscapeCanvas.findByIdAndUpdate(room.canvasId, {
          $push: { inkLedger: { userId: req.user._id, inkRemaining: 100, totalEarned: 100 } },
        });
      }

      await room.populate('participants.userId', 'username displayName avatar');
    }

    res.json({ success: true, room });
  } catch (error) {
    next(error);
  }
};

// Leave spatial room
export const leaveRoom = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const room = await SpatialRoom.findOne({ roomCode });
    if (!room) throw new AppError('Room not found', 404);

    room.participants = room.participants.filter(
      (p) => p.userId.toString() !== req.user._id.toString()
    );
    await room.save();

    const io = getIO();
    io?.to(`spatial:${roomCode}`).emit('spatial:user_left', {
      userId: req.user._id,
      displayName: req.user.displayName,
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// End spatial room (host only)
export const endRoom = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const room = await SpatialRoom.findOne({ roomCode });
    if (!room) throw new AppError('Room not found', 404);
    if (room.hostId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Only the host can end this room', 403);
    }

    room.status = 'ended';
    await room.save();

    // Lock the dreamscape canvas
    if (room.canvasId) {
      await DreamscapeCanvas.findByIdAndUpdate(room.canvasId, { status: 'locked' });
    }

    const io = getIO();
    io?.to(`spatial:${roomCode}`).emit('spatial:ended');

    res.json({ success: true, message: 'Spatial room ended' });
  } catch (error) {
    next(error);
  }
};

// Get active public rooms
export const getPublicRooms = async (req, res, next) => {
  try {
    const rooms = await SpatialRoom.find({ isPublic: true, status: { $ne: 'ended' } })
      .populate('hostId', 'username displayName avatar')
      .populate('videoId', 'title thumbnailUrl')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, rooms });
  } catch (error) {
    next(error);
  }
};

// Get room details by code
export const getRoomByCode = async (req, res, next) => {
  try {
    const { roomCode } = req.params;
    const room = await SpatialRoom.findOne({ roomCode })
      .populate('hostId', 'username displayName avatar')
      .populate('participants.userId', 'username displayName avatar')
      .populate('videoId', 'title hlsUrl originalUrl thumbnailUrl duration');

    if (!room) throw new AppError('Room not found', 404);
    res.json({ success: true, room });
  } catch (error) {
    next(error);
  }
};
