import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'user_ban', 'user_unban', 'user_role_change', 'video_remove',
        'video_restore', 'comment_remove', 'report_resolve', 'report_dismiss',
        'live_terminate', 'system_config_change', 'post_remove',
      ],
    },
    targetType: {
      type: String,
      enum: ['user', 'video', 'comment', 'report', 'live', 'post', 'system'],
    },
    targetId: mongoose.Schema.Types.ObjectId,
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
