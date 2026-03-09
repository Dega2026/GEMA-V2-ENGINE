const jwt = require('jsonwebtoken');
const { requireEnv } = require('../config/env');

const JWT_SECRET = requireEnv('JWT_SECRET');

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function requireRoles(roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!roles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Access denied for this role' });
    }
    return next();
  };
}

module.exports = {
  authenticateToken,
  requireRoles,
};
