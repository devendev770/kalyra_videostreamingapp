import mongoose from 'mongoose';

const watchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    progress: {
      type: Number,
      default: 0, // seconds watched
    },
    completed: {
      type: Boolean,
      default: false,
    },
    watchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

watchHistorySchema.index({ userId: 1, watchedAt: -1 });
watchHistorySchema.index({ userId: 1, videoId: 1 }, { unique: true });

const WatchHistory = mongoose.model('WatchHistory', watchHistorySchema);
export default WatchHistory;
