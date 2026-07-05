import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  startTime: { type: Number, required: true }, // seconds
}, { _id: false });

const subtitleSchema = new mongoose.Schema({
  language: { type: String, required: true },
  label: { type: String, required: true },
  url: { type: String, required: true },
}, { _id: false });

const videoSchema = new mongoose.Schema(
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
    originalUrl: String,
    originalKey: String,
    hlsUrl: String,
    hlsKey: String,
    qualities: [
      {
        label: String, // '360p', '480p', '720p', '1080p'
        url: String,
        width: Number,
        height: Number,
        bitrate: Number,
      },
    ],
    thumbnailUrl: {
      type: String,
      default: '',
    },
    thumbnailPublicId: String,
    autoThumbnails: [String], // Auto-generated thumbnails from FFmpeg
    duration: {
      type: Number,
      default: 0,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: String,
    videoSource: {
      type: String,
      enum: ['local', 'youtube'],
      default: 'local',
      index: true,
    },
    status: {
      type: String,
      enum: ['uploading', 'processing', 'published', 'draft', 'private', 'unlisted', 'failed', 'scheduled'],
      default: 'uploading',
      index: true,
    },
    processingProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    processingError: String,
    category: {
      type: String,
      enum: [
        'music', 'gaming', 'education', 'entertainment', 'sports',
        'news', 'technology', 'tech', 'cooking', 'travel', 'fashion',
        'comedy', 'film', 'science', 'howto', 'pets', 'autos', 'other',
      ],
      default: 'other',
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    chapters: [chapterSchema],
    subtitles: [subtitleSchema],
    views: {
      type: Number,
      default: 0,
      index: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    isShort: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishAt: {
      type: Date,
      default: null,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    ageRestricted: {
      type: Boolean,
      default: false,
    },
    // Upload tracking
    uploadId: String,
    chunksReceived: { type: Number, default: 0 },
    totalChunks: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
videoSchema.index({ createdAt: -1 });
videoSchema.index({ views: -1, createdAt: -1 });
videoSchema.index({ userId: 1, status: 1 });
videoSchema.index({ category: 1, status: 1, createdAt: -1 });
videoSchema.index({ status: 1, publishAt: 1 });
videoSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Engagement score for ranking
videoSchema.virtual('engagementScore').get(function () {
  const ageHours = (Date.now() - this.createdAt) / 3600000;
  const score = (this.views * 1 + this.likes * 3 - this.dislikes * 2) / Math.pow(ageHours + 2, 1.5);
  return Math.max(0, score);
});

const Video = mongoose.model('Video', videoSchema);
export default Video;
