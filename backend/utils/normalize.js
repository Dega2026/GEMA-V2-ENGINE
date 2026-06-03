const SUPPORTED_LANGUAGES = ['ar', 'en', 'de', 'zh', 'tr'];
const ALLOWED_CURRENCIES = ['USD', 'EGP'];

function normalizeEnum(value, allowedValues, fallback) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return allowedValues.includes(raw) ? raw : fallback;
}

function normalizeText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function normalizePrice(value) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return amount;
}

function normalizeCurrency(value) {
  const raw = String(value || '').trim().toUpperCase();
  return ALLOWED_CURRENCIES.includes(raw) ? raw : 'EGP';
}

module.exports = {
  SUPPORTED_LANGUAGES,
  ALLOWED_CURRENCIES,
  normalizeEnum,
  normalizeText,
  normalizePrice,
  normalizeCurrency
};
