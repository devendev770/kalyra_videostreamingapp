import mongoose from 'mongoose';
import { logger } from './logger.js';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/streamvibe';
  
  // ===== TEMPORARY DIAGNOSTIC LOG =====
  console.log(`[connectDB] MONGODB_URI starts with: ${uri.substring(0, 30)}...`);
  console.log(`[connectDB] Using Atlas: ${uri.includes('mongodb+srv')}`);
  // ===== END DIAGNOSTIC LOG =====
  
  try {
    logger.info('Connecting to MongoDB database...');
    // Reduce timeout so the fallback fires quicker if whitelisted IP issues occur
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 4000,
      socketTimeoutMS: 45000,
    });
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);

    // Clean up stale live streams from previous server sessions
    try {
      const LiveStream = (await import('../models/LiveStream.js')).default;
      const result = await LiveStream.updateMany(
        { status: { $in: ['idle', 'live'] } },
        { status: 'ended', endedAt: new Date() }
      );
      if (result.modifiedCount > 0) {
        logger.info(`🧹 Cleaned up ${result.modifiedCount} stale live stream(s) from previous session`);
      }
    } catch (cleanupErr) {
      logger.warn('Could not clean up stale streams:', cleanupErr.message);
    }

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnect...');
    });

    return conn;
  } catch (error) {
    logger.warn(`⚠️ MONGODB_URI connection failed: ${error.message}`);
    logger.info('🔄 Falling back to in-memory MongoDB server for local development...');
    
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const inMemoryUri = mongod.getUri();
      
      const conn = await mongoose.connect(inMemoryUri);
      logger.info(`✅ In-Memory MongoDB connected: ${inMemoryUri}`);
      
      // Store reference on process or connection to close it properly on exit if needed
      mongoose.connection.on('error', (err) => {
        logger.error('In-memory MongoDB connection error:', err);
      });
      
      return conn;
    } catch (fallbackError) {
      logger.error('❌ MongoDB fallback connection failed:', fallbackError.message);
      process.exit(1);
    }
  }
};
