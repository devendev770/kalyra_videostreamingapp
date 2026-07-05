import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../middlewares/errorHandler.js';
import {
  generateAccessToken, generateRefreshToken, setAuthCookies,
  clearAuthCookies, generateRandomToken, generateOTP,
} from '../utils/token.js';
import { sendVerificationEmail, sendPasswordResetOTP } from '../config/mail.js';
import { configurePassport } from '../config/passport.js';
import passport from 'passport';

configurePassport();

// Register
export const register = async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      throw new AppError(
        existingUser.email === email ? 'Email already registered' : 'Username already taken',
        409
      );
    }

    const verificationToken = generateRandomToken();
    const role = (process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) ? 'admin' : 'user';
    const user = await User.create({
      username,
      email,
      password,
      displayName: displayName || username,
      role,
      verificationToken,
      verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await sendVerificationEmail(email, verificationToken);

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: req.headers['user-agent'],
    });
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        isVerified: user.isVerified,
      },
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// Login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !user.password) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account has been deactivated', 403);
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Auto-promote user to admin if email matches ADMIN_EMAIL
    if (process.env.ADMIN_EMAIL && user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase() && user.role !== 'admin') {
      user.role = 'admin';
    }

    user.cleanExpiredTokens();
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: req.headers['user-agent'],
    });
    user.lastLogin = new Date();
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        banner: user.banner,
        role: user.role,
        isVerified: user.isVerified,
        subscriberCount: user.subscriberCount,
      },
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// Logout
export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken && req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { token: refreshToken } },
      });
    }
    clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// Refresh Token
export const refreshAccessToken = async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    if (!oldRefreshToken) {
      throw new AppError('Refresh token required', 401);
    }

    const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId).select('+refreshTokens');

    if (!user) {
      throw new AppError('User not found', 401);
    }

    const tokenIndex = user.refreshTokens.findIndex((rt) => rt.token === oldRefreshToken);
    if (tokenIndex === -1) {
      // Token reuse detected — invalidate all sessions
      user.refreshTokens = [];
      await user.save();
      clearAuthCookies(res);
      throw new AppError('Token reuse detected. All sessions invalidated.', 401);
    }

    // Rotate refresh token
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshTokens.splice(tokenIndex, 1);
    user.cleanExpiredTokens();
    user.refreshTokens.push({
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      userAgent: req.headers['user-agent'],
    });
    await user.save();

    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json({
      success: true,
      accessToken: newAccessToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Verify Email
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
};

// Forgot Password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If the email exists, an OTP has been sent.' });
    }

    const otp = generateOTP();
    user.passwordResetOTP = otp;
    user.passwordResetOTPExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendPasswordResetOTP(email, otp);

    res.json({ success: true, message: 'If the email exists, an OTP has been sent.' });
  } catch (error) {
    next(error);
  }
};

// Reset Password
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      passwordResetOTP: otp,
      passwordResetOTPExpiry: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    user.password = newPassword;
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpiry = undefined;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    res.json({ success: true, message: 'Password reset successful. Please login.' });
  } catch (error) {
    next(error);
  }
};

// Google OAuth
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account',
  session: false,
});

export const googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=oauth_failed`);
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    user.lastLogin = new Date();
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${accessToken}`);
  })(req, res, next);
};

// Get current user
export const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};
