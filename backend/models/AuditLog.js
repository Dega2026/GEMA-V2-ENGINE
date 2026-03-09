const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    module: { type: String, required: true, trim: true },
    targetType: { type: String, default: '', trim: true },
    targetId: { type: String, default: '', trim: true },
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    actor: {
      userId: { type: String, default: '' },
      role: { type: String, default: '' },
      username: { type: String, default: '' }
    },
    request: {
      ip: { type: String, default: '' },
      userAgent: { type: String, default: '' },
      requestId: { type: String, default: '' }
    },
    hash: { type: String, default: '', trim: true },
    prevHash: { type: String, default: '', trim: true },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ 'actor.role': 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ 'request.requestId': 1, createdAt: -1 });
auditLogSchema.index({ hash: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
