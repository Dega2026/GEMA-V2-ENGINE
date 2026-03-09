const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'security.log');

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function appendSecurityLog(event, meta = {}) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...meta,
    });
    fs.appendFileSync(LOG_FILE, `${line}\n`, 'utf8');
  } catch (_) {
    // Avoid breaking auth flow if disk logging fails.
  }
}

module.exports = {
  getClientIp,
  appendSecurityLog,
};
