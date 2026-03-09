/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Machinery = require('../models/Machinery');

dotenv.config({ path: path.join(__dirname, '../../.env') });

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeCategory(doc) {
  const category = String(doc.category || '').toLowerCase();
  const name = String(doc.name || '').toLowerCase();
  const slug = String(doc.slug || '').toLowerCase();
  const hint = `${category} ${name} ${slug}`;

  if (/spare|parts?|maint|service/.test(hint)) {
    return 'Spare Parts & Maintenance';
  }

  return 'Machinery & Production Lines';
}

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gema_v2';
  await mongoose.connect(uri);

  const docs = await Machinery.find().sort({ updatedAt: -1, createdAt: -1 });
  const usedSlugs = new Set();
  const duplicateIds = [];
  let updated = 0;

  for (const doc of docs) {
    const baseSlug = slugify(doc.slug || doc.name || `machinery-${doc._id}`) || `machinery-${doc._id}`;

    if (usedSlugs.has(baseSlug)) {
      duplicateIds.push(doc._id);
      continue;
    }

    usedSlugs.add(baseSlug);

    const targetCategory = normalizeCategory(doc);
    const needsSlugUpdate = doc.slug !== baseSlug;
    const needsCategoryUpdate = doc.category !== targetCategory;

    if (needsSlugUpdate || needsCategoryUpdate) {
      await Machinery.updateOne(
        { _id: doc._id },
        {
          $set: {
            slug: baseSlug,
            category: targetCategory
          }
        }
      );
      updated += 1;
    }
  }

  if (duplicateIds.length) {
    await Machinery.deleteMany({ _id: { $in: duplicateIds } });
  }

  await Machinery.syncIndexes();

  console.log(`Sanitized machinery docs: ${updated}`);
  console.log(`Removed duplicated slug docs: ${duplicateIds.length}`);

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('sanitize-machinery-categories failed:', error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    // ignore
  }
  process.exit(1);
});
