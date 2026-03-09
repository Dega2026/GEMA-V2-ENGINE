/* ==========================================================================
   GEMA GLOBAL - PUBLIC PRODUCTS ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 GEMA Public Engine: Initializing Supply Chain...");
    fetchPublicProducts(); // نده الداتا أول ما الصفحة تفتح
});

// دالة جلب المنتجات من الداتابيز
async function fetchPublicProducts() {
    const productsGrid = document.getElementById("public-products-grid");
    if (!productsGrid) return;

    // حالة التحميل (Loading)
    productsGrid.innerHTML = `<div class="loader-container" data-i18n="prod_loading">Loading the future...</div>`;

    try {
        const response = await fetch('/api/products');
        const products = await response.json();

        const formatMoney = (value, currency) => {
            const amount = Number(value);
            if (!Number.isFinite(amount) || amount <= 0) return 'Price on request';
            return `${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${String(currency || 'USD').toUpperCase()}`;
        };

        // لو الداتابيز فاضية
        if (!products || products.length === 0) {
            productsGrid.innerHTML = `<p class="no-data" data-i18n="prod_no_found">No products in the empire yet...</p>`;
            return;
        }

        // بناء الكروت (The Grid Logic)
        productsGrid.innerHTML = products.map(product => {
            const imagePath = typeof product?.imagePath === 'string' && product.imagePath.trim().length > 0
                ? product.imagePath.trim()
                : (typeof product?.image === 'string' && product.image.trim().length > 0
                    ? product.image.trim()
                    : '/assets/images/sectors/products.jpg');

            return `
            <div class="product-card" data-aos="fade-up">
                <div class="product-img-wrapper">
                    <img src="${imagePath}" alt="${product.name}" class="product-img">
                    <div class="product-tag">${product.category}</div>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-desc">${product.description}</p>
                    <p class="product-price-chip"><i class="fas fa-tag"></i> ${formatMoney(product.price, product.currency)}</p>
                    <a href="/product/${product._id}" class="view-details-btn">
                        <span data-i18n="prod_btn_specs">EXPLORE SPECS</span>
                        <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        `;
        }).join("");

        // نده دالة الترجمة عشان تعرّب الكروت لو اللغة عربي
        if (typeof setLanguage === "function") {
            const currentLang = localStorage.getItem("selectedLang") || "en";
            setLanguage(currentLang); 
        }

    } catch (err) {
        console.error("GEMA Engine Error:", err);
        productsGrid.innerHTML = `<p class="error-msg" data-i18n="prod_error">System Error: Check Connection.</p>`;
    }
}