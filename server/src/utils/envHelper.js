import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve to server/.env (two levels up from src/utils/)
const ENV_PATH = path.resolve(__dirname, '..', '..', '.env');

const ALLOWED_KEYS = [
  'ADMIN_EMAIL',
  'NODE_ENV',
  'PORT',
  'CLIENT_URL',
  'MONGODB_URI',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
  'REDIS_TLS',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRY',
  'JWT_REFRESH_EXPIRY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'B2_ENDPOINT',
  'B2_REGION',
  'B2_KEY_ID',
  'B2_APPLICATION_KEY',
  'B2_BUCKET_NAME',
  'B2_BUCKET_ID',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'NMS_RTMP_PORT',
  'NMS_HTTP_PORT',
  'FFMPEG_PATH'
];

export const readEnv = () => {
  const result = {};

  // Populate default empty structure first
  ALLOWED_KEYS.forEach(key => {
    result[key] = process.env[key] || '';
  });

  if (!fs.existsSync(ENV_PATH)) return result;

  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();

    if (ALLOWED_KEYS.includes(key)) {
      result[key] = val;
    }
  });

  return result;
};

export const writeEnv = (updates) => {
  let content = '';

  if (fs.existsSync(ENV_PATH)) {
    content = fs.readFileSync(ENV_PATH, 'utf-8');
  }

  const lines = content.split(/\r?\n/);
  const keysUpdated = new Set();

  const newLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return line;
    const key = trimmed.substring(0, eqIdx).trim();

    if (updates.hasOwnProperty(key) && ALLOWED_KEYS.includes(key)) {
      keysUpdated.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  // Append new keys that weren't in the original file but are allowed
  Object.keys(updates).forEach(key => {
    if (ALLOWED_KEYS.includes(key) && !keysUpdated.has(key)) {
      newLines.push(`${key}=${updates[key]}`);
    }
  });

  fs.writeFileSync(ENV_PATH, newLines.join('\n'), 'utf-8');

  // Update in-memory process.env
  Object.keys(updates).forEach(key => {
    if (ALLOWED_KEYS.includes(key)) {
      process.env[key] = updates[key];
    }
  });
};
