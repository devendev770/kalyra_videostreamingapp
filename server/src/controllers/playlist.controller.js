import Playlist from '../models/Playlist.js';
import { AppError } from '../middlewares/errorHandler.js';

// Create playlist
export const createPlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, playlist });
  } catch (error) {
    next(error);
  }
};

// Get user playlists
export const getUserPlaylists = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user._id;
    const query = { userId };
    if (userId.toString() !== req.user?._id?.toString()) {
      query.visibility = 'public';
    }
    const playlists = await Playlist.find(query).sort({ updatedAt: -1 });
    res.json({ success: true, playlists });
  } catch (error) {
    next(error);
  }
};

// Get single playlist
export const getPlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate({
        path: 'videos.videoId',
        select: 'title thumbnailUrl duration views userId createdAt',
        populate: { path: 'userId', select: 'username displayName avatar' },
      })
      .populate('userId', 'username displayName avatar');

    if (!playlist) throw new AppError('Playlist not found', 404);
    if (playlist.visibility === 'private' && playlist.userId._id.toString() !== req.user?._id?.toString()) {
      throw new AppError('Playlist not found', 404);
    }

    res.json({ success: true, playlist });
  } catch (error) {
    next(error);
  }
};

// Update playlist
export const updatePlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) throw new AppError('Playlist not found', 404);
    if (playlist.userId.toString() !== req.user._id.toString()) throw new AppError('Not authorized', 403);

    Object.assign(playlist, req.body);
    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    next(error);
  }
};

// Delete playlist
export const deletePlaylist = async (req, res, next) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) throw new AppError('Playlist not found', 404);
    if (playlist.userId.toString() !== req.user._id.toString()) throw new AppError('Not authorized', 403);

    await Playlist.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Playlist deleted' });
  } catch (error) {
    next(error);
  }
};

// Add video to playlist
export const addToPlaylist = async (req, res, next) => {
  try {
    const { videoId } = req.body;
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) throw new AppError('Playlist not found', 404);
    if (playlist.userId.toString() !== req.user._id.toString()) throw new AppError('Not authorized', 403);

    const exists = playlist.videos.some((v) => v.videoId.toString() === videoId);
    if (exists) throw new AppError('Video already in playlist', 409);

    playlist.videos.push({ videoId });
    playlist.videoCount = playlist.videos.length;
    await playlist.save();

    res.json({ success: true, playlist });
  } catch (error) {
    next(error);
  }
};

// Remove video from playlist
export const removeFromPlaylist = async (req, res, next) => {
  try {
    const { videoId } = req.params;
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) throw new AppError('Playlist not found', 404);
    if (playlist.userId.toString() !== req.user._id.toString()) throw new AppError('Not authorized', 403);

    playlist.videos = playlist.videos.filter((v) => v.videoId.toString() !== videoId);
    playlist.videoCount = playlist.videos.length;
    await playlist.save();

    res.json({ success: true, playlist });
  } catch (error) {
    next(error);
  }
};
