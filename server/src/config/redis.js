import Redis from 'ioredis';
import { logger } from './logger.js';

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  // Enable TLS for cloud Redis providers
  ...(process.env.REDIS_TLS === 'true' && { tls: { rejectUnauthorized: false } }),
  retryStrategy: (times) => {
    if (times > 10) {
      logger.error('Redis: max retries reached');
      return null;
    }
    return Math.min(times * 200, 5000);
  },
};

export const redis = new Redis(redisConfig);

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('error', (err) => logger.error('Redis error:', err));

export const cacheGet = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (key, value, ttlSeconds = 300) => {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn('Redis cacheSet failed:', err.message);
  }
};

export const cacheDel = async (key) => {
  try {
    await redis.del(key);
  } catch (err) {
    logger.warn('Redis cacheDel failed:', err.message);
  }
};

export const cacheDelPattern = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    logger.warn('Redis cacheDelPattern failed:', err.message);
  }
};
