import './loadEnv.js';

import http from 'http';
import app from './src/app.js';
import { connectDB } from './src/config/database.js';
import { initSocketIO } from './src/sockets/index.js';
import { startMediaServer } from './src/media/mediaServer.js';
import { logger } from './src/config/logger.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.IO
initSocketIO(server);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Node Media Server for live streaming
    startMediaServer();

    server.listen(PORT, () => {
      logger.info(`🚀 Kalyra server running on port ${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
