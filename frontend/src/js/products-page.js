async function fetchProductsPage() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const ALLOWED_SECTORS = ['Equipment', 'RawMaterial', 'Component', 'Cosmetic'];
  const ALLOWED_ORIGINS = ['Internal', 'Commercial'];

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const sanitizeHref = (value, fallback = '#') => {
    const href = String(value || '').trim();
    if (!href) return fallback;
    if (href.startsWith('/') || href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }
    return fallback;
  };

  const normalizeRole = (value) => {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'superadmin' || raw === 'super_admin') return 'SuperAdmin';
    if (raw === 'operationsadmin' || raw === 'operations_admin') return 'OperationsAdmin';
    if (raw === 'productadmin' || raw === 'product_admin') return 'ProductAdmin';
    if (raw === 'engineeringops' || raw === 'engineering_ops') return 'EngineeringOps';
    return value || '';
  };

  const resolveViewerRole = () => {
    const directRole = normalizeRole(
      localStorage.getItem('userRole')
      || localStorage.getItem('GEMA_user_role')
      || sessionStorage.getItem('GEMA_user_role')
    );
    if (directRole) return directRole;

    const token = String(localStorage.getItem('token') || localStorage.getItem('GEMA_token') || sessionStorage.getItem('GEMA_token') || '');
    if (!token || token.split('.').length !== 3) return '';

    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return normalizeRole(payload?.role || '');
    } catch (_) {
      return '';
    }
  };

  const canViewFinancialData = ['SuperAdmin', 'OperationsAdmin', 'ProductAdmin'].includes(resolveViewerRole());

  grid.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="gema-card skeleton-card" aria-hidden="true">
      <div class="skeleton-media"></div>
      <div class="card-content">
        <div class="skeleton-line skeleton-line-sm"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-line-btn"></div>
      </div>
    </div>
  `).join('');

  try {
    const searchParams = new URLSearchParams(window.location.search || '');
    const requestedSector = String(searchParams.get('sector') || '').trim();
    const requestedOrigin = String(searchParams.get('origin') || '').trim();
    const apiParams = new URLSearchParams();

    if (ALLOWED_SECTORS.includes(requestedSector)) {
      apiParams.set('sector', requestedSector);
    }

    if (ALLOWED_ORIGINS.includes(requestedOrigin)) {
      apiParams.set('origin', requestedOrigin);
    }

    const endpoint = apiParams.toString() ? `/api/products?${apiParams.toString()}` : '/api/products';
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Network response was not ok');

    const products = await response.json();

    grid.innerHTML = '';

    if (!products.length) {
      const hasActiveFilter = Boolean(apiParams.toString());
      grid.innerHTML = hasActiveFilter
        ? '<p class="section-desc products-msg">No products match these filters.</p>'
        : '<p class="section-desc products-msg" data-i18n="prod_no_found">No products found in the empire yet...</p>';
      return;
    }

    const formatMoney = (value, currency) => {
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount <= 0) return 'Price on request';
      const safeCurrency = String(currency || 'USD').toUpperCase();
      return `${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${safeCurrency}`;
    };

    products.forEach((product) => {
      const productImage = typeof product?.imagePath === 'string' && product.imagePath.trim()
        ? product.imagePath.trim()
        : (typeof product?.image === 'string' && product.image.trim()
          ? product.image.trim()
          : '/assets/images/sectors/products.jpg');

      const partnerPharmacies = Array.isArray(product?.partnerPharmacies)
        ? product.partnerPharmacies.filter((item) => item && typeof item === 'object')
        : [];

      const availableAtHtml = partnerPharmacies.length
        ? `
          <div class="available-at-block">
            <p class="available-at-title" data-i18n="prod_available_at">Available At</p>
            <div class="partner-holo-strip">
              ${partnerPharmacies.map((partner) => {
                const logo = typeof partner.logo === 'string' && partner.logo.trim()
                  ? sanitizeHref(partner.logo, '/assets/branding/logo-GEMA.png')
                  : '/assets/branding/logo-GEMA.png';
                const name = escapeHtml(partner.name || 'Partner Pharmacy');
                const slug = String(partner.slug || '').trim();
                const url = sanitizeHref(partner.landingPageUrl || (slug ? `/pharmacy/${encodeURIComponent(slug)}` : '#'), '#');

                return `
                  <a href="${url}" class="partner-holo-pill" title="${name}">
                    <img src="${logo}" alt="${name}" loading="lazy" />
                  </a>
                `;
              }).join('')}
            </div>
          </div>
        `
        : '';

      grid.innerHTML += `
        <div class="gema-card" data-aos="fade-up">
          <div class="card-image product-card-image lazy-bg" data-bg-image="${encodeURI(productImage)}"></div>
          <div class="card-content">
            <span class="category-tag">${escapeHtml(product.category)}</span>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.description)}</p>
            ${canViewFinancialData ? `<p class="product-price-chip"><i class="fas fa-tag"></i> ${formatMoney(product.price, product.currency)}</p>` : ''}
            ${availableAtHtml}
            <div class="card-footer product-card-footer">
              <a href="/product/${product._id}" class="btn-gold product-card-btn" data-i18n="prod_btn_specs">EXPLORE SPECS</a>
              <i class="fas fa-microchip product-card-icon"></i>
            </div>
          </div>
        </div>`;
    });

    const bgNodes = Array.from(grid.querySelectorAll('.product-card-image[data-bg-image]'));
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const node = entry.target;
          const bg = node.getAttribute('data-bg-image') || '';
          if (bg) node.style.backgroundImage = `url('${bg}')`;
          node.classList.remove('lazy-bg');
          obs.unobserve(node);
        });
      }, { rootMargin: '150px 0px' });

      bgNodes.forEach((node) => observer.observe(node));
    } else {
      bgNodes.forEach((node) => {
        const bg = node.getAttribute('data-bg-image') || '';
        if (bg) node.style.backgroundImage = `url('${bg}')`;
        node.classList.remove('lazy-bg');
      });
    }

    if (typeof setLanguage === 'function') {
      setLanguage(localStorage.getItem('selectedLang') || 'en');
    }
  } catch (error) {
    if (grid) {
      grid.innerHTML = '<p class="products-msg products-msg-error" data-i18n="prod_error">System Error: Please check database.</p>';
    }
  }
}

window.addEventListener('DOMContentLoaded', fetchProductsPage);
