import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'new_video', 'comment', 'reply', 'like', 'subscribe',
        'mention', 'live_start', 'system', 'watch_party_invite',
        'community_post',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    actionUrl: String,
    thumbnail: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30-day TTL

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
