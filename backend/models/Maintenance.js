const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    assetName: { type: String, required: true, trim: true },
    maintenanceType: {
      type: String,
      enum: ['Preventive', 'Corrective', 'Inspection'],
      default: 'Preventive'
    },
    status: {
      type: String,
      enum: ['Scheduled', 'InProgress', 'Completed', 'Cancelled'],
      default: 'Scheduled'
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium'
    },
    scheduledDate: { type: Date, required: true },
    completedDate: { type: Date, default: null },
    engineer: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    reportFile: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Maintenance', maintenanceSchema);
