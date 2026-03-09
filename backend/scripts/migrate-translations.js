/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PageContent = require('../models/PageContent');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const LANGS = ['ar', 'en', 'de', 'zh', 'tr'];
const PAGE_SLUGS = [
  'home',
  'about',
  'news',
  'products',
  'manufacturing',
  'trading',
  'direct-sourcing',
  'logistics',
  'engineering',
  'regulatory',
  'turnkey',
  'contact',
  'quote',
  'service-details'
];

function loadTranslationsObject() {
  const translationsPath = path.join(__dirname, '../../frontend/src/js/translations.js');
  const raw = fs.readFileSync(translationsPath, 'utf8');
  const start = raw.indexOf('const translations =');
  const end = raw.indexOf('// --- دالة تطبيق اللغة');

  if (start < 0 || end < 0 || end <= start) {
    throw new Error('Unable to isolate translations object from translations.js');
  }

  const snippet = raw.slice(start, end);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${snippet}\nthis.__translations = translations;`, sandbox);

  return sandbox.__translations;
}

function buildLangPayload(existingLangPayload, dictionary) {
  const base = existingLangPayload && typeof existingLangPayload === 'object' ? existingLangPayload : {};
  return {
    ...base,
    strings: dictionary || {}
  };
}

async function migrateTranslations() {
  const allTranslations = loadTranslationsObject();
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gema_v2';
  await mongoose.connect(uri);

  for (const slug of PAGE_SLUGS) {
    const existing = await PageContent.findOne({ slug });
    const existingContent = existing?.content || {};

    const nextContent = {};
    LANGS.forEach((lang) => {
      nextContent[lang] = buildLangPayload(existingContent[lang], allTranslations?.[lang]);
    });

    await PageContent.findOneAndUpdate(
      { slug },
      { slug, content: nextContent },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    console.log(`Migrated translations for slug: ${slug}`);
  }

  await mongoose.disconnect();
  console.log('Translations migration completed successfully.');
}

migrateTranslations().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
