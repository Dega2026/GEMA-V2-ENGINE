document.addEventListener('DOMContentLoaded', () => {
  const pageContainer = document.querySelector('.content-wrapper') || document.body;
  if (!pageContainer || document.querySelector('[data-component="sidebar-map"]')) {
    return;
  }

  const worldConfig = [
    {
      key: 'mfg',
      icon: 'fa-industry',
      titleKey: 'smap_world_mfg_title',
      descKey: 'smap_world_mfg_desc',
      links: [
        { key: 'smap_link_mfg_equipment', href: '/products?origin=Internal&sector=Equipment' },
        { key: 'smap_link_mfg_raw', href: '/products?origin=Internal&sector=RawMaterial' },
        { key: 'smap_link_mfg_component', href: '/products?origin=Internal&sector=Component' }
      ]
    },
    {
      key: 'trade',
      icon: 'fa-earth-africa',
      titleKey: 'smap_world_trade_title',
      descKey: 'smap_world_trade_desc',
      links: [
        { key: 'smap_link_trade_raw', href: '/products?origin=Commercial&sector=RawMaterial' },
        { key: 'smap_link_trade_component', href: '/products?origin=Commercial&sector=Component' },
        { key: 'smap_link_trade_cosmetic', href: '/products?origin=Commercial&sector=Cosmetic' }
      ]
    },
    {
      key: 'partners',
      icon: 'fa-clinic-medical',
      titleKey: 'smap_world_partners_title',
      descKey: 'smap_world_partners_desc',
      links: [
        { key: 'smap_link_partner_nahdi', href: '/pharmacy/alnahdi' },
        { key: 'smap_link_partner_aldawaa', href: '/pharmacy/aldawaa' },
        { key: 'smap_link_partner_cosmo', href: '/pharmacy/cosmo-care' }
      ]
    },
    {
      key: 'admin',
      icon: 'fa-shield-halved',
      titleKey: 'smap_world_admin_title',
      descKey: 'smap_world_admin_desc',
      links: [
        { key: 'smap_link_admin_dashboard', href: '/admin' },
        { key: 'smap_link_admin_audit', href: '/api/audit' },
        { key: 'smap_link_admin_leads', href: '/api/leads' }
      ]
    }
  ];

  const normalizeRole = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'superadmin' || raw === 'super_admin' || raw === 'admin') return 'SuperAdmin';
    if (raw === 'operationsadmin' || raw === 'operations_admin') return 'OperationsAdmin';
    if (raw === 'engineer') return 'Engineer';
    if (raw === 'engineeringops' || raw === 'engineering_ops') return 'EngineeringOps';
    if (raw === 'productadmin' || raw === 'product_admin') return 'ProductAdmin';
    return value || '';
  };

  const normalizeDepartment = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'medical') return 'Medical';
    if (raw === 'industrial') return 'Industrial';
    if (raw === 'sourcing') return 'Sourcing';
    if (raw === 'logistics') return 'Logistics';
    return '';
  };

  const resolveContext = () => {
    const role = normalizeRole(
      localStorage.getItem('userRole')
      || localStorage.getItem('GEMA_user_role')
      || sessionStorage.getItem('GEMA_user_role')
    );
    const department = normalizeDepartment(
      localStorage.getItem('GEMA_user_department')
      || sessionStorage.getItem('GEMA_user_department')
    );
    return { role, department };
  };

  const { role, department } = resolveContext();

  const visibleKeys = (() => {
    if (role === 'SuperAdmin' || role === 'OperationsAdmin') {
      return ['mfg', 'trade', 'partners', 'admin'];
    }
    if (role === 'Engineer' || role === 'EngineeringOps') {
      return ['mfg'];
    }
    if (department === 'Sourcing' || department === 'Logistics') {
      return ['trade'];
    }
    if (role === 'ProductAdmin') {
      return ['mfg', 'trade', 'partners'];
    }
    return ['mfg', 'trade', 'partners'];
  })();

  const visibleWorlds = worldConfig.filter((world) => visibleKeys.includes(world.key));

  const worldCards = visibleWorlds
    .map((world) => {
      const links = world.links
        .map((link) => `
          <li>
            <a href="${link.href}" class="sidebar-map-link" data-route="${link.href}" data-i18n="${link.key}">${link.key}</a>
          </li>
        `)
        .join('');

      return `
        <article class="sidebar-map-world" data-world="${world.key}">
          <header class="sidebar-map-world-head">
            <i class="fas ${world.icon}" aria-hidden="true"></i>
            <h3 data-i18n="${world.titleKey}">${world.titleKey}</h3>
          </header>
          <p class="sidebar-map-world-desc" data-i18n="${world.descKey}">${world.descKey}</p>
          <ul class="sidebar-map-links">${links}</ul>
        </article>
      `;
    })
    .join('');

  const sidebarMapHTML = `
    <aside class="sidebar-map" data-component="sidebar-map" aria-label="GEMA Sidebar Map">
      <div class="sidebar-map-overlay"></div>
      <div class="sidebar-map-inner">
        <h2 class="sidebar-map-title" data-i18n="smap_title">smap_title</h2>
        <p class="sidebar-map-subtitle" data-i18n="smap_subtitle">smap_subtitle</p>
        <div class="sidebar-map-worlds">
          ${worldCards}
        </div>
      </div>
    </aside>
  `;

  pageContainer.insertAdjacentHTML('afterbegin', sidebarMapHTML);

  const resolveTranslationsMap = () => {
    if (typeof translations === 'object' && translations) {
      return translations;
    }
    if (typeof window.translations === 'object' && window.translations) {
      return window.translations;
    }
    return null;
  };

  const applySidebarLanguage = (lang) => {
    const selectedLang = String(lang || localStorage.getItem('selectedLang') || 'en').trim().toLowerCase() || 'en';
    const translationMap = resolveTranslationsMap();
    if (!translationMap) return;

    const langDict = translationMap[selectedLang] || translationMap.en || {};
    const enDict = translationMap.en || {};

    pageContainer
      .querySelectorAll('[data-component="sidebar-map"] [data-i18n]')
      .forEach((element) => {
        const key = element.getAttribute('data-i18n');
        const translatedValue = langDict[key] ?? enDict[key];
        if (translatedValue !== undefined) {
          element.innerHTML = translatedValue;
        }
      });
  };

  applySidebarLanguage(localStorage.getItem('selectedLang') || 'en');

  // One-time translation pass only to avoid any language-event recursion.
});
