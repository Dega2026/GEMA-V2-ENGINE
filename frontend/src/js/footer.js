document.addEventListener('DOMContentLoaded', async () => {
    const lang = localStorage.getItem('selectedLang') || 'en';

    const defaultFooterConfig = {
        logoText: 'GEMA',
        logoAccent: 'GLOBAL',
        description: 'A Leading German-Egyptian Group shaping the future of medical technology through industrial excellence and digital innovation.',
        quickLinksTitle: 'Quick Links',
        quickLinks: [
            { href: '/about', label: 'Our Story', i18n: 'foot_story' },
            { href: '/products', label: 'Product Catalog', i18n: 'foot_catalog' },
            { href: '/news', label: 'Newsroom', i18n: 'foot_news' }
        ],
        hubsTitle: 'Global Hubs',
        hubs: [
            { city: 'Cairo, Egypt', note: '(Headquarters)' },
            { city: 'Riyadh, Saudi Arabia', note: '(Regional Office)' },
            { city: 'Shanghai, China', note: '(Logistics Center)' }
        ],
        partnerTitle: 'Tech Partner',
        partnerText: 'Digital Ecosystem by MSA Agency.',
        copyrightText: '&copy; 2026 GEMA GLOBAL MEDICAL. All Rights Reserved. Engineered by MSA Intelligence Unit.'
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

    async function fetchFooterConfig(activeLang) {
        try {
            const res = await fetch(`/api/pages/footer?lang=${encodeURIComponent(activeLang)}`);
            if (!res.ok) return {};
            const payload = await res.json();
            if (!payload.success || !isObject(payload.content)) return {};
            return payload.content;
        } catch (_) {
            return {};
        }
    }

    function mergeFooterConfig(base, incoming) {
        const merged = {
            ...base,
            ...(isObject(incoming) ? incoming : {})
        };

        if (!Array.isArray(merged.quickLinks) || !merged.quickLinks.length) {
            merged.quickLinks = base.quickLinks;
        }

        if (!Array.isArray(merged.hubs) || !merged.hubs.length) {
            merged.hubs = base.hubs;
        }

        return merged;
    }

    const remoteConfig = await fetchFooterConfig(lang);
    const footerConfig = mergeFooterConfig(defaultFooterConfig, remoteConfig);

    const quickLinksHtml = footerConfig.quickLinks
        .map((link) => {
            const href = sanitizeHref(link.href, '/');
            const label = escapeHtml(link.label || '');
            const i18n = escapeHtml(link.i18n || '');
            const i18nAttr = i18n ? ` data-i18n="${i18n}"` : '';
            return `<li><a href="${href}"${i18nAttr} class="footer-link">${label}</a></li>`;
        })
        .join('');

    const hubsHtml = footerConfig.hubs
        .map((hub) => `<strong>${escapeHtml(hub.city)}</strong> <span>${escapeHtml(hub.note)}</span><br>`)
        .join('');

    const footerHTML = `
    <footer class="main-footer">
        <div class="container">
            <div class="footer-grid footer-grid-layout">
                <div class="footer-col">
                    <a href="/" class="logo footer-logo">
                        <img src="/assets/branding/logo-GEMA.png" alt="GEMA Logo" class="footer-logo-image">
                        ${escapeHtml(footerConfig.logoText)} <span>${escapeHtml(footerConfig.logoAccent)}</span>
                    </a>
                    <p data-i18n="foot_desc" class="footer-desc">${escapeHtml(footerConfig.description)}</p>
                </div>

                <div class="footer-col">
                    <h4 data-i18n="foot_quick">${escapeHtml(footerConfig.quickLinksTitle)}</h4>
                    <ul class="footer-links footer-links-list">
                        ${quickLinksHtml}
                    </ul>
                </div>

                <div class="footer-col">
                    <h4 data-i18n="foot_hubs">${escapeHtml(footerConfig.hubsTitle)}</h4>
                    <p class="footer-hubs-copy">
                        ${hubsHtml}
                    </p>
                </div>

                <div class="footer-col">
                    <h4 data-i18n="foot_partner">${escapeHtml(footerConfig.partnerTitle)}</h4>
                    <p data-i18n="foot_msa" class="footer-partner-text">${escapeHtml(footerConfig.partnerText)}</p>
                    <div class="social-icons footer-social">
                        <a href="#" class="footer-social-link"><i class="fab fa-linkedin"></i></a>
                        <a href="#" class="footer-social-link"><i class="fab fa-twitter"></i></a>
                        <a href="#" class="footer-social-link"><i class="fab fa-facebook"></i></a>
                    </div>
                </div>
            </div>

            <div class="footer-bottom footer-bottom-strip">
                <p>${footerConfig.copyrightText}</p>
            </div>
        </div>
    </footer>
    `;

    document.body.insertAdjacentHTML('beforeend', footerHTML);
});
