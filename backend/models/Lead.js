const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    company: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    source: { type: String, default: 'Admin Manual', trim: true },
    module: { type: String, default: 'General', trim: true },
    specialty: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'won', 'lost'],
      default: 'new'
    },
    assignedTo: { type: String, default: '', trim: true },
    valueEstimate: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ['USD', 'EGP'], default: 'EGP' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lead', leadSchema);
