/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Machinery = require('../models/Machinery');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const SEED_ITEMS = [
  {
    name: 'Trading Supply Control Unit',
    slug: 'trading-supply-control-unit',
    category: 'Machinery & Production Lines',
    summary: 'Automated sourcing and cold-chain logistics orchestration engine.',
    image: '/assets/images/trading/shanghai-hub.jpg',
    datasheet: '/assets/uploads/trading-datasheet.pdf',
    technicalSpecs: {
      model: 'TSCU-420',
      origin: 'Shanghai, China',
      output: '350 pallets / day',
      power: '380V - 3 Phase',
      compliance: 'ISO 13485 / CE'
    },
    spareParts: [
      { name: 'Flow Sensor Kit', partNumber: 'FSK-420', notes: 'Quarterly replacement' },
      { name: 'Cold Chain Valve', partNumber: 'CCV-09', notes: 'Medical grade steel' }
    ]
  },
  {
    name: 'Trading Spare Parts Maintenance Suite',
    slug: 'trading-spare-parts-maintenance-suite',
    category: 'Spare Parts & Maintenance',
    summary: 'Dedicated spare-parts packs and preventive maintenance kits for trading operations.',
    image: '/assets/images/trading/shanghai-hub.jpg',
    datasheet: '/assets/uploads/trading-spares-datasheet.pdf',
    technicalSpecs: {
      model: 'TSM-115',
      origin: 'Shenzhen, China',
      output: '500 maintenance kits / week',
      power: '220V - 1 Phase',
      compliance: 'ISO 13485'
    },
    spareParts: [
      { name: 'Sterile Hose Pack', partNumber: 'SHP-115', notes: 'For quarterly maintenance windows' },
      { name: 'Calibration Relay Set', partNumber: 'CRS-22', notes: 'Factory-certified replacement set' }
    ]
  },
  {
    name: 'Engineering Precision Assembly Line',
    slug: 'engineering-precision-assembly-line',
    category: 'Machinery & Production Lines',
    summary: 'High-precision medical assembly line for turnkey deployment projects.',
    image: '/assets/images/engineering/operating-rooms.jpg',
    datasheet: '/assets/uploads/engineering-datasheet.pdf',
    technicalSpecs: {
      model: 'EPAL-900',
      origin: 'Germany',
      output: '1200 units / hour',
      power: '400V - 50Hz',
      compliance: 'ISO 13485 / GMP'
    },
    spareParts: [
      { name: 'Servo Motor Pack', partNumber: 'SMP-900', notes: 'Supports 24/7 runtime' },
      { name: 'Needle Guide Module', partNumber: 'NGM-44', notes: 'Calibrated for micron precision' }
    ]
  }
];

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gema_v2';
  await mongoose.connect(uri);

  for (const item of SEED_ITEMS) {
    await Machinery.findOneAndUpdate(
      { slug: item.slug },
      item,
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    console.log(`Seeded machinery: ${item.slug}`);
  }

  await mongoose.disconnect();
  console.log('Machinery seed completed successfully.');
}

run().catch(async (error) => {
  console.error('seed-machinery failed:', error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    // ignore
  }
  process.exit(1);
});
