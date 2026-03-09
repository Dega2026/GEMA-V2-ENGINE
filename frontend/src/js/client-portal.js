(async function loadClientPortal() {
  const state = document.getElementById('portal-state');
  const card = document.getElementById('portal-card');

  function showError(message) {
    if (state) state.textContent = `Access issue: ${message}`;
    if (card) card.style.display = 'none';
  }

  try {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const token = parts.length ? parts[parts.length - 1] : '';

    if (!token) {
      showError('Missing token');
      return;
    }

    const res = await fetch(`/api/portal/public/${encodeURIComponent(token)}`);
    const payload = await res.json();

    if (!res.ok || !payload.success) {
      showError(payload.message || 'Unable to load report');
      return;
    }

    const data = payload.data || {};
    const report = data.report || {};

    document.getElementById('report-subject').textContent = report.subject || '-';
    document.getElementById('report-module').textContent = `Module: ${report.relatedModule || '-'}`;
    document.getElementById('report-specialty').textContent = `Specialty: ${report.specialty || '-'}`;
    document.getElementById('report-status').textContent = `Status: ${report.status || '-'}`;

    const dateSource = report.sentAt || report.createdAt;
    const dateText = dateSource ? new Date(dateSource).toLocaleString() : '-';
    document.getElementById('report-date').textContent = `Date: ${dateText}`;

    document.getElementById('report-client').textContent = `Client: ${data.clientName || '-'} (${data.clientEmail || '-'})`;
    document.getElementById('report-message').textContent = report.message || '-';

    if (state) state.textContent = 'Secure report loaded successfully.';
    if (card) card.style.display = 'block';
  } catch (error) {
    showError(error.message || 'Unexpected error');
  }
})();
