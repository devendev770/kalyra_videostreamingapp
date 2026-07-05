import Comment from '../models/Comment.js';
import Video from '../models/Video.js';
import Like from '../models/Like.js';
import Notification from '../models/Notification.js';
import { AppError } from '../middlewares/errorHandler.js';
import { sendNotification } from '../sockets/index.js';

// Get comments for a video
export const getComments = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const sort = req.query.sort === 'new' ? { createdAt: -1 } : { isPinned: -1, likes: -1, createdAt: -1 };

    const comments = await Comment.find({ videoId, parentId: null, isDeleted: false })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'username displayName avatar');

    const total = await Comment.countDocuments({ videoId, parentId: null, isDeleted: false });

    // Get user like status for each comment
    let commentsWithLikes = comments;
    if (req.user) {
      const commentIds = comments.map((c) => c._id);
      const userLikes = await Like.find({
        userId: req.user._id,
        targetId: { $in: commentIds },
        targetType: 'comment',
      });
      const likeMap = {};
      userLikes.forEach((l) => { likeMap[l.targetId.toString()] = l.type; });
      commentsWithLikes = comments.map((c) => ({
        ...c.toJSON(),
        userLikeStatus: likeMap[c._id.toString()] || null,
      }));
    }

    res.json({
      success: true,
      comments: commentsWithLikes,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// Get replies
export const getReplies = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const replies = await Comment.find({ parentId: commentId, isDeleted: false })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'username displayName avatar');

    const total = await Comment.countDocuments({ parentId: commentId, isDeleted: false });

    res.json({
      success: true,
      replies,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// Add comment
export const addComment = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const { text, parentId } = req.body;

    const video = await Video.findById(videoId).lean();
    if (!video) throw new AppError('Video not found', 404);
    if (!video.allowComments) throw new AppError('Comments are disabled', 403);

    const comment = await Comment.create({
      videoId,
      userId: req.user._id,
      text,
      parentId: parentId || null,
    });

    // Respond immediately after creating comment, run side-effects in parallel
    const populatePromise = comment.populate('userId', 'username displayName avatar');

    // Fire-and-forget: update counts + notify in parallel
    const sideEffects = [
      Video.findByIdAndUpdate(videoId, { $inc: { commentCount: 1 } }),
    ];
    if (parentId) {
      sideEffects.push(Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } }));
    }
    if (video.userId.toString() !== req.user._id.toString()) {
      sideEffects.push(
        Notification.create({
          userId: video.userId,
          type: parentId ? 'reply' : 'comment',
          title: parentId ? 'New Reply' : 'New Comment',
          message: `${req.user.displayName} ${parentId ? 'replied to a comment' : 'commented'} on your video "${video.title}"`,
          senderId: req.user._id,
          actionUrl: `/watch/${videoId}`,
          thumbnail: req.user.avatar,
        }).then((n) => sendNotification(video.userId.toString(), n))
      );
    }

    // Wait only for populate (needed for response), side-effects run in background
    await populatePromise;
    Promise.all(sideEffects).catch((err) => console.error('Comment side-effect error:', err));

    res.status(201).json({ success: true, comment });
  } catch (error) {
    next(error);
  }
};

// Update comment
export const updateComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);
    if (!comment) throw new AppError('Comment not found', 404);
    if (comment.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized', 403);
    }

    comment.text = req.body.text;
    comment.isEdited = true;
    await comment.save();
    await comment.populate('userId', 'username displayName avatar');

    res.json({ success: true, comment });
  } catch (error) {
    next(error);
  }
};

// Delete comment
export const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);
    if (!comment) throw new AppError('Comment not found', 404);

    const video = await Video.findById(comment.videoId);
    if (
      comment.userId.toString() !== req.user._id.toString() &&
      video?.userId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      throw new AppError('Not authorized', 403);
    }

    comment.isDeleted = true;
    comment.text = '[Deleted]';
    await comment.save();

    await Video.findByIdAndUpdate(comment.videoId, { $inc: { commentCount: -1 } });

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
};

// Pin comment
export const pinComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);
    if (!comment) throw new AppError('Comment not found', 404);

    const video = await Video.findById(comment.videoId);
    if (video?.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Only video owner can pin comments', 403);
    }

    // Unpin any existing pinned comment
    await Comment.updateMany({ videoId: comment.videoId, isPinned: true }, { isPinned: false });
    comment.isPinned = true;
    await comment.save();

    res.json({ success: true, comment });
  } catch (error) {
    next(error);
  }
};

// Heart comment
export const heartComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);
    if (!comment) throw new AppError('Comment not found', 404);

    const video = await Video.findById(comment.videoId);
    if (video?.userId.toString() !== req.user._id.toString()) {
      throw new AppError('Only video owner can heart comments', 403);
    }

    comment.isHearted = !comment.isHearted;
    await comment.save();

    res.json({ success: true, hearted: comment.isHearted });
  } catch (error) {
    next(error);
  }
};

// Like/dislike comment
export const toggleCommentLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    const existing = await Like.findOne({ userId: req.user._id, targetId: id, targetType: 'comment' });

    if (existing) {
      if (existing.type === type) {
        // Respond immediately, update count in background
        Like.findByIdAndDelete(existing._id).catch(() => {});
        Comment.findByIdAndUpdate(id, { $inc: { [type === 'like' ? 'likes' : 'dislikes']: -1 } }).catch(() => {});
        return res.json({ success: true, action: 'removed' });
      }
      const oldType = existing.type;
      existing.type = type;
      existing.save().catch(() => {});
      Comment.findByIdAndUpdate(id, {
        $inc: { [oldType === 'like' ? 'likes' : 'dislikes']: -1, [type === 'like' ? 'likes' : 'dislikes']: 1 },
      }).catch(() => {});
      return res.json({ success: true, action: 'switched' });
    }

    Like.create({ userId: req.user._id, targetId: id, targetType: 'comment', type }).catch(() => {});
    Comment.findByIdAndUpdate(id, { $inc: { [type === 'like' ? 'likes' : 'dislikes']: 1 } }).catch(() => {});

    res.json({ success: true, action: 'added' });
  } catch (error) {
    next(error);
  }
};
