(function initApiConfig() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  // Update this single value when moving backend from localhost to Render.
  if (typeof window.GEMA_API_BASE_URL !== 'string') {
    window.GEMA_API_BASE_URL = 'http://localhost:5000';
  }

  if (window.__GEMA_FETCH_API_PATCHED__) return;

  const nativeFetch = window.fetch.bind(window);
  window.__GEMA_FETCH_API_PATCHED__ = true;

  window.fetch = function patchedFetch(input, init) {
    if (typeof input === 'string' && input.startsWith('/api')) {
      const base = String(window.GEMA_API_BASE_URL || '').trim().replace(/\/+$/, '');
      const target = base ? `${base}${input}` : input;
      return nativeFetch(target, init);
    }

    return nativeFetch(input, init);
  };
})();
