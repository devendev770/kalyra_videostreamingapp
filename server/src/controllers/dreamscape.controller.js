import DreamscapeCanvas from '../models/DreamscapeCanvas.js';
import { AppError } from '../middlewares/errorHandler.js';

// Get canvas by room
export const getCanvas = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const canvas = await DreamscapeCanvas.findOne({ roomId })
      .populate('assets.createdBy', 'username displayName avatar')
      .populate('drawings.createdBy', 'username displayName avatar');

    if (!canvas) throw new AppError('Canvas not found', 404);
    res.json({ success: true, canvas });
  } catch (error) {
    next(error);
  }
};

// Get canvas by ID (for VOD browsing)
export const getCanvasById = async (req, res, next) => {
  try {
    const canvas = await DreamscapeCanvas.findById(req.params.id)
      .populate('assets.createdBy', 'username displayName avatar')
      .populate('drawings.createdBy', 'username displayName avatar');

    if (!canvas) throw new AppError('Canvas not found', 404);
    res.json({ success: true, canvas });
  } catch (error) {
    next(error);
  }
};

// Add asset to canvas (REST fallback, real-time via socket)
export const addAsset = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { assetId, type, content, x, y, color, fontSize, timestamp } = req.body;

    const canvas = await DreamscapeCanvas.findOne({ roomId });
    if (!canvas) throw new AppError('Canvas not found', 404);
    if (canvas.status !== 'active') throw new AppError('Canvas is locked', 403);

    // Check ink
    const inkEntry = canvas.inkLedger.find(
      (e) => e.userId.toString() === req.user._id.toString()
    );
    if (!inkEntry || inkEntry.inkRemaining <= 0) {
      throw new AppError('No ink remaining. Keep watching to earn more!', 403);
    }

    canvas.assets.push({
      assetId: assetId || `asset_${Date.now()}`,
      type: type || 'text',
      content,
      x, y,
      color, fontSize,
      createdBy: req.user._id,
      timestamp: timestamp || 0,
    });

    // Deduct ink
    inkEntry.inkRemaining -= 5;
    await canvas.save();

    res.json({ success: true, asset: canvas.assets[canvas.assets.length - 1] });
  } catch (error) {
    next(error);
  }
};

// Get user's ink balance
export const getInkBalance = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const canvas = await DreamscapeCanvas.findOne({ roomId });
    if (!canvas) throw new AppError('Canvas not found', 404);

    const inkEntry = canvas.inkLedger.find(
      (e) => e.userId.toString() === req.user._id.toString()
    );

    res.json({
      success: true,
      ink: inkEntry ? inkEntry.inkRemaining : 0,
      totalEarned: inkEntry ? inkEntry.totalEarned : 0,
    });
  } catch (error) {
    next(error);
  }
};
