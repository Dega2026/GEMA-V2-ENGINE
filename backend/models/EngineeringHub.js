const mongoose = require('mongoose');

const engineeringHubSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, unique: true, sparse: true },
    category: { type: String, default: 'Engineering Hub', trim: true },
    summary: { type: String, default: '', trim: true },
    image: { type: String, default: '/assets/images/engineering/operating-rooms.jpg' },
    datasheet: { type: String, default: '' },
    technicalSpecs: {
      model: { type: String, default: '', trim: true },
      origin: { type: String, default: '', trim: true },
      output: { type: String, default: '', trim: true },
      power: { type: String, default: '', trim: true },
      compliance: { type: String, default: '', trim: true }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

engineeringHubSchema.pre('validate', function normalizeSlug() {
  if (!this.slug && this.title) {
    this.slug = String(this.title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
});

module.exports = mongoose.model('EngineeringHub', engineeringHubSchema);
