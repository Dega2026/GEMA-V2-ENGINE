document.addEventListener('DOMContentLoaded', async () => {
    const savedLang = localStorage.getItem('selectedLang') || 'en';

    const defaultHeaderConfig = {
        logoText: 'GEMA',
        logoAccent: 'GLOBAL',
        searchPlaceholder: 'Search...',
        quoteText: 'Get a Quote',
        sectorsLabel: 'Sectors',
        links: [
            { id: 'link-home', href: '/', label: 'Home Hub', i18n: 'nav_home' },
            { id: 'link-hub', href: '/hub', label: 'Empire Hub', i18n: 'nav_hub' },
            { id: 'link-mfg', href: '/manufacturing', label: 'Manufacturing', i18n: 'nav_mfg' },
            { id: 'link-products', href: '/products', label: 'Products', i18n: 'nav_prod' },
            { id: 'link-trade', href: '/trading', label: 'Trading', i18n: 'nav_trade' },
            { id: 'link-news', href: '/news', label: 'Newsroom', i18n: 'nav_news' },
            { id: 'link-about', href: '/about', label: 'About', i18n: 'nav_about' },
            { id: 'link-contact', href: '/contact', label: 'Contact', i18n: 'nav_contact' }
        ],
        sectors: [
            { href: '/engineering', label: 'Engineering', i18n: 'nav_eng' },
            { href: '/regulatory', label: 'Regulatory Affairs', i18n: 'nav_reg' },
            { href: '/turnkey', label: 'Turnkey Solutions', i18n: 'nav_turnkey' }
        ]
    };

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sanitizeHref(value, fallback = '#') {
        const href = String(value || '').trim();
        if (!href) return fallback;
        if (href.startsWith('/') || href.startsWith('http://') || href.startsWith('https://')) {
            return href;
        }
        return fallback;
    }

    function isObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value);
    }

    async function fetchHeaderConfig(lang) {
        try {
            const res = await fetch(`/api/pages/header?lang=${encodeURIComponent(lang)}`);
            if (!res.ok) return {};
            const payload = await res.json();
            if (!payload.success || !isObject(payload.content)) return {};
            return payload.content;
        } catch (_) {
            return {};
        }
    }

    function mergeHeaderConfig(base, incoming) {
        const merged = {
            ...base,
            ...(isObject(incoming) ? incoming : {})
        };

        if (!Array.isArray(merged.links) || !merged.links.length) {
            merged.links = base.links;
        }

        if (Array.isArray(merged.links)) {
            merged.links = merged.links.map((link) => {
                if (!isObject(link)) return link;
                const href = String(link.href || '').trim();
                const i18n = String(link.i18n || '').trim();

                if (href === '/hub' || i18n === 'nav_hub') {
                    return {
                        ...link,
                        id: link.id || 'link-hub',
                        href: '/hub',
                        i18n: 'nav_hub',
                        label: link.label || 'Empire Hub'
                    };
                }

                return link;
            });
        }

        const hasHubLink = Array.isArray(merged.links)
            ? merged.links.some((link) => String(link?.href || '').trim() === '/hub' || String(link?.i18n || '').trim() === 'nav_hub')
            : false;

        if (!hasHubLink) {
            merged.links = [
                { id: 'link-hub', href: '/hub', label: 'Empire Hub', i18n: 'nav_hub' },
                ...merged.links
            ];
        }

        if (!Array.isArray(merged.sectors) || !merged.sectors.length) {
            merged.sectors = base.sectors;
        }

        return merged;
    }

    const remoteConfig = await fetchHeaderConfig(savedLang);
    const headerConfig = mergeHeaderConfig(defaultHeaderConfig, remoteConfig);

    const navLinksHtml = headerConfig.links
        .map((link) => {
            const href = sanitizeHref(link.href, '/');
            const id = escapeHtml(link.id || '');
            const label = escapeHtml(link.label || '');
            const i18n = escapeHtml(link.i18n || '');
            const i18nAttr = i18n ? ` data-i18n="${i18n}"` : '';
            const idAttr = id ? ` id="${id}"` : '';
            return `<li><a href="${href}"${idAttr}${i18nAttr}>${label}</a></li>`;
        })
        .join('');

    const sectorsHtml = headerConfig.sectors
        .map((sector) => {
            const href = sanitizeHref(sector.href, '/');
            const label = escapeHtml(sector.label || '');
            const i18n = escapeHtml(sector.i18n || '');
            const i18nAttr = i18n ? ` data-i18n="${i18n}"` : '';
            return `<li><a href="${href}"${i18nAttr}>${label}</a></li>`;
        })
        .join('');

    const headerHTML = `
    <header class="main-header">
        <div class="container header-flex">
            <a href="/" class="logo">
                <img src="/assets/branding/logo-GEMA.png" alt="GEMA Logo" />
                ${escapeHtml(headerConfig.logoText)} <span>${escapeHtml(headerConfig.logoAccent)}</span>
            </a>

            <div class="menu-toggle" id="mobile-toggle">
                <i class="fas fa-bars"></i>
            </div>

            <nav class="main-nav">
                <ul class="nav-links" id="nav-list">
                    ${navLinksHtml}

                    <li class="nav-dropdown">
                        <a href="#" id="link-more" data-i18n="nav_sectors">${escapeHtml(headerConfig.sectorsLabel)} <i class="fas fa-chevron-down nav-chevron"></i></a>
                        <ul class="dropdown-menu">
                            ${sectorsHtml}
                        </ul>
                    </li>
                </ul>
            </nav>

            <div class="search-container">
                <div class="search-box">
                    <input type="text" id="globalSearch" placeholder="${escapeHtml(headerConfig.searchPlaceholder)}" onkeyup="handleSearch(this.value)">
                    <i class="fas fa-search search-icon"></i>
                </div>
                <div id="searchResults" class="search-results-dropdown"></div>
            </div>

            <div class="header-actions">
                <div class="lang-switcher">
                    <button class="lang-btn">
                        <i class="fas fa-globe"></i>
                        <span id="current-lang">${savedLang.toUpperCase()}</span>
                    </button>
                    <ul class="lang-dropdown">
                        <li onclick="changeLang('en')">English</li>
                        <li onclick="changeLang('ar')">العربية</li>
                        <li onclick="changeLang('zh')">中文</li>
                        <li onclick="changeLang('de')">Deutsch</li>
                        <li onclick="changeLang('tr')">Türkçe</li>
                    </ul>
                </div>
                <a href="/quote" class="btn-gold d-none-mobile" data-i18n="nav_quote">${escapeHtml(headerConfig.quoteText)}</a>
            </div>
        </div>
    </header>
    `;

    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    const internalServices = [
        { id: 'sfda', nameEn: 'SFDA Registration', nameAr: 'تسجيل الغذاء والدواء', category: 'Regulatory', tags: ['sfda', 'saudi', 'food', 'drug', 'سعودية', 'دواء'] },
        { id: 'eda', nameEn: 'EDA Registration', nameAr: 'تسجيل هيئة الدواء المصرية', category: 'Regulatory', tags: ['eda', 'egypt', 'drug', 'مصر', 'دواء'] },
        { id: 'iso13485', nameEn: 'ISO 13485', nameAr: 'أيزو 13485', category: 'Quality', tags: ['iso', '13485', 'quality', 'أيزو'] },
        { id: 'ce-marking', nameEn: 'CE Marking', nameAr: 'علامة CE', category: 'Compliance', tags: ['ce', 'marking', 'europe', 'أوروبا'] },
        { id: 'tk-concept', nameEn: 'Concept & Design', nameAr: 'المفهوم والتصميم', category: 'Turnkey', tags: ['factory', 'design', 'concept', 'مصنع', 'تصميم'] },
        { id: 'tk-setup', nameEn: 'Machinery & Setup', nameAr: 'الآلات والإعداد', category: 'Turnkey', tags: ['machinery', 'production', 'آلات', 'إنتاج'] },
        { id: 'tk-ops', nameEn: 'Operational Support', nameAr: 'الدعم التشغيلي', category: 'Turnkey', tags: ['support', 'training', 'تشغيل', 'تدريب'] },
        { id: 'eng-or', nameEn: 'Operating Rooms', nameAr: 'غرف العمليات', category: 'Engineering', tags: ['operating', 'hospital', 'modular', 'غرف', 'عمليات'] },
        { id: 'eng-maint', nameEn: 'Biomedical Maintenance', nameAr: 'الصيانة الطبية', category: 'Engineering', tags: ['maintenance', 'repair', 'صيانة', 'إصلاح'] }
    ];

    window.handleSearch = async (query) => {
        const resultsContainer = document.getElementById('searchResults');
        const currentLang = localStorage.getItem('selectedLang') || 'en';

        if (!resultsContainer) return;

        if (query.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }

        let resultsHTML = '';

        const filteredServices = internalServices.filter((s) =>
            s.tags.some((tag) => tag.includes(query.toLowerCase())) ||
            s.nameEn.toLowerCase().includes(query.toLowerCase()) ||
            s.nameAr.includes(query)
        );

        filteredServices.forEach((s) => {
            const displayName = currentLang === 'ar' ? s.nameAr : s.nameEn;
            resultsHTML += `
                <a href="/service-details?service=${s.id}" class="result-item">
                    <i class="fas fa-concierge-bell result-icon-service"></i>
                    <div class="result-info">
                        <h4>${escapeHtml(displayName)}</h4>
                        <span class="result-type">${escapeHtml(s.category)} Service</span>
                    </div>
                </a>`;
        });

        try {
            const response = await fetch('/api/products');
            if (response.ok) {
                const products = await response.json();
                const filteredProducts = products.filter((p) =>
                    String(p.name || '').toLowerCase().includes(query.toLowerCase())
                );

                filteredProducts.forEach((p) => {
                    const image = sanitizeHref(p.image, '/assets/branding/logo-GEMA.png');
                    resultsHTML += `
                        <a href="/product/${p._id}" class="result-item">
                            <img src="${image}" width="30" class="result-thumb" />
                            <div class="result-info">
                                <h4>${escapeHtml(p.name)}</h4>
                                <span class="result-type">Product / ${escapeHtml(p.category)}</span>
                            </div>
                        </a>`;
                });
            }
        } catch (err) {
            console.error('Search API Error:', err);
        }

        resultsContainer.innerHTML = resultsHTML || '<div class="no-results search-empty">No results found</div>';
        resultsContainer.style.display = 'block';
    };

    document.addEventListener('click', (e) => {
        const resultsContainer = document.getElementById('searchResults');
        if (resultsContainer && !e.target.closest('.search-container')) {
            resultsContainer.style.display = 'none';
        }
    });

    window.changeLang = (lang) => {
        localStorage.setItem('selectedLang', lang);
        if (typeof setLanguage === 'function') {
            setLanguage(lang);
        }
        const langLabel = document.getElementById('current-lang');
        if (langLabel) langLabel.innerText = lang.toUpperCase();
        location.reload();
    };

    const mobileToggle = document.getElementById('mobile-toggle');
    const navList = document.getElementById('nav-list');
    if (mobileToggle && navList) {
        mobileToggle.addEventListener('click', () => {
            navList.classList.toggle('active');
            const icon = mobileToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });
    }
});
