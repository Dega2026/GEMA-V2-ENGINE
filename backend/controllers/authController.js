const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { requireEnv } = require('../config/env');
const { appendSecurityLog, getClientIp } = require('../utils/securityLogger');
const { writeAuditLog } = require('../utils/auditLogger');
const { shouldSkipSecurity, isNgrokRequest } = require('../middleware/securityHardening');

const JWT_SECRET = requireEnv('JWT_SECRET');
const REFRESH_TOKEN_SECRET = requireEnv('REFRESH_TOKEN_SECRET');

const ACCESS_TOKEN_EXPIRES_IN = '4h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES || '7d';
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const ACCESS_COOKIE_MAX_AGE_MS = 4 * 60 * 60 * 1000;

function isTruthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function parseDurationToMs(rawValue, fallbackMs) {
  const raw = String(rawValue || '').trim().toLowerCase();
  if (!raw) return fallbackMs;

  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) return fallbackMs;

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

function getCookieProfile() {
  const bypassMode = isTruthy(process.env.BYPASS_SECURITY);
  if (bypassMode) {
    return {
      secure: false,
      sameSite: 'lax',
    };
  }

  const isProd = String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
  return {
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  };
}

function buildCookieOptions(maxAge) {
  const profile = getCookieProfile();
  return {
    httpOnly: true,
    secure: profile.secure,
    sameSite: profile.sameSite,
    maxAge,
    path: '/',
  };
}

const emailFailures = new Map();

function normalizeIdentity(req) {
  return String(req.body?.username || req.body?.email || '').trim().toLowerCase();
}

function cleanupEmailFailures(now) {
  for (const [key, entry] of emailFailures.entries()) {
    if (!entry.blockedUntil && now - entry.windowStart > WINDOW_MS) {
      emailFailures.delete(key);
      continue;
    }
    if (entry.blockedUntil && entry.blockedUntil <= now) {
      emailFailures.delete(key);
    }
  }
}

function getEmailFailureState(identity, now) {
  cleanupEmailFailures(now);
  const entry = emailFailures.get(identity);
  if (!entry) {
    return {
      count: 0,
      windowStart: now,
      blockedUntil: null,
    };
  }

  if (!entry.blockedUntil && now - entry.windowStart > WINDOW_MS) {
    return {
      count: 0,
      windowStart: now,
      blockedUntil: null,
    };
  }

  return entry;
}

function markEmailFailure(identity, req) {
  if (!identity || shouldSkipSecurity(req)) return;

  const now = Date.now();
  const state = getEmailFailureState(identity, now);
  state.count += 1;

  if (state.count >= MAX_ATTEMPTS) {
    state.blockedUntil = now + WINDOW_MS;
    state.count = MAX_ATTEMPTS;
    appendSecurityLog('auth.email_blocked', {
      ip: getClientIp(req),
      identity,
      attempts: state.count,
      blockedUntil: new Date(state.blockedUntil).toISOString(),
    });
  }

  emailFailures.set(identity, state);
}

function clearEmailFailures(identity) {
  if (!identity) return;
  emailFailures.delete(identity);
}

function isEmailBlocked(identity, req) {
  if (!identity || shouldSkipSecurity(req)) return null;

  const now = Date.now();
  const state = getEmailFailureState(identity, now);
  if (state.blockedUntil && state.blockedUntil > now) {
    const waitSec = Math.ceil((state.blockedUntil - now) / 1000);
    appendSecurityLog('auth.blocked_login_attempt', {
      ip: getClientIp(req),
      identity,
      waitSec,
      reason: 'email_failure_threshold',
    });
    return waitSec;
  }

  return null;
}

const loginRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => shouldSkipSecurity(req),
  message: { success: false, message: 'Too many login attempts from this IP. Try again after 15 minutes.' },
  handler: (req, res) => {
    appendSecurityLog('auth.ip_rate_limited', {
      ip: getClientIp(req),
      identity: normalizeIdentity(req),
      reason: 'ip_login_rate_limited',
    });
    // eslint-disable-next-line no-console
    console.warn(`[AUTH][429] login_rate_limited ip=${getClientIp(req)} identity=${normalizeIdentity(req)} path=${req.originalUrl}`);
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts from this IP. Try again after 15 minutes.',
    });
  },
});

function signAccessToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, type: 'refresh' },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
  );
}

async function loginHandler(req, res) {
  try {
    const usernameOrEmail = normalizeIdentity(req);
    const password = String(req.body?.password || '');
    const ip = getClientIp(req);

    if (!usernameOrEmail || !password) {
      markEmailFailure(usernameOrEmail, req);
      appendSecurityLog('auth.login_failed', {
        ip,
        identity: usernameOrEmail,
        reason: 'missing_credentials',
      });
      // eslint-disable-next-line no-console
      console.warn(`[AUTH][400] login_failed reason=missing_credentials ip=${ip} identity=${usernameOrEmail}`);
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const waitSec = isEmailBlocked(usernameOrEmail, req);
    if (waitSec) {
      // eslint-disable-next-line no-console
      console.warn(`[AUTH][429] login_blocked reason=email_failures ip=${ip} identity=${usernameOrEmail} waitSec=${waitSec}`);
      return res.status(429).json({
        success: false,
        message: `Account temporarily blocked due to failed attempts. Try again in ${waitSec} seconds.`,
      });
    }

    const rawUsername = String(req.body?.username || '').trim();
    const safeRegex = rawUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const user = await User.findOne({
      $or: [
        { email: usernameOrEmail },
        { name: { $regex: `^${safeRegex}$`, $options: 'i' } },
      ],
    });

    if (!user) {
      markEmailFailure(usernameOrEmail, req);
      appendSecurityLog('auth.login_failed', {
        ip,
        identity: usernameOrEmail,
        reason: 'user_not_found',
      });
      // eslint-disable-next-line no-console
      console.warn(`[AUTH][401] login_failed reason=user_not_found ip=${ip} identity=${usernameOrEmail}`);
      return res.status(401).json({ success: false, message: 'Invalid GEMA Access ID' });
    }

    if (Boolean(user.isFrozen)) {
      appendSecurityLog('auth.login_failed', {
        ip,
        identity: usernameOrEmail,
        userId: String(user._id),
        reason: 'account_frozen',
      });
      return res.status(403).json({ success: false, message: 'This account is frozen. Contact SuperAdmin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      markEmailFailure(usernameOrEmail, req);
      appendSecurityLog('auth.login_failed', {
        ip,
        identity: usernameOrEmail,
        userId: String(user._id),
        reason: 'invalid_password',
      });
      // eslint-disable-next-line no-console
      console.warn(`[AUTH][401] login_failed reason=invalid_password ip=${ip} identity=${usernameOrEmail} userId=${String(user._id)}`);
      return res.status(401).json({ success: false, message: 'Invalid Security Key' });
    }

    const token = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    const isRemoteNgrokAccess = isNgrokRequest(req);
    const remoteAccessTag = isRemoteNgrokAccess ? 'Remote Access via ngrok' : 'Direct Access';

    res.cookie('gema_access_token', token, buildCookieOptions(ACCESS_COOKIE_MAX_AGE_MS));
    res.cookie(
      'gema_refresh_token',
      refreshToken,
      buildCookieOptions(parseDurationToMs(REFRESH_TOKEN_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000)),
    );

    clearEmailFailures(usernameOrEmail);
    // Update lightweight activity counters without blocking login response on transient DB issues.
    try {
      user.lastLogin = new Date();
      user.activityCount = Number.isFinite(Number(user.activityCount)) ? Number(user.activityCount) + 1 : 1;
      await user.save();
    } catch (activityErr) {
      // eslint-disable-next-line no-console
      console.warn('Login activity update skipped:', activityErr.message);
    }

    appendSecurityLog('auth.login_success', {
      ip,
      identity: usernameOrEmail,
      userId: String(user._id),
      role: user.role,
      accessPath: remoteAccessTag,
      ipNote: isRemoteNgrokAccess ? `${ip} (Remote Access via ngrok)` : ip,
    });
    await writeAuditLog(req, {
      module: 'Authentication',
      action: 'auth.login',
      targetType: 'User',
      targetId: String(user._id),
      details: {
        identity: usernameOrEmail,
        role: user.role,
        ipNote: isRemoteNgrokAccess ? `${ip} (Remote Access via ngrok)` : ip,
      },
    });

    return res.json({
      success: true,
      token,
      refreshToken,
      user: { name: user.name, role: user.role, department: user.department || 'Medical' },
    });
  } catch (error) {
    const identity = normalizeIdentity(req);
    markEmailFailure(identity, req);
    appendSecurityLog('auth.login_failed', {
      ip: getClientIp(req),
      identity,
      reason: 'server_error',
      error: error.message,
    });
    // eslint-disable-next-line no-console
    console.warn(`[AUTH][500] login_failed reason=server_error ip=${getClientIp(req)} identity=${identity} error=${error.message}`);
    return res.status(500).json({ success: false, message: 'System Error during GEMA authentication' });
  }
}

async function refreshTokenHandler(req, res) {
  try {
    const incomingRefreshToken = String(req.body?.refreshToken || '').trim();
    if (!incomingRefreshToken) {
      appendSecurityLog('auth.refresh_failed', {
        ip: getClientIp(req),
        reason: 'missing_refresh_token',
      });
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    const decoded = jwt.verify(incomingRefreshToken, REFRESH_TOKEN_SECRET);
    if (decoded.type !== 'refresh' || !decoded.id) {
      appendSecurityLog('auth.refresh_failed', {
        ip: getClientIp(req),
        reason: 'invalid_refresh_payload',
      });
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      appendSecurityLog('auth.refresh_failed', {
        ip: getClientIp(req),
        reason: 'refresh_user_not_found',
        userId: String(decoded.id),
      });
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const token = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.cookie('gema_access_token', token, buildCookieOptions(ACCESS_COOKIE_MAX_AGE_MS));
    res.cookie(
      'gema_refresh_token',
      refreshToken,
      buildCookieOptions(parseDurationToMs(REFRESH_TOKEN_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000)),
    );

    appendSecurityLog('auth.refresh_success', {
      ip: getClientIp(req),
      userId: String(user._id),
      role: user.role,
    });

    return res.json({
      success: true,
      token,
      refreshToken,
      user: { name: user.name, role: user.role },
    });
  } catch (error) {
    appendSecurityLog('auth.refresh_failed', {
      ip: getClientIp(req),
      reason: 'refresh_verify_failed',
      error: error.message,
    });
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
}

module.exports = {
  loginRateLimiter,
  loginHandler,
  refreshTokenHandler,
};
