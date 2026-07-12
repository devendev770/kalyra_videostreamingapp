import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  assetId: { type: String, required: true },         // Unique ID for this canvas asset
  type: {
    type: String,
    enum: ['text', 'emoji', 'drawing', 'image', 'sticker', 'reaction'],
    default: 'text',
  },
  content: { type: String, required: true },          // Text content, emoji char, or image URL
  x: { type: Number, required: true },                // Canvas X position (0-1 normalized)
  y: { type: Number, required: true },                // Canvas Y position (0-1 normalized)
  width: { type: Number, default: 0.1 },
  height: { type: Number, default: 0.05 },
  rotation: { type: Number, default: 0 },
  color: { type: String, default: '#e8c86e' },
  fontSize: { type: Number, default: 14 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Number, default: 0 },            // Video timestamp in seconds when created
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const drawingPathSchema = new mongoose.Schema({
  pathId: { type: String, required: true },
  points: [{ x: Number, y: Number }],                 // Array of normalized coordinates
  color: { type: String, default: '#c9a048' },
  strokeWidth: { type: Number, default: 2 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const dreamscapeCanvasSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'roomType',
      required: true,
    },
    roomType: {
      type: String,
      enum: ['SpatialRoom', 'WatchParty', 'LiveStream'],
      default: 'SpatialRoom',
    },
    title: {
      type: String,
      default: 'Untitled Canvas',
      trim: true,
    },
    assets: [assetSchema],
    drawings: [drawingPathSchema],
    status: {
      type: String,
      enum: ['active', 'locked', 'archived'],
      default: 'active',
    },
    // Ink system: tracks how much each user can contribute
    inkLedger: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      inkRemaining: { type: Number, default: 100 },
      totalEarned: { type: Number, default: 100 },
    }],
  },
  { timestamps: true }
);

dreamscapeCanvasSchema.index({ roomId: 1, roomType: 1 });
dreamscapeCanvasSchema.index({ status: 1 });

const DreamscapeCanvas = mongoose.model('DreamscapeCanvas', dreamscapeCanvasSchema);
export default DreamscapeCanvas;
