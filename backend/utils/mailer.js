const nodemailer = require('nodemailer');

function toBool(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function buildTransportConfig() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number.parseInt(String(process.env.SMTP_PORT || '587').trim(), 10);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
  const secure = toBool(process.env.SMTP_SECURE, false);

  if (!host || !Number.isFinite(port) || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass }
  };
}

function getMailerFrom() {
  const from = String(process.env.SMTP_FROM || '').trim();
  if (from) return from;
  const user = String(process.env.SMTP_USER || '').trim();
  return user || 'noreply@gema.local';
}

async function sendRealEmail({ to, subject, text, html }) {
  const transportConfig = buildTransportConfig();
  if (!transportConfig) {
    // Non-blocking test mode fallback: avoid crashing server flows when SMTP is not set.
    // eslint-disable-next-line no-console
    console.warn('[Warning] SMTP is not configured. Returning placeholder email response.');
    return {
      accepted: Array.isArray(to) ? to : [String(to || '').trim()].filter(Boolean),
      rejected: [],
      envelope: {
        from: getMailerFrom(),
        to: Array.isArray(to) ? to : [String(to || '').trim()].filter(Boolean)
      },
      messageId: 'placeholder-smtp-message-id',
      response: 'SMTP placeholder response (delivery skipped in test mode).',
      placeholder: true,
      subject: String(subject || '').trim(),
      text: String(text || '').trim(),
      html: String(html || '').trim()
    };
  }

  const transporter = nodemailer.createTransport(transportConfig);
  return transporter.sendMail({
    from: getMailerFrom(),
    to,
    subject,
    text,
    html
  });
}

module.exports = {
  sendRealEmail
};
