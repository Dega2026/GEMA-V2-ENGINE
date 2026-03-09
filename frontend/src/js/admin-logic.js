/* ==========================================================================
   GEMA ADMIN ENGINE - LOGIC UNIT (V3.0 - CLEAN ISLAND)
   Unified, Secured, Smart with Currency Engine & Matrix Calculator
   ========================================================================== */

(function enhanceNativeAlert() {
    const nativeAlert = window.alert.bind(window);

    window.alert = function smartAlert(message) {
        const text = String(message || '').trim();
        if (window.Swal && typeof window.Swal.fire === 'function') {
            window.Swal.fire({
                icon: text.includes('❌') || text.toLowerCase().includes('error') ? 'error' : 'success',
                title: 'GEMA Notification',
                text,
                confirmButtonText: 'OK',
                confirmButtonColor: '#c99a2f',
                background: '#0f1319',
                color: '#f5f0dc'
            });
            return;
        }

        nativeAlert(message);
    };
})();

window.addEventListener('DOMContentLoaded', () => {
    // Strict admin policy: always require fresh credentials on each entry.
    clearAdminAuthStorage();
    document.body.classList.remove('authenticated');
    showLoginPortal();
    applyAdminUiTranslation(getAdminUiLang());
    setupLoginForm();
});

// Security policy requested by user:
// as soon as admin page is left, credentials are wiped and re-login is required.
window.addEventListener('beforeunload', () => {
    clearAdminAuthStorage();
    AdminState.token = null;
    AdminState.user = null;
    AdminState.userRole = null;
});

// ========== GLOBAL STATE ==========
const AdminState = {
    token: null,
    user: null,
    userRole: null,      // 🆕 تخزين الرتبة
    products: [],
    machinery: [],
    news: [],
    pageContentCache: {},
    exchangeRate: 1,
    matrixValue: 0
};

const ActivityTrackerState = {
    actors: [],
    loadedActors: false,
    bound: false,
    seedUserId: '',
    seedName: ''
};

const ALL_SECTIONS = ['products', 'projects', 'machinery', 'regulatory', 'staff', 'newsroom', 'page-manager', 'operations', 'about-manager'];
const REPORT_MODULE_BY_SECTION = {
    products: 'Products',
    projects: 'Projects',
    machinery: 'Engineering Hub',
    regulatory: 'Regulatory',
    staff: 'Staff',
    newsroom: 'Newsroom',
    'page-manager': 'Page Manager',
    operations: 'Operations',
    'about-manager': 'About Manager'
};
const REPORT_SPECIALTY_BY_SECTION = {
    products: 'General',
    projects: 'Turnkey',
    machinery: 'Machinery & Production Lines',
    regulatory: 'Regulatory Compliance',
    staff: 'Staff & Roles',
    newsroom: 'News & Media',
    'page-manager': 'Content Management',
    operations: 'Operations',
    'about-manager': 'Corporate Profile'
};
const SUPPORTED_LANGS = ['ar', 'en', 'de', 'zh', 'tr'];
const AdminI18nApi = (window.GEMA && window.GEMA.I18n && window.GEMA.I18n.Admin && window.GEMA.I18n.Admin.api) || {};
const {
    getAdminUiLang = () => 'en',
    applyAdminUiTranslation = () => {},
    setupAdminHeaderI18n = () => {}
} = AdminI18nApi;
const PAGE_API_BASE = '/api/pages';
const ABOUT_PAGE_SLUG = 'about';
const LOGIN_SUCCESS_DURATION_MS = 2000;
const LOGIN_ERROR_DURATION_MS = 2200;
const HUD_MAX_RESULTS = 8;
const STRONG_PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const PASSWORD_POLICY_MESSAGE = 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.';

function formatPriceLabel(value, currency = 'EGP', fallback = 'Price on request') {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return fallback;
    return `${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${String(currency || 'EGP').toUpperCase()}`;
}

function isHighPrivilegeRole(role = AdminState.userRole) {
    const normalized = normalizeRole(role);
    return normalized === 'SuperAdmin' || normalized === 'OperationsAdmin';
}

function canViewFinancials(role = AdminState.userRole) {
    return isHighPrivilegeRole(role);
}

function refreshFinancialWidgetVisibility() {
    const matrixWidget = document.getElementById('widget-matrix-value');
    const exchangeWidget = document.getElementById('widget-exchange-rate');
    const matrixCard = matrixWidget ? matrixWidget.closest('.widget-card') : null;
    const exchangeCard = exchangeWidget ? exchangeWidget.closest('.widget-card') : null;
    const visible = canViewFinancials(AdminState.userRole);

    if (matrixCard) matrixCard.style.display = visible ? 'flex' : 'none';
    if (exchangeCard) exchangeCard.style.display = visible ? 'flex' : 'none';
}

const UNIVERSAL_SLUG_TEMPLATES = {
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

function getUniversalTemplate(slug, lang) {
    const slugTemplates = UNIVERSAL_SLUG_TEMPLATES[slug];
    if (!slugTemplates) return {};
    return slugTemplates[lang] || slugTemplates.en || {};
}

function normalizeRole(role) {
    const raw = String(role || '').trim().toLowerCase();
    if (raw === 'superadmin' || raw === 'super_admin') return 'SuperAdmin';
    if (raw === 'operationsadmin' || raw === 'operations_admin') return 'OperationsAdmin';
    if (raw === 'engineeringops' || raw === 'engineering_ops' || raw === 'engineeringhubadmin') return 'EngineeringOps';
    if (raw === 'newseditor' || raw === 'news_editor') return 'NewsEditor';
    if (raw === 'productadmin' || raw === 'product_admin') return 'ProductAdmin';
    if (raw === 'regulatory') return 'Regulatory';
    if (raw === 'engineer') return 'Engineer';
    if (raw === 'staff') return 'Staff';
    return role || '';
}

// ========== 1. AUTH GUARD & ROLE-BASED ACCESS (SESSION ONLY) ========== 
function decodeJwtPayload(token) {
    try {
        const parts = String(token || '').split('.');
        if (parts.length !== 3) return null;
        const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payloadJson = atob(payloadBase64);
        return JSON.parse(payloadJson);
    } catch (error) {
        return null;
    }
}

function isTokenValid(token) {
    if (!token || token === 'undefined' || token === 'null') return false;
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    return payload.exp > nowSec;
}

function showLoginPortal() {
    const portal = document.getElementById('login-overlay');
    const dashboard = document.getElementById('admin-dashboard');
    document.body.classList.remove('authenticated');
    if (portal) portal.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
}

function clearAdminAuthStorage() {
    sessionStorage.clear();
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('GEMA_token');
    localStorage.removeItem('GEMA_user_role');
    localStorage.removeItem('GEMA_user_name');
    document.body.classList.remove('authenticated');
}

function forceLogout(reason = 'Session expired', notify = false) {
    clearAdminAuthStorage();
    AdminState.token = null;
    AdminState.user = null;
    AdminState.userRole = null;

    if (notify) {
        alert(`🔒 ${reason}`);
    }

    showLoginPortal();
}

async function initializeAdmin() {
    const token = localStorage.getItem('token') || localStorage.getItem('GEMA_token') || sessionStorage.getItem('GEMA_token');
    const rawRole = localStorage.getItem('userRole') || localStorage.getItem('GEMA_user_role') || sessionStorage.getItem('GEMA_user_role');
    const userRole = normalizeRole(rawRole);
    const userName = localStorage.getItem('userName') || localStorage.getItem('GEMA_user_name') || sessionStorage.getItem('GEMA_user_name');

    window.onpageshow = function(event) {
        if (event.persisted) window.location.reload();
    };

    if (!token || !isTokenValid(token) || !userRole) {
        console.log('🔒 Auth Guard: Missing/Expired token in localStorage/sessionStorage');
        showLoginPortal();
        setupLoginForm();
        return;
    }

    console.log('✨ GEMA Engine Initialized [Auth Guard Active] Role:', userRole);
    await startAuthenticatedAdmin(token, userRole, userName);
}

async function startAuthenticatedAdmin(token, userRole, userName) {
    const normalizedRole = normalizeRole(userRole);

    if (!isTokenValid(token) || !normalizedRole) {
        forceLogout('Invalid token payload');
        setupLoginForm();
        return;
    }

    AdminState.token = token;
    AdminState.user = { role: normalizedRole, name: userName || 'GEMA Operator' };
    showDashboard();

    const userRoleDisplay = document.getElementById('user-role-display');
    if (userRoleDisplay) {
        userRoleDisplay.innerHTML = `<strong>${AdminState.user.name}</strong><br><small>(${normalizedRole})</small>`;
    }

    applyPermissions(normalizedRole);
    await loadDashboardData();
}

// ========== ROLE-BASED RESTRICTIONS (V3.5 - SECURE) ==========
function applyPermissions(userRole) {
    AdminState.userRole = normalizeRole(userRole);

    // إخفاء جميع الأقسام أولاً
    ALL_SECTIONS.forEach(sec => {
        const item = document.querySelector(`[data-section="${sec}"]`);
        if (item) {
            item.style.display = 'none';
            item.style.pointerEvents = 'none';
            item.classList.add('nav-item--disabled');
            item.setAttribute('aria-disabled', 'true');
            item.setAttribute('tabindex', '-1');
        }
    });
    
    // إعادة ضبط جميع الأقسام. applyPermissions هي المتحكم الوحيد في إظهار المسموح.
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
        section.classList.remove('is-allowed');
    });
    
    // إخفاء الويدجتس المالية افتراضياً حتى تحديد الرتبة.
    const matrixWidget = document.getElementById('widget-matrix-value');
    const exchangeWidget = document.getElementById('widget-exchange-rate');
    if (matrixWidget) {
        const parentCard = matrixWidget.closest('.widget-card');
        if (parentCard) parentCard.style.display = 'none';
    }
    if (exchangeWidget) {
        const parentCard = exchangeWidget.closest('.widget-card');
        if (parentCard) parentCard.style.display = 'none';
    }
    
    const activeAdminWidget = document.querySelector('[data-widget="active-admin"]');
    if (activeAdminWidget) activeAdminWidget.style.display = 'none';
    
    const allowedSections = getAllowedSections(AdminState.userRole);

    // تطبيق القيود بناءً على الدور
    if (AdminState.userRole === 'SuperAdmin') {
        // SuperAdmin: يرى كل شيء
        ALL_SECTIONS.forEach(sec => {
            const item = document.querySelector(`[data-section="${sec}"]`);
            if (item) {
                item.style.display = 'flex';
                item.style.pointerEvents = 'auto';
            }
        });
        
        if (activeAdminWidget) activeAdminWidget.style.display = 'flex';
        
    } else if (AdminState.userRole === 'ProductAdmin') {
        // إظهار الويدجتس الأساسية
        const totalProductsWidget = document.getElementById('widget-total-products');
        if (totalProductsWidget) {
            const parentCard = totalProductsWidget.closest('.widget-card');
            if (parentCard) parentCard.style.display = 'flex';
        }
    } else if (!allowedSections.length) {
        // غيره: لا يرى شيء
        console.log('⚠️ Limited access for role:', AdminState.userRole);
    }

    // إظهار العناصر المسموحة فقط في القائمة الجانبية
    allowedSections.forEach(sec => {
        const item = document.querySelector(`[data-section="${sec}"]`);
        if (item) {
            item.style.display = 'flex';
            item.style.pointerEvents = 'auto';
            item.classList.remove('nav-item--disabled');
            item.removeAttribute('aria-disabled');
            item.removeAttribute('tabindex');
        }

        const section = document.getElementById(`section-${sec}`);
        if (section) {
            section.classList.add('is-allowed');
        }
    });

    // افتراضياً افتح القسم المسموح فقط
    redirectToAllowedSection();
    
    // تطبيق حماية CSS إضافية
    protectRestrictedSections(AdminState.userRole);
    
    // تشغيل حارس إعادة التوجيه
    setupRedirectionGuard(AdminState.userRole);

    if (AdminState.userRole === 'Staff') {
        enableReadOnlyMode();
    }

    refreshFinancialWidgetVisibility();
}

// دالة حماية إضافية تمنع ظهور الأقسام حتى لو حاول المستخدم تغيير الـ CSS يدوياً
function protectRestrictedSections(userRole) {
    const allowedSections = getAllowedSections(userRole);
    const restrictedSections = ALL_SECTIONS.filter(sec => !allowedSections.includes(sec));
    
    if (restrictedSections.length > 0) {
        const selectors = restrictedSections.map(sec => `#section-${sec}, [data-section="${sec}"]`).join(', ');
        const existingStyle = document.getElementById('gema-restricted-sections-shield');
        if (existingStyle) existingStyle.remove();

        const style = document.createElement('style');
        style.id = 'gema-restricted-sections-shield';
        style.textContent = `
            ${selectors} { display: none !important; visibility: hidden !important; pointer-events: none !important; }
        `;
        document.head.appendChild(style);
        console.log('🛡️ Matrix CSS Shield Activated for restricted sections:', restrictedSections);
    }
}

// تقييد الإجراءات في قسم المنتجات للموظفين غير SuperAdmin و ProductAdmin
function restrictProductActions() {
    const userRole = AdminState.userRole;
    
    if (userRole !== 'SuperAdmin' && userRole !== 'ProductAdmin') {
        // إخفاء نموذج إضافة المنتج
        const addForm = document.getElementById('form-add-product');
        if (addForm) {
            addForm.style.display = 'none';
        }
        
        // إخفاء أزرار التعديل والحذف في قائمة المنتجات
        const productActions = document.querySelectorAll('.product-actions');
        productActions.forEach(actions => {
            actions.style.display = 'none';
        });
        
        console.log('🔒 Product actions restricted for role:', userRole);
    } else {
        console.log('✅ Product actions allowed for role:', userRole);
    }
}

// ========== REDIRECTION GUARD ==========
// منع الوصول لأقسام محظورة عبر الكود أو console
function setupRedirectionGuard(userRole) {
    if (userRole !== 'SuperAdmin') {
        const guard = () => {
            const hash = window.location.hash;
            const requestedSection = hash.replace('#', '').trim();
            if (requestedSection && !hasSectionAccess(requestedSection, userRole)) {
                console.warn('🚨 Attempt to access restricted section detected!');
                redirectToAllowedSection();
            }
        };

        window.addEventListener('hashchange', guard);
        window.addEventListener('popstate', guard);
        
        console.log('🛡️ Redirection guard activated');
    }
}

// إعادة التوجيه للقسم المسموح
function redirectToAllowedSection() {
    const userRole = AdminState.userRole;
    const defaultSection = getDefaultSectionForRole(userRole);
    
    console.log('📍 Redirecting to allowed section:', defaultSection, 'for role:', userRole);

    setActiveSection(defaultSection);
}

function getDefaultSectionForRole(userRole) {
    if (userRole === 'Regulatory') return 'regulatory';
    if (userRole === 'Engineer') return 'machinery';
    if (userRole === 'EngineeringOps') return 'machinery';
    if (userRole === 'NewsEditor') return 'newsroom';
    if (userRole === 'OperationsAdmin') return 'page-manager';
    if (userRole === 'Staff') return 'products';
    return 'products';
}

function hasSectionAccess(sectionName, userRole = AdminState.userRole) {
    if (!sectionName) return false;
    if (!userRole) return false;
    return getAllowedSections(userRole).includes(sectionName);
}

function setActiveSection(sectionName) {
    if (!hasSectionAccess(sectionName)) {
        console.warn('🚨 Unauthorized setActiveSection blocked:', sectionName);
        const fallbackSection = getDefaultSectionForRole(AdminState.userRole);
        if (!fallbackSection || !hasSectionAccess(fallbackSection)) {
            forceLogout('Security policy violation', true);
            return;
        }
        sectionName = fallbackSection;
    }

    document.querySelectorAll('.admin-section').forEach(s => {
        s.classList.remove('active');
    });

    const section = document.getElementById(`section-${sectionName}`);
    if (section && section.classList.contains('is-allowed')) {
        section.classList.add('active');
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });

    if (window.location.hash !== `#${sectionName}`) {
        history.replaceState(null, '', `#${sectionName}`);
    }
}

async function loadSectionData(sectionName) {
    if (!hasSectionAccess(sectionName)) {
        console.warn('🚨 Blocked section data load attempt:', sectionName);
        return;
    }

    if (sectionName === 'products') {
        await fetchExchangeRate();
        await fetchAdminProducts();
    } else if (sectionName === 'projects') {
        await fetchProjects();
    } else if (sectionName === 'machinery') {
        await fetchMachinery();
    } else if (sectionName === 'regulatory') {
        await fetchRegulatory();
    } else if (sectionName === 'staff') {
        await fetchStaff();
    } else if (sectionName === 'newsroom') {
        await fetchAdminNews();
    } else if (sectionName === 'page-manager') {
        await loadUniversalPageManagerData();
    } else if (sectionName === 'operations') {
        await loadOperationsEditorData();
        await loadCommercialInsights();
    } else if (sectionName === 'about-manager') {
        await loadAboutEditorData();
    }
}

// ========== 2. LOGIN FORM ========== 
function setupLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;
    setupLoginPasswordToggle(form);
    if (form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = form.querySelector('input[name="username"]').value;
        const password = form.querySelector('input[name="password"]').value;
        const btn = form.querySelector('button');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AUTHORIZING...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await res.json();
            
            if (res.status === 200 && data.success) {
                AdminState.token = data.token;
                AdminState.user = data.user;
                const normalizedRole = normalizeRole(data?.user?.role);

                // Keep auth in-memory only for this page lifecycle.
                sessionStorage.setItem('GEMA_token', data.token);
                sessionStorage.setItem('GEMA_user_role', normalizedRole);
                sessionStorage.setItem('GEMA_user_name', data.user.name || 'GEMA Operator');
                sessionStorage.setItem('GEMA_user_department', String(data?.user?.department || 'Medical'));
                
                console.log('🔐 Login successful - Role stored:', normalizedRole);

                await runLoginSuccessCeremony(LOGIN_SUCCESS_DURATION_MS);
                await startAuthenticatedAdmin(
                    data.token,
                    normalizedRole,
                    data.user.name || 'GEMA Operator'
                );
            } else {
                let errorMessage = data?.message || 'تعذر تسجيل الدخول';
                if (res.status === 429) {
                    errorMessage = data?.message || 'تم تجاوز عدد المحاولات. حاول لاحقًا';
                } else if (res.status === 403) {
                    errorMessage = data?.message || 'تم رفض الطلب بواسطة سياسة الحماية';
                } else if (res.status === 401) {
                    errorMessage = data?.message || 'بيانات الدخول غير صحيحة';
                }
                await runLoginErrorCeremony(errorMessage);
            }
        } catch (err) {
            await runLoginErrorCeremony('تعذر الاتصال بالخادم، حاول مرة اخرى');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

function setupLoginPasswordToggle(form) {
    const passwordInput = form.querySelector('input[name="password"]');
    const toggleBtn = form.querySelector('[data-toggle-password]');
    const icon = toggleBtn?.querySelector('i');

    if (!passwordInput || !toggleBtn || !icon) return;
    if (toggleBtn.dataset.bound === '1') return;
    toggleBtn.dataset.bound = '1';

    toggleBtn.addEventListener('click', () => {
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        icon.classList.toggle('fa-eye', !isHidden);
        icon.classList.toggle('fa-eye-slash', isHidden);
        toggleBtn.setAttribute('aria-pressed', String(isHidden));
        toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    });
}

function playSuccessClickSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(980, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(450, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.018, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.16);

        setTimeout(() => {
            if (ctx.state !== 'closed') ctx.close().catch(() => {});
        }, 350);
    } catch (_) {
        // Optional sound effect; ignore playback errors.
    }
}

async function runLoginSuccessCeremony(durationMs = LOGIN_SUCCESS_DURATION_MS) {
    await showAuthStatusCard({
        type: 'success',
        title: 'Welcome to GEMA Admin',
        message: 'Login successful. Loading your command center...',
        durationMs
    });
}

async function runLoginErrorCeremony(message = 'ادخل البيانات صحيحة', durationMs = LOGIN_ERROR_DURATION_MS) {
    await showAuthStatusCard({
        type: 'error',
        title: 'Login Failed',
        message,
        durationMs
    });
}

async function showAuthStatusCard({ type = 'success', title = '', message = '', durationMs = 1800 } = {}) {
    const overlay = document.getElementById('login-success-ceremony');
    const icon = document.getElementById('auth-status-icon');
    const titleEl = document.getElementById('auth-status-title');
    const messageEl = document.getElementById('auth-status-message');

    if (!overlay || !icon || !titleEl || !messageEl) {
        await new Promise((resolve) => setTimeout(resolve, durationMs));
        return;
    }

    const isError = type === 'error';
    overlay.classList.toggle('is-error', isError);
    overlay.classList.add('is-active');
    overlay.classList.remove('is-playing');
    overlay.setAttribute('aria-hidden', 'false');

    icon.textContent = isError ? '!' : '✓';
    titleEl.textContent = title || (isError ? 'Login Failed' : 'Welcome');
    messageEl.textContent = message || (isError ? 'ادخل البيانات صحيحة' : 'Access granted.');

    // Restart CSS animation reliably.
    void overlay.offsetWidth;
    overlay.classList.add('is-playing');

    if (!isError) playSuccessClickSound();

    await new Promise((resolve) => setTimeout(resolve, durationMs));

    overlay.classList.remove('is-playing', 'is-active', 'is-error');
    overlay.setAttribute('aria-hidden', 'true');
}

// ========== 3. CURRENCY ENGINE ==========
async function fetchExchangeRate() {
    if (!canViewFinancials(AdminState.userRole)) {
        const exchangeNode = document.getElementById('widget-exchange-rate');
        if (exchangeNode) exchangeNode.textContent = 'Restricted';
        AdminState.exchangeRate = 50.0;
        return AdminState.exchangeRate;
    }

    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await res.json();
        
        if (data.rates && data.rates.EGP && !isNaN(data.rates.EGP)) {
            AdminState.exchangeRate = parseFloat(data.rates.EGP) || 50.0;
            document.getElementById('widget-exchange-rate').textContent = 
                AdminState.exchangeRate.toFixed(2);
            console.log('💱 Exchange Rate Updated:', AdminState.exchangeRate);
            return AdminState.exchangeRate;
        } else {
            throw new Error('Invalid rate data');
        }
    } catch (err) {
        console.warn('⚠️ Could not fetch exchange rate:', err);
        AdminState.exchangeRate = 50.0; // Fallback rate (50 EGP per USD)
        document.getElementById('widget-exchange-rate').textContent = '50.00';
    }
}

// ========== 4. MATRIX CALCULATOR (Fixed for English Numbers & NaN Safety) ==========
function calculateMatrixValue() {
    if (!canViewFinancials(AdminState.userRole)) {
        AdminState.matrixValue = 0;
        const matrixWidget = document.getElementById('widget-matrix-value');
        if (matrixWidget) matrixWidget.textContent = 'Restricted';
        return 0;
    }

    let total = 0;
    
    // تأكد من أن معدل الصرف رقم صحيح (افتراضي 50 جنيه)
    const validExchangeRate = parseFloat(AdminState.exchangeRate) || 50.0;
    
    AdminState.products.forEach(product => {
        // تحويل السعر لرقم حقيقي ومنع الـ NaN
        const price = parseFloat(product.price) || 0;
        let priceInEGP = 0;
        
        if (product.currency === 'USD') {
            // تحويل الدولار للجنيه بناءً على السعر اللحظي
            priceInEGP = price * validExchangeRate;
        } else {
            // السعر بالجنيه كما هو
            priceInEGP = price;
        }
        
        // التحقق من أن القيمة صالحة قبل جمعها للمجموع الكلي
        if (!isNaN(priceInEGP) && isFinite(priceInEGP)) {
            total += priceInEGP;
        }
    });
    
    // حفظ القيمة النهائية وضمان أنها ليست NaN
    AdminState.matrixValue = (isNaN(total) || !isFinite(total)) ? 0 : total;
    
    // تحديث الويدجت في الصفحة
    const matrixWidget = document.getElementById('widget-matrix-value');
    if (matrixWidget) {
        // 'en-US' تضمن ظهور الأرقام (12345) وليس (٠١٢٣٤٥)
        // maximumFractionDigits: 0 عشان نعرض الرقم صحيح بدون فواصل عشرية كتير
        matrixWidget.textContent = AdminState.matrixValue.toLocaleString('en-US', { 
            maximumFractionDigits: 0 
        }) + " EGP";
    }
    
    console.log('📊 Matrix Financial Sync:', AdminState.matrixValue);
    return AdminState.matrixValue;
}
// ========== 5. DASHBOARD INITIALIZATION ==========
async function showDashboard() {
    document.body.classList.add('authenticated');
    const overlay = document.getElementById('login-overlay');
    const dashboard = document.getElementById('admin-dashboard');
    if (overlay) overlay.style.display = 'none';
    if (dashboard) dashboard.style.display = 'grid';
}

async function loadDashboardData() {
    setupAdminHeaderI18n();

    // Setup navigation
    setupNavigation();
    
    // Setup logout
    setupLogout();
    
    // Setup forms
    setupProductDropdowns();
    setupProductForm();
    setupProjectForm();
    setupMachineryForm();
    setupGlobalReportCenter();
    setupReportDispatchForm();
    setupRegulatoryForm();
    setupStaffForm();
    setupNewsForm();
    setupEditNewsForm();
    setupUniversalPageManager();
    setupOperationsManager();
    setupLeadForm();
    setupAutomationForm();
    setupPortalLinkForm();
    setupAuditActions();
    setupActivityTracker();
    setupAboutManager();
    
    // Setup validation messages
    setupValidationMessages();
    
    // Setup search
    setupSearch();

    // Smart quick navigation overlay (Ctrl+K)
    setupSmartHud();

    // Performance: load only the active (or default allowed) section data.
    const activeSection = document.querySelector('.admin-section.active')?.id?.replace('section-', '')
        || window.location.hash.replace('#', '').trim()
        || getDefaultSectionForRole(AdminState.userRole);
    await loadSectionData(activeSection);
}

function getHudIcon(sectionName) {
    const map = {
        products: 'fa-box-open',
        projects: 'fa-hard-hat',
        machinery: 'fa-industry',
        regulatory: 'fa-file-signature',
        staff: 'fa-users-cog',
        newsroom: 'fa-broadcast-tower',
        'page-manager': 'fa-globe',
        operations: 'fa-gears',
        'about-manager': 'fa-address-card'
    };
    return map[sectionName] || 'fa-compass';
}

function getSmartHudItems() {
    const role = AdminState.userRole;
    const allowed = getAllowedSections(role);
    return allowed
        .map((section) => {
            const navNode = document.querySelector(`.nav-item[data-section="${section}"] span`);
            return {
                section,
                label: navNode ? navNode.textContent.trim() : section,
                icon: getHudIcon(section)
            };
        })
        .filter((item) => item.label);
}

function setupSmartHud() {
    const overlay = document.getElementById('smart-hud');
    const input = document.getElementById('smart-hud-input');
    const list = document.getElementById('smart-hud-results');
    if (!overlay || !input || !list) return;
    if (overlay.dataset.bound === '1') return;
    overlay.dataset.bound = '1';

    let visibleItems = [];
    let activeIndex = 0;

    const closeHud = () => {
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        input.value = '';
    };

    const render = (query = '') => {
        const needle = query.trim().toLowerCase();
        const all = getSmartHudItems();
        visibleItems = all
            .filter((item) => !needle || item.label.toLowerCase().includes(needle) || item.section.includes(needle))
            .slice(0, HUD_MAX_RESULTS);

        if (!visibleItems.length) {
            list.innerHTML = '<li class="smart-hud-empty">No matching modules.</li>';
            activeIndex = 0;
            return;
        }

        if (activeIndex >= visibleItems.length) activeIndex = 0;

        list.innerHTML = visibleItems
            .map((item, index) => `
                <li class="smart-hud-item ${index === activeIndex ? 'is-active' : ''}" data-index="${index}" data-section="${item.section}">
                    <i class="fas ${item.icon}"></i>
                    <span>${item.label}</span>
                    <small>${item.section}</small>
                </li>
            `)
            .join('');
    };

    const activateItem = (index) => {
        const item = visibleItems[index];
        if (!item) return;
        closeHud();
        setActiveSection(item.section);
        loadSectionData(item.section);
    };

    const openHud = () => {
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        activeIndex = 0;
        render('');
        setTimeout(() => input.focus(), 20);
    };

    document.addEventListener('keydown', (event) => {
        const tag = (event.target && event.target.tagName) ? event.target.tagName.toLowerCase() : '';
        const inTypingField = tag === 'input' || tag === 'textarea' || event.target?.isContentEditable;

        if (event.ctrlKey && (event.key === 'k' || event.key === 'K')) {
            event.preventDefault();
            if (!document.body.classList.contains('authenticated')) return;
            if (overlay.classList.contains('is-open')) {
                closeHud();
            } else {
                openHud();
            }
            return;
        }

        if (!overlay.classList.contains('is-open')) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            closeHud();
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (visibleItems.length) {
                activeIndex = (activeIndex + 1) % visibleItems.length;
                render(input.value);
            }
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (visibleItems.length) {
                activeIndex = (activeIndex - 1 + visibleItems.length) % visibleItems.length;
                render(input.value);
            }
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            activateItem(activeIndex);
            return;
        }

        if (inTypingField && event.target !== input) {
            return;
        }
    });

    input.addEventListener('input', () => {
        activeIndex = 0;
        render(input.value);
    });

    list.addEventListener('click', (event) => {
        const li = event.target.closest('.smart-hud-item');
        if (!li) return;
        const idx = Number(li.dataset.index || 0);
        activateItem(idx);
    });

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeHud();
    });
}

// ========== 6. LOGOUT (HARD TERMINATION) ==========
function setupLogout() {
    const btn = document.getElementById('system-logout-btn') || document.getElementById('btn-logout');
    if (btn) {
        btn.addEventListener('click', () => {
            console.log('🔄 Hard Logout process initiated...');
            clearAdminAuthStorage();
            
            // 3️⃣ تصفير حالة التطبيق البرمجية
            AdminState.token = null;
            AdminState.user = null;
            AdminState.userRole = null;
            AdminState.products = [];
            AdminState.news = [];
            AdminState.matrixValue = 0;
            
            // 4️⃣ إعادة التوجيه مع استخدام replace لمنع زر "Back" تماماً
            console.log('🔐 Session Terminated. Returning to authorization unit...');
            window.location.replace('/admin');
        });
    }
}
// ========== وظيفة تعديل كلمة مرور الموظف (للأدمن فقط) ==========
function setupStaffEditButtons() {
    const editBtns = document.querySelectorAll('.btn-edit-staff');
    editBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (AdminState.userRole !== 'SuperAdmin') {
                alert('🚫 Only SuperAdmin can change passwords!');
                return;
            }
            const staffId = btn.dataset.staffId;
            const staffName = btn.dataset.staffName;
            openEditPasswordModal(staffId, staffName);
        });
    });
}

async function updateStaffPassword(staffId, newPassword) {
    try {
        const res = await fetch(`/api/users/update-password/${staffId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AdminState.token}`
            },
            body: JSON.stringify({ password: newPassword })
        });
        const data = await res.json();
        if (data.success) {
            alert('✅ Password updated successfully!');
        } else {
            alert('❌ Failed: ' + data.message);
        }
    } catch (err) {
        alert('❌ Connection Error');
    }
}

// ========== 6. NAVIGATION WITH ROLE RESTRICTION ==========
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const userRole = AdminState.userRole;
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const sectionName = item.dataset.section;
            
            // 🛡️ حارس: منع الوصول لأقسام محظورة بناءً على الدور
            if (!hasSectionAccess(sectionName, userRole)) {
                console.warn('🚨 Access denied to section:', sectionName, 'for role:', userRole);
                alert('❌ You do not have access to this section!');
                e.preventDefault();
                e.stopPropagation();
                return; // إيقاف العملية
            }
            
            // تحديث الحالة النشطة ثم تحميل بيانات القسم المطلوب فقط
            setActiveSection(sectionName);
            loadSectionData(sectionName);
        });
    });
}

// دالة لتحديد الأقسام المسموحة لكل دور
function getAllowedSections(userRole) {
    switch (userRole) {
        case 'SuperAdmin':
            return ['products', 'projects', 'machinery', 'regulatory', 'staff', 'newsroom', 'page-manager', 'operations', 'about-manager'];
        case 'ProductAdmin':
            return ['products'];
        case 'Regulatory':
            return ['regulatory'];
        case 'Engineer':
            return ['machinery'];
        case 'EngineeringOps':
            return ['machinery', 'projects'];
        case 'NewsEditor':
            return ['newsroom'];
        case 'OperationsAdmin':
            return ['projects', 'staff', 'page-manager', 'operations', 'about-manager'];
        case 'Staff':
            return ['products', 'projects', 'regulatory', 'newsroom'];
        default:
            return []; // لا يرى شيء
    }
}

function enableReadOnlyMode() {
    const forms = document.querySelectorAll('form');
    forms.forEach((form) => {
        form.querySelectorAll('input, textarea, select, button').forEach((control) => {
            if (control.id === 'btn-logout' || control.closest('#btn-logout')) return;
            if (control.type === 'button' || control.type === 'submit' || control.tagName === 'BUTTON') {
                control.style.display = 'none';
                return;
            }

            control.setAttribute('disabled', 'disabled');
        });
    });

    document.querySelectorAll('.btn-edit, .btn-delete, .btn-news-delete, .product-actions, .btn-edit-staff').forEach((node) => {
        node.style.display = 'none';
    });
}

// ========== 7. PRODUCTS MANAGEMENT ==========
async function fetchAdminProducts() {
    if (!hasSectionAccess('products')) {
        console.warn('🚫 Unauthorized products data request blocked');
        return;
    }

    try {
        const res = await fetch('/api/products', {
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });

        if (!res.ok) {
            throw new Error('Failed to fetch products');
        }

        const payload = await res.json();
        AdminState.products = Array.isArray(payload) ? payload : [];
        renderProducts(AdminState.products);
        
        // Update widgets dynamically based on actual product count
        const totalProductsWidget = document.getElementById('widget-total-products');
        const productCount = Array.isArray(AdminState.products) ? AdminState.products.length : 0;
        
        if (totalProductsWidget) {
            totalProductsWidget.textContent = productCount;
            console.log('📦 Total Products Updated:', productCount);
        }
        
        // حساب قيمة المصفوفة بعد التأكد من المنتجات
        calculateMatrixValue();
        
    } catch (err) {
        console.error('❌ Failed to fetch products:', err);
        
        // Update widget to show zero on error
        const totalProductsWidget = document.getElementById('widget-total-products');
        if (totalProductsWidget) {
            totalProductsWidget.textContent = '0';
        }
        
        document.getElementById('inventory-list').innerHTML =
            '<p class="loading">❌ Failed to load products</p>';
    }
}

// ========== 7.5 NEWS MANAGEMENT ==========
async function fetchAdminNews() {
    if (!hasSectionAccess('newsroom')) {
        console.warn('🚫 Unauthorized newsroom data request blocked');
        return;
    }

    const container = document.getElementById('news-list');
    if (!container) return;

    try {
        const res = await fetch('/api/news', {
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });

        if (!res.ok) {
            throw new Error('Failed to load news');
        }

        const news = await res.json();
        AdminState.news = Array.isArray(news) ? news : [];
        renderNewsList(AdminState.news);
    } catch (err) {
        console.error('❌ Failed to fetch news:', err);
        container.innerHTML = '<p class="loading">❌ Failed to load newsroom feed</p>';
    }
}

function renderNewsList(news) {
    const container = document.getElementById('news-list');
    if (!container) return;

    if (!news.length) {
        container.innerHTML = '<p class="loading">No broadcast stories yet.</p>';
        return;
    }

    const canManageNews = AdminState.userRole === 'SuperAdmin' || AdminState.userRole === 'NewsEditor';

    container.innerHTML = news.map(item => {
        const safeDate = new Date(item.createdAt).toLocaleDateString('en-GB');
        return `
            <div class="news-item">
                <div class="news-main-row">
                    <img src="${item.image}" alt="${item.title}" class="news-thumb" />
                    <div class="news-meta">
                        <h4>${item.title}</h4>
                        <a href="${item.postLink}" target="_blank" rel="noopener">${item.postLink}</a>
                        <p class="news-date-text">${safeDate}</p>
                    </div>
                </div>
                ${canManageNews ? `
                    <div class="product-actions">
                        <button class="btn-news-edit" onclick="openEditNewsModal('${item._id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-news-delete" onclick="deleteNews('${item._id}')" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function openEditNewsModal(id) {
    const item = AdminState.news.find((entry) => String(entry._id) === String(id));
    if (!item) {
        alert('❌ News item not found.');
        return;
    }

    const modal = document.getElementById('modal-edit-news');
    if (!modal) return;

    document.getElementById('edit-news-id').value = item._id;
    document.getElementById('edit-news-title').value = item.title || '';
    document.getElementById('edit-news-link').value = item.postLink || '';
    const imageInput = document.getElementById('edit-news-image');
    if (imageInput) imageInput.value = '';

    modal.style.display = 'flex';
}

function setupNewsForm() {
    const form = document.getElementById('form-add-news');
    if (!form) return;
    if (form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!hasSectionAccess('newsroom')) {
            alert('🚫 Unauthorized action.');
            return;
        }

        const formData = new FormData(form);
        const btn = form.querySelector('button[type="submit"]') || form.querySelector('button');
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PUBLISHING...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/news/add', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AdminState.token}`
                },
                body: formData
            });

            const result = await res.json();
            if (result.success) {
                alert('✅ News published successfully');
                form.reset();
                await fetchAdminNews();
            } else {
                alert('❌ ' + (result.message || 'Failed to publish news'));
            }
        } catch (err) {
            alert('❌ Error: ' + err.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

async function deleteNews(id) {
    if (!confirm('🚨 Delete this news story?')) return;

    try {
        const res = await fetch(`/api/news/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${AdminState.token}`
            }
        });

        const result = await res.json();
        if (result.success) {
            alert('✅ News story deleted');
            await fetchAdminNews();
        } else {
            alert('❌ ' + (result.message || 'Deletion failed'));
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

async function fetchLeads() {
    const container = document.getElementById('leads-list');
    if (!container) return;

    try {
        const res = await fetch('/api/leads', {
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });
        const payload = await res.json();

        if (!res.ok || !payload.success) {
            throw new Error(payload.message || 'Failed to load leads');
        }

        const leads = Array.isArray(payload.data) ? payload.data : [];
        const leadSelect = document.getElementById('followup-lead-id');
        if (leadSelect) {
            const options = leads.map((lead) => {
                const label = `${lead.fullName || '-'} (${lead.email || '-'})`;
                return `<option value="${lead._id}">${safeText(label)}</option>`;
            }).join('');
            leadSelect.innerHTML = `<option value="">Select lead...</option>${options}`;
        }

        if (!leads.length) {
            container.innerHTML = '<p class="loading">No leads yet.</p>';
            return;
        }

        container.innerHTML = leads.map((lead) => `
            <div class="product-item">
                <div class="project-main">
                    <h4 class="project-title">${lead.fullName}</h4>
                    <p class="project-meta">${lead.email} • ${lead.company || 'No company'}</p>
                    <p class="project-meta">${lead.module || 'General'} • ${lead.specialty || 'N/A'}</p>
                    <p class="project-meta">Value: ${formatPriceLabel(lead.valueEstimate, lead.currency, 'N/A')}</p>
                </div>
                <div class="project-actions">
                    <select onchange="updateLeadStatus('${lead._id}', this.value)">
                        <option value="new" ${lead.status === 'new' ? 'selected' : ''}>new</option>
                        <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>contacted</option>
                        <option value="qualified" ${lead.status === 'qualified' ? 'selected' : ''}>qualified</option>
                        <option value="won" ${lead.status === 'won' ? 'selected' : ''}>won</option>
                        <option value="lost" ${lead.status === 'lost' ? 'selected' : ''}>lost</option>
                    </select>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="loading">❌ Failed to load leads.</p>';
    }
}

async function updateLeadStatus(id, status) {
    try {
        const res = await fetch(`/api/leads/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AdminState.token}`
            },
            body: JSON.stringify({ status })
        });

        const payload = await res.json();
        if (!res.ok || !payload.success) {
            throw new Error(payload.message || 'Failed to update lead status');
        }

        await fetchLeads();
        await fetchAnalyticsSummary();
    } catch (error) {
        alert(`❌ ${error.message}`);
    }
}

window.updateLeadStatus = updateLeadStatus;

async function fetchAnalyticsSummary() {
    const container = document.getElementById('analytics-summary');
    if (!container) return;

    try {
        const res = await fetch('/api/analytics/summary', {
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });
        const payload = await res.json();
        if (!res.ok || !payload.success) {
            throw new Error(payload.message || 'Failed to load analytics');
        }

        const totals = payload.data?.totals || {};
        const funnel = payload.data?.funnel || {};

        container.innerHTML = `
            <div class="product-item">
                <div class="project-main">
                    <h4 class="project-title">Totals</h4>
                    <p class="project-meta">Products: ${totals.products || 0} • Projects: ${totals.projects || 0} • Machinery: ${totals.machinery || 0} • News: ${totals.news || 0}</p>
                    <p class="project-meta">Leads: ${totals.leads || 0} • Reports: ${totals.reports || 0}</p>
                </div>
            </div>
            <div class="product-item">
                <div class="project-main">
                    <h4 class="project-title">Funnel</h4>
                    <p class="project-meta">New: ${funnel.new || 0} • Contacted: ${funnel.contacted || 0} • Qualified: ${funnel.qualified || 0}</p>
                    <p class="project-meta">Won: ${funnel.won || 0} • Lost: ${funnel.lost || 0}</p>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<p class="loading">❌ Failed to load analytics.</p>';
    }
}

function setupLeadForm() {
    const form = document.getElementById('form-add-lead');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!hasSectionAccess('operations')) {
            alert('🚫 Unauthorized action.');
            return;
        }

        const payload = Object.fromEntries(new FormData(form).entries());
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn ? btn.innerHTML : '';

        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING...';
            btn.disabled = true;
        }

        try {
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AdminState.token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to create lead');
            }

            alert('✅ Lead added successfully');
            form.reset();
            await fetchLeads();
            await fetchAnalyticsSummary();
        } catch (error) {
            alert(`❌ ${error.message}`);
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    });
}

function shortText(value, max = 120) {
    const raw = String(value || '');
    if (raw.length <= max) return raw;
    return `${raw.slice(0, max - 3)}...`;
}

function safeText(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function fetchAutomationJobs() {
    const container = document.getElementById('automation-jobs-list');
    if (!container) return;

    try {
        const res = await fetch('/api/automation/follow-ups', {
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });
        const payload = await res.json();
        if (!res.ok || !payload.success) {
            throw new Error(payload.message || 'Failed to fetch follow-up jobs');
        }

        const jobs = Array.isArray(payload.data) ? payload.data : [];
        if (!jobs.length) {
            container.innerHTML = '<p class="loading">No follow-up jobs yet.</p>';
            return;
        }

        container.innerHTML = jobs.map((job) => {
            const isRunnable = job.status !== 'sent';
            const scheduleText = job.scheduledFor ? new Date(job.scheduledFor).toLocaleString() : '-';
            const sentText = job.result?.sentAt ? new Date(job.result.sentAt).toLocaleString() : '-';

            return `
                <div class="product-item">
                    <div class="project-main">
                        <h4 class="project-title">${safeText(job.subject || '-')}</h4>
                        <p class="project-meta">Lead: ${safeText(job.leadName || '-')} (${safeText(job.leadEmail || '-')})</p>
                        <p class="project-meta">Template: ${safeText(job.templateKey || '-')} • Status: ${safeText(job.status || '-')}</p>
                        <p class="project-meta">Scheduled: ${safeText(scheduleText)} • Sent: ${safeText(sentText)}</p>
                        <p class="project-meta">${safeText(shortText(job.message || '', 110))}</p>
                    </div>
                    <div class="project-actions">
                        ${isRunnable ? `<button class="btn-action btn-action-gold" onclick="runFollowUpJob('${job._id}')"><i class="fas fa-paper-plane"></i></button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="loading">❌ Failed to load follow-up jobs.</p>';
    }
}

async function runFollowUpJob(jobId) {
    try {
        const res = await fetch(`/api/automation/follow-ups/${jobId}/run`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AdminState.token}`
            }
        });

        const payload = await res.json();
        if (!res.ok || !payload.success) {
            throw new Error(payload.message || 'Failed to run follow-up job');
        }

        alert('✅ Follow-up sent successfully.');
        await fetchAutomationJobs();
        await fetchAuditLogs();
    } catch (error) {
        alert(`❌ ${error.message}`);
    }
}

window.runFollowUpJob = runFollowUpJob;

function setupAutomationForm() {
    const form = document.getElementById('form-create-followup');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!hasSectionAccess('operations')) {
            alert('🚫 Unauthorized action.');
            return;
        }

        const payload = Object.fromEntries(new FormData(form).entries());
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn ? btn.innerHTML : '';

        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CREATING...';
            btn.disabled = true;
        }

        try {
            const res = await fetch('/api/automation/follow-ups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AdminState.token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to create follow-up');
            }

            alert('✅ Follow-up job created.');
            form.reset();
            await fetchAutomationJobs();
            await fetchAuditLogs();
        } catch (error) {
            alert(`❌ ${error.message}`);
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    });
}

async function fetchReportsForPortalSelect() {
    const reportSelect = document.getElementById('portal-report-id');
    if (!reportSelect) return;

    try {
        const res = await fetch('/api/reports', {
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });
        const payload = await res.json();
        if (!res.ok || !payload.success) {
            throw new Error(payload.message || 'Failed to fetch reports');
        }

        const reports = Array.isArray(payload.data) ? payload.data : [];
        const options = reports.map((report) => {
            const label = `${report.subject || 'Untitled'} (${report.relatedModule || '-'})`;
            return `<option value="${report._id}">${safeText(label)}</option>`;
        }).join('');

        reportSelect.innerHTML = `<option value="">Select report...</option>${options}`;
    } catch (error) {
        reportSelect.innerHTML = '<option value="">Failed to load reports</option>';
    }
}

async function fetchPortalLinks() {
    const container = document.getElementById('portal-link-result');
    if (!container) return;

    try {
        const res = await fetch('/api/portal/links', {
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });
        const payload = await res.json();
        if (!res.ok || !payload.success) {
            throw new Error(payload.message || 'Failed to load portal links');
        }

        const links = Array.isArray(payload.data) ? payload.data : [];
        if (!links.length) {
            container.innerHTML = '<p class="loading">No generated portal links yet.</p>';
            return;
        }

        container.innerHTML = links.slice(0, 10).map((item) => {
            const host = window.location.origin.replace(/\/+$/, '');
            const url = `${host}/client-portal/${item.token}`;
            return `
                <div class="product-item">
                    <div class="project-main">
                        <h4 class="project-title">${safeText(item.reportId?.subject || 'Report')}</h4>
                        <p class="project-meta">Client: ${safeText(item.clientName || '-')} (${safeText(item.clientEmail || '-')})</p>
                        <p class="project-meta">Views: ${Number(item.viewCount || 0)} • Expires: ${safeText(new Date(item.expiresAt).toLocaleDateString())}</p>
                        <p class="project-meta"><a href="${safeText(url)}" target="_blank" rel="noopener">${safeText(url)}</a></p>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = '<p class="loading">❌ Failed to load portal links.</p>';
    }
}

function setupPortalLinkForm() {
    const form = document.getElementById('form-create-portal-link');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!hasSectionAccess('operations')) {
            alert('🚫 Unauthorized action.');
            return;
        }

        const payload = Object.fromEntries(new FormData(form).entries());
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn ? btn.innerHTML : '';

        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> GENERATING...';
            btn.disabled = true;
        }

        try {
            const res = await fetch('/api/portal/links', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AdminState.token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to generate portal link');
            }

            const url = data?.data?.portalUrl || '';
            alert(url ? `✅ Link created:\n${url}` : '✅ Link created');
            form.reset();
            await fetchPortalLinks();
            await fetchAuditLogs();
        } catch (error) {
            alert(`❌ ${error.message}`);
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    });
}

async function fetchAuditLogs() {
    const container = document.getElementById('audit-log-list');
    if (!container) return;

    try {
        const res = await fetch('/api/audit?limit=80', {
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });
        const payload = await res.json();
        if (!res.ok || !payload.success) {
            throw new Error(payload.message || 'Failed to load audit logs');
        }

        const logs = Array.isArray(payload.data) ? payload.data : [];
        if (!logs.length) {
            container.innerHTML = '<p class="loading">No audit events yet.</p>';
            return;
        }

        container.innerHTML = logs.map((log) => `
            <div class="product-item">
                <div class="project-main">
                    <h4 class="project-title">${safeText(log.module || 'General')} - ${safeText(log.action || '-')}</h4>
                    <p class="project-meta">Status: ${safeText(log.status || '-')} • Role: ${safeText(log.actor?.role || '-')}</p>
                    <p class="project-meta">Target: ${safeText(log.targetType || '-')} (${safeText(log.targetId || '-')})</p>
                    <p class="project-meta">${safeText(new Date(log.createdAt).toLocaleString())}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p class="loading">❌ Failed to load audit logs.</p>';
    }
}

function setupAuditActions() {
    const refreshBtn = document.getElementById('btn-refresh-audit');
    if (refreshBtn && refreshBtn.dataset.bound !== '1') {
        refreshBtn.dataset.bound = '1';
        refreshBtn.addEventListener('click', () => {
            fetchAuditLogs();
        });
    }

    const exportBtn = document.getElementById('btn-export-audit');
    if (exportBtn && exportBtn.dataset.bound !== '1') {
        exportBtn.dataset.bound = '1';
        exportBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/audit/export.csv', {
                    headers: { 'Authorization': `Bearer ${AdminState.token}` }
                });
                if (!res.ok) throw new Error('Failed to export audit log');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'gema-audit-log.csv';
                a.click();
                URL.revokeObjectURL(url);
            } catch (error) {
                alert(`❌ ${error.message}`);
            }
        });
    }
}

async function loadCommercialInsights() {
    if (!hasSectionAccess('operations')) return;
    await Promise.all([
        fetchLeads(),
        fetchAnalyticsSummary(),
        fetchAutomationJobs(),
        fetchPortalLinks(),
        fetchAuditLogs(),
        fetchReportsForPortalSelect()
    ]);
}

async function fetchPageContentAdmin(slug) {
    const res = await fetch(`${PAGE_API_BASE}/admin/${slug}`, {
        headers: { 'Authorization': `Bearer ${AdminState.token}` }
    });

    if (!res.ok) {
        throw new Error('Failed to fetch page content');
    }

    const payload = await res.json();
    if (!payload.success || !payload.data) {
        throw new Error(payload.message || 'Invalid page content payload');
    }

    return payload.data;
}

async function savePageContentAdmin(slug, content) {
    const res = await fetch(`${PAGE_API_BASE}/admin/${slug}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AdminState.token}`
        },
        body: JSON.stringify({ content })
    });

    const payload = await res.json();
    if (!res.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to save page content');
    }

    return payload.data;
}

function safeJSONString(value) {
    try {
        return JSON.stringify(value || {}, null, 2);
    } catch (error) {
        return '{}';
    }
}

function parseLanguageJSON(jsonText, langCode) {
    const source = (jsonText || '').trim();
    if (!source) return {};

    try {
        const parsed = JSON.parse(source);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed;
        }
    } catch (error) {
        throw new Error(`Invalid JSON for ${langCode.toUpperCase()} language`);
    }

    throw new Error(`Invalid JSON object for ${langCode.toUpperCase()} language`);
}

function renderUniversalSummary(slug, content) {
    const container = document.getElementById('universal-page-summary');
    if (!container) return;

    const summaryLines = SUPPORTED_LANGS.map((lang) => {
        const langObject = content?.[lang] || {};
        const keyCount = Object.keys(langObject).length;
        return `<li><strong>${lang.toUpperCase()}</strong>: ${keyCount} keys</li>`;
    }).join('');

    container.innerHTML = `
            <div class="product-item universal-summary-item">
                <h4 class="universal-summary-title">Slug: ${slug}</h4>
                <p class="universal-summary-subtitle">Current payload keys by language:</p>
                <ul class="universal-summary-list">${summaryLines}</ul>
        </div>
    `;
}

async function loadUniversalPageManagerData() {
    if (!hasSectionAccess('page-manager')) return;

    const slugSelect = document.getElementById('universal-page-slug');
    if (!slugSelect) return;
    const slug = slugSelect.value;

    try {
        const res = await fetch(`${PAGE_API_BASE}/${slug}?includeAll=1`);
        if (!res.ok) throw new Error('Failed to load page payload');
        const payload = await res.json();
        if (!payload.success) throw new Error(payload.message || 'Invalid payload');

        SUPPORTED_LANGS.forEach((lang) => {
            const textarea = document.getElementById(`page-content-${lang}`);
            if (!textarea) return;

            const incoming = payload.content?.[lang] || {};
            const hasExistingKeys = incoming && Object.keys(incoming).length > 0;
            const seeded = hasExistingKeys ? incoming : getUniversalTemplate(slug, lang);
            textarea.value = safeJSONString(seeded);
        });

        renderUniversalSummary(slug, payload.content || {});
    } catch (error) {
        alert(`❌ ${error.message}`);
    }
}

function setupUniversalPageManager() {
    const form = document.getElementById('form-universal-page-manager');
    const slugSelect = document.getElementById('universal-page-slug');
    if (!form || !slugSelect) return;

    const requiredSlugs = ['header', 'footer', 'home', 'hub', 'about', 'news', 'products', 'trading', 'direct-sourcing', 'logistics', 'manufacturing', 'engineering', 'regulatory', 'turnkey', 'contact', 'quote', 'service-details'];
    const existingSlugs = Array.from(slugSelect.options || []).map((opt) => String(opt.value || '').trim()).filter(Boolean);
    const missing = requiredSlugs.filter((slug) => !existingSlugs.includes(slug));
    if (missing.length) {
        missing.forEach((slug) => {
            const opt = document.createElement('option');
            opt.value = slug;
            opt.textContent = slug;
            slugSelect.appendChild(opt);
        });
    }

    slugSelect.addEventListener('change', async () => {
        await loadUniversalPageManagerData();
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!hasSectionAccess('page-manager')) {
            alert('🚫 Unauthorized action.');
            return;
        }

        const slug = slugSelect.value;
        const content = {};

        try {
            SUPPORTED_LANGS.forEach((lang) => {
                const textarea = document.getElementById(`page-content-${lang}`);
                content[lang] = parseLanguageJSON(textarea?.value || '{}', lang);
            });
        } catch (error) {
            alert(`❌ ${error.message}`);
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING...';
        btn.disabled = true;

        try {
            const res = await fetch(`${PAGE_API_BASE}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AdminState.token}`
                },
                body: JSON.stringify({ slug, content })
            });

            const payload = await res.json();
            if (!res.ok || !payload.success) {
                throw new Error(payload.message || 'Failed to update page');
            }

            renderUniversalSummary(slug, payload.data?.content || content);
            alert('✅ Universal page content updated successfully.');
        } catch (error) {
            alert(`❌ ${error.message}`);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

async function uploadPageImage(file) {
    if (!file) return '';

    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch(`${PAGE_API_BASE}/admin/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AdminState.token}` },
        body: formData
    });

    if (res.status === 404) {
        throw new Error('Upload endpoint is not available. Please use Image URL field.');
    }

    const payload = await res.json();
    if (!res.ok || !payload.success || !payload.imageUrl) {
        throw new Error(payload.message || 'Image upload failed');
    }

    return payload.imageUrl;
}

function safeLocalizedPage(rawData) {
    const sourceContent = rawData?.content || {};
    const normalized = {};
    SUPPORTED_LANGS.forEach((lang) => {
        const src = sourceContent[lang] || {};
        const cards = Array.isArray(src.cards) ? src.cards.slice(0, 3) : [];
        while (cards.length < 3) {
            cards.push({ title: '', text: '', image: '' });
        }

        normalized[lang] = {
            title: src.title || '',
            cards: cards.map((card) => ({
                title: card?.title || '',
                text: card?.text || '',
                image: card?.image || ''
            }))
        };
    });
    return normalized;
}

function renderAdminPagePreview(containerId, localizedContent) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cardsHtml = localizedContent.cards.map((card, index) => `
        <div class="product-item admin-preview-item">
            <img src="${card.image || '/assets/images/sectors/products.jpg'}" alt="card-${index + 1}" class="news-thumb" />
            <div class="admin-preview-body">
                <h4 class="admin-preview-card-title">${card.title || 'Untitled Card'}</h4>
                <p class="admin-preview-card-text">${card.text || 'No text set yet.'}</p>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="admin-preview-header">
            <h4 class="admin-preview-main-title">${localizedContent.title || 'Untitled Page'}</h4>
        </div>
        ${cardsHtml}
    `;
}

async function ensurePageContentCached(slug) {
    if (!AdminState.pageContentCache[slug]) {
        const payload = await fetchPageContentAdmin(slug);
        AdminState.pageContentCache[slug] = {
            slug,
            content: safeLocalizedPage(payload)
        };
    }

    return AdminState.pageContentCache[slug];
}

function populateOperationsEditor() {
    const slug = document.getElementById('operations-page-slug')?.value || 'direct-sourcing';
    const lang = document.getElementById('operations-lang')?.value || 'ar';
    const page = AdminState.pageContentCache[slug];
    if (!page) return;

    const localized = page.content[lang];
    document.getElementById('operations-title').value = localized.title || '';

    localized.cards.forEach((card, i) => {
        const n = i + 1;
        document.getElementById(`operations-card${n}-title`).value = card.title || '';
        document.getElementById(`operations-card${n}-text`).value = card.text || '';
        document.getElementById(`operations-card${n}-image-url`).value = card.image || '';
        document.getElementById(`operations-card${n}-image`).value = '';
    });

    renderAdminPagePreview('operations-preview', localized);
}

function populateAboutEditor() {
    const lang = document.getElementById('about-manager-lang')?.value || 'ar';
    const page = AdminState.pageContentCache[ABOUT_PAGE_SLUG];
    if (!page) return;

    const localized = page.content[lang];
    document.getElementById('about-title').value = localized.title || '';

    localized.cards.forEach((card, i) => {
        const n = i + 1;
        document.getElementById(`about-card${n}-title`).value = card.title || '';
        document.getElementById(`about-card${n}-text`).value = card.text || '';
        document.getElementById(`about-card${n}-image-url`).value = card.image || '';
        document.getElementById(`about-card${n}-image`).value = '';
    });

    renderAdminPagePreview('about-preview', localized);
}

async function loadOperationsEditorData() {
    if (!hasSectionAccess('operations')) return;
    const slug = document.getElementById('operations-page-slug')?.value || 'direct-sourcing';
    await ensurePageContentCached(slug);
    populateOperationsEditor();
}

async function loadAboutEditorData() {
    if (!hasSectionAccess('about-manager')) return;
    await ensurePageContentCached(ABOUT_PAGE_SLUG);
    populateAboutEditor();
}

function setupOperationsManager() {
    const form = document.getElementById('form-operations-content');
    const langSelect = document.getElementById('operations-lang');
    const pageSelect = document.getElementById('operations-page-slug');
    if (!form || !langSelect || !pageSelect) return;

    langSelect.addEventListener('change', populateOperationsEditor);
    pageSelect.addEventListener('change', async () => {
        await ensurePageContentCached(pageSelect.value);
        populateOperationsEditor();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!hasSectionAccess('operations')) {
            alert('🚫 Unauthorized action.');
            return;
        }

        const slug = pageSelect.value;
        const lang = langSelect.value;
        const page = await ensurePageContentCached(slug);
        const localized = {
            title: document.getElementById('operations-title').value.trim(),
            cards: []
        };

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING...';
        btn.disabled = true;

        try {
            for (let i = 1; i <= 3; i += 1) {
                const fileInput = document.getElementById(`operations-card${i}-image`);
                const urlInput = document.getElementById(`operations-card${i}-image-url`);
                let imageUrl = (urlInput.value || '').trim();
                if (fileInput.files && fileInput.files[0]) {
                    imageUrl = await uploadPageImage(fileInput.files[0]);
                }

                localized.cards.push({
                    title: document.getElementById(`operations-card${i}-title`).value.trim(),
                    text: document.getElementById(`operations-card${i}-text`).value.trim(),
                    image: imageUrl
                });
            }

            page.content[lang] = localized;
            const updated = await savePageContentAdmin(slug, page.content);
            AdminState.pageContentCache[slug] = { slug, content: safeLocalizedPage(updated) };
            populateOperationsEditor();
            alert('✅ Operations content saved successfully.');
        } catch (err) {
            alert(`❌ ${err.message}`);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

function setupAboutManager() {
    const form = document.getElementById('form-about-content');
    const langSelect = document.getElementById('about-manager-lang');
    if (!form || !langSelect) return;

    langSelect.addEventListener('change', populateAboutEditor);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!hasSectionAccess('about-manager')) {
            alert('🚫 Unauthorized action.');
            return;
        }

        const lang = langSelect.value;
        const slug = ABOUT_PAGE_SLUG;
        const page = await ensurePageContentCached(slug);

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING...';
        btn.disabled = true;

        try {
            const localized = {
                title: document.getElementById('about-title').value.trim(),
                cards: []
            };

            for (let i = 1; i <= 3; i += 1) {
                const fileInput = document.getElementById(`about-card${i}-image`);
                const urlInput = document.getElementById(`about-card${i}-image-url`);
                let imageUrl = (urlInput.value || '').trim();
                if (fileInput.files && fileInput.files[0]) {
                    imageUrl = await uploadPageImage(fileInput.files[0]);
                }

                localized.cards.push({
                    title: document.getElementById(`about-card${i}-title`).value.trim(),
                    text: document.getElementById(`about-card${i}-text`).value.trim(),
                    image: imageUrl
                });
            }

            page.content[lang] = localized;
            const updated = await savePageContentAdmin(slug, page.content);
            AdminState.pageContentCache[slug] = { slug, content: safeLocalizedPage(updated) };
            populateAboutEditor();
            alert('✅ About content saved successfully.');
        } catch (err) {
            alert(`❌ ${err.message}`);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

function renderProducts(products) {
    const container = document.getElementById('inventory-list');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<p class="loading">No products available</p>';
        return;
    }
    
    const canManageCatalog = AdminState.userRole === 'SuperAdmin' || AdminState.userRole === 'ProductAdmin';
    const canManageDatasheet = canManageCatalog;
    const showFinancialData = canViewFinancials(AdminState.userRole);
    
    container.innerHTML = products.map(p => `
        <div class="product-item">
            <div class="product-info">
                <img 
                    src="${p.imagePath || p.image || '/assets/images/sectors/products.jpg'}" 
                    alt="${p.name}" 
                    class="product-image"
                />
                <div class="product-details">
                    <h4>${p.name}</h4>
                    <p>
                        <strong>${p.specialty || 'General'}</strong> • 
                        ${showFinancialData ? `${p.price} ${p.currency}` : 'Restricted'}
                    </p>
                    <p class="product-category-note">
                        ${p.category || 'N/A'}
                    </p>
                </div>
            </div>
            ${canManageDatasheet ? `
            <div class="product-actions">
                <button class="btn-edit" data-action="edit" data-product-id="${p._id}" data-product-json="${encodeURIComponent(JSON.stringify({_id: p._id, name: p.name, price: p.price, currency: p.currency, category: p.category || 'Manufacturing', specialty: p.specialty, sector: p.sector || 'Equipment', origin: p.origin || 'Internal', logistics: p.logistics || 'Local', description: p.description, imagePath: p.imagePath || p.image || '/assets/images/sectors/products.jpg', image: p.imagePath || p.image || '/assets/images/sectors/products.jpg', datasheet: p.datasheet || p.datasheet_url || '', technicalSpecs: p.technicalSpecs || {}}))}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                ${canManageCatalog ? `
                <button class="btn-delete" data-action="delete" data-product-id="${p._id}" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
                ` : ''}
            </div>
            ` : ''}
        </div>
    `).join('');
}

// ========== VALIDATION MESSAGES (English Only) ==========
function setupValidationMessages() {
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('invalid', (e) => {
            if (input.validity.valueMissing) {
                input.setCustomValidity('This field is required');
            } else if (input.validity.typeMismatch) {
                input.setCustomValidity('Please enter a valid number');
            } else if (input.validity.rangeUnderflow) {
                input.setCustomValidity('Value must be >= ' + input.min);
            } else if (input.validity.rangeOverflow) {
                input.setCustomValidity('Value must be <= ' + input.max);
            }
        });
        
        input.addEventListener('input', () => {
            input.setCustomValidity('');
        });
    });
}

function setupProductDropdowns() {
    const categoryOptions = [
        { value: 'Manufacturing', label: 'Manufacturing / تصنيع' },
        { value: 'Trading', label: 'Trading / تجارة' },
        { value: 'Engineering', label: 'Engineering / هندسة' },
        { value: 'RawMaterial', label: 'Raw Materials / خامات' },
        { value: 'Component', label: 'Components / مكونات' },
        { value: 'MedicalCosmetics', label: 'Medical Cosmetics / تجميل طبي' }
    ];

    const specialtyOptions = [
        { value: 'Cardiology', label: 'Cardiology' },
        { value: 'Dental', label: 'Dental' },
        { value: 'IV Fluids', label: 'IV Fluids' },
        { value: 'OR Solutions', label: 'OR Solutions' },
        { value: 'Consumables', label: 'Consumables' },
        { value: 'General', label: 'General' },
        { value: 'Manufacturing Components', label: 'Manufacturing Components / مكونات تصنيع' },
        { value: 'Imported Raw Materials', label: 'Imported Raw Materials / مواد خام مستوردة' },
        { value: 'Pharmacies', label: 'Pharmacies / صيدليات' }
    ];

    const sectorOptions = [
        { value: 'Equipment', label: 'Equipment / معدات' },
        { value: 'RawMaterial', label: 'Raw Material / مواد خام' },
        { value: 'Component', label: 'Component / مكون' },
        { value: 'Cosmetic', label: 'Cosmetic / تجميلي' }
    ];

    const originOptions = [
        { value: 'Internal', label: 'Internal / داخلي' },
        { value: 'Commercial', label: 'Commercial / تجاري' }
    ];

    const logisticsOptions = [
        { value: 'Local', label: 'Local / محلي' },
        { value: 'Import', label: 'Import / استيراد' },
        { value: 'Export', label: 'Export / تصدير' }
    ];

    const applyOptions = (selector, options, placeholderLabel = '', placeholderValue = '') => {
        const node = document.querySelector(selector);
        if (!node) return;
        const current = String(node.value || '').trim();
        const placeholder = placeholderLabel
            ? `<option value="${placeholderValue}">${placeholderLabel}</option>`
            : '';
        node.innerHTML = `${placeholder}${options.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join('')}`;
        if (current && Array.from(node.options).some((opt) => opt.value === current)) {
            node.value = current;
        }
    };

    applyOptions('#form-add-product select[name="category"]', categoryOptions, 'Select Category', '');
    applyOptions('#edit-category', categoryOptions);
    applyOptions('#form-add-product select[name="specialty"]', specialtyOptions, 'Select Specialty', '');
    applyOptions('#edit-specialty', specialtyOptions);
    applyOptions('#specialty-filter', specialtyOptions, 'All Specialties', 'all');
    applyOptions('#form-add-product select[name="sector"]', sectorOptions);
    applyOptions('#edit-sector', sectorOptions);
    applyOptions('#form-add-product select[name="productOrigin"]', originOptions);
    applyOptions('#edit-product-origin', originOptions);
    applyOptions('#form-add-product select[name="logistics"]', logisticsOptions);
    applyOptions('#edit-logistics', logisticsOptions);
}

function setupProductForm() {
    const form = document.getElementById('form-add-product');
    if (!form) return;
    if (form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    const canCreateProducts = AdminState.userRole === 'SuperAdmin' || AdminState.userRole === 'ProductAdmin';
    if (!canCreateProducts) {
        form.style.display = 'none';
        return;
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!hasSectionAccess('products')) {
            alert('🚫 Unauthorized action.');
            return;
        }

        if (!isTokenValid(AdminState.token)) {
            forceLogout('Session expired', true);
            return;
        }
        
        const formData = new FormData(form);
        const allowedCategories = ['Manufacturing', 'Trading', 'Engineering', 'RawMaterial', 'Component', 'MedicalCosmetics'];
        const allowedSpecialties = ['IV Fluids', 'Cardiology', 'OR Solutions', 'Dental', 'Consumables', 'General', 'Manufacturing Components', 'Imported Raw Materials', 'Pharmacies'];
        const allowedSectors = ['Equipment', 'RawMaterial', 'Component', 'Cosmetic'];
        const allowedOrigins = ['Internal', 'Commercial'];
        const allowedLogistics = ['Import', 'Export', 'Local'];
        const allowedCurrencies = ['USD', 'EGP'];

        const name = (formData.get('name') || '').toString().trim();
        const description = (formData.get('description') || '').toString().trim();
        const category = (formData.get('category') || '').toString().trim();
        const specialty = (formData.get('specialty') || '').toString().trim();
        const sector = (formData.get('sector') || '').toString().trim();
        const productOrigin = (formData.get('productOrigin') || '').toString().trim();
        const logistics = (formData.get('logistics') || '').toString().trim();
        const currency = (formData.get('currency') || '').toString().trim().toUpperCase();
        const datasheetUrl = (formData.get('datasheetUrl') || '').toString().trim();
        const productImageFile = formData.get('productImage');
        const datasheetFile = formData.get('datasheet');

        if (!name || !description) {
            alert('❌ Product name and description are required.');
            return;
        }

        if (!allowedCategories.includes(category)) {
            alert('❌ Please choose a valid category.');
            return;
        }

        if (!allowedSpecialties.includes(specialty)) {
            alert('❌ Please choose a valid specialty.');
            return;
        }

        if (!allowedSectors.includes(sector)) {
            alert('❌ Please choose a valid sector.');
            return;
        }

        if (!allowedOrigins.includes(productOrigin)) {
            alert('❌ Please choose a valid origin.');
            return;
        }

        if (!allowedLogistics.includes(logistics)) {
            alert('❌ Please choose a valid logistics value.');
            return;
        }

        if (!allowedCurrencies.includes(currency)) {
            alert('❌ Please choose a valid currency.');
            return;
        }

        if (!(productImageFile instanceof File) || productImageFile.size <= 0) {
            alert('❌ Product image is required.');
            return;
        }

        if (datasheetFile instanceof File && datasheetFile.size > 0) {
            const fileType = String(datasheetFile.type || '').toLowerCase();
            const fileName = String(datasheetFile.name || '').toLowerCase();
            const looksLikePdf = fileType === 'application/pdf' || fileType === 'application/x-pdf' || fileName.endsWith('.pdf');
            if (!looksLikePdf) {
                alert('❌ Datasheet file must be PDF (.pdf).');
                return;
            }
        }

        formData.set('name', name);
        formData.set('description', description);
        formData.set('category', category);
        formData.set('specialty', specialty);
        formData.set('sector', sector);
        formData.set('productOrigin', productOrigin);
        formData.set('logistics', logistics);
        formData.set('currency', currency);
        formData.set('datasheetUrl', datasheetUrl);

        const btn = form.querySelector('button');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DEPLOYING...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/products/add', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${AdminState.token}` },
                body: formData
            });
            
            const rawText = await res.text();
            let data = {};
            try {
                data = rawText ? JSON.parse(rawText) : {};
            } catch (parseError) {
                data = { message: rawText || 'Unexpected server response' };
            }

            if (res.ok && data.success) {
                alert('✅ Product deployed successfully');
                form.reset();
                await fetchAdminProducts();
            } else {
                if (res.status === 401 || res.status === 403) {
                    forceLogout(data.message || 'Unauthorized session', true);
                    return;
                }
                alert('❌ ' + (data.message || data.error || 'Failed to add product'));
            }
        } catch (err) {
            alert('❌ Error: ' + err.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// ========== 8. EDIT MODAL ==========
// ========== PRODUCT EDIT/DELETE HANDLERS ==========
function openEditModal(product) {
    const modal = document.getElementById('modal-edit');
    const imagePreview = document.getElementById('edit-image-preview');
    document.getElementById('edit-product-id').value = product._id;
    document.getElementById('edit-name').value = product.name;
    document.getElementById('edit-price').value = product.price;
    document.getElementById('edit-currency').value = product.currency;
    document.getElementById('edit-category').value = product.category || 'Manufacturing';
    document.getElementById('edit-specialty').value = product.specialty;
    document.getElementById('edit-sector').value = product.sector || 'Equipment';
    document.getElementById('edit-product-origin').value = product.origin || 'Internal';
    document.getElementById('edit-logistics').value = product.logistics || 'Local';
    document.getElementById('edit-description').value = product.description;
    const specs = product.technicalSpecs || {};
    document.getElementById('edit-material').value = specs.material || '';
    document.getElementById('edit-origin').value = specs.origin || '';
    document.getElementById('edit-compliance').value = specs.compliance || '';
    document.getElementById('edit-sterilization').value = specs.sterilization || '';
    document.getElementById('edit-sizes').value = specs.sizes || '';
    document.getElementById('edit-components').value = specs.components || '';
    if (imagePreview) {
        imagePreview.src = product.imagePath || product.image || '/assets/images/sectors/products.jpg';
    }
    const imageFileInput = document.getElementById('edit-product-image');
    if (imageFileInput) {
        imageFileInput.value = '';
    }
    const datasheetInput = document.getElementById('edit-datasheet-url');
    if (datasheetInput) {
        datasheetInput.value = product.datasheet || '';
    }
    const datasheetFileInput = document.getElementById('edit-datasheet-file');
    if (datasheetFileInput) {
        datasheetFileInput.value = '';
    }

    ['edit-name', 'edit-price', 'edit-currency', 'edit-category', 'edit-specialty', 'edit-sector', 'edit-product-origin', 'edit-logistics', 'edit-description', 'edit-material', 'edit-origin', 'edit-compliance', 'edit-sterilization', 'edit-sizes', 'edit-components'].forEach((id) => {
        const node = document.getElementById(id);
        if (!node) return;
        node.disabled = false;
    });
    
    modal.style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('modal-edit').style.display = 'none';
}

function openEditPasswordModal(staffId, staffName) {
    const modal = document.getElementById('modal-edit-password');
    if (!modal) return;

    const idInput = document.getElementById('edit-password-staff-id');
    const nameInput = document.getElementById('edit-password-staff-name');
    const newInput = document.getElementById('edit-password-new');
    const confirmInput = document.getElementById('edit-password-confirm');

    if (idInput) idInput.value = staffId;
    if (nameInput) nameInput.value = staffName;
    if (newInput) newInput.value = '';
    if (confirmInput) confirmInput.value = '';

    modal.style.display = 'flex';
}

function closeEditPasswordModal() {
    const modal = document.getElementById('modal-edit-password');
    if (!modal) return;

    modal.style.display = 'none';
}

function closeReportCenterModal() {
    const modal = document.getElementById('modal-report-center');
    if (!modal) return;
    modal.style.display = 'none';
}

function closeEditNewsModal() {
    const modal = document.getElementById('modal-edit-news');
    if (!modal) return;
    modal.style.display = 'none';
}

function closeActivityModal() {
    const modal = document.getElementById('modal-activity-tracker');
    if (!modal) return;
    modal.style.display = 'none';
}

// Event Delegation for Edit/Delete buttons
document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('authenticated')) {
        return;
    }

    if (e.target.closest('.btn-edit')) {
        const btn = e.target.closest('.btn-edit');
        const productJson = btn.dataset.productJson;
        const product = JSON.parse(decodeURIComponent(productJson || '{}'));
        openEditModal(product);
    }
    
    if (e.target.closest('.btn-delete')) {
        const btn = e.target.closest('.btn-delete');
        const productId = btn.dataset.productId;
        if (confirm('🚨 Delete this product? This cannot be undone.')) {
            deleteProduct(productId);
        }
    }
    
    if (e.target.getAttribute('data-action') === 'close-modal') {
        closeEditModal();
        closeEditPasswordModal();
        closeReportCenterModal();
        closeEditNewsModal();
        closeActivityModal();
    }
});

function setupEditNewsForm() {
    const form = document.getElementById('form-edit-news');
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!hasSectionAccess('newsroom')) {
            alert('🚫 Unauthorized action.');
            return;
        }

        const id = (document.getElementById('edit-news-id')?.value || '').trim();
        const title = (document.getElementById('edit-news-title')?.value || '').trim();
        const postLink = (document.getElementById('edit-news-link')?.value || '').trim();
        const imageInput = document.getElementById('edit-news-image');
        const hasImage = Boolean(imageInput?.files && imageInput.files[0]);

        if (!id || !title || !postLink) {
            alert('❌ Title and link are required.');
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING...';
            btn.disabled = true;
        }

        try {
            let res;
            if (hasImage) {
                const fd = new FormData();
                fd.set('title', title);
                fd.set('postLink', postLink);
                fd.set('image', imageInput.files[0]);
                res = await fetch(`/api/news/${id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${AdminState.token}` },
                    body: fd
                });
            } else {
                res = await fetch(`/api/news/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AdminState.token}`
                    },
                    body: JSON.stringify({ title, postLink })
                });
            }

            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.message || 'Failed to update news');
            }

            alert('✅ News updated successfully');
            closeEditNewsModal();
            await fetchAdminNews();
        } catch (err) {
            alert('❌ Error: ' + err.message);
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    });
}

const editForm = document.getElementById('form-edit-product');
if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!document.body.classList.contains('authenticated')) {
            return;
        }
        
        const id = document.getElementById('edit-product-id').value;
        const data = {
            name: document.getElementById('edit-name').value,
            price: parseFloat(document.getElementById('edit-price').value),
            currency: document.getElementById('edit-currency').value,
            category: document.getElementById('edit-category').value,
            specialty: document.getElementById('edit-specialty').value,
            sector: document.getElementById('edit-sector').value,
            productOrigin: document.getElementById('edit-product-origin').value,
            logistics: document.getElementById('edit-logistics').value,
            description: document.getElementById('edit-description').value,
            material: document.getElementById('edit-material').value,
            origin: document.getElementById('edit-origin').value,
            compliance: document.getElementById('edit-compliance').value,
            sterilization: document.getElementById('edit-sterilization').value,
            sizes: document.getElementById('edit-sizes').value,
            components: document.getElementById('edit-components').value
        };

        const imageFileInput = document.getElementById('edit-product-image');
        const hasImageFile = Boolean(imageFileInput?.files && imageFileInput.files[0]);

        if (hasImageFile) {
            const imageFormData = new FormData();
            imageFormData.append('productImage', imageFileInput.files[0]);

            const imageRes = await fetch(`/api/products/${id}/image`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${AdminState.token}` },
                body: imageFormData
            });

            if (!imageRes.ok) {
                const imageErrorText = await imageRes.text();
                alert(`❌ Product image update failed: ${imageErrorText}`);
                return;
            }
        }

        const datasheetInput = document.getElementById('edit-datasheet-url');
        const datasheetUrl = datasheetInput ? datasheetInput.value.trim() : '';
        const datasheetFileInput = document.getElementById('edit-datasheet-file');
        const hasDatasheetFile = Boolean(datasheetFileInput?.files && datasheetFileInput.files[0]);

        if (hasDatasheetFile || datasheetUrl.length > 0) {
            const dsFormData = new FormData();
            if (hasDatasheetFile) {
                dsFormData.append('datasheet', datasheetFileInput.files[0]);
            }
            if (datasheetUrl.length > 0) {
                dsFormData.append('datasheetUrl', datasheetUrl);
            }

            const dsRes = await fetch(`/api/products/${id}/datasheet`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${AdminState.token}` },
                body: dsFormData
            });

            if (!dsRes.ok) {
                const dsErrorText = await dsRes.text();
                alert(`❌ Datasheet update failed: ${dsErrorText}`);
                return;
            }
        }

        if (datasheetUrl.length > 0) {
            data.datasheetUrl = datasheetUrl;
        }
        
        try {
            const res = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AdminState.token}`
                },
                body: JSON.stringify(data)
            });
            
            // Check if response is OK
            if (!res.ok) {
                const errorText = await res.text();
                console.error('❌ Server response:', res.status, errorText);
                alert(`❌ Server error: ${res.status} - ${res.statusText}`);
                return;
            }
            
            const result = await res.json();
            
            if (result.success) {
                alert('✅ Product updated');
                closeEditModal();
                await fetchAdminProducts();
            } else {
                alert('❌ ' + (result.message || 'Update failed'));
            }
        } catch (err) {
            console.error('❌ Error:', err);
            alert('❌ Error: ' + err.message);
        }
    });
}

const editPasswordForm = document.getElementById('form-edit-password');
if (editPasswordForm) {
    editPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!document.body.classList.contains('authenticated')) {
            return;
        }

        if (AdminState.userRole !== 'SuperAdmin') {
            alert('🚫 Only SuperAdmin can reset security keys.');
            return;
        }

        const staffId = (document.getElementById('edit-password-staff-id')?.value || '').trim();
        const newPassword = document.getElementById('edit-password-new')?.value || '';
        const confirmPassword = document.getElementById('edit-password-confirm')?.value || '';

        if (!staffId) {
            alert('❌ Invalid staff account selected.');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('❌ Password confirmation does not match.');
            return;
        }

        if (!STRONG_PASSWORD_REGEX.test(newPassword)) {
            alert(`❌ ${PASSWORD_POLICY_MESSAGE}`);
            return;
        }

        try {
            const res = await fetch(`/api/users/update-password/${staffId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AdminState.token}`
                },
                body: JSON.stringify({ password: newPassword })
            });

            const data = await res.json();
            if (data.success) {
                alert('✅ Security key updated successfully.');
                closeEditPasswordModal();
            } else {
                alert('❌ ' + (data.message || 'Failed to update password.'));
            }
        } catch (err) {
            alert('❌ Connection error while updating password.');
        }
    });
}

async function deleteProduct(id) {
    if (!id) {
        alert('❌ Invalid product id.');
        return;
    }

    try {
        const res = await fetch(`/api/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });
        
        const result = await res.json();
        
        if (res.ok && result.success) {
            alert('✅ Product deleted');
            await fetchAdminProducts();
            return;
        }

        alert('❌ ' + (result.message || 'Failed to delete product.'));
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

// ========== 9. SEARCH & FILTER ==========
function setupSearch() {
    const searchInput = document.getElementById('product-search');
    const filterSelect = document.getElementById('specialty-filter');
    
    if (searchInput) {
        searchInput.addEventListener('input', runSearch);
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', runSearch);
    }
}

function runSearch() {
    const searchTerm = (document.getElementById('product-search')?.value || '').toLowerCase();
    const specialty = document.getElementById('specialty-filter')?.value || 'all';
    
    const filtered = AdminState.products.filter(p => {
        const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm);
        const matchesSpecialty = specialty === 'all' || p.specialty === specialty;
        return matchesSearch && matchesSpecialty;
    });
    
    renderProducts(filtered);
}

// ==========================================================================
// 10. PROJECTS MANAGEMENT (IMPERIAL TURNKEY UNIT)
// ==========================================================================

// --- جلب المشاريع من المصفوفة ---
async function fetchProjects() {
    if (!hasSectionAccess('projects')) {
        console.warn('🚫 Unauthorized projects data request blocked');
        return;
    }

    try {
        const res = await fetch('/api/projects', {
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });

        if (!res.ok) {
            throw new Error('Failed to fetch projects');
        }

        const payload = await res.json();
        const projects = Array.isArray(payload) ? payload : [];
        renderProjects(projects);
    } catch (err) {
        console.error('❌ Project Matrix Sync Error:', err);
        const container = document.getElementById('projects-list');
        if (container) container.innerHTML = '<p class="loading">❌ Failed to load project data</p>';
    }
}

// --- عرض المشاريع مع إضافة أزرار التحكم الجديدة ---
function renderProjects(projects) {
    const container = document.getElementById('projects-list');
    if (!container) return;
    
    if (!projects || projects.length === 0) {
        container.innerHTML = '<p class="loading">No active projects in the portfolio.</p>';
        return;
    }
    
    container.innerHTML = projects.map(p => `
        <div class="product-item">
            <div class="project-main">
                <h4 class="project-title">${p.projectName}</h4>
                <p class="project-meta">${p.location} • <span id="status-text-${p._id}">${p.status}</span></p>
                <p class="project-meta"><strong>Budget:</strong> ${formatPriceLabel(p.price, p.currency)}</p>
                <div class="progress-wrapper project-progress-wrap">
                    <div class="project-progress-head">
                        <span>Completion Rate</span>
                        <span id="progress-val-${p._id}">${p.progress}%</span>
                    </div>
                    <div class="project-progress-track">
                        <div id="progress-bar-${p._id}" class="project-progress-fill" data-progress="${p.progress}"></div>
                    </div>
                </div>
            </div>
            
            <div class="project-actions">
                <button onclick="updateProjectStatus('${p._id}', ${Number(p.progress) || 0}, '${String(p.status || '').replace(/'/g, "\\'")}')"
                        class="btn-action btn-action-gold"
                        title="Update Status">
                    <i class="fas fa-sync-alt"></i>
                </button>

                <button onclick="deleteProject('${p._id}')" 
                        class="btn-action btn-action-danger" 
                        title="Delete Project">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.project-progress-fill').forEach((bar) => {
        const progress = Number(bar.getAttribute('data-progress') || 0);
        bar.style.width = `${Math.max(0, Math.min(progress, 100))}%`;
    });
}

// --- 🆕 وظيفة تحديث حالة المشروع ونسبة الإنجاز (جديد) ---
async function updateProjectStatus(id, currentProgress, currentStatus) {
    const newProgress = prompt("Update Project Progress % (0-100):", currentProgress);
    const newStatus = prompt("Update Operational Status (Planning, InProgress, Completed):", currentStatus);

    if (newProgress !== null && newStatus) {
        const parsedProgress = Number.parseInt(newProgress, 10);
        const allowedStatuses = ['Planning', 'InProgress', 'Completed'];

        if (!Number.isFinite(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
            alert('❌ Progress must be a number between 0 and 100.');
            return;
        }

        if (!allowedStatuses.includes(newStatus)) {
            alert('❌ Status must be one of: Planning, InProgress, Completed.');
            return;
        }

        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AdminState.token}`
                },
                body: JSON.stringify({ 
                    progress: parsedProgress,
                    status: newStatus 
                })
            });
            
            const result = await res.json();
            if (result.success) {
                alert("✅ Project Matrix Updated Successfully!");
                fetchProjects(); // ريفريش للقائمة
            } else {
                alert("❌ Sync Refused: " + result.message);
            }
        } catch (err) {
            alert("❌ Matrix Connection Error");
        }
    }
}

// --- حذف المشروع (الأصلي بدون تعديل) ---
async function deleteProject(id) {
    if (!confirm('🚨 TERMINATE PROJECT RECORD? This will be permanently erased.')) return;
    
    try {
        const res = await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });
        
        const result = await res.json();
        if (result.success) {
            alert('✅ Project Record Terminated.');
            await fetchProjects();
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

// --- إعداد فورم إضافة المشاريع (الأصلي بدون تعديل) ---
function setupProjectForm() {
    const form = document.getElementById('form-add-project');
    if (!form) return;
    if (form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!hasSectionAccess('projects')) {
            alert('🚫 Unauthorized action.');
            return;
        }
        
        const formData = new FormData(form);
        const btn = form.querySelector('button');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> DEPLOYING...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/projects/add', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${AdminState.token}` },
                body: formData
            });
            
            const result = await res.json();
            if (result.success) {
                alert('✅ Project deployed to the portfolio');
                form.reset();
                await fetchProjects();
            } else {
                alert('❌ Deployment Failed: ' + result.message);
            }
        } catch (err) {
            alert('❌ Error: ' + err.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

async function fetchMachinery() {
    if (!hasSectionAccess('machinery')) {
        console.warn('🚫 Unauthorized machinery data request blocked');
        return;
    }

    const container = document.getElementById('machinery-list');
    if (!container) return;

    try {
        const res = await fetch('/api/machinery', {
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });

        const payload = await res.json();
        const items = Array.isArray(payload?.data) ? payload.data : [];
        AdminState.machinery = items;
        renderMachinery(items);
    } catch (error) {
        container.innerHTML = '<p class="loading">❌ Failed to load machinery matrix</p>';
    }
}

function renderMachinery(items) {
    const container = document.getElementById('machinery-list');
    if (!container) return;

    if (!items.length) {
        container.innerHTML = '<p class="loading">No machinery items yet.</p>';
        return;
    }

    const canManage =
        AdminState.userRole === 'SuperAdmin' ||
        AdminState.userRole === 'Engineer' ||
        AdminState.userRole === 'EngineeringOps';

    container.innerHTML = items.map((item) => `
        <div class="product-item">
            <div class="product-info">
                <img src="${item.image || '/assets/images/engineering/operating-rooms.jpg'}" alt="${item.name}" class="product-image" />
                <div class="product-details">
                    <h4>${item.name}</h4>
                    <p><strong>${item.category || 'Engineering Hub'}</strong></p>
                    <p><strong>Price:</strong> ${formatPriceLabel(item.price, item.currency)}</p>
                    <p class="product-category-note">${item.summary || 'No summary available.'}</p>
                </div>
            </div>
            ${canManage ? `
            <div class="product-actions">
                <button class="btn-machinery-delete" onclick="deleteMachinery('${item._id}')" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
            ` : ''}
        </div>
    `).join('');
}

function setupMachineryForm() {
    const form = document.getElementById('form-add-machinery');
    if (!form) return;

    if (!(AdminState.userRole === 'SuperAdmin' || AdminState.userRole === 'Engineer' || AdminState.userRole === 'EngineeringOps')) {
        form.style.display = 'none';
        return;
    }

    if (form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    const categorySelect = form.querySelector('select[name="category"]');
    if (categorySelect && AdminState.userRole === 'EngineeringOps') {
        // EngineeringOps is primarily responsible for machinery lines.
        categorySelect.value = 'Machinery & Production Lines';
        const spareOption = Array.from(categorySelect.options || []).find(
            (option) => option.value === 'Spare Parts & Maintenance'
        );
        if (spareOption) spareOption.disabled = true;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!hasSectionAccess('machinery')) {
            alert('🚫 Unauthorized action.');
            return;
        }

        const formData = new FormData(form);

        if (AdminState.userRole === 'EngineeringOps') {
            formData.set('category', 'Machinery & Production Lines');
        }

        const sparePartsRaw = (formData.get('spareParts') || '').toString().trim();
        if (sparePartsRaw) {
            try {
                JSON.parse(sparePartsRaw);
            } catch (error) {
                alert('❌ Spare Parts must be valid JSON array.');
                return;
            }
        }

        const datasheetUrl = (formData.get('datasheetUrl') || '').toString().trim();
        formData.set('datasheetUrl', datasheetUrl);

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SAVING...';
        btn.disabled = true;

        try {
            console.log('🛠️ Machinery submit started', {
                role: AdminState.userRole,
                endpoint: '/api/machinery/add',
                name: (formData.get('name') || '').toString().trim(),
                category: (formData.get('category') || '').toString().trim(),
                hasImage: Boolean(formData.get('image') instanceof File && formData.get('image').size > 0),
                hasDatasheet: Boolean(formData.get('datasheet') instanceof File && formData.get('datasheet').size > 0)
            });

            const res = await fetch('/api/machinery/add', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${AdminState.token}` },
                body: formData
            });

            const payload = await res.json();
            console.log('🛠️ Machinery submit response', { status: res.status, ok: res.ok, payload });
            if (!res.ok || !payload.success) {
                throw new Error(payload.message || 'Failed to save machinery item');
            }

            alert('✅ Machinery item saved successfully');
            form.reset();
            await fetchMachinery();
        } catch (error) {
            alert(`❌ ${error.message}`);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

function bindReportForm(form, { moduleFallback = 'General', specialtyFallback = '', sectionAccess = '' } = {}) {
    if (!form || form.dataset.bound === '1') return;
    form.dataset.bound = '1';

    const recipientSelect = form.querySelector('select[name="recipientType"]');
    const clientEmailInput = form.querySelector('input[name="clientEmail"]');
    const moduleInput = form.querySelector('[name="relatedModule"]');
    const specialtyInput = form.querySelector('[name="specialty"]');

    const syncClientEmailRequirement = () => {
        const isClientTarget = recipientSelect?.value === 'Client';
        if (clientEmailInput) {
            clientEmailInput.required = isClientTarget;
            if (!isClientTarget) clientEmailInput.value = '';
        }
    };

    if (moduleInput && !moduleInput.value) {
        moduleInput.value = moduleFallback;
    }

    if (specialtyInput && !specialtyInput.value && specialtyFallback) {
        specialtyInput.value = specialtyFallback;
    }

    if (recipientSelect) {
        recipientSelect.addEventListener('change', syncClientEmailRequirement);
    }
    syncClientEmailRequirement();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (sectionAccess && !hasSectionAccess(sectionAccess)) {
            alert('🚫 Unauthorized action.');
            return;
        }

        const body = {
            recipientType: (form.recipientType?.value || 'SuperAdmin').trim(),
            clientName: (form.clientName?.value || '').trim(),
            clientEmail: (form.clientEmail?.value || '').trim(),
            subject: (form.subject?.value || '').trim(),
            message: (form.message?.value || '').trim(),
            relatedModule: ((form.relatedModule?.value || '').trim() || moduleFallback),
            specialty: ((form.specialty?.value || '').trim() || specialtyFallback)
        };

        if (!body.subject || !body.message) {
            alert('❌ Subject and message are required.');
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SENDING...';
            btn.disabled = true;
        }

        try {
            const res = await fetch('/api/reports/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AdminState.token}`
                },
                body: JSON.stringify(body)
            });

            const payload = await res.json();
            if (!res.ok || !payload.success) {
                throw new Error(payload.message || 'Failed to send report');
            }

            alert(`✅ ${payload.message || 'Report sent successfully'}`);
            form.reset();
            if (moduleInput) moduleInput.value = body.relatedModule;
            if (specialtyInput && specialtyFallback) specialtyInput.value = specialtyFallback;
            syncClientEmailRequirement();
            closeReportCenterModal();
        } catch (error) {
            alert(`❌ ${error.message}`);
        } finally {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }
    });
}

function setupGlobalReportCenter() {
    const modal = document.getElementById('modal-report-center');
    const globalForm = document.getElementById('form-report-global');
    if (!modal || !globalForm) return;
    if (modal.dataset.bound === '1') return;
    modal.dataset.bound = '1';

    document.querySelectorAll('.admin-section').forEach((section) => {
        const sectionId = section.id.replace('section-', '');
        const header = section.querySelector('.section-header');
        if (!header || header.querySelector('.section-report-btn')) return;

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'section-report-btn';
        trigger.dataset.section = sectionId;
        trigger.innerHTML = '<i class="fas fa-paper-plane"></i> Send Report';
        header.appendChild(trigger);
    });

    bindReportForm(globalForm, { sectionAccess: '' });

    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('.section-report-btn');
        if (!trigger) return;

        const sectionName = trigger.dataset.section || '';
        if (sectionName && !hasSectionAccess(sectionName)) {
            alert('🚫 Unauthorized action.');
            return;
        }

        const moduleInput = globalForm.querySelector('[name="relatedModule"]');
        const specialtyInput = globalForm.querySelector('[name="specialty"]');
        if (moduleInput) {
            moduleInput.value = REPORT_MODULE_BY_SECTION[sectionName] || 'General';
        }
        if (specialtyInput) {
            specialtyInput.value = REPORT_SPECIALTY_BY_SECTION[sectionName] || '';
        }

        modal.style.display = 'flex';
    });
}

function setupReportDispatchForm() {
    const sectionForm = document.getElementById('form-send-report');
    bindReportForm(sectionForm, {
        moduleFallback: 'Engineering Hub',
        specialtyFallback: 'Machinery & Production Lines',
        sectionAccess: 'machinery'
    });
}

async function deleteMachinery(id) {
    if (!confirm('🚨 Delete this machinery item?')) return;

    try {
        const res = await fetch(`/api/machinery/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });
        const payload = await res.json();
        if (!res.ok || !payload.success) {
            throw new Error(payload.message || 'Delete failed');
        }

        alert('✅ Machinery item deleted');
        await fetchMachinery();
    } catch (error) {
        alert(`❌ ${error.message}`);
    }
}

// ==========================================================================
// 11. REGULATORY AFFAIRS (GEMA COMPLIANCE UNIT)
// ==========================================================================

// --- جلب وعرض التراخيص والشهادات ---
async function fetchRegulatory() {
    if (!hasSectionAccess('regulatory')) {
        console.warn('🚫 Unauthorized regulatory data request blocked');
        return;
    }

    try {
        const res = await fetch('/api/regulatory', {
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });

        if (!res.ok) {
            throw new Error('Failed to fetch regulatory documents');
        }

        const payload = await res.json();
        const items = Array.isArray(payload) ? payload : [];
        const container = document.getElementById('regulatory-list');
        
        if (container) {
            container.innerHTML = items.map(r => {
                // التحقق مما إذا كانت الشهادة منتهية لتلوين التاريخ بالأحمر
                const expiryDate = new Date(r.expiryDate);
                const isExpired = expiryDate < new Date();
                
                return `
                <div class="product-item">
                    <div class="reg-main">
                        <h4 class="reg-title">${r.title}</h4>
                        <p class="reg-meta">
                            ${r.type} • Expiry: 
                            <span class="reg-expiry ${isExpired ? 'is-expired' : 'is-valid'}">
                                ${expiryDate.toLocaleDateString()}
                            </span>
                        </p>
                        <p class="reg-meta"><strong>Cost:</strong> ${formatPriceLabel(r.fee, r.currency, 'N/A')}</p>
                    </div>
                    
                    <div class="reg-actions">
                        <button onclick="renewCertificate('${r._id}', '${r.expiryDate.split('T')[0]}')" 
                                class="btn-action btn-action-gold" 
                                title="Renew / Update Expiry">
                            <i class="fas fa-calendar-plus"></i>
                        </button>

                        <button onclick="deleteRegulatory('${r._id}')" 
                                class="btn-action btn-action-danger" 
                                title="Delete Record">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                `;
            }).join('') || '<p class="loading">No regulatory documents found.</p>';
        }
    } catch (err) {
        console.error('❌ Regulatory Sync Error:', err);
    }
}

// --- 🆕 وظيفة تجديد الشهادة وتحديث تاريخها (جديد) ---
async function renewCertificate(id, currentExpiry) {
    const newDate = prompt("Enter New Expiry Date (YYYY-MM-DD):", currentExpiry);
    
    if (newDate && newDate !== currentExpiry) {
        try {
            const res = await fetch(`/api/regulatory/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AdminState.token}`
                },
                body: JSON.stringify({ expiryDate: newDate })
            });
            
            const result = await res.json();
            if (result.success) {
                alert("✅ Certificate Expiry Updated Successfully!");
                fetchRegulatory(); // تحديث القائمة فوراً
            } else {
                alert("❌ Sync Refused: " + result.message);
            }
        } catch (err) {
            alert("❌ Matrix Error: Could not update certificate");
        }
    }
}

// --- إعداد فورم رفع الشهادات (الأصلي بدون حذف) ---
function setupRegulatoryForm() {
    const form = document.getElementById('form-add-regulatory');
    if (!form) return;
    if (form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!hasSectionAccess('regulatory')) {
            alert('🚫 Unauthorized action.');
            return;
        }
        
        const formData = new FormData(form);
        const btn = form.querySelector('button');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> UPLOADING...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/regulatory/add', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${AdminState.token}` },
                body: formData
            });
            
            const result = await res.json();
            if (result.success) {
                alert('✅ Certificate successfully authorized and uploaded');
                form.reset();
                await fetchRegulatory();
            } else {
                alert('❌ Upload Failed: ' + result.message);
            }
        } catch (err) {
            alert('❌ Error: ' + err.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// --- حذف الشهادة (الأصلي بدون حذف) ---
async function deleteRegulatory(id) {
    if (!confirm('🚨 TERMINATE REGULATORY RECORD? This cannot be undone.')) return;
    
    try {
        const res = await fetch(`/api/regulatory/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });
        
        const result = await res.json();
        if (result.success) {
            alert('✅ Document purged from the Matrix.');
            await fetchRegulatory();
        }
    } catch (err) {
        alert('❌ Purge Error: ' + err.message);
    }
}
// ==========================================================================
// 12. STAFF MANAGEMENT (IMPERIAL EDITION - FULL CRUD)
// ==========================================================================

// --- جلب وعرض قائمة الموظفين ---
async function fetchStaff() {
    if (!hasSectionAccess('staff')) {
        console.warn('🚫 Unauthorized staff data request blocked');
        return;
    }

    try {
        const res = await fetch('/api/users', {
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });

        if (!res.ok) {
            throw new Error('Failed to fetch staff list');
        }

        const payload = await res.json();
        const users = Array.isArray(payload) ? payload : [];
        const container = document.getElementById('staff-list');
        const canAdministerStaff = normalizeRole(AdminState.userRole) === 'SuperAdmin';
        const canInspectActivity = canUseAdvancedActivityTracker();
        
        if (container) {
            container.innerHTML = users.map(u => `
                <div class="product-item">
                    <div class="staff-info">
                        <h4>${u.name}</h4>
                        <p>${u.email} • <span class="badge-role">${u.role}</span> • ${u.department || 'Medical'}${u.isFrozen ? ' • FROZEN' : ''}</p>
                    </div>
                    <div class="staff-actions">
                        ${canInspectActivity ? `
                        <button onclick="showStaffActivity('${u._id}', '${String(u.name || '').replace(/'/g, "&#39;")}')" class="btn-action btn-action-gold btn-action-spaced" title="Activity">
                            <i class="fas fa-chart-line"></i>
                        </button>
                        ` : ''}

                        ${canAdministerStaff ? `
                        <button onclick="promoteStaff('${u._id}', '${u.role}')" class="btn-action btn-action-gold btn-action-spaced" title="Promote / Change Role">
                            <i class="fas fa-user-tag"></i>
                        </button>

                        <button onclick="toggleFreezeStaff('${u._id}', ${Boolean(u.isFrozen)})" class="btn-action btn-action-gold btn-action-spaced" title="Freeze / Unfreeze">
                            <i class="fas ${u.isFrozen ? 'fa-unlock' : 'fa-snowflake'}"></i>
                        </button>
                        
                        <button onclick="changeStaffPassword('${u._id}', '${u.name}')" class="btn-action btn-action-gold btn-action-spaced" title="Reset Security Key">
                            <i class="fas fa-key"></i>
                        </button>
                        
                        <button onclick="deleteStaff('${u._id}')" class="btn-action btn-action-danger" title="Terminate Access">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            `).join('') || '<p class="loading">No authorized personnel found.</p>';
        }
    } catch (err) {
        console.error('❌ Staff Matrix Sync Error:', err);
    }
}

// --- إضافة موظف جديد (حافظنا على وظيفتك القديمة مع تحسين) ---
function setupStaffForm() {
    const form = document.getElementById('form-add-staff');
    if (!form) return;
    if (form.dataset.bound === '1') return;
    form.dataset.bound = '1';
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!hasSectionAccess('staff')) {
            alert('🚫 Unauthorized action.');
            return;
        }
        
        const data = Object.fromEntries(new FormData(form));
        const btn = form.querySelector('button');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AUTHORIZING...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/users/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AdminState.token}`
                },
                body: JSON.stringify(data)
            });
            
            const result = await res.json();
            if (result.success) {
                alert('✅ Staff member authorized in the Matrix');
                form.reset();
                await fetchStaff();
            } else {
                alert('❌ Access Denied: ' + (result.message || 'Operation failed'));
            }
        } catch (err) {
            alert('❌ Matrix Error: ' + err.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// --- 🆕 وظيفة ترقية الموظف (تغيير الرتبة) ---
async function promoteStaff(id, currentRole) {
    // التأكد من أن القائم بالتعديل SuperAdmin
    const myRole = AdminState.userRole;
    if (myRole !== 'SuperAdmin') return alert("🚫 Unauthorized! Only SuperAdmin can modify roles.");

    const newRole = prompt("Matrix Access Level - Enter New Role:\n(SuperAdmin, ProductAdmin, Regulatory, Engineer, EngineeringOps, NewsEditor, OperationsAdmin, Staff)", currentRole);
    
    if (!newRole || newRole === currentRole) return;

    const allowedRoles = ['SuperAdmin', 'ProductAdmin', 'Regulatory', 'Engineer', 'EngineeringOps', 'NewsEditor', 'OperationsAdmin', 'Staff'];
    if (!allowedRoles.includes(newRole)) {
        alert('❌ Invalid role value.');
        return;
    }

    try {
        const res = await fetch(`/api/users/update-role/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AdminState.token}`
            },
            body: JSON.stringify({ role: newRole })
        });
        const data = await res.json();
        if (data.success) {
            alert(`✅ Credentials Updated: Staff is now ${newRole}`);
            fetchStaff();
        } else {
            alert("❌ Matrix Refused: " + data.message);
        }
    } catch (err) { alert("❌ Critical Sync Failure"); }
}

// --- 🆕 وظيفة تغيير كلمة المرور ---
async function changeStaffPassword(id, name) {
    const myRole = AdminState.userRole;
    if (myRole !== 'SuperAdmin') return alert("🚫 Only SuperAdmin can reset security keys.");
    openEditPasswordModal(id, name);
}

async function toggleFreezeStaff(id, currentState) {
    const myRole = AdminState.userRole;
    if (myRole !== 'SuperAdmin') return alert('🚫 Only SuperAdmin can freeze accounts.');

    const nextState = !Boolean(currentState);
    const confirmationText = nextState
        ? 'Freeze this account and block login?'
        : 'Unfreeze this account and restore login access?';

    if (!confirm(`🚨 ${confirmationText}`)) return;

    try {
        const res = await fetch(`/api/users/freeze/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AdminState.token}`
            },
            body: JSON.stringify({ isFrozen: nextState })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || 'Failed to update freeze status');
        }

        alert(nextState ? '✅ Account frozen successfully.' : '✅ Account unfrozen successfully.');
        await fetchStaff();
    } catch (err) {
        alert(`❌ ${err.message}`);
    }
}

async function showStaffActivity(id, name = 'Staff Member') {
    openActivityTrackerModal(id, name);
}

function canUseAdvancedActivityTracker() {
    const role = normalizeRole(AdminState.userRole);
    return role === 'SuperAdmin' || role === 'OperationsAdmin';
}

function setupActivityTracker() {
    if (ActivityTrackerState.bound) return;
    ActivityTrackerState.bound = true;

    const actorSelect = document.getElementById('activity-filter-actor');
    const moduleSelect = document.getElementById('activity-filter-module');
    const dateInput = document.getElementById('activity-filter-date');

    [actorSelect, moduleSelect, dateInput].forEach((node) => {
        if (!node) return;
        node.addEventListener('change', () => {
            loadFilteredActivity();
        });
    });
}

async function loadActivityActors() {
    if (ActivityTrackerState.loadedActors) return;

    const actorSelect = document.getElementById('activity-filter-actor');
    if (!actorSelect) return;

    const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${AdminState.token}` }
    });

    const payload = await res.json();
    if (!res.ok || !Array.isArray(payload)) {
        throw new Error('Failed to load actor list.');
    }

    ActivityTrackerState.actors = payload
        .map((u) => ({ id: String(u._id || '').trim(), name: String(u.name || 'Unknown').trim() }))
        .filter((u) => u.id);

    actorSelect.innerHTML = '<option value="">All Actors</option>'
        + ActivityTrackerState.actors.map((u) => `<option value="${u.id}">${u.name}</option>`).join('');

    ActivityTrackerState.loadedActors = true;
}

async function loadFilteredActivity() {
    if (!canUseAdvancedActivityTracker()) return;

    const listNode = document.getElementById('activity-tracker-list');
    const actorSelect = document.getElementById('activity-filter-actor');
    const moduleSelect = document.getElementById('activity-filter-module');
    const dateInput = document.getElementById('activity-filter-date');
    if (!listNode) return;

    const params = new URLSearchParams();
    const userId = String(actorSelect?.value || '').trim();
    const moduleName = String(moduleSelect?.value || '').trim();
    const date = String(dateInput?.value || '').trim();

    if (userId) params.set('userId', userId);
    if (moduleName) params.set('module', moduleName);
    if (date) params.set('date', date);
    params.set('limit', '120');

    listNode.innerHTML = '<p class="loading">Loading activity...</p>';

    const res = await fetch(`/api/users/activity?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${AdminState.token}` }
    });
    const payload = await res.json();

    if (!res.ok || !payload.success) {
        throw new Error(payload.message || 'Failed to load activity.');
    }

    const logs = Array.isArray(payload?.data?.logs) ? payload.data.logs : [];
    if (!logs.length) {
        listNode.innerHTML = '<p class="loading">No matching activity found.</p>';
        return;
    }

    listNode.innerHTML = logs.map((item) => {
        const when = new Date(item.createdAt || item.timestamp || Date.now()).toLocaleString();
        const actorName = item?.actor?.username || item?.actor?.userId || 'Unknown';
        return `
            <div class="product-item">
                <div class="staff-info">
                    <h4>${item.action || 'unknown_action'}</h4>
                    <p>${when} • ${item.module || 'General'} • ${actorName}</p>
                </div>
                <div class="staff-actions">
                    <span class="badge-role">${item.status || 'success'}</span>
                </div>
            </div>
        `;
    }).join('');
}

async function openActivityTrackerModal(seedUserId = '', seedName = '') {
    if (!canUseAdvancedActivityTracker()) {
        alert('🚫 Advanced activity tracker is restricted to SuperAdmin and OperationsAdmin.');
        return;
    }

    const modal = document.getElementById('modal-activity-tracker');
    const actorSelect = document.getElementById('activity-filter-actor');
    const moduleSelect = document.getElementById('activity-filter-module');
    const dateInput = document.getElementById('activity-filter-date');
    if (!modal) return;

    ActivityTrackerState.seedUserId = String(seedUserId || '').trim();
    ActivityTrackerState.seedName = String(seedName || '').trim();

    try {
        await loadActivityActors();

        if (actorSelect) {
            actorSelect.value = ActivityTrackerState.seedUserId || '';
        }
        if (moduleSelect) {
            moduleSelect.value = '';
        }
        if (dateInput) {
            dateInput.value = '';
        }

        modal.style.display = 'flex';
        await loadFilteredActivity();
    } catch (err) {
        alert(`❌ ${err.message}`);
    }
}

// --- حذف موظف (وظيفتك القديمة) ---
async function deleteStaff(id) {
    if (!confirm('🚨 TERMINATE ACCESS? This record will be erased from the Matrix.')) return;
    
    try {
        const res = await fetch(`/api/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${AdminState.token}` }
        });
        
        const result = await res.json();
        if (result.success) {
            alert('✅ Access Terminated Successfully.');
            await fetchStaff();
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}

window.openActivityTrackerModal = openActivityTrackerModal;
