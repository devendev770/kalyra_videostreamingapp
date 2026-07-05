import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

const s3Client = new S3Client({
  endpoint: process.env.B2_ENDPOINT,
  region: process.env.B2_REGION || 'us-west-004',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.B2_BUCKET_NAME || 'streamvibe-videos';

/**
 * Upload a file to Backblaze B2
 * @param {string} filePath - Local file path
 * @param {string} key - S3 key (remote path)
 * @param {string} contentType - MIME type
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{url: string, key: string}>}
 */
export const uploadToB2 = async (filePath, key, contentType, onProgress) => {
  const fileStream = fs.createReadStream(filePath);
  const fileSize = fs.statSync(filePath).size;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
    },
    queueSize: 4,
    partSize: 10 * 1024 * 1024, // 10MB parts
    leavePartsOnError: false,
  });

  if (onProgress) {
    upload.on('httpUploadProgress', (progress) => {
      const percent = Math.round((progress.loaded / fileSize) * 100);
      onProgress(percent);
    });
  }

  await upload.done();
  const url = `${process.env.B2_ENDPOINT}/${BUCKET}/${key}`;
  logger.info(`Uploaded to B2: ${key}`);
  return { url, key };
};

/**
 * Upload a buffer to B2
 */
export const uploadBufferToB2 = async (buffer, key, contentType) => {
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  const url = `${process.env.B2_ENDPOINT}/${BUCKET}/${key}`;
  return { url, key };
};

/**
 * Delete a file from B2
 */
export const deleteFromB2 = async (key) => {
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));
    logger.info(`Deleted from B2: ${key}`);
  } catch (error) {
    logger.error(`Failed to delete from B2: ${key}`, error);
    throw error;
  }
};

/**
 * Upload a directory (HLS segments) to B2
 */
export const uploadDirectoryToB2 = async (dirPath, keyPrefix) => {
  const files = fs.readdirSync(dirPath);
  const uploadPromises = files.map((file) => {
    const filePath = path.join(dirPath, file);
    const key = `${keyPrefix}/${file}`;
    const ext = path.extname(file).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.m3u8') contentType = 'application/x-mpegURL';
    else if (ext === '.ts') contentType = 'video/MP2T';
    else if (ext === '.mp4') contentType = 'video/mp4';
    return uploadToB2(filePath, key, contentType);
  });
  return Promise.all(uploadPromises);
};

export { s3Client, BUCKET };
