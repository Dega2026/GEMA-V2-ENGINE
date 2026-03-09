const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

const SENSITIVE_KEYS = new Set(['password', 'token', 'refreshToken', 'authorization', 'apiKey', 'secret']);

function redactSensitive(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const output = {};
  for (const [key, current] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(String(key))) {
      output[key] = '[REDACTED]';
      continue;
    }
    output[key] = redactSensitive(current);
  }
  return output;
}

function normalizeForHash(payload) {
  const sortDeep = (item) => {
    if (Array.isArray(item)) return item.map(sortDeep);
    if (!item || typeof item !== 'object') return item;

    const sorted = {};
    for (const key of Object.keys(item).sort()) {
      sorted[key] = sortDeep(item[key]);
    }
    return sorted;
  };

  return JSON.stringify(sortDeep(payload));
}

function signAuditLog(payload, prevHash) {
  const signingKey = String(process.env.AUDIT_LOG_SIGNING_KEY || process.env.JWT_SECRET || 'dev-insecure-audit-key');
  const base = `${prevHash}|${normalizeForHash(payload)}`;
  return crypto.createHmac('sha256', signingKey).update(base).digest('hex');
}

function getRequestIp(req) {
  const fromHeader = req.headers['x-forwarded-for'];
  if (typeof fromHeader === 'string' && fromHeader.trim()) {
    return fromHeader.split(',')[0].trim();
  }
  return String(req.ip || req.connection?.remoteAddress || '').trim();
}

async function writeAuditLog(req, payload) {
  try {
    const safePayload = payload || {};
    const details = safePayload.details && typeof safePayload.details === 'object' ? redactSensitive(safePayload.details) : {};
    const prevRecord = await AuditLog.findOne().sort({ createdAt: -1 }).select('hash').lean();
    const prevHash = String(prevRecord?.hash || 'GENESIS').trim();

    const baseLog = {
      action: String(safePayload.action || 'unknown').trim(),
      module: String(safePayload.module || 'General').trim(),
      targetType: String(safePayload.targetType || '').trim(),
      targetId: String(safePayload.targetId || '').trim(),
      status: safePayload.status === 'failure' ? 'failure' : 'success',
      actor: {
        userId: String(req.user?.id || req.user?._id || '').trim(),
        role: String(req.user?.role || '').trim(),
        username: String(req.user?.username || req.user?.name || '').trim()
      },
      request: {
        ip: getRequestIp(req),
        userAgent: String(req.headers['user-agent'] || '').trim(),
        requestId: String(req.requestId || req.headers['x-request-id'] || '').trim(),
      },
      details,
    };

    const hash = signAuditLog(baseLog, prevHash);
    await AuditLog.create({
      ...baseLog,
      prevHash,
      hash,
    });
  } catch (error) {
    // Logging must never break the request flow.
    console.error('Audit logger error:', error.message);
  }
}

module.exports = {
  writeAuditLog
};
