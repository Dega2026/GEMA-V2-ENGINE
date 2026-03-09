const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PageContent = require('../models/PageContent');
const { requireEnv } = require('../config/env');

const router = express.Router();
const JWT_SECRET = requireEnv('JWT_SECRET');
const UPLOAD_IMAGE_MIMES = ['image/webp', 'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/avif', 'image/svg+xml'];

const pageImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../../frontend/public/assets/uploads');
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const safeExt = path.extname(file.originalname || '').toLowerCase() || '.png';
      cb(null, `page-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!UPLOAD_IMAGE_MIMES.includes(file.mimetype)) {
      cb(new Error('Unsupported image format. Allowed: WEBP, JPG, PNG, GIF, AVIF, SVG.'));
      return;
    }
    cb(null, true);
  }
});

const LANGS = ['ar', 'en', 'de', 'zh', 'tr'];
const KNOWN_SLUGS = ['home', 'hub', 'about', 'logistics', 'direct-sourcing', 'contact', 'news', 'products', 'manufacturing', 'trading', 'engineering', 'regulatory', 'turnkey', 'quote', 'service-details', 'header', 'footer'];
const SLUG_IMAGE_MAP = {
  'direct-sourcing': {
    '/assets/images/trading/riyadh-logistics.jpg': '/assets/images/trading/sourcing-hologram.jpg'
  }
};

function toCanonicalSlug(rawSlug) {
  const slug = String(rawSlug || '').toLowerCase();
  if (slug === 'index') return 'home';
  if (slug === 'about-gema') return 'about';
  return slug;
}

function isValidSlug(slug) {
  return /^[a-z0-9-]+$/.test(slug);
}

function normalizeLanguagePayload(raw, slug, lang) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    const seed = buildDefaultContentBySlug(slug)?.[lang];
    return seed && typeof seed === 'object' ? { ...seed } : {};
  }

  const normalized = { ...raw };

  if (Array.isArray(normalized.cards)) {
    const slugMap = SLUG_IMAGE_MAP[slug] || {};
    normalized.cards = normalized.cards.map((card) => {
      if (!card || typeof card !== 'object') return card;
      const nextCard = { ...card };
      if (typeof nextCard.image === 'string') {
        const key = nextCard.image.trim().toLowerCase();
        const mapped = Object.entries(slugMap).find(([legacy]) => legacy.toLowerCase() === key);
        if (mapped) {
          nextCard.image = mapped[1];
        }
      }
      return nextCard;
    });
  }

  if (slug === 'header' || slug === 'footer') {
    const defaults = buildDefaultContentBySlug(slug)?.[lang] || {};
    const merged = { ...defaults, ...normalized };

    // Keep arrays complete when legacy payload has missing keys.
    if (!Array.isArray(merged.links) && Array.isArray(defaults.links)) merged.links = defaults.links;
    if (!Array.isArray(merged.sectors) && Array.isArray(defaults.sectors)) merged.sectors = defaults.sectors;
    if (!Array.isArray(merged.quickLinks) && Array.isArray(defaults.quickLinks)) merged.quickLinks = defaults.quickLinks;
    if (!Array.isArray(merged.hubs) && Array.isArray(defaults.hubs)) merged.hubs = defaults.hubs;

    return merged;
  }

  return normalized;
}

function normalizeContent(contentInput = {}) {
  const normalized = {};
  const slug = toCanonicalSlug(contentInput?.slug || contentInput?._slug || '');
  LANGS.forEach((lang) => {
    normalized[lang] = normalizeLanguagePayload(contentInput[lang], slug, lang);
  });
  return normalized;
}

function normalizeContentBySlug(contentInput = {}, slug) {
  const normalized = {};
  LANGS.forEach((lang) => {
    normalized[lang] = normalizeLanguagePayload(contentInput[lang], slug, lang);
  });
  return normalized;
}

function buildDefaultContentBySlug(slug) {
  const defaults = {
    hub: {
      en: {
        title: 'GEMA Empire Hub',
        subtitle: 'Six sectors. One operational map.',
        sectors: [
          { key: 'manufacturing', title: 'Manufacturing', description: 'Medical manufacturing lines, validated quality, and internal production scale.' },
          { key: 'products', title: 'Products', description: 'Curated medical portfolio with regulated specs and field-ready documentation.' },
          { key: 'trading', title: 'Trading', description: 'Cross-border sourcing and strategic supply lanes across core markets.' },
          { key: 'engineering', title: 'Engineering', description: 'Turnkey systems, biomedical machinery, and operations continuity planning.' },
          { key: 'regulatory', title: 'Regulatory', description: 'Compliance execution for registration, licensing, and quality frameworks.' },
          { key: 'turnkey', title: 'Turnkey', description: 'End-to-end delivery from concept design to operational launch.' }
        ]
      },
      ar: {
        title: 'مركز إمبراطورية جيما',
        subtitle: 'ستة قطاعات ضمن خريطة تشغيل واحدة.',
        sectors: [
          { key: 'manufacturing', title: 'التصنيع', description: 'خطوط تصنيع طبية، جودة معتمدة، وطاقة إنتاج داخلية.' },
          { key: 'products', title: 'المنتجات', description: 'محفظة طبية منتقاة بمواصفات تنظيمية ووثائق جاهزة للتشغيل.' },
          { key: 'trading', title: 'التجارة', description: 'توريد عابر للحدود ومسارات إمداد استراتيجية للأسواق الأساسية.' },
          { key: 'engineering', title: 'الهندسة', description: 'أنظمة متكاملة، معدات حيوية، واستمرارية تشغيل.' },
          { key: 'regulatory', title: 'الشؤون التنظيمية', description: 'تنفيذ الامتثال للتسجيل والترخيص وأطر الجودة.' },
          { key: 'turnkey', title: 'تسليم المفتاح', description: 'تنفيذ كامل من التصميم حتى الإطلاق التشغيلي.' }
        ]
      },
      de: {
        title: 'GEMA Empire Hub',
        subtitle: 'Sechs Sektoren in einer operativen Karte.',
        sectors: [
          { key: 'manufacturing', title: 'Fertigung', description: 'Medizinische Produktionslinien, validierte Qualitat und interne Skalierung.' },
          { key: 'products', title: 'Produkte', description: 'Kuratiertes Medizinportfolio mit regulierten Spezifikationen.' },
          { key: 'trading', title: 'Handel', description: 'Grenzubergreifende Beschaffung und strategische Lieferkorridore.' },
          { key: 'engineering', title: 'Engineering', description: 'Turnkey-Systeme, Medizintechnik und betriebliche Kontinuitat.' },
          { key: 'regulatory', title: 'Regulatorik', description: 'Compliance fur Registrierung, Zulassung und Qualitatsrahmen.' },
          { key: 'turnkey', title: 'Turnkey', description: 'End-to-end Umsetzung von Planung bis Betriebsstart.' }
        ]
      },
      zh: {
        title: 'GEMA 帝国枢纽',
        subtitle: '六大业务板块，一张统一运营地图。',
        sectors: [
          { key: 'manufacturing', title: '制造', description: '医疗制造产线、验证质量与内部产能规模。' },
          { key: 'products', title: '产品', description: '符合监管规范的医疗产品组合与技术文档。' },
          { key: 'trading', title: '贸易', description: '跨境采购与核心市场供应通道。' },
          { key: 'engineering', title: '工程', description: '交钥匙系统、生物医学设备与运营保障。' },
          { key: 'regulatory', title: '法规事务', description: '注册、许可与质量体系的合规执行。' },
          { key: 'turnkey', title: '交钥匙', description: '从方案设计到投运上线的端到端交付。' }
        ]
      },
      tr: {
        title: 'GEMA Imparatorluk Merkezi',
        subtitle: 'Alti sektor, tek operasyon haritasi.',
        sectors: [
          { key: 'manufacturing', title: 'Uretim', description: 'Medikal uretim hatlari, dogrulanmis kalite ve ic kapasite olcegi.' },
          { key: 'products', title: 'Urunler', description: 'Regule spesifikasyonlarla hazirlanan medikal urun portfoyu.' },
          { key: 'trading', title: 'Ticaret', description: 'Sinir otesi tedarik ve stratejik arz koridorlari.' },
          { key: 'engineering', title: 'Muhendislik', description: 'Anahtar teslim sistemler, biyomedikal ekipman ve sureklilik plani.' },
          { key: 'regulatory', title: 'Regulasyon', description: 'Kayit, lisans ve kalite cerceveleri icin uyum icrasi.' },
          { key: 'turnkey', title: 'Anahtar Teslim', description: 'Konseptten operasyon acilisina kadar uctan uca teslimat.' }
        ]
      }
    },
    header: {
      en: {
        logoText: 'GEMA', logoAccent: 'GLOBAL', searchPlaceholder: 'Search...', quoteText: 'Get a Quote', sectorsLabel: 'Sectors',
        links: [{ id: 'link-home', href: '/', label: 'Home Hub' }, { id: 'link-mfg', href: '/manufacturing', label: 'Manufacturing' }, { id: 'link-products', href: '/products', label: 'Products' }, { id: 'link-trade', href: '/trading', label: 'Trading' }, { id: 'link-news', href: '/news', label: 'Newsroom' }, { id: 'link-about', href: '/about', label: 'About' }, { id: 'link-contact', href: '/contact', label: 'Contact' }],
        sectors: [{ href: '/engineering', label: 'Engineering' }, { href: '/regulatory', label: 'Regulatory Affairs' }, { href: '/turnkey', label: 'Turnkey Solutions' }]
      },
      ar: {
        logoText: 'GEMA', logoAccent: 'GLOBAL', searchPlaceholder: 'ابحث...', quoteText: 'اطلب سعر', sectorsLabel: 'القطاعات',
        links: [{ id: 'link-home', href: '/', label: 'الرئيسية' }, { id: 'link-mfg', href: '/manufacturing', label: 'التصنيع' }, { id: 'link-products', href: '/products', label: 'المنتجات' }, { id: 'link-trade', href: '/trading', label: 'التجارة' }, { id: 'link-news', href: '/news', label: 'غرفة الأخبار' }, { id: 'link-about', href: '/about', label: 'عن جيما' }, { id: 'link-contact', href: '/contact', label: 'اتصل بنا' }],
        sectors: [{ href: '/engineering', label: 'الهندسة' }, { href: '/regulatory', label: 'الشؤون التنظيمية' }, { href: '/turnkey', label: 'حلول متكاملة' }]
      },
      zh: {
        logoText: 'GEMA', logoAccent: 'GLOBAL', searchPlaceholder: '搜索...', quoteText: '获取报价', sectorsLabel: '业务领域',
        links: [{ id: 'link-home', href: '/', label: '首页' }, { id: 'link-mfg', href: '/manufacturing', label: '制造' }, { id: 'link-products', href: '/products', label: '产品' }, { id: 'link-trade', href: '/trading', label: '贸易' }, { id: 'link-news', href: '/news', label: '新闻中心' }, { id: 'link-about', href: '/about', label: '关于我们' }, { id: 'link-contact', href: '/contact', label: '联系我们' }],
        sectors: [{ href: '/engineering', label: '工程' }, { href: '/regulatory', label: '法规事务' }, { href: '/turnkey', label: '交钥匙方案' }]
      },
      de: {
        logoText: 'GEMA', logoAccent: 'GLOBAL', searchPlaceholder: 'Suchen...', quoteText: 'Angebot anfordern', sectorsLabel: 'Bereiche',
        links: [{ id: 'link-home', href: '/', label: 'Startseite' }, { id: 'link-mfg', href: '/manufacturing', label: 'Fertigung' }, { id: 'link-products', href: '/products', label: 'Produkte' }, { id: 'link-trade', href: '/trading', label: 'Handel' }, { id: 'link-news', href: '/news', label: 'Newsroom' }, { id: 'link-about', href: '/about', label: 'Über uns' }, { id: 'link-contact', href: '/contact', label: 'Kontakt' }],
        sectors: [{ href: '/engineering', label: 'Engineering' }, { href: '/regulatory', label: 'Regulatorik' }, { href: '/turnkey', label: 'Turnkey-Lösungen' }]
      },
      tr: {
        logoText: 'GEMA', logoAccent: 'GLOBAL', searchPlaceholder: 'Ara...', quoteText: 'Teklif Al', sectorsLabel: 'Sektorler',
        links: [{ id: 'link-home', href: '/', label: 'Ana Sayfa' }, { id: 'link-mfg', href: '/manufacturing', label: 'Uretim' }, { id: 'link-products', href: '/products', label: 'Urunler' }, { id: 'link-trade', href: '/trading', label: 'Ticaret' }, { id: 'link-news', href: '/news', label: 'Haber Merkezi' }, { id: 'link-about', href: '/about', label: 'Hakkimizda' }, { id: 'link-contact', href: '/contact', label: 'Iletisim' }],
        sectors: [{ href: '/engineering', label: 'Muhendislik' }, { href: '/regulatory', label: 'Regulasyon' }, { href: '/turnkey', label: 'Anahtar Teslim Cozumler' }]
      }
    },
    footer: {
      en: { logoText: 'GEMA', logoAccent: 'GLOBAL', description: 'A Leading German-Egyptian Group shaping the future of medical technology through industrial excellence and digital innovation.', quickLinksTitle: 'Quick Links', quickLinks: [{ href: '/about', label: 'Our Story' }, { href: '/products', label: 'Product Catalog' }, { href: '/news', label: 'Newsroom' }], hubsTitle: 'Global Hubs', hubs: [{ city: 'Cairo, Egypt', note: '(Headquarters)' }, { city: 'Riyadh, Saudi Arabia', note: '(Regional Office)' }, { city: 'Shanghai, China', note: '(Logistics Center)' }], partnerTitle: 'Tech Partner', partnerText: 'Digital Ecosystem by MSA Agency.', copyrightText: '&copy; 2026 GEMA GLOBAL MEDICAL. All Rights Reserved. Engineered by MSA Intelligence Unit.' },
      ar: { logoText: 'GEMA', logoAccent: 'GLOBAL', description: 'مجموعة ألمانية مصرية رائدة تشكل مستقبل التكنولوجيا الطبية عبر التميز الصناعي والابتكار الرقمي.', quickLinksTitle: 'روابط سريعة', quickLinks: [{ href: '/about', label: 'قصتنا' }, { href: '/products', label: 'كتالوج المنتجات' }, { href: '/news', label: 'غرفة الأخبار' }], hubsTitle: 'المراكز العالمية', hubs: [{ city: 'القاهرة، مصر', note: '(المقر الرئيسي)' }, { city: 'الرياض، السعودية', note: '(المكتب الإقليمي)' }, { city: 'شنغهاي، الصين', note: '(مركز اللوجستيات)' }], partnerTitle: 'الشريك التقني', partnerText: 'منظومة رقمية من MSA Agency.', copyrightText: '&copy; 2026 جيما جلوبال ميديكال. جميع الحقوق محفوظة. تطوير وحدة ذكاء MSA.' },
      zh: { logoText: 'GEMA', logoAccent: 'GLOBAL', description: '德埃领先集团，以工业卓越与数字创新塑造医疗技术未来。', quickLinksTitle: '快速链接', quickLinks: [{ href: '/about', label: '我们的故事' }, { href: '/products', label: '产品目录' }, { href: '/news', label: '新闻中心' }], hubsTitle: '全球枢纽', hubs: [{ city: '埃及开罗', note: '(总部)' }, { city: '沙特利雅得', note: '(区域办公室)' }, { city: '中国上海', note: '(物流中心)' }], partnerTitle: '技术合作伙伴', partnerText: '由 MSA Agency 打造数字生态。', copyrightText: '&copy; 2026 GEMA GLOBAL MEDICAL。保留所有权利。由 MSA Intelligence Unit 提供技术支持。' },
      de: { logoText: 'GEMA', logoAccent: 'GLOBAL', description: 'Eine fuhrende deutsch-agyptische Gruppe, die die Zukunft der Medizintechnik durch industrielle Exzellenz und digitale Innovation gestaltet.', quickLinksTitle: 'Schnelllinks', quickLinks: [{ href: '/about', label: 'Unsere Geschichte' }, { href: '/products', label: 'Produktkatalog' }, { href: '/news', label: 'Newsroom' }], hubsTitle: 'Globale Standorte', hubs: [{ city: 'Kairo, Agypten', note: '(Hauptsitz)' }, { city: 'Riad, Saudi-Arabien', note: '(Regionalburo)' }, { city: 'Shanghai, China', note: '(Logistikzentrum)' }], partnerTitle: 'Technologiepartner', partnerText: 'Digitales Okosystem von MSA Agency.', copyrightText: '&copy; 2026 GEMA GLOBAL MEDICAL. Alle Rechte vorbehalten. Entwickelt von der MSA Intelligence Unit.' },
      tr: { logoText: 'GEMA', logoAccent: 'GLOBAL', description: 'Endustriyel mukemmellik ve dijital inovasyonla tibbi teknolojinin gelecegini sekillendiren oncu Alman-Misir grubu.', quickLinksTitle: 'Hizli Baglantilar', quickLinks: [{ href: '/about', label: 'Hikayemiz' }, { href: '/products', label: 'Urun Katalogu' }, { href: '/news', label: 'Haber Merkezi' }], hubsTitle: 'Kuresel Merkezler', hubs: [{ city: 'Kahire, Misir', note: '(Merkez Ofis)' }, { city: 'Riyad, Suudi Arabistan', note: '(Bolgesel Ofis)' }, { city: 'Sanghay, Cin', note: '(Lojistik Merkezi)' }], partnerTitle: 'Teknoloji Ortagi', partnerText: 'MSA Agency tarafindan dijital ekosistem.', copyrightText: '&copy; 2026 GEMA GLOBAL MEDICAL. Tum haklari saklidir. MSA Intelligence Unit tarafindan gelistirildi.' }
    }
  };

  if (defaults[slug]) return defaults[slug];
  return normalizeContent({});
}

async function getOrCreateBySlug(slug) {
  let page = await PageContent.findOne({ slug });

  if (!page) {
    page = await PageContent.create({
      slug,
      content: buildDefaultContentBySlug(slug)
    });
  }

  return page;
}

function authenticateAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function requireOperationsRole(req, res, next) {
  const role = req.user?.role;

  if (role !== 'SuperAdmin' && role !== 'OperationsAdmin') {
    return res.status(403).json({ success: false, message: 'Access denied for this role' });
  }

  return next();
}

router.post('/admin/upload-image', authenticateAdmin, requireOperationsRole, (req, res) => {
  const handler = pageImageUpload.single('image');

  handler(req, res, (error) => {
    if (error) {
      return res.status(400).json({ success: false, message: error.message || 'Image upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }

    return res.json({ success: true, imageUrl: `/uploads/${req.file.filename}` });
  });
});

router.get('/:slug', async (req, res) => {
  try {
    const slug = toCanonicalSlug(req.params.slug);
    if (!isValidSlug(slug)) {
      return res.status(400).json({ success: false, message: 'Invalid page slug' });
    }

    const lang = LANGS.includes(req.query.lang) ? req.query.lang : 'en';
    const includeAll = req.query.includeAll === '1' || req.query.includeAll === 'true';

    const page = await getOrCreateBySlug(slug);

    if (includeAll) {
      return res.json({
        success: true,
        slug,
        content: normalizeContentBySlug(page.content || {}, slug)
      });
    }

    const localized = normalizeLanguagePayload(page.content?.[lang] || {}, slug, lang);

    return res.json({
      success: true,
      slug,
      lang,
      content: localized
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch page content' });
  }
});

router.post('/update', authenticateAdmin, requireOperationsRole, async (req, res) => {
  try {
    const slug = toCanonicalSlug(req.body.slug);
    if (!isValidSlug(slug)) {
      return res.status(400).json({ success: false, message: 'Invalid page slug' });
    }

    const content = normalizeContentBySlug(req.body.content || {}, slug);

    const updated = await PageContent.findOneAndUpdate(
      { slug },
      { slug, content },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      message: `Page content updated for ${slug}`,
      knownPage: KNOWN_SLUGS.includes(slug),
      data: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update page content' });
  }
});

router.get('/admin/:slug', authenticateAdmin, requireOperationsRole, async (req, res) => {
  try {
    const slug = toCanonicalSlug(req.params.slug);

    if (!isValidSlug(slug)) {
      return res.status(400).json({ success: false, message: 'Invalid page slug' });
    }

    const page = await getOrCreateBySlug(slug);
    return res.json({ success: true, data: page });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch admin content' });
  }
});

router.put('/admin/:slug', authenticateAdmin, requireOperationsRole, async (req, res) => {
  try {
    const slug = toCanonicalSlug(req.params.slug);

    if (!isValidSlug(slug)) {
      return res.status(400).json({ success: false, message: 'Invalid page slug' });
    }

    const normalizedContent = normalizeContentBySlug(req.body.content || {}, slug);

    const updated = await PageContent.findOneAndUpdate(
      { slug },
      { slug, content: normalizedContent },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, message: 'Page content updated', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update page content' });
  }
});

module.exports = router;
