import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    subscriberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notifications: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

subscriptionSchema.index({ subscriberId: 1, channelId: 1 }, { unique: true });
subscriptionSchema.index({ channelId: 1 });
subscriptionSchema.index({ subscriberId: 1, createdAt: -1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
