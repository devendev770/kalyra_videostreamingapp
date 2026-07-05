import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    isHearted: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

commentSchema.index({ videoId: 1, parentId: 1, createdAt: -1 });
commentSchema.index({ videoId: 1, isPinned: -1, createdAt: -1 });

commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
});

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
