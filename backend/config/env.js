function requireEnv(key) {
  const value = process.env[key];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return String(value).trim();
}

function requireMany(keys) {
  const missing = keys.filter((key) => {
    const value = process.env[key];
    return !value || !String(value).trim();
  });

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function validateSecurityEnv() {
  const isProduction = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';

  requireMany(['JWT_SECRET', 'REFRESH_TOKEN_SECRET']);

  if (isProduction) {
    requireMany(['MONGO_URI', 'AUDIT_LOG_SIGNING_KEY', 'CORS_ALLOWED_ORIGINS']);
  }

  if (!process.env.AUDIT_LOG_SIGNING_KEY) {
    // Keep dev startup smooth but emit a clear warning.
    // eslint-disable-next-line no-console
    console.warn('Security warning: AUDIT_LOG_SIGNING_KEY is not set. Audit tamper-proof chain uses a weak fallback in development.');
  }
}

module.exports = {
  requireEnv,
  requireMany,
  validateSecurityEnv,
};
