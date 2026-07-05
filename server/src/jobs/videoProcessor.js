import Bull from 'bull';
import path from 'path';
import fs from 'fs';
import { logger } from '../config/logger.js';
import { generateHLS, extractThumbnails, getVideoMetadata } from '../utils/ffmpeg.js';
import { uploadDirectoryToB2, uploadToB2 } from '../config/b2.js';
import { uploadThumbnail } from '../config/cloudinary.js';
import Video from '../models/Video.js';
import { getIO } from '../sockets/index.js';

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  ...(process.env.REDIS_TLS === 'true' && { tls: { rejectUnauthorized: false } }),
};

// Video processing queue
export const videoQueue = new Bull('video-processing', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 50,
    removeOnFail: 20,
  },
});

// Process video jobs
videoQueue.process(2, async (job) => {
  const { videoId, filePath, userId } = job.data;
  const io = getIO();

  const emitProgress = (stage, percent) => {
    const data = { videoId, stage, percent };
    io?.to(`user:${userId}`).emit('video:processing', data);
    job.progress(percent);
  };

  try {
    // Check if FFmpeg is available
    if (!process.env.FFMPEG_PATH) {
      logger.warn(`FFmpeg not available — publishing video ${videoId} without transcoding`);
      const videoUrl = `/uploads/temp/${path.basename(filePath)}`;
      await Video.findByIdAndUpdate(videoId, {
        originalUrl: videoUrl,
        status: 'published',
        processingProgress: 100,
      });
      emitProgress('complete', 100);
      io?.to(`user:${userId}`).emit('video:ready', { videoId });
      return { videoId, status: 'complete (no ffmpeg)' };
    }

    logger.info(`Processing video: ${videoId}`);
    emitProgress('analyzing', 5);

    // 1. Get metadata
    const metadata = await getVideoMetadata(filePath);
    await Video.findByIdAndUpdate(videoId, {
      duration: Math.round(metadata.duration),
      fileSize: metadata.size,
      status: 'processing',
    });
    emitProgress('metadata', 10);

    // 2. Extract thumbnails
    const thumbDir = path.join(process.cwd(), 'uploads', 'thumbnails', videoId);
    const thumbnailPaths = await extractThumbnails(filePath, thumbDir, 3);
    emitProgress('thumbnails', 20);

    // Upload thumbnails to Cloudinary
    const thumbnailUrls = [];
    for (const thumbPath of thumbnailPaths) {
      const result = await uploadThumbnail(thumbPath);
      thumbnailUrls.push(result.url);
    }
    emitProgress('thumbnails_uploaded', 25);

    // 3. Generate HLS multi-quality
    const hlsDir = path.join(process.cwd(), 'uploads', 'hls', videoId);
    const hlsResult = await generateHLS(filePath, hlsDir, (percent) => {
      emitProgress('encoding', 25 + Math.round(percent * 0.55));
    });
    emitProgress('encoding_complete', 80);

    // 4. Upload HLS to Backblaze B2
    const hlsKey = `videos/${videoId}/hls`;
    await uploadDirectoryToB2(hlsDir, hlsKey);

    // Upload quality subdirectories
    for (const quality of hlsResult.qualities) {
      const qualityDir = path.join(hlsDir, quality.label);
      await uploadDirectoryToB2(qualityDir, `${hlsKey}/${quality.label}`);
    }
    emitProgress('uploading', 95);

    // 5. Update video record
    const hlsUrl = `${process.env.B2_ENDPOINT}/${process.env.B2_BUCKET_NAME}/${hlsKey}/master.m3u8`;
    const qualities = hlsResult.qualities.map((q) => ({
      label: q.label,
      url: `${process.env.B2_ENDPOINT}/${process.env.B2_BUCKET_NAME}/${hlsKey}/${q.label}/index.m3u8`,
      width: q.width,
      height: q.height,
      bitrate: q.bitrate,
    }));

    await Video.findByIdAndUpdate(videoId, {
      hlsUrl,
      hlsKey,
      qualities,
      thumbnailUrl: thumbnailUrls[0] || '',
      autoThumbnails: thumbnailUrls,
      duration: Math.round(hlsResult.duration),
      status: 'draft',
      processingProgress: 100,
    });

    emitProgress('complete', 100);
    io?.to(`user:${userId}`).emit('video:ready', { videoId });

    // Cleanup temp files
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (fs.existsSync(hlsDir)) fs.rmSync(hlsDir, { recursive: true, force: true });
      if (fs.existsSync(thumbDir)) fs.rmSync(thumbDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      logger.warn('Cleanup warning:', cleanupErr.message);
    }

    logger.info(`Video processed successfully: ${videoId}`);
    return { videoId, status: 'complete' };
  } catch (error) {
    logger.error(`Video processing failed: ${videoId}`, error);
    
    // Fallback: publish video from original file so it's still watchable
    try {
      const videoUrl = `/uploads/temp/${path.basename(filePath)}`;
      const existsOnDisk = fs.existsSync(filePath);
      const video = await Video.findById(videoId);
      
      if (video) {
        await Video.findByIdAndUpdate(videoId, {
          originalUrl: existsOnDisk ? videoUrl : video.originalUrl,
          status: 'published',
          processingProgress: 100,
          processingError: `Processing failed (${error.message}). Published with original quality.`,
        });
        logger.info(`Video ${videoId} published with fallback (original quality)`);
        io?.to(`user:${userId}`).emit('video:ready', { videoId });
        return { videoId, status: 'fallback' };
      }
    } catch (fallbackErr) {
      logger.error(`Fallback publish also failed for ${videoId}:`, fallbackErr);
    }
    
    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      processingError: error.message,
    });
    io?.to(`user:${userId}`).emit('video:error', { videoId, error: error.message });
    throw error;
  }
});

videoQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed: ${result?.videoId}`);
});

videoQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err.message);
});

export default videoQueue;
