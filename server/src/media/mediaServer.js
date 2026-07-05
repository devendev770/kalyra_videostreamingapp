import NodeMediaServer from 'node-media-server';
import LiveStream from '../models/LiveStream.js';
import { logger } from '../config/logger.js';
import { getIO } from '../sockets/index.js';

let nms = null;

export const startMediaServer = () => {
  const ffmpegPath = process.env.FFMPEG_PATH;

  const config = {
    rtmp: {
      port: parseInt(process.env.NMS_RTMP_PORT, 10) || 1935,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60,
    },
    http: {
      port: parseInt(process.env.NMS_HTTP_PORT, 10) || 8000,
      allow_origin: '*',
      mediaroot: './media',
    },
    // Only enable HLS transcoding if FFmpeg is available
    ...(ffmpegPath && {
      trans: {
        ffmpeg: ffmpegPath,
        tasks: [
          {
            app: 'live',
            hls: true,
            hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
            dash: false,
          },
        ],
      },
    }),
  };

  if (!ffmpegPath) {
    logger.warn('⚠️ FFmpeg not configured — live HLS transcoding is disabled. Set FFMPEG_PATH in .env to enable.');
  }

  nms = new NodeMediaServer(config);

  // Authentication: verify stream key
  nms.on('prePublish', async (id, streamPath, args) => {
    const streamKey = streamPath.split('/').pop();
    logger.info(`Stream publish attempt: ${streamPath}`);

    try {
      const stream = await LiveStream.findOne({ streamKey, status: { $ne: 'ended' } });
      if (!stream) {
        logger.warn(`Invalid stream key: ${streamKey}`);
        const session = nms.getSession(id);
        if (session) session.reject();
        return;
      }

      // Update stream status with both HLS and FLV playback URLs
      const updatedStream = await LiveStream.findByIdAndUpdate(stream._id, {
        status: 'live',
        startedAt: new Date(),
        hlsUrl: `/live/${streamKey}/index.m3u8`,
        flvUrl: `/live/${streamKey}.flv`,
      }, { new: true }).populate('userId', 'username displayName avatar subscriberCount');

      const io = getIO();
      // Notify clients who are already on the live room page
      io?.emit('live:started', { streamId: stream._id, userId: stream.userId });
      // Broadcast the full stream data so the LiveStreams listing page can update in real-time
      io?.emit('live:stream_update', { stream: updatedStream });

      logger.info(`Stream started: ${stream._id}`);
    } catch (error) {
      logger.error('Stream auth error:', error);
    }
  });

  nms.on('donePublish', async (id, streamPath) => {
    const streamKey = streamPath.split('/').pop();
    logger.info(`Stream ended: ${streamPath}`);

    try {
      const stream = await LiveStream.findOneAndUpdate(
        { streamKey, status: 'live' },
        { status: 'ended', endedAt: new Date() },
        { new: true }
      );

      if (stream) {
        const io = getIO();
        io?.to(`live:${stream._id}`).emit('live:ended', { streamId: stream._id });
        io?.emit('live:ended', { streamId: stream._id });
      }
    } catch (error) {
      logger.error('Stream end error:', error);
    }
  });

  nms.run();
  logger.info(`✅ Node Media Server running (RTMP: ${config.rtmp.port}, HTTP: ${config.http.port})`);

  return nms;
};

export const getMediaServer = () => nms;
