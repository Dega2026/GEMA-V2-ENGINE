const mongoose = require('mongoose');

const clientPortalSessionSchema = new mongoose.Schema(
  {
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', required: true },
    clientEmail: { type: String, required: true, trim: true, lowercase: true },
    clientName: { type: String, default: '', trim: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    viewCount: { type: Number, default: 0 },
    lastViewedAt: { type: Date },
    createdBy: {
      userId: { type: String, default: '' },
      role: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

clientPortalSessionSchema.index({ reportId: 1, clientEmail: 1, createdAt: -1 });

module.exports = mongoose.model('ClientPortalSession', clientPortalSessionSchema);
