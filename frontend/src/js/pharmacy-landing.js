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

function getSlugFromPath() {
  const path = String(window.location.pathname || '').replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
  if (parts.length >= 2 && parts[0] === 'pharmacy') {
    return parts[1];
  }
  return '';
}

async function loadPharmacyLanding() {
  const root = document.getElementById('pharmacy-landing-root');
  if (!root) return;

  const slug = getSlugFromPath();
  if (!slug) {
    root.innerHTML = '<p class="products-msg products-msg-error" data-i18n="phrm_not_found">Partner pharmacy not found.</p>';
    if (typeof setLanguage === 'function') setLanguage(localStorage.getItem('selectedLang') || 'en');
    return;
  }

  try {
    const response = await fetch(`/api/pharmacies/${encodeURIComponent(slug)}`);
    if (!response.ok) {
      if (response.status === 404) {
        root.innerHTML = '<p class="products-msg products-msg-error" data-i18n="phrm_not_found">Partner pharmacy not found.</p>';
      } else {
        root.innerHTML = '<p class="products-msg products-msg-error" data-i18n="phrm_error">Unable to load pharmacy profile right now.</p>';
      }
      if (typeof setLanguage === 'function') setLanguage(localStorage.getItem('selectedLang') || 'en');
      return;
    }

    const payload = await response.json();
    const pharmacy = payload?.data;
    const approvedProducts = Array.isArray(pharmacy?.approvedProducts) ? pharmacy.approvedProducts : [];
    const safeLogo = sanitizeHref(pharmacy?.logo, '/assets/branding/logo-GEMA.png');
    const safeName = escapeHtml(pharmacy?.name || 'Pharmacy Partner');

    const productsHtml = approvedProducts.length
      ? approvedProducts.map((product) => {
          const productImage = typeof product?.imagePath === 'string' && product.imagePath.trim()
            ? sanitizeHref(product.imagePath, '/assets/images/sectors/products.jpg')
            : sanitizeHref(product?.image, '/assets/images/sectors/products.jpg');

          return `
            <article class="pharmacy-product-card">
              <div class="pharmacy-product-thumb" style="background-image:url('${encodeURI(productImage)}')"></div>
              <div class="pharmacy-product-info">
                <h4>${escapeHtml(product?.name || '')}</h4>
                <p>${escapeHtml(product?.description || '')}</p>
                <a class="btn-outline" href="/product/${encodeURIComponent(product?._id || '')}" data-i18n="prod_btn_specs">EXPLORE SPECS</a>
              </div>
            </article>
          `;
        }).join('')
      : '<p class="products-msg" data-i18n="phrm_no_products">No approved products available for this pharmacy yet.</p>';

    root.innerHTML = `
      <header class="pharmacy-hero">
        <div class="pharmacy-logo">
          <img src="${safeLogo}" alt="${safeName}" loading="lazy" />
        </div>
        <div>
          <p class="pharmacy-eyebrow" data-i18n="phrm_badge">Healthcare Partner</p>
          <h1 class="pharmacy-name">${safeName}</h1>
        </div>
      </header>

      <h2 class="pharmacy-products-title" data-i18n="phrm_products_title">Approved GEMA Products</h2>
      <section class="pharmacy-products-grid">${productsHtml}</section>
    `;

    if (typeof setLanguage === 'function') {
      setLanguage(localStorage.getItem('selectedLang') || 'en');
    }
  } catch (_) {
    root.innerHTML = '<p class="products-msg products-msg-error" data-i18n="phrm_error">Unable to load pharmacy profile right now.</p>';
    if (typeof setLanguage === 'function') setLanguage(localStorage.getItem('selectedLang') || 'en');
  }
}

document.addEventListener('DOMContentLoaded', loadPharmacyLanding);
