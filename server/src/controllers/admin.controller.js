import User from '../models/User.js';
import Video from '../models/Video.js';
import Comment from '../models/Comment.js';
import Report from '../models/Report.js';
import AuditLog from '../models/AuditLog.js';
import LiveStream from '../models/LiveStream.js';
import { AppError } from '../middlewares/errorHandler.js';
import { readEnv, writeEnv } from '../utils/envHelper.js';

// Admin dashboard stats
export const getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalVideos, totalComments, pendingReports, activeStreams] = await Promise.all([
      User.countDocuments(), Video.countDocuments(), Comment.countDocuments(),
      Report.countDocuments({ status: 'pending' }), LiveStream.countDocuments({ status: 'live' }),
    ]);
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } });
    const newVideosToday = await Video.countDocuments({ createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } });
    res.json({ success: true, stats: { totalUsers, totalVideos, totalComments, pendingReports, activeStreams, newUsersToday, newVideosToday } });
  } catch (error) { next(error); }
};

// Get all users (admin)
export const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search;
    const query = {};
    if (search) query.$or = [{ username: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    const users = await User.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-refreshTokens');
    const total = await User.countDocuments(query);
    res.json({ success: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// Ban/unban user
export const toggleUserBan = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    user.isActive = !user.isActive;
    await user.save();
    await AuditLog.create({ userId: req.user._id, action: user.isActive ? 'user_unban' : 'user_ban', targetType: 'user', targetId: user._id, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ success: true, user: { _id: user._id, isActive: user.isActive } });
  } catch (error) { next(error); }
};

// Change user role
export const changeUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'creator', 'admin'].includes(role)) throw new AppError('Invalid role', 400);
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) throw new AppError('User not found', 404);
    await AuditLog.create({ userId: req.user._id, action: 'user_role_change', targetType: 'user', targetId: user._id, details: { newRole: role }, ipAddress: req.ip });
    res.json({ success: true, user: { _id: user._id, role: user.role } });
  } catch (error) { next(error); }
};

// Get all videos (admin)
export const getAdminVideos = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const status = req.query.status;
    const query = {};
    if (status) query.status = status;
    const videos = await Video.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'username displayName avatar');
    const total = await Video.countDocuments(query);
    res.json({ success: true, videos, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// Remove video (admin)
export const removeVideo = async (req, res, next) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);
    if (!video) throw new AppError('Video not found', 404);
    await AuditLog.create({ userId: req.user._id, action: 'video_remove', targetType: 'video', targetId: req.params.id, details: { title: video.title }, ipAddress: req.ip });
    res.json({ success: true, message: 'Video removed' });
  } catch (error) { next(error); }
};

// Get reports
export const getReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const status = req.query.status || 'pending';
    const reports = await Report.find({ status }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('reporterId', 'username displayName');
    const total = await Report.countDocuments({ status });
    res.json({ success: true, reports, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// Resolve report
export const resolveReport = async (req, res, next) => {
  try {
    const { status, reviewNote, actionTaken } = req.body;
    const report = await Report.findByIdAndUpdate(req.params.id, { status, reviewNote, actionTaken, reviewedBy: req.user._id }, { new: true });
    if (!report) throw new AppError('Report not found', 404);
    await AuditLog.create({ userId: req.user._id, action: status === 'resolved' ? 'report_resolve' : 'report_dismiss', targetType: 'report', targetId: report._id, details: { actionTaken }, ipAddress: req.ip });
    res.json({ success: true, report });
  } catch (error) { next(error); }
};

// Create report
export const createReport = async (req, res, next) => {
  try {
    const report = await Report.create({ reporterId: req.user._id, ...req.body });
    res.status(201).json({ success: true, report });
  } catch (error) { next(error); }
};

// Get audit logs
export const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = await AuditLog.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'username displayName');
    const total = await AuditLog.countDocuments();
    res.json({ success: true, logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

// Admin analytics
export const getAdminAnalytics = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const videoGrowth = await Video.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const topCategories = await Video.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 }, totalViews: { $sum: '$views' } } },
      { $sort: { totalViews: -1 } },
    ]);
    res.json({ success: true, userGrowth, videoGrowth, topCategories });
  } catch (error) { next(error); }
};

// Get admin system credentials
export const getCredentials = async (req, res, next) => {
  try {
    const credentials = readEnv();
    res.json({ success: true, credentials });
  } catch (error) {
    next(error);
  }
};

// Update admin system credentials
export const updateCredentials = async (req, res, next) => {
  try {
    const updates = req.body;
    writeEnv(updates);
    
    // Log action to security audit logs
    await AuditLog.create({
      userId: req.user._id,
      action: 'system_config_change',
      targetType: 'system',
      details: { updatedKeys: Object.keys(updates) },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, message: 'System configuration updated successfully' });
  } catch (error) {
    next(error);
  }
};
