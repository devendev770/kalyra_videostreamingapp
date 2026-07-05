import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from './errorHandler.js';

/**
 * Authenticate JWT from HTTP-only cookie or Authorization header
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId).select('-refreshTokens');

        if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account has been deactivated', 403);
    }

    // Auto-promote user to admin if email matches ADMIN_EMAIL
    if (process.env.ADMIN_EMAIL && user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase() && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token', 401));
    }
    next(error);
  }
};

/**
 * Optional authentication — sets req.user if token exists, but doesn't fail
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = await User.findById(decoded.userId).select('-refreshTokens');
    }
  } catch {
    // Silently fail — user just won't be authenticated
  }
  next();
};

/**
 * Role-based authorization
 * @param  {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
};
