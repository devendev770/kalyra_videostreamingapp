import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { mongoSanitize } from './middlewares/mongoSanitize.js';
import hpp from 'hpp';
import path from 'path';

import { logger } from './config/logger.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import videoRoutes from './routes/video.routes.js';
import commentRoutes from './routes/comment.routes.js';
import playlistRoutes from './routes/playlist.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import watchPartyRoutes from './routes/watchParty.routes.js';
import liveRoutes from './routes/live.routes.js';
import shortRoutes from './routes/short.routes.js';
import communityRoutes from './routes/community.routes.js';
import studioRoutes from './routes/studio.routes.js';
import adminRoutes from './routes/admin.routes.js';
import searchRoutes from './routes/search.routes.js';
import spatialRoomRoutes from './routes/spatialRoom.routes.js';
import dreamscapeRoutes from './routes/dreamscape.routes.js';

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable default CSP to allow YouTube embeds and external media
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Data sanitization against NoSQL injection
app.use(mongoSanitize);

// Prevent HTTP parameter pollution
app.use(hpp());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// Serve uploaded media files (videos, thumbnails, images)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mp4')) res.setHeader('Content-Type', 'video/mp4');
    else if (filePath.endsWith('.webm')) res.setHeader('Content-Type', 'video/webm');
    else if (filePath.endsWith('.m3u8')) res.setHeader('Content-Type', 'application/x-mpegURL');
    else if (filePath.endsWith('.ts')) res.setHeader('Content-Type', 'video/MP2T');
  },
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/watch-party', watchPartyRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/shorts', shortRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/studio', studioRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/spatial', spatialRoomRoutes);
app.use('/api/dreamscape', dreamscapeRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
