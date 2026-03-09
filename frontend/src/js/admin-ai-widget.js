(function initGemaAdminAiWidget() {
  const SUPPORTED_LANGS = ['ar', 'en', 'de', 'zh', 'tr'];
  const I18N = {
    en: {
      title: 'GEMA Assistant',
      subtitle: 'Admin AI Copilot',
      placeholder: 'Ask about leads, audits, operations...',
      send: 'Send',
      thinking: 'Analyzing your request...',
      empty: 'Ask a question to start.',
      unavailable: 'AI service is currently unavailable.',
      boot: 'GEMA_Assistant online. How can I support your operations today?'
    },
    ar: {
      title: 'مساعد جيما',
      subtitle: 'مساعد إداري ذكي',
      placeholder: 'اسأل عن العملاء المحتملين، التدقيق، والعمليات...',
      send: 'إرسال',
      thinking: 'جاري تحليل طلبك...',
      empty: 'ابدأ بكتابة سؤالك.',
      unavailable: 'خدمة الذكاء الاصطناعي غير متاحة حالياً.',
      boot: 'مساعد جيما جاهز. كيف يمكنني دعم عملياتك اليوم؟'
    },
    de: {
      title: 'GEMA Assistent',
      subtitle: 'Admin KI-Copilot',
      placeholder: 'Fragen Sie zu Leads, Audit oder Betrieb...',
      send: 'Senden',
      thinking: 'Ihre Anfrage wird analysiert...',
      empty: 'Stellen Sie eine Frage, um zu beginnen.',
      unavailable: 'KI-Dienst ist derzeit nicht verfugbar.',
      boot: 'GEMA_Assistant ist online. Wie kann ich Ihre Ablaufe heute unterstutzen?'
    },
    zh: {
      title: 'GEMA 助手',
      subtitle: '管理 AI 副驾',
      placeholder: '询问线索、审计或运营问题...',
      send: '发送',
      thinking: '正在分析你的请求...',
      empty: '请输入你的问题。',
      unavailable: 'AI 服务当前不可用。',
      boot: 'GEMA_Assistant 已上线。今天我可以如何支持你的运营？'
    },
    tr: {
      title: 'GEMA Asistani',
      subtitle: 'Yonetici AI Copilot',
      placeholder: 'Lead, denetim veya operasyon sorun...',
      send: 'Gonder',
      thinking: 'Talebiniz analiz ediliyor...',
      empty: 'Baslamak icin bir soru sorun.',
      unavailable: 'AI servisi su anda kullanilamiyor.',
      boot: 'GEMA_Assistant aktif. Bugun operasyonlarinizi nasil destekleyebilirim?'
    }
  };

  function getLang() {
    const fromAdmin = String(document.getElementById('admin-language-select')?.value || '').trim();
    const fromAdminStorage = String(localStorage.getItem('GEMA_admin_ui_lang') || '').trim();
    const fromSiteStorage = String(localStorage.getItem('selectedLang') || 'en').trim();
    const resolved = fromAdmin || fromAdminStorage || fromSiteStorage || 'en';
    return SUPPORTED_LANGS.includes(resolved) ? resolved : 'en';
  }

  function t(key) {
    const lang = getLang();
    return I18N[lang]?.[key] || I18N.en[key] || key;
  }

  function getToken() {
    return (
      localStorage.getItem('token')
      || localStorage.getItem('GEMA_token')
      || sessionStorage.getItem('GEMA_token')
      || ''
    );
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function appendMessage(logNode, role, text, typing = false) {
    const cls = role === 'user' ? 'admin-ai-msg user' : 'admin-ai-msg ai';
    const typingClass = typing ? ' is-typing' : '';
    logNode.insertAdjacentHTML('beforeend', `<div class="${cls}${typingClass}">${escapeHtml(text)}</div>`);
    logNode.scrollTop = logNode.scrollHeight;
  }

  function mountWidget() {
    if (document.body.classList.contains('admin-page') === false) return;
    if (document.getElementById('admin-ai-widget')) return;

    const shell = document.createElement('div');
    shell.id = 'admin-ai-widget';
    shell.className = 'admin-ai-widget is-hidden';
    shell.innerHTML = `
      <button type="button" id="admin-ai-toggle" class="admin-ai-toggle" aria-label="Open GEMA Assistant">
        <i class="fas fa-robot"></i>
      </button>
      <section class="admin-ai-panel" id="admin-ai-panel" aria-live="polite">
        <header class="admin-ai-head">
          <div>
            <h4 id="admin-ai-title">${t('title')}</h4>
            <p id="admin-ai-subtitle">${t('subtitle')}</p>
          </div>
          <button type="button" id="admin-ai-close" class="admin-ai-close" aria-label="Close">&times;</button>
        </header>
        <div class="admin-ai-log" id="admin-ai-log">
          <div class="admin-ai-msg ai">${escapeHtml(t('boot'))}</div>
        </div>
        <form id="admin-ai-form" class="admin-ai-form">
          <input id="admin-ai-input" type="text" maxlength="1200" placeholder="${escapeHtml(t('placeholder'))}" />
          <button type="submit" id="admin-ai-send">${escapeHtml(t('send'))}</button>
        </form>
      </section>
    `;

    document.body.appendChild(shell);

    const panel = shell.querySelector('#admin-ai-panel');
    const toggle = shell.querySelector('#admin-ai-toggle');
    const closeBtn = shell.querySelector('#admin-ai-close');
    const form = shell.querySelector('#admin-ai-form');
    const input = shell.querySelector('#admin-ai-input');
    const log = shell.querySelector('#admin-ai-log');

    function refreshLabels() {
      const title = shell.querySelector('#admin-ai-title');
      const subtitle = shell.querySelector('#admin-ai-subtitle');
      const send = shell.querySelector('#admin-ai-send');
      if (title) title.textContent = t('title');
      if (subtitle) subtitle.textContent = t('subtitle');
      if (send) send.textContent = t('send');
      if (input) input.placeholder = t('placeholder');
    }

    function openPanel() {
      shell.classList.remove('is-hidden');
      panel.classList.add('is-open');
      setTimeout(() => input.focus(), 120);
    }

    function closePanel() {
      panel.classList.remove('is-open');
    }

    toggle.addEventListener('click', () => {
      if (panel.classList.contains('is-open')) {
        closePanel();
      } else {
        openPanel();
      }
    });

    closeBtn.addEventListener('click', closePanel);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = String(input.value || '').trim();
      if (!message) return;

      const token = getToken();
      if (!token) {
        appendMessage(log, 'ai', t('unavailable'));
        return;
      }

      appendMessage(log, 'user', message);
      input.value = '';
      appendMessage(log, 'ai', t('thinking'), true);

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ message, lang: getLang() })
        });

        const typingNode = log.querySelector('.admin-ai-msg.ai.is-typing:last-child');
        if (typingNode) typingNode.remove();

        if (!response.ok) {
          appendMessage(log, 'ai', t('unavailable'));
          return;
        }

        const payload = await response.json();
        const reply = String(payload?.reply || '').trim() || t('unavailable');
        appendMessage(log, 'ai', reply);
      } catch (_) {
        const typingNode = log.querySelector('.admin-ai-msg.ai.is-typing:last-child');
        if (typingNode) typingNode.remove();
        appendMessage(log, 'ai', t('unavailable'));
      }
    });

    const langSelect = document.getElementById('admin-language-select');
    if (langSelect) {
      langSelect.addEventListener('change', refreshLabels);
    }

    window.addEventListener('storage', refreshLabels);
    refreshLabels();
  }

  function monitorAuthAndMount() {
    mountWidget();
    const observer = new MutationObserver(() => {
      const shell = document.getElementById('admin-ai-widget');
      if (!shell) return;
      const isAuthenticated = document.body.classList.contains('authenticated');
      shell.style.display = isAuthenticated ? 'block' : 'none';
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const shell = document.getElementById('admin-ai-widget');
    if (shell) {
      shell.style.display = document.body.classList.contains('authenticated') ? 'block' : 'none';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', monitorAuthAndMount);
  } else {
    monitorAuthAndMount();
  }
})();
