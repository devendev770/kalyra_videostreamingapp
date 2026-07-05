import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Local file path or data URI
 * @param {string} folder - Cloudinary folder
 * @param {Object} options - Additional options
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadImage = async (filePath, folder = 'streamvibe', options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
      ],
      ...options,
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    logger.error('Cloudinary upload failed:', error);
    throw error;
  }
};

/**
 * Upload avatar with specific transformations
 */
export const uploadAvatar = async (filePath) => {
  return uploadImage(filePath, 'streamvibe/avatars', {
    transformation: [
      { width: 300, height: 300, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });
};

/**
 * Upload channel banner
 */
export const uploadBanner = async (filePath) => {
  return uploadImage(filePath, 'streamvibe/banners', {
    transformation: [
      { width: 2048, height: 1152, crop: 'fill' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });
};

/**
 * Upload thumbnail
 */
export const uploadThumbnail = async (filePath) => {
  return uploadImage(filePath, 'streamvibe/thumbnails', {
    transformation: [
      { width: 1280, height: 720, crop: 'fill' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });
};

/**
 * Delete image from Cloudinary
 */
export const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Deleted from Cloudinary: ${publicId}`);
  } catch (error) {
    logger.error('Cloudinary delete failed:', error);
  }
};

export default cloudinary;
