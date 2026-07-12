import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  x: { type: Number, default: 0.5 },       // Normalized 0-1 position on map
  y: { type: Number, default: 0.5 },
  color: { type: String, default: '#c9a048' },
  role: { type: String, enum: ['host', 'cohost', 'vip', 'viewer'], default: 'viewer' },
  joinedAt: { type: Date, default: Date.now },
  isMuted: { type: Boolean, default: true },
}, { _id: false });

const spatialRoomSchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
      default: '',
    },
    roomCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      default: null,
    },
    participants: [participantSchema],
    maxParticipants: { type: Number, default: 100 },
    status: {
      type: String,
      enum: ['waiting', 'active', 'ended'],
      default: 'waiting',
    },
    isPublic: { type: Boolean, default: true },
    // Spatial settings
    proximityRadius: { type: Number, default: 0.15 },  // Normalized radius for audio falloff
    // Linked dreamscape canvas
    canvasId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DreamscapeCanvas',
      default: null,
    },
    tags: [String],
    category: {
      type: String,
      enum: ['hangout', 'debate', 'gaming', 'music', 'study', 'watch', 'other'],
      default: 'hangout',
    },
  },
  { timestamps: true }
);

spatialRoomSchema.index({ status: 1, isPublic: 1 });
spatialRoomSchema.index({ hostId: 1, status: 1 });
spatialRoomSchema.index({ createdAt: -1 });

const SpatialRoom = mongoose.model('SpatialRoom', spatialRoomSchema);
export default SpatialRoom;
