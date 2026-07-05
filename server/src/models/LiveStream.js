import mongoose from 'mongoose';
import crypto from 'crypto';

const liveStreamSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 5000,
      default: '',
    },
    thumbnailUrl: String,
    streamKey: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(20).toString('hex'),
    },
    status: {
      type: String,
      enum: ['idle', 'live', 'ended'],
      default: 'idle',
      index: true,
    },
    hlsUrl: String,
    flvUrl: String,
    viewerCount: { type: Number, default: 0 },
    peakViewers: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    chatEnabled: { type: Boolean, default: true },
    dvrEnabled: { type: Boolean, default: true },
    category: {
      type: String,
      enum: [
        'music', 'gaming', 'education', 'entertainment', 'sports',
        'news', 'technology', 'cooking', 'travel', 'other',
      ],
      default: 'other',
    },
    startedAt: Date,
    endedAt: Date,
    archiveVideoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
    },
    tags: [String],
  },
  { timestamps: true }
);

liveStreamSchema.index({ status: 1, viewerCount: -1 });
liveStreamSchema.index({ userId: 1, createdAt: -1 });

const LiveStream = mongoose.model('LiveStream', liveStreamSchema);
export default LiveStream;
