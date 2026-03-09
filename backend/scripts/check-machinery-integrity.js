/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Machinery = require('../models/Machinery');

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gema_v2';
  await mongoose.connect(uri);

  const docs = await Machinery.find().select('_id name slug category').sort({ createdAt: -1 }).lean();
  const duplicates = await Machinery.aggregate([
    { $group: { _id: '$slug', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]);

  console.log(`TOTAL: ${docs.length}`);
  console.log(JSON.stringify(docs, null, 2));
  console.log(`DUPLICATE_SLUGS: ${JSON.stringify(duplicates, null, 2)}`);

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('check-machinery-integrity failed:', error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    // ignore
  }
  process.exit(1);
});
