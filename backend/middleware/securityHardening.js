const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { appendSecurityLog, getClientIp } = require('../utils/securityLogger');

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function parseCsv(raw) {
  return String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeIp(ip) {
  const value = String(ip || '').trim().toLowerCase();
  if (!value) return '';
  if (value === '::1') return '127.0.0.1';
  if (value.startsWith('::ffff:')) return value.replace('::ffff:', '');
  return value;
}

function isTruthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function isSecurityBypassed() {
  if (!isTruthy(process.env.BYPASS_SECURITY)) return false;
  const env = String(process.env.NODE_ENV || '').trim().toLowerCase();
  return env !== 'production';
}

function getDeveloperIpAllowList() {
  const defaults = ['127.0.0.1', '::1', '::ffff:127.0.0.1', '192.168.1.10'];
  const configured = parseCsv(process.env.DEV_IP_WHITELIST);
  const all = configured.length ? configured : defaults;
  return new Set(all.map((ip) => normalizeIp(ip)).filter(Boolean));
}

function isDeveloperIp(req) {
  const current = normalizeIp(getClientIp(req));
  if (!current) return false;
  return getDeveloperIpAllowList().has(current);
}

function shouldSkipSecurity(req) {
  return isSecurityBypassed() || isDeveloperIp(req);
}

function isNgrokRequest(req) {
  const host = String(req.headers?.host || '').toLowerCase();
  const origin = String(req.headers?.origin || '').toLowerCase();
  const referer = String(req.headers?.referer || '').toLowerCase();
  const forwardedHost = String(req.headers?.['x-forwarded-host'] || '').toLowerCase();

  const combined = `${host} ${origin} ${referer} ${forwardedHost}`;
  return combined.includes('ngrok-free.app') || combined.includes('ngrok.io');
}

function buildCorsOptions() {
  return {
    origin: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    credentials: false,
    maxAge: 600,
  };
}

function attachRequestId(req, res, next) {
  const incoming = String(req.headers['x-request-id'] || '').trim();
  req.requestId = incoming || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

function createLimiter({ windowMs, limit, eventName }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => shouldSkipSecurity(req),
    handler: (req, res) => {
      appendSecurityLog(eventName, {
        ip: getClientIp(req),
        path: req.originalUrl,
        method: req.method,
        requestId: req.requestId || '',
        reason: 'rate_limited',
      });

      // Keep rejection reason visible in terminal for quick local debugging.
      // eslint-disable-next-line no-console
      console.warn(
        `[SECURITY][429] ${eventName} ip=${getClientIp(req)} method=${req.method} path=${req.originalUrl} requestId=${req.requestId || ''}`,
      );

      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        requestId: req.requestId || '',
      });
    },
  });
}

const globalApiLimiter = createLimiter({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS || `${DEFAULT_WINDOW_MS}`, 10),
  limit: Number.parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '300', 10),
  eventName: 'http.rate_limited.global',
});

const adminApiLimiter = createLimiter({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS || `${DEFAULT_WINDOW_MS}`, 10),
  limit: Number.parseInt(process.env.RATE_LIMIT_ADMIN_MAX || '120', 10),
  eventName: 'http.rate_limited.admin',
});

const authApiLimiter = createLimiter({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || `${DEFAULT_WINDOW_MS}`, 10),
  limit: Number.parseInt(process.env.RATE_LIMIT_AUTH_MAX || '40', 10),
  eventName: 'http.rate_limited.auth',
});

const suspiciousPatterns = [
  /<script\b/gi,
  /\bunion\b\s+\bselect\b/gi,
  /\bdrop\b\s+\btable\b/gi,
  /\bor\b\s+1=1/gi,
  /\.\.[\\/]/g,
  /\/etc\/passwd/gi,
];

function containsSuspiciousPayload(input) {
  if (typeof input !== 'string') return false;
  return suspiciousPatterns.some((pattern) => pattern.test(input));
}

function wafGuard(req, res, next) {
  if (shouldSkipSecurity(req)) return next();

  // Keep auth payload checks lightweight to avoid false positives during login.
  const isAuthLogin = req.method === 'POST' && req.path === '/api/auth/login';
  const requestSegments = [
    req.originalUrl,
    JSON.stringify(req.query || {}),
    String(req.headers['user-agent'] || ''),
  ];

  if (!isAuthLogin) {
    requestSegments.push(JSON.stringify(req.body || {}));
  }

  const flagged = requestSegments.some((segment) => containsSuspiciousPayload(String(segment || '')));
  if (!flagged) return next();

  appendSecurityLog('http.waf_blocked', {
    ip: getClientIp(req),
    method: req.method,
    path: req.originalUrl,
    requestId: req.requestId || '',
    reason: 'suspicious_payload',
  });

  // eslint-disable-next-line no-console
  console.warn(
    `[SECURITY][403] waf_blocked ip=${getClientIp(req)} method=${req.method} path=${req.originalUrl} requestId=${req.requestId || ''}`,
  );

  return res.status(403).json({
    success: false,
    message: 'Request blocked by security policy.',
    requestId: req.requestId || '',
  });
}

module.exports = {
  buildCorsOptions,
  attachRequestId,
  globalApiLimiter,
  adminApiLimiter,
  authApiLimiter,
  wafGuard,
  isSecurityBypassed,
  isDeveloperIp,
  shouldSkipSecurity,
  isNgrokRequest,
};
