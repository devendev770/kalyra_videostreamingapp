import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';

let io = null;

export const getIO = () => io;

export const initSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie?.match(/accessToken=([^;]+)/)?.[1];
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        socket.userId = decoded.userId;
      }
      next();
    } catch {
      next(); // Allow unauthenticated sockets for public features
    }
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user: ${socket.userId || 'anonymous'})`);

    // Join user-specific room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // ============ VIDEO EVENTS ============
    socket.on('video:join', (videoId) => {
      socket.join(`video:${videoId}`);
    });

    socket.on('video:leave', (videoId) => {
      socket.leave(`video:${videoId}`);
    });

    // ============ WATCH PARTY EVENTS ============
    socket.on('watchparty:join', ({ roomCode, userId }) => {
      socket.join(`watchparty:${roomCode}`);
      socket.to(`watchparty:${roomCode}`).emit('watchparty:user_joined', { userId });
      logger.debug(`User ${userId} joined watch party: ${roomCode}`);
    });

    socket.on('watchparty:leave', ({ roomCode, userId }) => {
      socket.leave(`watchparty:${roomCode}`);
      socket.to(`watchparty:${roomCode}`).emit('watchparty:user_left', { userId });
    });

    socket.on('watchparty:sync', ({ roomCode, currentTime, isPlaying }) => {
      socket.to(`watchparty:${roomCode}`).emit('watchparty:sync', { currentTime, isPlaying });
    });

    socket.on('watchparty:play', ({ roomCode }) => {
      io.to(`watchparty:${roomCode}`).emit('watchparty:play');
    });

    socket.on('watchparty:pause', ({ roomCode }) => {
      io.to(`watchparty:${roomCode}`).emit('watchparty:pause');
    });

    socket.on('watchparty:seek', ({ roomCode, time }) => {
      io.to(`watchparty:${roomCode}`).emit('watchparty:seek', { time });
    });

    socket.on('watchparty:chat', ({ roomCode, message, userId, username, avatar }) => {
      io.to(`watchparty:${roomCode}`).emit('watchparty:chat', {
        message, userId, username, avatar, timestamp: new Date(),
      });
    });

    socket.on('watchparty:reaction', ({ roomCode, emoji, userId }) => {
      io.to(`watchparty:${roomCode}`).emit('watchparty:reaction', { emoji, userId });
    });

    // ============ LIVE STREAM EVENTS ============
    socket.on('live:join', (streamId) => {
      socket.join(`live:${streamId}`);
      const room = io.sockets.adapter.rooms.get(`live:${streamId}`);
      const viewerCount = room ? room.size : 0;
      io.to(`live:${streamId}`).emit('live:viewer_count', { count: viewerCount });
    });

    socket.on('live:leave', (streamId) => {
      socket.leave(`live:${streamId}`);
      const room = io.sockets.adapter.rooms.get(`live:${streamId}`);
      const viewerCount = room ? room.size : 0;
      io.to(`live:${streamId}`).emit('live:viewer_count', { count: viewerCount });
    });

    socket.on('live:chat', ({ streamId, message, userId, username, avatar }) => {
      io.to(`live:${streamId}`).emit('live:chat', {
        message, userId, username, avatar, timestamp: new Date(),
      });
    });

    // ============ COMMENT EVENTS ============
    socket.on('comment:new', ({ videoId, comment }) => {
      socket.to(`video:${videoId}`).emit('comment:new', comment);
    });

    // ============ SPATIAL ROOM EVENTS ============
    socket.on('spatial:join', ({ roomCode, userId, displayName, avatar, color }) => {
      socket.join(`spatial:${roomCode}`);
      socket.to(`spatial:${roomCode}`).emit('spatial:user_joined', {
        userId, displayName, avatar, color,
      });
      logger.debug(`User ${userId} joined spatial room: ${roomCode}`);
    });

    socket.on('spatial:leave', ({ roomCode, userId }) => {
      socket.leave(`spatial:${roomCode}`);
      socket.to(`spatial:${roomCode}`).emit('spatial:user_left', { userId });
    });

    // Position update — broadcast to all others in the room
    socket.on('spatial:move', ({ roomCode, userId, x, y }) => {
      socket.to(`spatial:${roomCode}`).emit('spatial:move', { userId, x, y });
    });

    // Megaphone — host broadcasts to entire room
    socket.on('spatial:megaphone', ({ roomCode, userId, active }) => {
      io.to(`spatial:${roomCode}`).emit('spatial:megaphone', { userId, active });
    });

    // Spotlight / Tractor Beam — host pulls a user to center
    socket.on('spatial:spotlight', ({ roomCode, targetUserId }) => {
      io.to(`spatial:${roomCode}`).emit('spatial:spotlight', { targetUserId });
    });

    // Chat message in spatial room
    socket.on('spatial:chat', ({ roomCode, message, userId, username, avatar }) => {
      io.to(`spatial:${roomCode}`).emit('spatial:chat', {
        message, userId, username, avatar, timestamp: new Date(),
      });
    });

    // Reaction burst in spatial room
    socket.on('spatial:reaction', ({ roomCode, emoji, userId, x, y }) => {
      io.to(`spatial:${roomCode}`).emit('spatial:reaction', { emoji, userId, x, y });
    });

    // ============ DREAMSCAPE CANVAS EVENTS ============
    socket.on('canvas:join', (roomId) => {
      socket.join(`canvas:${roomId}`);
    });

    socket.on('canvas:leave', (roomId) => {
      socket.leave(`canvas:${roomId}`);
    });

    // Asset placed on canvas
    socket.on('canvas:add_asset', ({ roomId, asset }) => {
      socket.to(`canvas:${roomId}`).emit('canvas:add_asset', asset);
    });

    // Asset moved/resized on canvas
    socket.on('canvas:move_asset', ({ roomId, assetId, x, y }) => {
      socket.to(`canvas:${roomId}`).emit('canvas:move_asset', { assetId, x, y });
    });

    // Drawing path added
    socket.on('canvas:draw', ({ roomId, path }) => {
      socket.to(`canvas:${roomId}`).emit('canvas:draw', path);
    });

    // Drawing in progress (live cursor streaming)
    socket.on('canvas:draw_progress', ({ roomId, pathId, point }) => {
      socket.to(`canvas:${roomId}`).emit('canvas:draw_progress', { pathId, point });
    });

    // ============ NOTIFICATION EVENTS ============
    // Notifications are pushed server-side via getIO()

    // ============ DISCONNECT ============
    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info('✅ Socket.IO initialized');
  return io;
};

/**
 * Send notification to a specific user
 */
export const sendNotification = (userId, notification) => {
  if (io) {
    io.to(`user:${userId}`).emit('notification:new', notification);
  }
};

/**
 * Broadcast to all sockets in a room
 */
export const broadcastToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};
