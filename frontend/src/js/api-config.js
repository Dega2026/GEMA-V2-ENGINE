(function initApiConfig() {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  // تم التعديل من localhost لرابط ريندر الرسمي الخاص بك
  if (typeof window.GEMA_API_BASE_URL !== 'string') {
    window.GEMA_API_BASE_URL = 'https://gema-v2-backend.onrender.com';
  }

  // Backward-compatible alias for scripts expecting API_BASE_URL.
  window.API_BASE_URL = String(window.GEMA_API_BASE_URL || '').trim().replace(/\/+$/, '');

  if (window.__GEMA_FETCH_API_PATCHED__) return;

  const nativeFetch = window.fetch.bind(window);
  window.__GEMA_FETCH_API_PATCHED__ = true;

  const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  function getAuthToken() {
    return (
      sessionStorage.getItem('GEMA_token')
      || localStorage.getItem('GEMA_token')
      || localStorage.getItem('token')
      || ''
    );
  }

  window.fetch = function patchedFetch(input, init) {
    const requestInit = init ? { ...init } : {};
    const method = String(requestInit.method || 'GET').toUpperCase();

    if (typeof input === 'string' && input.startsWith('/api')) {
      const base = String(window.GEMA_API_BASE_URL || '').trim().replace(/\/+$/, '');
      const target = base ? `${base}${input}` : input;

      if (WRITE_METHODS.has(method)) {
        const headers = new Headers(requestInit.headers || {});
        const token = getAuthToken();
        if (token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        requestInit.headers = headers;
      }

      return nativeFetch(target, requestInit);
    }

    return nativeFetch(input, requestInit);
  };
})();
