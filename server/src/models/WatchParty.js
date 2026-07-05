import mongoose from 'mongoose';

const watchPartySchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
    },
    roomCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        joinedAt: { type: Date, default: Date.now },
        role: { type: String, enum: ['host', 'cohost', 'viewer'], default: 'viewer' },
      },
    ],
    maxParticipants: { type: Number, default: 50 },
    status: {
      type: String,
      enum: ['waiting', 'playing', 'paused', 'ended'],
      default: 'waiting',
    },
    currentTime: { type: Number, default: 0 },
    isPlaying: { type: Boolean, default: false },
    chatEnabled: { type: Boolean, default: true },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

watchPartySchema.index({ status: 1 });
watchPartySchema.index({ hostId: 1, status: 1 });

const WatchParty = mongoose.model('WatchParty', watchPartySchema);
export default WatchParty;
