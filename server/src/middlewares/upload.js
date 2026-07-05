import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from './errorHandler.js';

// Ensure upload directories exist
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');
const CHUNKS_DIR = path.join(UPLOAD_DIR, 'chunks');
[UPLOAD_DIR, TEMP_DIR, CHUNKS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Video upload storage
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

// Image upload storage (avatars, banners, thumbnails)
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `img_${uuidv4()}${ext}`);
  },
});

// Chunk upload storage
const chunkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadId = req.body.uploadId || req.query.uploadId;
    const chunkDir = path.join(CHUNKS_DIR, uploadId);
    if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });
    cb(null, chunkDir);
  },
  filename: (req, file, cb) => {
    const chunkIndex = req.body.chunkIndex || req.query.chunkIndex || '0';
    cb(null, `chunk_${chunkIndex}`);
  },
});

// File filters
const videoFilter = (req, file, cb) => {
  const allowedMimes = [
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
    'video/x-matroska', 'video/mpeg', 'application/octet-stream',
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only video files are allowed', 400), false);
  }
};

const imageFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files (JPEG, PNG, GIF, WebP) are allowed', 400), false);
  }
};

const subtitleFilter = (req, file, cb) => {
  const allowedExts = ['.vtt', '.srt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError('Only VTT and SRT subtitle files are allowed', 400), false);
  }
};

// Export multer instances
export const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10GB
});

export const uploadChunk = multer({
  storage: chunkStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per chunk
});

export const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const uploadSubtitle = multer({
  storage: imageStorage,
  fileFilter: subtitleFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export { UPLOAD_DIR, TEMP_DIR, CHUNKS_DIR };
