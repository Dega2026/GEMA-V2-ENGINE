const mongoose = require('mongoose');

const sparePartSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    partNumber: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true }
  },
  { _id: false }
);

const machinerySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: {
      type: String,
      trim: true,
      enum: [
        'Machinery & Production Lines',
        'Spare Parts & Maintenance',
        'Trading Hub',
        'Turnkey',
        'Engineering Hub'
      ],
      default: 'Machinery & Production Lines'
    },
    summary: { type: String, default: '', trim: true },
    price: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ['USD', 'EGP'], default: 'EGP' },
    image: { type: String, default: '/assets/images/engineering/operating-rooms.jpg' },
    datasheet: { type: String, default: '' },
    technicalSpecs: {
      model: { type: String, default: '', trim: true },
      origin: { type: String, default: '', trim: true },
      output: { type: String, default: '', trim: true },
      power: { type: String, default: '', trim: true },
      compliance: { type: String, default: '', trim: true }
    },
    spareParts: { type: [sparePartSchema], default: [] }
  },
  { timestamps: true }
);

machinerySchema.pre('validate', function normalizeSlug() {
  if (!this.slug && this.name) {
    this.slug = String(this.name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
});

module.exports = mongoose.model('Machinery', machinerySchema);
