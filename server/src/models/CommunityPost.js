import mongoose from 'mongoose';

const pollOptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: { type: Number, default: 0 },
  voters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: true });

const communityPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      maxlength: 5000,
      default: '',
    },
    images: [String],
    poll: {
      question: String,
      options: [pollOptionSchema],
      endsAt: Date,
      totalVotes: { type: Number, default: 0 },
    },
    likes: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ['text', 'image', 'poll'],
      default: 'text',
    },
  },
  { timestamps: true }
);

communityPostSchema.index({ userId: 1, createdAt: -1 });
communityPostSchema.index({ createdAt: -1 });

const CommunityPost = mongoose.model('CommunityPost', communityPostSchema);
export default CommunityPost;
