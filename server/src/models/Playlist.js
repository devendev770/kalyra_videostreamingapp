import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      maxlength: 5000,
      default: '',
    },
    thumbnailUrl: String,
    videos: [
      {
        videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    visibility: {
      type: String,
      enum: ['public', 'private', 'unlisted'],
      default: 'public',
    },
    videoCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

playlistSchema.index({ userId: 1, createdAt: -1 });

const Playlist = mongoose.model('Playlist', playlistSchema);
export default Playlist;
