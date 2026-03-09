/* eslint-disable no-console */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('../models/Product');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gema_v2';

function guessSectorByCategory(category) {
  const normalized = String(category || '').trim();
  if (normalized === 'RawMaterial') return 'RawMaterial';
  if (normalized === 'Component') return 'Component';
  if (normalized === 'MedicalCosmetics') return 'Cosmetic';
  return 'Equipment';
}

function guessOriginByCategory(category) {
  const normalized = String(category || '').trim();
  if (normalized === 'Trading' || normalized === 'RawMaterial' || normalized === 'Component') {
    return 'Commercial';
  }
  return 'Internal';
}

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const missingSectorFilter = {
    $or: [
      { sector: { $exists: false } },
      { sector: null },
      { sector: '' }
    ]
  };

  const candidates = await Product.find(missingSectorFilter)
    .sort({ createdAt: 1 })
    .limit(6)
    .lean();

  if (!candidates.length) {
    console.log('No products missing sector were found. Nothing to migrate.');
    return;
  }

  let updatedCount = 0;
  for (const product of candidates) {
    const sector = guessSectorByCategory(product.category);
    const origin = product.origin && String(product.origin).trim() ? String(product.origin).trim() : guessOriginByCategory(product.category);
    const logistics = product.logistics && String(product.logistics).trim() ? String(product.logistics).trim() : 'Local';

    const result = await Product.updateOne(
      { _id: product._id },
      {
        $set: {
          sector,
          origin,
          logistics,
        }
      },
      { runValidators: true }
    );

    if (result.modifiedCount > 0) {
      updatedCount += 1;
      console.log(`Updated ${product.name} -> sector=${sector}, origin=${origin}, logistics=${logistics}`);
    }
  }

  console.log(`Migration finished. Updated ${updatedCount} of ${candidates.length} scanned products.`);
}

run()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
