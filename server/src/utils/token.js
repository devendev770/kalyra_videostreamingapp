import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Generate JWT access token
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  });
};

/**
 * Set auth cookies on response
 */
export const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/auth/refresh',
  });
};

/**
 * Clear auth cookies
 */
export const clearAuthCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
};

/**
 * Generate random token (for email verification)
 */
export const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate OTP (6-digit)
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
