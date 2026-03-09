const mongoose = require('mongoose');

const reportRecipientSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Client', 'SuperAdmin'], required: true },
    name: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true }
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    recipientType: { type: String, enum: ['Client', 'SuperAdmin'], required: true },
    clientName: { type: String, default: '', trim: true },
    clientEmail: { type: String, default: '', trim: true, lowercase: true },
    relatedModule: { type: String, default: 'Engineering Hub', trim: true },
    specialty: { type: String, default: '', trim: true },
    sentBy: {
      userId: { type: String, default: '' },
      role: { type: String, default: '' }
    },
    recipients: { type: [reportRecipientSchema], default: [] },
    status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'sent' },
    deliveryResults: {
      type: [
        new mongoose.Schema(
          {
            email: { type: String, default: '', trim: true, lowercase: true },
            success: { type: Boolean, default: false },
            messageId: { type: String, default: '' },
            error: { type: String, default: '' }
          },
          { _id: false }
        )
      ],
      default: []
    },
    sentAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
