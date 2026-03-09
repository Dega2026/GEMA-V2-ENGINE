const mongoose = require('mongoose');

const localizedContentSchema = new mongoose.Schema({}, { _id: false, strict: false });

const pageContentSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9-]+$/
    },
    content: {
      ar: { type: localizedContentSchema, default: () => ({}) },
      en: { type: localizedContentSchema, default: () => ({}) },
      de: { type: localizedContentSchema, default: () => ({}) },
      zh: { type: localizedContentSchema, default: () => ({}) },
      tr: { type: localizedContentSchema, default: () => ({}) }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PageContent', pageContentSchema);
