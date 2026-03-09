const mongoose = require('mongoose');

const followUpJobSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    leadEmail: { type: String, required: true, trim: true, lowercase: true },
    leadName: { type: String, default: '', trim: true },
    templateKey: {
      type: String,
      enum: ['intro', 'proposal', 'reminder', 'closure'],
      default: 'intro'
    },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    relatedModule: { type: String, default: 'General', trim: true },
    specialty: { type: String, default: '', trim: true },
    scheduledFor: { type: Date, required: true },
    status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' },
    result: {
      messageId: { type: String, default: '' },
      error: { type: String, default: '' },
      sentAt: { type: Date }
    },
    createdBy: {
      userId: { type: String, default: '' },
      role: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

followUpJobSchema.index({ status: 1, scheduledFor: 1 });
followUpJobSchema.index({ leadEmail: 1, createdAt: -1 });

module.exports = mongoose.model('FollowUpJob', followUpJobSchema);
