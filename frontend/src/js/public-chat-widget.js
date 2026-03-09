(function initGemaPublicChatWidget() {
  if (document.body?.classList?.contains('admin-page')) return;
  if (document.getElementById('gema-public-chat-widget')) return;

  const SUPPORTED_LANGS = ['ar', 'en', 'de', 'zh', 'tr'];
  const I18N = {
    en: {
      title: 'GEMA Concierge',
      subtitle: 'Public Assistant',
      placeholder: 'Ask about sectors, products, pharmacies, export...',
      send: 'Send',
      leadTitle: 'Business / Export Request',
      leadName: 'Full name',
      leadWhatsapp: 'WhatsApp number',
      leadSubmit: 'Submit request',
      thinking: 'One moment, checking that for you...',
      unavailable: 'Service is temporarily unavailable. Please try again shortly.',
      hello: 'Welcome to GEMA. Ask me about our six sectors and available products.',
    },
    ar: {
      title: 'كونسيرج جيما',
      subtitle: 'مساعد الزوار',
      placeholder: 'اسأل عن القطاعات، المنتجات، الصيدليات، أو التصدير...',
      send: 'إرسال',
      leadTitle: 'طلب تجاري / تصدير',
      leadName: 'الاسم الكامل',
      leadWhatsapp: 'رقم واتساب',
      leadSubmit: 'إرسال الطلب',
      thinking: 'لحظة من فضلك، جاري التحقق...',
      unavailable: 'الخدمة غير متاحة حالياً. حاول مرة أخرى بعد قليل.',
      hello: 'أهلاً بك في جيما. اسألني عن قطاعاتنا الستة والمنتجات المتاحة.',
    }
  };

  const state = {
    pendingLeadMessage: '',
    isOpen: false,
  };

  function getLang() {
    const selected = String(localStorage.getItem('selectedLang') || 'en').trim().toLowerCase();
    return SUPPORTED_LANGS.includes(selected) ? selected : 'en';
  }

  function t(key) {
    const lang = getLang();
    return I18N[lang]?.[key] || I18N.en[key] || key;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function appendMessage(logNode, role, text, typing) {
    const roleClass = role === 'user' ? 'is-user' : 'is-ai';
    const typingClass = typing ? ' is-typing' : '';
    logNode.insertAdjacentHTML(
      'beforeend',
      `<div class="gema-chat-msg ${roleClass}${typingClass}">${escapeHtml(text)}</div>`
    );
    logNode.scrollTop = logNode.scrollHeight;
  }

  function removeTyping(logNode) {
    const typingNode = logNode.querySelector('.gema-chat-msg.is-ai.is-typing:last-child');
    if (typingNode) typingNode.remove();
  }

  function toggleLeadForm(shell, show) {
    const lead = shell.querySelector('#gema-public-lead');
    if (!lead) return;
    lead.style.display = show ? 'grid' : 'none';
  }

  async function callPublicChat(payload) {
    const response = await fetch('/api/ai/public-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Public chat request failed');
    }

    return response.json();
  }

  function mount() {
    const shell = document.createElement('section');
    shell.id = 'gema-public-chat-widget';
    shell.className = 'gema-public-chat';

    shell.innerHTML = `
      <style>
        .gema-public-chat {
          --gc-gold-1: #c89b3c;
          --gc-gold-2: #f6df9f;
          --gc-ink: #1f1b12;
          --gc-panel: rgba(24, 20, 12, 0.64);
          --gc-glass: rgba(255, 255, 255, 0.1);
          --gc-border: rgba(246, 223, 159, 0.38);
          --gc-text: #fff7de;
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 1200;
          font-family: 'Trebuchet MS', 'Segoe UI', sans-serif;
        }

        .gema-chat-toggle {
          border: 0;
          width: 58px;
          height: 58px;
          border-radius: 18px;
          cursor: pointer;
          color: #241b0a;
          font-size: 20px;
          background: linear-gradient(135deg, var(--gc-gold-1), var(--gc-gold-2));
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.34), 0 0 0 1px rgba(255, 246, 214, 0.3) inset;
          animation: gemaPulseIn 0.55s ease-out;
        }

        .gema-chat-panel {
          width: min(390px, calc(100vw - 28px));
          max-height: min(76vh, 640px);
          display: none;
          margin-top: 10px;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid var(--gc-border);
          background:
            radial-gradient(120% 140% at 0% 0%, rgba(246, 223, 159, 0.28), transparent 52%),
            radial-gradient(110% 120% at 100% 100%, rgba(200, 155, 60, 0.22), transparent 54%),
            var(--gc-panel);
          backdrop-filter: blur(14px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.38);
          transform: translateY(20px) scale(0.98);
          opacity: 0;
          transition: transform 220ms ease, opacity 220ms ease;
        }

        .gema-chat-panel.is-open {
          display: flex;
          flex-direction: column;
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .gema-chat-head {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.14);
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
          color: var(--gc-text);
        }

        .gema-chat-head h4 {
          margin: 0;
          font-family: Georgia, 'Times New Roman', serif;
          letter-spacing: 0.02em;
        }

        .gema-chat-head p {
          margin: 4px 0 0;
          font-size: 12px;
          opacity: 0.85;
        }

        .gema-chat-log {
          padding: 14px;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 220px;
          max-height: 380px;
        }

        .gema-chat-msg {
          max-width: 92%;
          padding: 10px 12px;
          border-radius: 14px;
          color: var(--gc-text);
          font-size: 14px;
          line-height: 1.45;
          white-space: pre-wrap;
          animation: gemaRise 160ms ease;
        }

        .gema-chat-msg.is-ai {
          background: rgba(255, 255, 255, 0.11);
          border: 1px solid rgba(255, 255, 255, 0.12);
          align-self: flex-start;
        }

        .gema-chat-msg.is-user {
          background: linear-gradient(130deg, rgba(200, 155, 60, 0.86), rgba(246, 223, 159, 0.7));
          color: var(--gc-ink);
          align-self: flex-end;
          border: 1px solid rgba(246, 223, 159, 0.58);
        }

        .gema-chat-form {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          padding: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          background: var(--gc-glass);
        }

        .gema-chat-form input {
          border: 1px solid rgba(246, 223, 159, 0.26);
          background: rgba(0, 0, 0, 0.22);
          color: var(--gc-text);
          border-radius: 12px;
          padding: 10px 12px;
          outline: none;
        }

        .gema-chat-form button,
        .gema-lead-form button {
          border: 0;
          border-radius: 12px;
          padding: 10px 14px;
          cursor: pointer;
          color: #261c08;
          font-weight: 700;
          background: linear-gradient(130deg, var(--gc-gold-1), var(--gc-gold-2));
        }

        .gema-lead-form {
          display: none;
          grid-template-columns: 1fr;
          gap: 8px;
          padding: 0 12px 12px;
        }

        .gema-lead-form h5 {
          margin: 6px 0 0;
          color: var(--gc-text);
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 13px;
          letter-spacing: 0.03em;
        }

        .gema-lead-form input {
          border: 1px solid rgba(246, 223, 159, 0.26);
          background: rgba(0, 0, 0, 0.22);
          color: var(--gc-text);
          border-radius: 12px;
          padding: 10px 12px;
          outline: none;
        }

        @keyframes gemaPulseIn {
          from { transform: scale(0.84); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes gemaRise {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @media (max-width: 640px) {
          .gema-public-chat {
            right: 10px;
            bottom: 10px;
          }

          .gema-chat-panel {
            width: min(95vw, 390px);
            border-radius: 18px;
            max-height: 74vh;
          }
        }
      </style>

      <button type="button" class="gema-chat-toggle" id="gema-public-toggle" aria-label="Open GEMA concierge">
        <span>G</span>
      </button>

      <div class="gema-chat-panel" id="gema-public-panel" aria-live="polite">
        <header class="gema-chat-head">
          <h4>${escapeHtml(t('title'))}</h4>
          <p>${escapeHtml(t('subtitle'))}</p>
        </header>

        <div class="gema-chat-log" id="gema-public-log">
          <div class="gema-chat-msg is-ai">${escapeHtml(t('hello'))}</div>
        </div>

        <form class="gema-chat-form" id="gema-public-form">
          <input id="gema-public-input" type="text" maxlength="1200" placeholder="${escapeHtml(t('placeholder'))}" />
          <button type="submit">${escapeHtml(t('send'))}</button>
        </form>

        <form class="gema-lead-form" id="gema-public-lead">
          <h5>${escapeHtml(t('leadTitle'))}</h5>
          <input id="gema-lead-name" type="text" maxlength="120" placeholder="${escapeHtml(t('leadName'))}" />
          <input id="gema-lead-whatsapp" type="text" maxlength="30" placeholder="${escapeHtml(t('leadWhatsapp'))}" />
          <button type="submit">${escapeHtml(t('leadSubmit'))}</button>
        </form>
      </div>
    `;

    document.body.appendChild(shell);

    const panel = shell.querySelector('#gema-public-panel');
    const toggle = shell.querySelector('#gema-public-toggle');
    const form = shell.querySelector('#gema-public-form');
    const input = shell.querySelector('#gema-public-input');
    const log = shell.querySelector('#gema-public-log');
    const leadForm = shell.querySelector('#gema-public-lead');
    const leadName = shell.querySelector('#gema-lead-name');
    const leadWhatsapp = shell.querySelector('#gema-lead-whatsapp');

    toggle.addEventListener('click', function onToggle() {
      state.isOpen = !state.isOpen;
      panel.classList.toggle('is-open', state.isOpen);
      if (state.isOpen) {
        setTimeout(function focusInput() {
          input.focus();
        }, 120);
      }
    });

    form.addEventListener('submit', async function onSubmit(event) {
      event.preventDefault();
      const message = String(input.value || '').trim();
      if (!message) return;

      appendMessage(log, 'user', message, false);
      input.value = '';
      appendMessage(log, 'ai', t('thinking'), true);

      try {
        const payload = await callPublicChat({
          message: message,
          lang: getLang(),
        });

        removeTyping(log);
        appendMessage(log, 'ai', String(payload?.reply || t('unavailable')), false);

        if (payload?.captureRequired) {
          state.pendingLeadMessage = message;
          toggleLeadForm(shell, true);
        } else {
          toggleLeadForm(shell, false);
        }
      } catch (_) {
        removeTyping(log);
        appendMessage(log, 'ai', t('unavailable'), false);
      }
    });

    leadForm.addEventListener('submit', async function onLeadSubmit(event) {
      event.preventDefault();
      const fullName = String(leadName.value || '').trim();
      const whatsapp = String(leadWhatsapp.value || '').trim();

      if (!fullName || !whatsapp || !state.pendingLeadMessage) return;

      appendMessage(log, 'user', `${fullName} | WhatsApp: ${whatsapp}`, false);
      appendMessage(log, 'ai', t('thinking'), true);

      try {
        const payload = await callPublicChat({
          message: state.pendingLeadMessage,
          lang: getLang(),
          lead: { fullName: fullName, whatsapp: whatsapp },
        });

        removeTyping(log);
        appendMessage(log, 'ai', String(payload?.reply || t('unavailable')), false);

        state.pendingLeadMessage = '';
        leadName.value = '';
        leadWhatsapp.value = '';
        toggleLeadForm(shell, false);
      } catch (_) {
        removeTyping(log);
        appendMessage(log, 'ai', t('unavailable'), false);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
