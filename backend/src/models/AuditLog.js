import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'create', 'update', 'delete', 'publish', 'approve', 'reject',
        'login', 'logout', 'export', 'import', 'claim', 'swap',
      ],
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        'organization', 'location', 'user', 'employee', 'schedule',
        'shift', 'timeoff', 'swap', 'availability', 'notification',
        'template', 'announcement',
      ],
    },
    entityId: mongoose.Schema.Types.ObjectId,
    changes: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

export default mongoose.model('AuditLog', auditLogSchema);
