import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { logger } from '../config/logger.js';

// Set FFmpeg path if configured
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

/**
 * Get video metadata (duration, resolution, codec)
 */
export const getVideoMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      const audioStream = metadata.streams.find((s) => s.codec_type === 'audio');
      resolve({
        duration: metadata.format.duration,
        size: metadata.format.size,
        bitrate: metadata.format.bit_rate,
        width: videoStream?.width,
        height: videoStream?.height,
        videoCodec: videoStream?.codec_name,
        audioCodec: audioStream?.codec_name,
        fps: videoStream?.r_frame_rate,
      });
    });
  });
};

/**
 * Extract thumbnails from video at intervals
 */
export const extractThumbnails = (filePath, outputDir, count = 3) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const thumbnails = [];
    ffmpeg(filePath)
      .screenshots({
        count,
        folder: outputDir,
        filename: 'thumb_%i.jpg',
        size: '1280x720',
      })
      .on('filenames', (filenames) => {
        filenames.forEach((f) => thumbnails.push(path.join(outputDir, f)));
      })
      .on('end', () => {
        logger.info(`Extracted ${thumbnails.length} thumbnails`);
        resolve(thumbnails);
      })
      .on('error', reject);
  });
};

/**
 * Generate HLS streams at multiple qualities
 */
export const generateHLS = (inputPath, outputDir, onProgress) => {
  return new Promise(async (resolve, reject) => {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    let metadata;
    try {
      metadata = await getVideoMetadata(inputPath);
    } catch (err) {
      return reject(err);
    }

    const sourceHeight = metadata.height || 1080;

    // Determine quality presets based on source resolution
    const presets = [];
    if (sourceHeight >= 1080) presets.push({ label: '1080p', width: 1920, height: 1080, bitrate: '5000k', audioBitrate: '192k' });
    if (sourceHeight >= 720) presets.push({ label: '720p', width: 1280, height: 720, bitrate: '2800k', audioBitrate: '128k' });
    if (sourceHeight >= 480) presets.push({ label: '480p', width: 854, height: 480, bitrate: '1400k', audioBitrate: '128k' });
    presets.push({ label: '360p', width: 640, height: 360, bitrate: '800k', audioBitrate: '96k' });

    const qualities = [];
    let completed = 0;

    const processQuality = (preset) => {
      return new Promise((res, rej) => {
        const qualityDir = path.join(outputDir, preset.label);
        if (!fs.existsSync(qualityDir)) fs.mkdirSync(qualityDir, { recursive: true });
        const outputFile = path.join(qualityDir, 'index.m3u8');

        ffmpeg(inputPath)
          .outputOptions([
            '-c:v h264',
            '-c:a aac',
            `-b:v ${preset.bitrate}`,
            `-b:a ${preset.audioBitrate}`,
            `-vf scale=${preset.width}:${preset.height}`,
            '-preset fast',
            '-g 48',
            '-keyint_min 48',
            '-sc_threshold 0',
            '-hls_time 4',
            '-hls_list_size 0',
            '-hls_segment_filename', path.join(qualityDir, 'segment_%03d.ts'),
            '-f hls',
          ])
          .output(outputFile)
          .on('progress', (progress) => {
            if (onProgress && progress.percent) {
              const totalProgress = ((completed * 100 + progress.percent) / presets.length);
              onProgress(Math.round(totalProgress));
            }
          })
          .on('end', () => {
            completed++;
            qualities.push({
              label: preset.label,
              width: preset.width,
              height: preset.height,
              bitrate: parseInt(preset.bitrate),
              playlistPath: outputFile,
            });
            res();
          })
          .on('error', rej)
          .run();
      });
    };

    try {
      // Process qualities sequentially to avoid CPU overload
      for (const preset of presets) {
        await processQuality(preset);
      }

      // Generate master playlist
      const masterPlaylist = generateMasterPlaylist(qualities);
      const masterPath = path.join(outputDir, 'master.m3u8');
      fs.writeFileSync(masterPath, masterPlaylist);

      resolve({
        masterPlaylistPath: masterPath,
        qualities,
        duration: metadata.duration,
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate HLS master playlist referencing all quality variants
 */
const generateMasterPlaylist = (qualities) => {
  let playlist = '#EXTM3U\n#EXT-X-VERSION:3\n';

  // Sort by resolution descending
  const sorted = [...qualities].sort((a, b) => b.height - a.height);

  for (const q of sorted) {
    playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${q.bitrate * 1000},RESOLUTION=${q.width}x${q.height}\n`;
    playlist += `${q.label}/index.m3u8\n`;
  }

  return playlist;
};

/**
 * Check if a video is vertical (for shorts)
 */
export const isVerticalVideo = async (filePath) => {
  const metadata = await getVideoMetadata(filePath);
  return metadata.height > metadata.width;
};
