const express = require('express');
const PageContent = require('../models/PageContent');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { createUpload } = require('../utils/uploadConfig');
const { SUPPORTED_LANGUAGES } = require('../utils/normalize');

const router = express.Router();

const LANGS = SUPPORTED_LANGUAGES;
const SLUGS = ['direct-sourcing', 'logistics', 'about-gema'];
const CARD_IMAGE_FALLBACK = '/assets/images/trading/shanghai-hub.jpg';

// Map legacy image URLs that no longer exist to valid assets.
const LEGACY_IMAGE_MAP = {
  '/assets/images/trading/riyadh-logistics.jpg': '/assets/images/trading/sourcing-hologram.jpg'
};

const upload = createUpload({ prefix: 'page', maxFileSize: 8 * 1024 * 1024 });

function sanitizeCards(cards) {
  if (!Array.isArray(cards)) return [];
  return cards.slice(0, 6).map((card) => ({
    title: String(card?.title || ''),
    text: String(card?.text || ''),
    image: normalizeCardImagePath(card?.image)
  }));
}

function normalizeCardImagePath(imageValue) {
  const raw = String(imageValue || '').trim();
  if (!raw) return CARD_IMAGE_FALLBACK;

  const lowered = raw.toLowerCase();
  const mapped = Object.entries(LEGACY_IMAGE_MAP).find(([key]) => key.toLowerCase() === lowered);
  return mapped ? mapped[1] : raw;
}

function normalizeContent(contentInput = {}) {
  const normalized = {};
  LANGS.forEach((lang) => {
    const source = contentInput[lang] || {};
    normalized[lang] = {
      title: String(source.title || ''),
      cards: sanitizeCards(source.cards)
    };
  });
  return normalized;
}

function buildDefaultContent(slug) {
  const defaults = {
    'direct-sourcing': {
      title: 'Direct Sourcing',
      cards: [
        {
          title: 'Shanghai Factory Audits',
          text: 'On-ground sourcing audits with full quality validation before shipment.',
          image: '/assets/images/trading/shanghai-hub.jpg'
        },
        {
          title: 'Supplier Qualification',
          text: 'Only approved medical suppliers enter the sourcing pipeline.',
          image: '/assets/images/trading/supply-chain.jpg'
        },
        {
          title: 'Risk-Control Procurement',
          text: 'Commercial and compliance controls managed from purchase to dispatch.',
          image: '/assets/images/trading/sourcing-hologram.jpg'
        }
      ]
    },
    logistics: {
      title: 'Logistics',
      cards: [
        {
          title: 'End-to-End Shipping',
          text: 'Managed routes from Asia to GCC and North Africa healthcare hubs.',
          image: '/assets/images/trading/supply-chain.jpg'
        },
        {
          title: 'Cold Chain Readiness',
          text: 'Temperature-sensitive handling across certified transport partners.',
          image: '/assets/images/trading/shanghai-hub.jpg'
        },
        {
          title: 'Customs Coordination',
          text: 'Documentation and border clearance support for regulated shipments.',
          image: '/assets/images/trading/shipping-hologram.jpg'
        }
      ]
    },
    'about-gema': {
      title: 'About GEMA',
      cards: [
        {
          title: 'Riyadh & Shanghai Hubs',
          text: 'Regional operations in Riyadh and sourcing in Shanghai powering fast delivery.',
          image: '/assets/images/news/riyadh-hq.jpg'
        },
        {
          title: 'Digital Intelligence',
          text: 'AI-first execution and digital systems built with enterprise-grade governance.',
          image: '/assets/images/news/future-news.jpg'
        },
        {
          title: 'Industrial Excellence',
          text: 'German-grade manufacturing discipline combined with local operational scale.',
          image: '/assets/images/news/factory-news.jpg'
        }
      ]
    }
  };

  const base = defaults[slug] || { title: '', cards: [] };
  const localized = {};
  LANGS.forEach((lang) => {
    localized[lang] = {
      title: base.title,
      cards: base.cards
    };
  });

  return localized;
}

async function getOrCreateBySlug(slug) {
  let page = await PageContent.findOne({ slug });
  if (!page) {
    page = await PageContent.create({
      slug,
      content: buildDefaultContent(slug)
    });
  }
  return page;
}

const OPS_ROLES = ['SuperAdmin', 'OperationsAdmin'];

router.get('/:slug', async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    const lang = LANGS.includes(req.query.lang) ? req.query.lang : 'en';

    if (!SLUGS.includes(slug)) {
      return res.status(404).json({ success: false, message: 'Unknown page slug' });
    }

    const page = await getOrCreateBySlug(slug);
    const normalizedContent = normalizeContent(page.content || {});
    return res.json({
      success: true,
      slug,
      lang,
      content: normalizedContent[lang] || { title: '', cards: [] }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch page content' });
  }
});

router.get('/admin/:slug', authenticateToken, requireRoles(OPS_ROLES), async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    if (!SLUGS.includes(slug)) {
      return res.status(404).json({ success: false, message: 'Unknown page slug' });
    }

    const page = await getOrCreateBySlug(slug);
    const normalizedContent = normalizeContent(page.content || {});
    return res.json({ success: true, data: { ...page.toObject(), content: normalizedContent } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch admin content' });
  }
});

router.put('/admin/:slug', authenticateToken, requireRoles(OPS_ROLES), async (req, res) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase();
    if (!SLUGS.includes(slug)) {
      return res.status(404).json({ success: false, message: 'Unknown page slug' });
    }

    const normalizedContent = normalizeContent(req.body.content || {});

    const updated = await PageContent.findOneAndUpdate(
      { slug },
      { slug, content: normalizedContent },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, message: 'Page content updated', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update page content' });
  }
});

router.post('/admin/upload-image', authenticateToken, requireRoles(OPS_ROLES), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    return res.status(201).json({
      success: true,
      imageUrl: `/uploads/${req.file.filename}`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
});

module.exports = router;
