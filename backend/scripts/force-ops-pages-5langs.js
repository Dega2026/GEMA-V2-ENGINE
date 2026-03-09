/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const PageContent = require('../models/PageContent');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const DIRECT_SOURCING_CONTENT = {
  en: {
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
        image: '/assets/images/trading/riyadh-logistics.jpg'
      }
    ]
  },
  ar: {
    title: 'التوريد المباشر',
    cards: [
      {
        title: 'تدقيق مصانع شنغهاي',
        text: 'عمليات تدقيق ميدانية للتوريد مع تحقق كامل من الجودة قبل الشحن.',
        image: '/assets/images/trading/shanghai-hub.jpg'
      },
      {
        title: 'تأهيل الموردين',
        text: 'لا يدخل سلسلة التوريد إلا الموردون الطبيون المعتمدون.',
        image: '/assets/images/trading/supply-chain.jpg'
      },
      {
        title: 'مشتريات بضبط المخاطر',
        text: 'ضوابط تجارية وتنظيمية تدار من الشراء حتى الإرسال.',
        image: '/assets/images/trading/riyadh-logistics.jpg'
      }
    ]
  },
  de: {
    title: 'Direktbeschaffung',
    cards: [
      {
        title: 'Werksaudits in Shanghai',
        text: 'Vor-Ort-Audits mit vollstandiger Qualitatsvalidierung vor dem Versand.',
        image: '/assets/images/trading/shanghai-hub.jpg'
      },
      {
        title: 'Lieferantenqualifizierung',
        text: 'Nur freigegebene Medizinlieferanten gelangen in die Beschaffungskette.',
        image: '/assets/images/trading/supply-chain.jpg'
      },
      {
        title: 'Risikokontrollierte Beschaffung',
        text: 'Kommerzielle und Compliance-Kontrollen vom Einkauf bis zum Versand.',
        image: '/assets/images/trading/riyadh-logistics.jpg'
      }
    ]
  },
  zh: {
    title: '直接采购',
    cards: [
      {
        title: '上海工厂审计',
        text: '发货前执行现场采购审计与完整质量验证。',
        image: '/assets/images/trading/shanghai-hub.jpg'
      },
      {
        title: '供应商资质筛选',
        text: '仅已批准的医疗供应商可进入采购流程。',
        image: '/assets/images/trading/supply-chain.jpg'
      },
      {
        title: '风险控制采购',
        text: '从采购到发运全程执行商务与合规管控。',
        image: '/assets/images/trading/riyadh-logistics.jpg'
      }
    ]
  },
  tr: {
    title: 'Dogrudan Tedarik',
    cards: [
      {
        title: 'Sanghay Fabrika Denetimleri',
        text: 'Sevkiyat oncesi tam kalite dogrulamasiyla sahada tedarik denetimleri.',
        image: '/assets/images/trading/shanghai-hub.jpg'
      },
      {
        title: 'Tedarikci Yeterlilik Sureci',
        text: 'Sadece onayli medikal tedarikciler tedarik hattina dahil edilir.',
        image: '/assets/images/trading/supply-chain.jpg'
      },
      {
        title: 'Risk Kontrollu Satin Alma',
        text: 'Satin almadan sevkiyata kadar ticari ve uyum kontrolleri yonetilir.',
        image: '/assets/images/trading/riyadh-logistics.jpg'
      }
    ]
  }
};

const LOGISTICS_CONTENT = {
  en: {
    title: 'Logistics',
    cards: [
      {
        title: 'End-to-End Shipping',
        text: 'Integrated route planning from factory gate to regional healthcare facilities.',
        image: '/assets/images/trading/supply-chain.jpg'
      },
      {
        title: 'Cold-Chain Assurance',
        text: 'Temperature-sensitive products handled under validated medical standards.',
        image: '/assets/images/trading/riyadh-logistics.jpg'
      },
      {
        title: 'Customs & Clearance',
        text: 'Regulatory paperwork and border clearance synchronized with delivery timelines.',
        image: '/assets/images/trading/shanghai-hub.jpg'
      }
    ]
  },
  ar: {
    title: 'اللوجستيات',
    cards: [
      {
        title: 'شحن متكامل من البداية للنهاية',
        text: 'تخطيط مسارات متكامل من بوابة المصنع حتى المرافق الصحية الإقليمية.',
        image: '/assets/images/trading/supply-chain.jpg'
      },
      {
        title: 'ضمان سلسلة التبريد',
        text: 'التعامل مع المنتجات الحساسة للحرارة وفق معايير طبية معتمدة.',
        image: '/assets/images/trading/riyadh-logistics.jpg'
      },
      {
        title: 'الجمارك والتخليص',
        text: 'مستندات الامتثال والتخليص الحدودي متزامنة مع جداول التسليم.',
        image: '/assets/images/trading/shanghai-hub.jpg'
      }
    ]
  },
  de: {
    title: 'Logistik',
    cards: [
      {
        title: 'Ende-zu-Ende Versand',
        text: 'Integrierte Routenplanung vom Werkstor bis zu regionalen Gesundheitseinrichtungen.',
        image: '/assets/images/trading/supply-chain.jpg'
      },
      {
        title: 'Kuhlketten-Sicherheit',
        text: 'Temperaturkritische Produkte unter validierten medizinischen Standards gehandhabt.',
        image: '/assets/images/trading/riyadh-logistics.jpg'
      },
      {
        title: 'Zoll und Freigabe',
        text: 'Regulatorische Dokumente und Grenzfreigaben im Takt der Lieferzeitplane.',
        image: '/assets/images/trading/shanghai-hub.jpg'
      }
    ]
  },
  zh: {
    title: '物流',
    cards: [
      {
        title: '端到端运输',
        text: '从工厂出货口到区域医疗机构的一体化路线规划。',
        image: '/assets/images/trading/supply-chain.jpg'
      },
      {
        title: '冷链保障',
        text: '对温敏产品按照医疗验证标准进行全程处理。',
        image: '/assets/images/trading/riyadh-logistics.jpg'
      },
      {
        title: '清关与放行',
        text: '合规文件与口岸清关与交付时程同步执行。',
        image: '/assets/images/trading/shanghai-hub.jpg'
      }
    ]
  },
  tr: {
    title: 'Lojistik',
    cards: [
      {
        title: 'Uctan Uca Sevkiyat',
        text: 'Fabrika cikisindan bolgesel saglik tesislerine kadar entegre rota planlamasi.',
        image: '/assets/images/trading/supply-chain.jpg'
      },
      {
        title: 'Soguk Zincir Guvencesi',
        text: 'Isiya duyarli urunler dogrulanmis medikal standartlarla yonetilir.',
        image: '/assets/images/trading/riyadh-logistics.jpg'
      },
      {
        title: 'Gumruk ve Cikis Islemleri',
        text: 'Uyumluluk evraklari ve sinir gecisleri teslimat takvimleriyle senkronize edilir.',
        image: '/assets/images/trading/shanghai-hub.jpg'
      }
    ]
  }
};

async function upsertPage(slug, content) {
  await PageContent.findOneAndUpdate(
    { slug },
    { slug, content },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}

async function printCheck(slug) {
  const doc = await PageContent.findOne({ slug }).lean();
  console.log(`--- ${slug} ---`);
  ['ar', 'en', 'de', 'zh', 'tr'].forEach((lang) => {
    const langContent = doc?.content?.[lang] || {};
    console.log(
      `${lang}: title=${langContent.title || 'MISSING'} | card0=${langContent.cards?.[0]?.title || 'MISSING'}`
    );
  });
}

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gema_v2';
  await mongoose.connect(uri);

  await upsertPage('direct-sourcing', DIRECT_SOURCING_CONTENT);
  await upsertPage('logistics', LOGISTICS_CONTENT);

  await printCheck('direct-sourcing');
  await printCheck('logistics');

  await mongoose.disconnect();
  console.log('force-ops-pages-5langs completed.');
}

run().catch(async (error) => {
  console.error('force-ops-pages-5langs failed:', error);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
