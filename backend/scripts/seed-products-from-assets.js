/* eslint-disable no-console */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Product = require('../models/Product');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gema_v2';

const productsSeed = [
  {
    name: '3-Part Syringes',
    category: 'Manufacturing',
    specialty: 'Consumables',
    description: 'High-precision disposable syringes for safe clinical use with consistent plunger performance.',
    price: 3.5,
    currency: 'USD',
    imagePath: '/uploads/syringes.jpg'
  },
  {
    name: 'Smart Syringes',
    category: 'Manufacturing',
    specialty: 'Consumables',
    description: 'Auto-disable smart syringe range designed to reduce reuse risks in immunization programs.',
    price: 4.1,
    currency: 'USD',
    imagePath: '/uploads/smart-syringe.jpg'
  },
  {
    name: 'IV Cannula',
    category: 'Manufacturing',
    specialty: 'IV Fluids',
    description: 'Sterile IV cannula with smooth insertion profile for reliable venous access.',
    price: 2.2,
    currency: 'USD',
    imagePath: '/uploads/iv-cannula.jpg'
  },
  {
    name: 'IV Sets',
    category: 'Manufacturing',
    specialty: 'IV Fluids',
    description: 'Medical-grade IV administration sets with stable flow control and secure connectors.',
    price: 2.9,
    currency: 'USD',
    imagePath: '/uploads/iv-sets.jpg'
  },
  {
    name: 'Safety Boxes',
    category: 'Manufacturing',
    specialty: 'Consumables',
    description: 'Leak-resistant sharps containers engineered for safe disposal workflows.',
    price: 1.4,
    currency: 'USD',
    imagePath: '/uploads/safety-boxes.jpg'
  },
  {
    name: 'Chest Drainage Bag',
    category: 'Manufacturing',
    specialty: 'General',
    description: 'Single-use chest drainage collection system built for secure postoperative monitoring.',
    price: 8.5,
    currency: 'USD',
    imagePath: '/uploads/chest-drainage.jpg'
  }
];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  for (const item of productsSeed) {
    const updatePayload = {
      name: item.name,
      category: item.category,
      specialty: item.specialty,
      description: item.description,
      price: item.price,
      currency: item.currency,
      imagePath: item.imagePath,
      image: item.imagePath
    };

    const updated = await Product.findOneAndUpdate(
      { name: item.name },
      { $set: updatePayload },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    console.log(`Upserted: ${updated.name} -> ${updated.imagePath || updated.image}`);
  }

  const total = await Product.countDocuments();
  console.log(`Seed complete. Total products in DB: ${total}`);
}

run()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
