import Notification from '../models/Notification.js';

// Get notifications
export const getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'username displayName avatar');

    const total = await Notification.countDocuments({ userId: req.user._id });
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// Mark as read
export const markAsRead = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (ids && ids.length) {
      await Notification.updateMany({ _id: { $in: ids }, userId: req.user._id }, { read: true });
    } else {
      await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Delete notification
export const deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Get unread count
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user._id, read: false });
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
};
