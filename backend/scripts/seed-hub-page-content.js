/* eslint-disable no-console */
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const PageContent = require('../models/PageContent');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gema_v2';

const hubContent = {
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
};

async function run() {
  await mongoose.connect(MONGO_URI);
  const updated = await PageContent.findOneAndUpdate(
    { slug: 'hub' },
    { slug: 'hub', content: hubContent },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  console.log(`Hub content seeded. id=${updated._id}`);
}

run()
  .catch((error) => {
    console.error('Hub seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
