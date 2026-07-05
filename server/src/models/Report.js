import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    targetType: {
      type: String,
      enum: ['video', 'comment', 'user', 'live', 'post'],
      required: true,
    },
    reason: {
      type: String,
      enum: [
        'spam', 'harassment', 'hate_speech', 'violence', 'nudity',
        'misinformation', 'copyright', 'other',
      ],
      required: true,
    },
    description: {
      type: String,
      maxlength: 2000,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewNote: String,
    actionTaken: {
      type: String,
      enum: ['none', 'warning', 'content_removed', 'user_banned', 'user_suspended'],
    },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporterId: 1, targetId: 1, targetType: 1 });

const Report = mongoose.model('Report', reportSchema);
export default Report;
