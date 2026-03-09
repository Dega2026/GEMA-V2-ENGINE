const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { adminApiLimiter, shouldSkipSecurity } = require('../middleware/securityHardening');
const { appendSecurityLog, getClientIp } = require('../utils/securityLogger');
const { generateAiText } = require('../utils/aiClient');
const Lead = require('../models/Lead');
const Product = require('../models/Product');

const router = express.Router();

const AI_ALLOWED_ROLES = ['SuperAdmin', 'OperationsAdmin', 'ProductAdmin', 'Engineer', 'EngineeringOps', 'NewsEditor'];
const SYSTEM_PROMPT = [
  'You are GEMA_Assistant, the executive AI advisor for the Global Egyptian Medical Alliance (GEMA).',
  'Your role is to help administrators with products, regulatory operations, engineering planning, leads, audit interpretation, and workflow guidance.',
  'Keep answers concise, operational, and evidence-focused.',
  'Never reveal secrets or environment variables. If asked for unsafe actions, refuse briefly and offer a safe alternative.',
  'When relevant, suggest practical next steps in bullets.'
].join(' ');

const PUBLIC_SYSTEM_PROMPT = 'أنت مساعد جيما اللبق. ساعد الزوار في فهم القطاعات الستة. لا تذكر أسعاراً. اجمع الاسم والواتساب للطلبات التجارية.';

const publicChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => shouldSkipSecurity(req),
  handler: (req, res) => {
    appendSecurityLog('http.rate_limited.public_ai', {
      ip: getClientIp(req),
      path: req.originalUrl,
      method: req.method,
      requestId: req.requestId || '',
      reason: 'rate_limited',
    });

    return res.status(429).json({
      success: false,
      message: 'Public concierge is busy. Please wait one minute and try again.',
      requestId: req.requestId || '',
    });
  },
});

function normalizeLang(raw) {
  const lang = String(raw || 'en').trim().toLowerCase();
  return ['ar', 'en', 'de', 'zh', 'tr'].includes(lang) ? lang : 'en';
}

function isBusinessIntent(message) {
  const text = String(message || '').toLowerCase();
  return /(طلب\s*تجاري|تصدير|export|commercial\s*request|business\s*inquiry|distribution|wholesale|partnership)/i.test(text);
}

function isProductQuestion(message) {
  const text = String(message || '').toLowerCase();
  return /(منتج|منتجات|products?|catalog|كتالوج|what\s+products|available\s+products|do\s+you\s+have)/i.test(text);
}

function isManufacturingQuestion(message) {
  const text = String(message || '').toLowerCase();
  return /(ماذا\s*تصنع\s*جيما|ايه\s*منتجات\s*جيما|what\s+do\s+gema\s+manufacture|what\s+does\s+gema\s+make|what\s+does\s+gema\s+produce)/i.test(text);
}

function getLeadCapturePrompt(lang) {
  const prompts = {
    ar: 'لفتح طلب تجاري/تصدير، برجاء إرسال: الاسم الكامل ورقم واتساب.',
    en: 'To open a business/export request, please share your full name and WhatsApp number.',
    de: 'Um eine Handels-/Exportanfrage zu starten, teilen Sie bitte Ihren vollstandigen Namen und Ihre WhatsApp-Nummer mit.',
    zh: '如需提交商务/出口咨询，请提供您的姓名和 WhatsApp 号码。',
    tr: 'Ticari/ihracat talebi acmak icin lutfen ad-soyad ve WhatsApp numaranizi paylasin.',
  };

  return prompts[lang] || prompts.en;
}

function normalizeLeadData(input) {
  return {
    fullName: String(input?.fullName || '').trim(),
    whatsapp: String(input?.whatsapp || '').trim(),
  };
}

function buildSyntheticLeadEmail(whatsapp) {
  const safePhone = String(whatsapp || '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const localPart = safePhone ? `publicchat-${safePhone}-${suffix}` : `publicchat-${suffix}`;
  return `${localPart}@gema-public.local`;
}

async function createPublicLead({ leadData, message, lang }) {
  const payload = {
    fullName: leadData.fullName,
    email: buildSyntheticLeadEmail(leadData.whatsapp),
    company: 'Public Concierge Visitor',
    phone: leadData.whatsapp,
    source: 'Public Concierge',
    module: 'Public AI',
    specialty: 'Export & Trading',
    notes: `Origin message: ${String(message || '').slice(0, 600)} | lang=${lang}`,
  };

  const created = await Lead.create(payload);
  return created;
}

function buildManufacturingReply(products, lang) {
  const grouped = products.reduce((acc, item) => {
    const sector = String(item?.sector || 'General').trim() || 'General';
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(String(item?.name || '').trim());
    return acc;
  }, {});

  const sectors = Object.entries(grouped)
    .map(([sector, names]) => `${sector}: ${names.filter(Boolean).slice(0, 12).join(', ')}`)
    .filter(Boolean);

  if (!sectors.length) {
    const fallback = {
      ar: 'حالياً لا توجد بيانات منتجات منشورة في قاعدة البيانات.',
      en: 'There are currently no published product records in the database.',
      de: 'Derzeit sind keine veroffentlichten Produktdaten in der Datenbank vorhanden.',
      zh: '当前数据库中暂无已发布产品数据。',
      tr: 'Veritabaninda su anda yayinlanmis urun kaydi bulunmuyor.',
    };
    return fallback[lang] || fallback.en;
  }

  const intro = {
    ar: 'جيما تصنع وتوفر المنتجات التالية حسب القطاع:',
    en: 'GEMA manufactures/supplies the following products by sector:',
    de: 'GEMA stellt/liefert folgende Produkte nach Sektor bereit:',
    zh: 'GEMA 按业务领域提供以下产品：',
    tr: 'GEMA sektorlere gore su urunleri uretir/tedarik eder:',
  };

  return `${intro[lang] || intro.en}\n- ${sectors.join('\n- ')}`;
}

function buildProductNamesReply(products, lang) {
  const names = products
    .map((item) => String(item?.name || '').trim())
    .filter(Boolean)
    .slice(0, 40);

  if (!names.length) {
    const fallback = {
      ar: 'حالياً لا توجد أسماء منتجات منشورة في قاعدة البيانات.',
      en: 'There are currently no published product names in the database.',
      de: 'Derzeit sind keine veroffentlichten Produktnamen in der Datenbank vorhanden.',
      zh: '当前数据库中暂无已发布产品名称。',
      tr: 'Veritabaninda su anda yayinlanmis urun adi bulunmuyor.',
    };
    return fallback[lang] || fallback.en;
  }

  const intro = {
    ar: 'هذه بعض المنتجات المتاحة حالياً في جيما:',
    en: 'Here are some products currently available at GEMA:',
    de: 'Hier sind einige aktuell bei GEMA verfugbare Produkte:',
    zh: '以下是 GEMA 当前可提供的部分产品：',
    tr: 'GEMA tarafinda su anda sunulan bazi urunler:',
  };

  return `${intro[lang] || intro.en}\n- ${names.join('\n- ')}`;
}

router.post('/public-chat', publicChatLimiter, async (req, res) => {
  try {
    const userMessage = String(req.body?.message || '').trim();
    const lang = normalizeLang(req.body?.lang);
    const leadData = normalizeLeadData(req.body?.lead || {});

    if (!userMessage) {
      return res.status(400).json({ success: false, message: 'message is required.' });
    }

    if (userMessage.length > 2000) {
      return res.status(400).json({ success: false, message: 'message is too long.' });
    }

    if (isManufacturingQuestion(userMessage)) {
      const products = await Product.find({}, { name: 1, sector: 1 }).sort({ name: 1 }).lean();
      return res.json({
        success: true,
        reply: buildManufacturingReply(products, lang),
        source: 'products-db',
      });
    }

    if (isProductQuestion(userMessage)) {
      const products = await Product.find({}, { name: 1 }).sort({ name: 1 }).lean();
      return res.json({
        success: true,
        reply: buildProductNamesReply(products, lang),
        source: 'products-db',
      });
    }

    const requiresLeadCapture = isBusinessIntent(userMessage);
    if (requiresLeadCapture) {
      const hasLeadPayload = Boolean(leadData.fullName && leadData.whatsapp);
      if (!hasLeadPayload) {
        return res.json({
          success: true,
          reply: getLeadCapturePrompt(lang),
          captureRequired: true,
        });
      }

      await createPublicLead({ leadData, message: userMessage, lang });
    }

    const visitorContext = [
      `Visitor language code: ${lang}`,
      'Public assistant scope: sectors, product availability in pharmacies, export procedures.',
      'Safety: never disclose prices, financial data, or internal administrative secrets.',
    ].join('\n');

    const aiReply = await generateAiText({
      systemPrompt: PUBLIC_SYSTEM_PROMPT,
      userPrompt: `${visitorContext}\n\nVisitor question:\n${userMessage}`,
      temperature: 0.2,
    });

    return res.json({
      success: true,
      reply: aiReply,
      leadCaptured: requiresLeadCapture,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to process public AI request.' });
  }
});

router.post('/chat', adminApiLimiter, authenticateToken, requireRoles(AI_ALLOWED_ROLES), async (req, res) => {
  try {
    const userMessage = String(req.body?.message || '').trim();
    const lang = String(req.body?.lang || 'en').trim().toLowerCase();

    if (!userMessage) {
      return res.status(400).json({ success: false, message: 'message is required.' });
    }

    if (userMessage.length > 4000) {
      return res.status(400).json({ success: false, message: 'message is too long.' });
    }

    const userRole = String(req.user?.role || '').trim();
    const userContext = [
      `Operator role: ${userRole || 'unknown'}`,
      `Preferred response language code: ${lang || 'en'}`
    ].join('\n');

    const aiReply = await generateAiText({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `${userContext}\n\nAdmin question:\n${userMessage}`,
      temperature: 0.2
    });

    return res.json({ success: true, reply: aiReply });
  } catch (error) {
    if (String(error.message || '').includes('AI_API_KEY')) {
      return res.status(503).json({ success: false, message: 'AI service is not configured yet (missing AI_API_KEY).' });
    }

    return res.status(500).json({ success: false, message: 'Failed to process AI request.' });
  }
});

module.exports = router;
