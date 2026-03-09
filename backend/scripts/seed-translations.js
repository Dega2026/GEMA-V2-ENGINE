/* eslint-disable no-console */
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const PageContent = require('../models/PageContent');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const LANGS = ['ar', 'en', 'de', 'zh', 'tr'];
const ABOUT_IMAGE_PATHS = [
  '/assets/images/news/riyadh-hq.jpg',
  '/assets/images/news/future-news.jpg',
  '/assets/images/news/factory-news.jpg'
];

const ABOUT_DEFAULTS = {
  en: {
    title: 'About GEMA',
    abt_subtitle: 'THE GEMA MULTIVERSE',
    abt_vision_h2: 'Our Vision',
    abt_vision_p: 'To become the primary medical infrastructure partner in the region.',
    cards: [
      {
        title: 'Riyadh & Shanghai Hubs',
        text: 'Regional operations in Riyadh and sourcing in Shanghai powering fast delivery.'
      },
      {
        title: 'Digital Intelligence',
        text: 'AI-first execution and digital systems built with enterprise-grade governance.'
      },
      {
        title: 'Industrial Excellence',
        text: 'German-grade manufacturing discipline combined with local operational scale.'
      }
    ]
  },
  ar: {
    title: 'عن جيما',
    abt_subtitle: 'عالم جيما المتعدد',
    abt_vision_h2: 'رؤيتنا',
    abt_vision_p: 'أن نصبح الشريك الأول للبنية التحتية الطبية في المنطقة.',
    cards: [
      {
        title: 'مراكز الرياض وشنغهاي',
        text: 'عمليات إقليمية في الرياض وتوريد من شنغهاي يدعمان سرعة التسليم.'
      },
      {
        title: 'الذكاء الرقمي',
        text: 'تنفيذ يعتمد على الذكاء الاصطناعي وأنظمة رقمية مبنية بحوكمة مؤسسية.'
      },
      {
        title: 'التميز الصناعي',
        text: 'انضباط تصنيع بمعايير ألمانية مع نطاق تشغيلي محلي.'
      }
    ]
  },
  de: {
    title: 'Über GEMA',
    abt_subtitle: 'DAS GEMA MULTIVERSUM',
    abt_vision_h2: 'Unsere Vision',
    abt_vision_p: 'Der führende Partner für medizinische Infrastruktur in der Region zu sein.',
    cards: [
      {
        title: 'Hubs in Riad und Shanghai',
        text: 'Regionale Abläufe in Riad und Beschaffung in Shanghai ermöglichen schnelle Lieferung.'
      },
      {
        title: 'Digitale Intelligenz',
        text: 'AI-First-Umsetzung und digitale Systeme mit Governance auf Enterprise-Niveau.'
      },
      {
        title: 'Industrielle Exzellenz',
        text: 'Deutsche Fertigungsdisziplin kombiniert mit lokaler operativer Skalierung.'
      }
    ]
  },
  zh: {
    title: '关于 GEMA',
    abt_subtitle: 'GEMA 多元宇宙',
    abt_vision_h2: '我们的愿景',
    abt_vision_p: '成为区域内首要的医疗基础设施合作伙伴。',
    cards: [
      {
        title: '利雅得与上海枢纽',
        text: '利雅得区域运营与上海采购协同，保障快速交付。'
      },
      {
        title: '数字智能',
        text: '以 AI 为先的执行体系与企业级治理的数字系统。'
      },
      {
        title: '工业卓越',
        text: '德系制造纪律结合本地化运营规模。'
      }
    ]
  },
  tr: {
    title: 'GEMA Hakkında',
    abt_subtitle: 'GEMA ÇOKLU EVRENİ',
    abt_vision_h2: 'Vizyonumuz',
    abt_vision_p: 'Bölgede birincil medikal altyapı ortağı olmak.',
    cards: [
      {
        title: 'Riyad ve Şanghay Merkezleri',
        text: 'Riyad\'daki bölgesel operasyonlar ve Şanghay\'daki tedarik hızlı teslimatı destekler.'
      },
      {
        title: 'Dijital Zeka',
        text: 'Yapay zeka odaklı yürütme ve kurumsal düzeyde yönetişimle kurulan dijital sistemler.'
      },
      {
        title: 'Endüstriyel Mükemmellik',
        text: 'Alman standartlarında üretim disiplini, yerel operasyonel ölçekle birleşir.'
      }
    ]
  }
};

const SERVICE_DETAILS_DEFAULTS = {
  en: {
    serviceMeta: {
      overviewTitle: 'Overview',
      benefitsTitle: 'Key Benefits',
      requestTitle: 'Request This Service',
      namePlaceholder: 'Your Name',
      emailPlaceholder: 'Business Email',
      submitLabel: 'Submit Request'
    },
    fallback: {
      title: 'Service Not Found',
      subtitle: '',
      tag: 'Error',
      desc: 'Please return to the services pages and select a valid service.',
      subject: 'General Inquiry',
      image: '/assets/images/default-bg.jpg',
      benefits: []
    },
    services: {
      sfda: {
        title: 'SFDA Registration', subtitle: 'Saudi Food & Drug Authority Compliance', tag: 'GCC Markets',
        desc: 'Regulatory registration support for medical products in Saudi Arabia.',
        subject: 'Inquiry regarding: SFDA Registration', image: '/assets/images/regulatory/sfda-registration.jpg',
        benefits: ['Local Authorized Representation', 'Fast-track MDMA Approval', 'Classification Support']
      },
      eda: {
        title: 'EDA Registration', subtitle: 'Egyptian Drug Authority Standards', tag: 'Compliance',
        desc: 'Product registration and licensing support for Egyptian market entry.',
        subject: 'Inquiry regarding: EDA Registration', image: '/assets/images/regulatory/eda-registration.jpg',
        benefits: ['Complete File Preparation', 'Factory Licensing Assistance', 'Import and Export Approvals']
      },
      iso13485: {
        title: 'ISO 13485 Implementation', subtitle: 'Quality Management for Medical Devices', tag: 'Quality',
        desc: 'QMS implementation from gap analysis to certification readiness.',
        subject: 'Inquiry regarding: ISO 13485 Implementation', image: '/assets/images/regulatory/iso-13485.jpg',
        benefits: ['Gap Analysis', 'Document Control', 'Certification Preparation']
      },
      'ce-marking': {
        title: 'CE Marking', subtitle: 'European Market Entry', tag: 'European Markets',
        desc: 'Technical file preparation for MDR and IVDR compliant market entry.',
        subject: 'Inquiry regarding: CE Marking', image: '/assets/images/regulatory/ce-marking.jpg',
        benefits: ['Technical File Compilation', 'Clinical Evaluation Reports', 'Risk Management ISO 14971']
      },
      'tk-concept': {
        title: 'Concept & Design', subtitle: 'Turnkey Factory Projects (Phase 01)', tag: 'Phase 01',
        desc: 'Architectural and technical design of compliant medical facilities.',
        subject: 'Inquiry regarding: Turnkey - Concept & Design', image: '/assets/images/turnkey/factory-design.jpg',
        benefits: ['Architectural Planning', 'Cleanroom Compliance', 'Utility and HVAC Planning']
      },
      'tk-setup': {
        title: 'Machinery & Setup', subtitle: 'Turnkey Factory Projects (Phase 02)', tag: 'Phase 02',
        desc: 'Production line sourcing and installation with smart monitoring integration.',
        subject: 'Inquiry regarding: Turnkey - Machinery & Setup', image: '/assets/images/turnkey/machinery-setup.jpg',
        benefits: ['Equipment Sourcing', 'Professional Installation', 'Monitoring Integration']
      },
      'tk-ops': {
        title: 'Operational Support', subtitle: 'Turnkey Factory Projects (Phase 03)', tag: 'Phase 03',
        desc: 'Training and supervised ramp-up to reach full operational readiness.',
        subject: 'Inquiry regarding: Turnkey - Operational Support', image: '/assets/images/turnkey/operational-support.jpg',
        benefits: ['Staff Training', 'Know-how Transfer', 'Initial Production Supervision']
      },
      'eng-or': {
        title: 'Turnkey Operating Rooms', subtitle: 'Medical Engineering Infrastructure', tag: 'Infrastructure',
        desc: 'Modular operating rooms designed and installed to German-grade standards.',
        subject: 'Inquiry regarding: Turnkey Operating Rooms', image: '/assets/images/engineering/operating-rooms.jpg',
        benefits: ['Modular OR Design', 'Sterilization Standards', 'Laminar Flow Integration']
      },
      'eng-maint': {
        title: 'Biomedical Maintenance', subtitle: 'Medical Engineering Service', tag: 'Service',
        desc: '24/7 support and preventive maintenance for critical medical systems.',
        subject: 'Inquiry regarding: Biomedical Maintenance', image: '/assets/images/engineering/biomedical-service.jpg',
        benefits: ['24/7 Technical Support', 'Preventive Maintenance', 'Downtime Reduction']
      }
    }
  },
  ar: {
    serviceMeta: {
      overviewTitle: 'نظرة عامة',
      benefitsTitle: 'المزايا الرئيسية',
      requestTitle: 'اطلب هذه الخدمة',
      namePlaceholder: 'الاسم',
      emailPlaceholder: 'بريد العمل',
      submitLabel: 'إرسال الطلب'
    },
    fallback: {
      title: 'الخدمة غير موجودة',
      subtitle: '',
      tag: 'خطأ',
      desc: 'يرجى الرجوع إلى صفحات الخدمات واختيار خدمة صحيحة.',
      subject: 'استفسار عام',
      image: '/assets/images/default-bg.jpg',
      benefits: []
    },
    services: {
      sfda: { title: 'تسجيل SFDA', subtitle: 'امتثال هيئة الغذاء والدواء السعودية', tag: 'أسواق الخليج', desc: 'دعم تنظيمي متكامل لتسجيل المنتجات الطبية في السعودية.', subject: 'استفسار بخصوص: تسجيل SFDA', image: '/assets/images/regulatory/sfda-registration.jpg', benefits: ['تمثيل محلي معتمد', 'تسريع موافقات MDMA', 'دعم التصنيف'] },
      eda: { title: 'تسجيل EDA', subtitle: 'معايير هيئة الدواء المصرية', tag: 'امتثال', desc: 'دعم تسجيل المنتجات والتراخيص لدخول السوق المصري.', subject: 'استفسار بخصوص: تسجيل EDA', image: '/assets/images/regulatory/eda-registration.jpg', benefits: ['إعداد الملف الكامل', 'مساعدة تراخيص المصانع', 'موافقات الاستيراد والتصدير'] },
      iso13485: { title: 'تطبيق ISO 13485', subtitle: 'إدارة جودة الأجهزة الطبية', tag: 'جودة', desc: 'تنفيذ نظام الجودة من تحليل الفجوات وحتى الاستعداد للاعتماد.', subject: 'استفسار بخصوص: تطبيق ISO 13485', image: '/assets/images/regulatory/iso-13485.jpg', benefits: ['تحليل الفجوات', 'ضبط الوثائق', 'الاستعداد للاعتماد'] },
      'ce-marking': { title: 'علامة CE', subtitle: 'دخول السوق الأوروبية', tag: 'الأسواق الأوروبية', desc: 'إعداد الملفات الفنية وفق MDR وIVDR لدخول السوق.', subject: 'استفسار بخصوص: علامة CE', image: '/assets/images/regulatory/ce-marking.jpg', benefits: ['تجهيز الملف الفني', 'تقارير التقييم السريري', 'إدارة المخاطر ISO 14971'] },
      'tk-concept': { title: 'المفهوم والتصميم', subtitle: 'المشاريع المتكاملة - المرحلة 01', tag: 'المرحلة 01', desc: 'تصميم معماري وفني لمنشآت طبية مطابقة للمعايير.', subject: 'استفسار بخصوص: المفهوم والتصميم', image: '/assets/images/turnkey/factory-design.jpg', benefits: ['تخطيط معماري', 'امتثال الغرف النظيفة', 'تخطيط المرافق والتكييف'] },
      'tk-setup': { title: 'الآلات والإعداد', subtitle: 'المشاريع المتكاملة - المرحلة 02', tag: 'المرحلة 02', desc: 'توريد وتركيب خطوط الإنتاج مع دمج المراقبة الذكية.', subject: 'استفسار بخصوص: الآلات والإعداد', image: '/assets/images/turnkey/machinery-setup.jpg', benefits: ['توريد المعدات', 'تركيب احترافي', 'دمج المراقبة'] },
      'tk-ops': { title: 'الدعم التشغيلي', subtitle: 'المشاريع المتكاملة - المرحلة 03', tag: 'المرحلة 03', desc: 'تدريب الفرق والإشراف على التشغيل للوصول للطاقة الكاملة.', subject: 'استفسار بخصوص: الدعم التشغيلي', image: '/assets/images/turnkey/operational-support.jpg', benefits: ['تدريب الطاقم', 'نقل المعرفة', 'إشراف الإنتاج الأولي'] },
      'eng-or': { title: 'غرف عمليات متكاملة', subtitle: 'البنية التحتية للهندسة الطبية', tag: 'بنية تحتية', desc: 'تصميم وتركيب غرف عمليات معيارية بمعايير ألمانية.', subject: 'استفسار بخصوص: غرف العمليات المتكاملة', image: '/assets/images/engineering/operating-rooms.jpg', benefits: ['تصميم OR معياري', 'معايير التعقيم', 'دمج Laminar Flow'] },
      'eng-maint': { title: 'الصيانة الطبية الحيوية', subtitle: 'خدمات الهندسة الطبية', tag: 'خدمة', desc: 'دعم وصيانة وقائية على مدار الساعة للأنظمة الحرجة.', subject: 'استفسار بخصوص: الصيانة الطبية الحيوية', image: '/assets/images/engineering/biomedical-service.jpg', benefits: ['دعم 24/7', 'صيانة وقائية', 'تقليل التوقف'] }
    }
  },
  de: {
    serviceMeta: {
      overviewTitle: 'Uberblick',
      benefitsTitle: 'Hauptvorteile',
      requestTitle: 'Diesen Service anfordern',
      namePlaceholder: 'Ihr Name',
      emailPlaceholder: 'Business-E-Mail',
      submitLabel: 'Anfrage senden'
    },
    fallback: {
      title: 'Dienst nicht gefunden',
      subtitle: '',
      tag: 'Fehler',
      desc: 'Bitte kehren Sie zur Serviceseite zuruck und wahlen Sie einen gultigen Dienst.',
      subject: 'Allgemeine Anfrage',
      image: '/assets/images/default-bg.jpg',
      benefits: []
    },
    services: {}
  },
  zh: {
    serviceMeta: {
      overviewTitle: '服务概览',
      benefitsTitle: '核心优势',
      requestTitle: '申请此服务',
      namePlaceholder: '您的姓名',
      emailPlaceholder: '商务邮箱',
      submitLabel: '提交申请'
    },
    fallback: {
      title: '未找到服务',
      subtitle: '',
      tag: '错误',
      desc: '请返回服务页面并选择有效服务。',
      subject: '一般咨询',
      image: '/assets/images/default-bg.jpg',
      benefits: []
    },
    services: {}
  },
  tr: {
    serviceMeta: {
      overviewTitle: 'Genel Bakis',
      benefitsTitle: 'Temel Avantajlar',
      requestTitle: 'Bu Hizmeti Talep Et',
      namePlaceholder: 'Adiniz',
      emailPlaceholder: 'Is E-postasi',
      submitLabel: 'Talep Gonder'
    },
    fallback: {
      title: 'Hizmet Bulunamadi',
      subtitle: '',
      tag: 'Hata',
      desc: 'Lutfen hizmet sayfasina donun ve gecerli bir hizmet secin.',
      subject: 'Genel Talep',
      image: '/assets/images/default-bg.jpg',
      benefits: []
    },
    services: {}
  }
};

const HOME_STRINGS_DEFAULTS = {
  home_news_subtitle: 'GEMA Broadcast',
  home_news_title: 'Latest <span>Newsroom Signals</span>',
  home_news_loading_title: 'Loading latest broadcast...',
  home_news_loading_desc: 'Please wait while we sync newsroom updates.',
  home_news_enabled: 'true',
  home_explore_subtitle: 'Operational Gateways',
  home_explore_title: 'Explore <span>Live Pages</span>',
  home_explore_enabled: 'true',
  home_explore_card1_tag: 'Operations',
  home_explore_card1_title: 'Direct Sourcing',
  home_explore_card1_text: 'Factory audits, supplier qualification, and compliant procurement at source.',
  home_explore_card2_tag: 'Operations',
  home_explore_card2_title: 'Logistics',
  home_explore_card2_text: 'End-to-end transport planning and regional delivery orchestration.',
  home_explore_card3_tag: 'Company',
  home_explore_card3_title: 'About GEMA',
  home_explore_card3_text: 'Riyadh and Shanghai hubs, digital intelligence, and industrial excellence.'
};

function ensureLangContent(content) {
  const out = { ...content };
  LANGS.forEach((lang) => {
    if (!out[lang] || typeof out[lang] !== 'object' || Array.isArray(out[lang])) {
      out[lang] = {};
    }
  });
  return out;
}

function ensureAboutCards(contentByLang) {
  const next = { ...contentByLang };
  LANGS.forEach((lang) => {
    const langPayload = next[lang] || {};
    const defaults = ABOUT_DEFAULTS[lang] || ABOUT_DEFAULTS.en;
    const cards = Array.isArray(langPayload.cards) ? [...langPayload.cards] : [];

    for (let index = 0; index < 3; index += 1) {
      const card = cards[index] && typeof cards[index] === 'object' ? { ...cards[index] } : {};
      const defaultCard = defaults.cards[index] || ABOUT_DEFAULTS.en.cards[index];
      card.title = String(defaultCard.title);
      card.text = String(defaultCard.text);
      card.image = ABOUT_IMAGE_PATHS[index];
      cards[index] = card;
    }

    next[lang] = {
      ...langPayload,
      title: String(defaults.title),
      abt_subtitle: String(defaults.abt_subtitle),
      abt_vision_h2: String(defaults.abt_vision_h2),
      abt_vision_p: String(defaults.abt_vision_p),
      cards
    };
  });

  return next;
}

function ensureHomeStrings(contentByLang) {
  const next = { ...contentByLang };
  LANGS.forEach((lang) => {
    const langPayload = next[lang] || {};
    const strings = langPayload.strings && typeof langPayload.strings === 'object'
      ? { ...langPayload.strings }
      : {};

    Object.entries(HOME_STRINGS_DEFAULTS).forEach(([key, value]) => {
      if (typeof strings[key] !== 'string' || strings[key].trim().length === 0) {
        strings[key] = value;
      }
    });

    next[lang] = {
      ...langPayload,
      strings,
      sections: {
        ...(langPayload.sections && typeof langPayload.sections === 'object' ? langPayload.sections : {}),
        news: {
          ...(langPayload.sections?.news && typeof langPayload.sections.news === 'object' ? langPayload.sections.news : {}),
          enabled: true
        },
        explore: {
          ...(langPayload.sections?.explore && typeof langPayload.sections.explore === 'object' ? langPayload.sections.explore : {}),
          enabled: true
        }
      }
    };
  });

  return next;
}

function cloneFallbackFromEnglish(defaults) {
  const englishServices = defaults.en.services || {};
  ['de', 'zh', 'tr'].forEach((lang) => {
    if (!defaults[lang].services || Object.keys(defaults[lang].services).length === 0) {
      defaults[lang].services = JSON.parse(JSON.stringify(englishServices));
    }
  });
  return defaults;
}

function ensureServiceDetailsContent(contentByLang) {
  const defaultsByLang = cloneFallbackFromEnglish(JSON.parse(JSON.stringify(SERVICE_DETAILS_DEFAULTS)));
  const next = { ...contentByLang };

  LANGS.forEach((lang) => {
    const defaults = defaultsByLang[lang] || defaultsByLang.en;
    next[lang] = {
      serviceMeta: defaults.serviceMeta,
      fallback: defaults.fallback,
      services: defaults.services
    };
  });

  return next;
}

async function runSeedTranslations() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gema_v2';
  await mongoose.connect(uri);

  const aboutDoc = await PageContent.findOne({ slug: 'about' });
  const homeDoc = await PageContent.findOne({ slug: 'home' });
  const serviceDetailsDoc = await PageContent.findOne({ slug: 'service-details' });

  const aboutContent = ensureAboutCards(ensureLangContent(aboutDoc?.content || {}));
  await PageContent.findOneAndUpdate(
    { slug: 'about' },
    { slug: 'about', content: aboutContent },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const homeContent = ensureHomeStrings(ensureLangContent(homeDoc?.content || {}));
  await PageContent.findOneAndUpdate(
    { slug: 'home' },
    { slug: 'home', content: homeContent },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const serviceDetailsContent = ensureServiceDetailsContent(ensureLangContent(serviceDetailsDoc?.content || {}));
  await PageContent.findOneAndUpdate(
    { slug: 'service-details' },
    { slug: 'service-details', content: serviceDetailsContent },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  await mongoose.disconnect();
  console.log('seed-translations completed: about, home, and service-details content synchronized.');
}

runSeedTranslations().catch((error) => {
  console.error('seed-translations failed:', error);
  process.exit(1);
});
