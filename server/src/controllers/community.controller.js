import CommunityPost from '../models/CommunityPost.js';
import Like from '../models/Like.js';
import { AppError } from '../middlewares/errorHandler.js';

export const createPost = async (req, res, next) => {
  try {
    const postData = { userId: req.user._id, text: req.body.text, type: req.body.type || 'text' };
    if (req.body.type === 'poll' && req.body.poll) {
      postData.poll = { question: req.body.poll.question, options: req.body.poll.options.map((o) => ({ text: o.text })), endsAt: req.body.poll.endsAt };
    }
    if (req.files?.length) postData.images = req.files.map((f) => f.path);
    const post = await CommunityPost.create(postData);
    await post.populate('userId', 'username displayName avatar');
    res.status(201).json({ success: true, post });
  } catch (error) { next(error); }
};

export const getPosts = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const query = userId ? { userId } : {};
    const posts = await CommunityPost.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'username displayName avatar');
    const total = await CommunityPost.countDocuments(query);
    res.json({ success: true, posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

export const getPost = async (req, res, next) => {
  try {
    const post = await CommunityPost.findById(req.params.id).populate('userId', 'username displayName avatar');
    if (!post) throw new AppError('Post not found', 404);
    res.json({ success: true, post });
  } catch (error) { next(error); }
};

export const deletePost = async (req, res, next) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) throw new AppError('Post not found', 404);
    if (post.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') throw new AppError('Not authorized', 403);
    await CommunityPost.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) { next(error); }
};

export const togglePostLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await Like.findOne({ userId: req.user._id, targetId: id, targetType: 'post' });
    if (existing) {
      await Like.findByIdAndDelete(existing._id);
      await CommunityPost.findByIdAndUpdate(id, { $inc: { likes: -1 } });
      return res.json({ success: true, liked: false });
    }
    await Like.create({ userId: req.user._id, targetId: id, targetType: 'post', type: 'like' });
    await CommunityPost.findByIdAndUpdate(id, { $inc: { likes: 1 } });
    res.json({ success: true, liked: true });
  } catch (error) { next(error); }
};

export const votePoll = async (req, res, next) => {
  try {
    const { optionId } = req.body;
    const post = await CommunityPost.findById(req.params.id);
    if (!post || post.type !== 'poll') throw new AppError('Poll not found', 404);
    if (post.poll.endsAt && new Date() > post.poll.endsAt) throw new AppError('Poll has ended', 400);
    const alreadyVoted = post.poll.options.some((o) => o.voters.includes(req.user._id));
    if (alreadyVoted) throw new AppError('Already voted', 400);
    const option = post.poll.options.id(optionId);
    if (!option) throw new AppError('Option not found', 404);
    option.votes += 1;
    option.voters.push(req.user._id);
    post.poll.totalVotes += 1;
    await post.save();
    res.json({ success: true, poll: post.poll });
  } catch (error) { next(error); }
};
