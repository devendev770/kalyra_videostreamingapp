import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      lowercase: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 50,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    avatarPublicId: String,
    banner: {
      type: String,
      default: '',
    },
    bannerPublicId: String,
    bio: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'creator', 'admin'],
      default: 'user',
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpiry: Date,
    passwordResetOTP: String,
    passwordResetOTPExpiry: Date,
    refreshTokens: [
      {
        token: String,
        expiresAt: Date,
        userAgent: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    subscriberCount: {
      type: Number,
      default: 0,
      index: true,
    },
    totalViews: {
      type: Number,
      default: 0,
    },
    channelDescription: {
      type: String,
      maxlength: 5000,
      default: '',
    },
    channelLinks: [
      {
        title: String,
        url: String,
      },
    ],
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      subscriptions: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      likes: { type: Boolean, default: true },
    },
    watchHistoryEnabled: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ createdAt: -1 });
userSchema.index({ subscriberCount: -1 });
userSchema.index({ username: 'text', displayName: 'text' });

// Pre-save hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Clean up expired refresh tokens
userSchema.methods.cleanExpiredTokens = function () {
  this.refreshTokens = this.refreshTokens.filter(
    (rt) => rt.expiresAt > new Date()
  );
};

// Virtual: videos (populated on demand)
userSchema.virtual('videos', {
  ref: 'Video',
  localField: '_id',
  foreignField: 'userId',
});

const User = mongoose.model('User', userSchema);
export default User;
