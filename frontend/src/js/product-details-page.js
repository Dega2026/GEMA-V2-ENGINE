// Compatibility shim: product details loading is handled in main.js.
window.addEventListener('DOMContentLoaded', async () => {
  if (typeof window.loadProductDetails === 'function') {
    await window.loadProductDetails();
  }
});
