/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const PageContent = require('../models/PageContent');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const ABOUT_5_LANGS = {
  en: {
    title: 'About GEMA',
    abt_subtitle: 'THE GEMA MULTIVERSE',
    abt_vision_h2: 'Our Vision',
    abt_vision_p: 'To become the primary medical infrastructure partner in the region.',
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
  },
  ar: {
    title: 'عن جيما',
    abt_subtitle: 'عالم جيما المتعدد',
    abt_vision_h2: 'رؤيتنا',
    abt_vision_p: 'أن نصبح الشريك الأول للبنية التحتية الطبية في المنطقة.',
    cards: [
      {
        title: 'مراكز الرياض وشنغهاي',
        text: 'عمليات إقليمية في الرياض وتوريد من شنغهاي يدعمان سرعة التسليم.',
        image: '/assets/images/news/riyadh-hq.jpg'
      },
      {
        title: 'الذكاء الرقمي',
        text: 'تنفيذ يعتمد على الذكاء الاصطناعي وأنظمة رقمية مبنية بحوكمة مؤسسية.',
        image: '/assets/images/news/future-news.jpg'
      },
      {
        title: 'التميز الصناعي',
        text: 'انضباط تصنيع بمعايير ألمانية مع نطاق تشغيلي محلي.',
        image: '/assets/images/news/factory-news.jpg'
      }
    ]
  },
  de: {
    title: 'Uber GEMA',
    abt_subtitle: 'DAS GEMA MULTIVERSUM',
    abt_vision_h2: 'Unsere Vision',
    abt_vision_p: 'Der fuhrende Partner fur medizinische Infrastruktur in der Region zu sein.',
    cards: [
      {
        title: 'Hubs in Riad und Shanghai',
        text: 'Regionale Ablaufe in Riad und Beschaffung in Shanghai ermoglichen schnelle Lieferung.',
        image: '/assets/images/news/riyadh-hq.jpg'
      },
      {
        title: 'Digitale Intelligenz',
        text: 'AI-First-Umsetzung und digitale Systeme mit Governance auf Enterprise-Niveau.',
        image: '/assets/images/news/future-news.jpg'
      },
      {
        title: 'Industrielle Exzellenz',
        text: 'Deutsche Fertigungsdisziplin kombiniert mit lokaler operativer Skalierung.',
        image: '/assets/images/news/factory-news.jpg'
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
        text: '利雅得区域运营与上海采购协同，保障快速交付。',
        image: '/assets/images/news/riyadh-hq.jpg'
      },
      {
        title: '数字智能',
        text: '以 AI 为先的执行体系与企业级治理的数字系统。',
        image: '/assets/images/news/future-news.jpg'
      },
      {
        title: '工业卓越',
        text: '德系制造纪律结合本地化运营规模。',
        image: '/assets/images/news/factory-news.jpg'
      }
    ]
  },
  tr: {
    title: 'GEMA Hakkinda',
    abt_subtitle: 'GEMA COKLU EVRENI',
    abt_vision_h2: 'Vizyonumuz',
    abt_vision_p: 'Bolgede birincil medikal altyapi ortagi olmak.',
    cards: [
      {
        title: 'Riyad ve Sanghay Merkezleri',
        text: 'Riyad\'daki bolgesel operasyonlar ve Sanghay\'daki tedarik hizli teslimati destekler.',
        image: '/assets/images/news/riyadh-hq.jpg'
      },
      {
        title: 'Dijital Zeka',
        text: 'Yapay zeka odakli yurutme ve kurumsal duzeyde yonetisimle kurulan dijital sistemler.',
        image: '/assets/images/news/future-news.jpg'
      },
      {
        title: 'Endustriyel Mukemmellik',
        text: 'Alman standartlarinda uretim disiplini, yerel operasyonel olcekle birlesir.',
        image: '/assets/images/news/factory-news.jpg'
      }
    ]
  }
};

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gema_v2';
  await mongoose.connect(uri);

  await PageContent.findOneAndUpdate(
    { slug: 'about' },
    { slug: 'about', content: ABOUT_5_LANGS },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  const saved = await PageContent.findOne({ slug: 'about' }).lean();
  console.log('about content updated. titles by lang:');
  ['ar', 'en', 'de', 'zh', 'tr'].forEach((lang) => {
    console.log(`${lang}: ${saved?.content?.[lang]?.title || 'MISSING'}`);
  });

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('force-about-5langs failed:', error);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
