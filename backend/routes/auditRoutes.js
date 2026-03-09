const express = require('express');
const AuditLog = require('../models/AuditLog');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();
const AUDIT_ROLES = ['SuperAdmin', 'OperationsAdmin'];

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

function recomputeHash(log, prevHash) {
  const signingKey = String(process.env.AUDIT_LOG_SIGNING_KEY || process.env.JWT_SECRET || 'dev-insecure-audit-key');
  const basePayload = {
    action: log.action,
    module: log.module,
    targetType: log.targetType,
    targetId: log.targetId,
    status: log.status,
    actor: log.actor || {},
    request: {
      ip: log.request?.ip || '',
      userAgent: log.request?.userAgent || '',
      requestId: log.request?.requestId || '',
    },
    details: log.details || {},
  };
  return crypto
    .createHmac('sha256', signingKey)
    .update(`${prevHash}|${normalizeForHash(basePayload)}`)
    .digest('hex');
}

router.get('/', authenticateToken, requireRoles(AUDIT_ROLES), async (req, res) => {
  try {
    const limitRaw = Number.parseInt(String(req.query.limit || '120').trim(), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 120;
    const pageRaw = Number.parseInt(String(req.query.page || '1').trim(), 10);
    const page = Number.isFinite(pageRaw) ? Math.max(pageRaw, 1) : 1;

    const query = {};
    if (req.query.module) {
      query.module = String(req.query.module).trim();
    }
    if (req.query.action) {
      query.action = String(req.query.action).trim();
    }
    if (req.query.status) {
      const status = String(req.query.status).trim().toLowerCase();
      if (status === 'success' || status === 'failure') query.status = status;
    }
    if (req.query.targetId) {
      query.targetId = String(req.query.targetId).trim();
    }
    const actorUserId = String(req.query.actorUserId || req.query.userId || '').trim();
    if (actorUserId) {
      query['actor.userId'] = actorUserId;
    }
    if (req.query.requestId) {
      query['request.requestId'] = String(req.query.requestId).trim();
    }

    const createdAtFilter = {};
    if (req.query.from) {
      const fromDate = new Date(String(req.query.from));
      if (!Number.isNaN(fromDate.getTime())) createdAtFilter.$gte = fromDate;
    }
    if (req.query.to) {
      const toDate = new Date(String(req.query.to));
      if (!Number.isNaN(toDate.getTime())) createdAtFilter.$lte = toDate;
    }

    if (req.query.date) {
      const dayText = String(req.query.date).trim();
      const fromDate = new Date(`${dayText}T00:00:00.000Z`);
      if (!Number.isNaN(fromDate.getTime())) {
        const toDate = new Date(fromDate);
        toDate.setUTCDate(toDate.getUTCDate() + 1);
        createdAtFilter.$gte = fromDate;
        createdAtFilter.$lt = toDate;
      }
    }
    if (Object.keys(createdAtFilter).length) {
      query.createdAt = createdAtFilter;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
});

router.get('/export.csv', authenticateToken, requireRoles(AUDIT_ROLES), async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(1000).lean();

    const header = [
      'timestamp',
      'module',
      'action',
      'status',
      'targetType',
      'targetId',
      'actorRole',
      'actorUserId',
      'ip',
      'requestId',
      'hash',
      'prevHash',
    ];

    const escapeCsv = (value) => {
      const raw = String(value || '');
      if (/[",\n]/.test(raw)) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    };

    const rows = logs.map((item) => [
      new Date(item.createdAt || Date.now()).toISOString(),
      item.module,
      item.action,
      item.status,
      item.targetType,
      item.targetId,
      item.actor?.role || '',
      item.actor?.userId || '',
      item.request?.ip || '',
      item.request?.requestId || '',
      item.hash || '',
      item.prevHash || '',
    ].map(escapeCsv).join(','));

    const csv = [header.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="gema-audit-log.csv"');
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to export audit logs.' });
  }
});

router.get('/verify-chain', authenticateToken, requireRoles(['SuperAdmin']), async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: 1 })
      .limit(5000)
      .lean();

    let expectedPrev = 'GENESIS';
    const broken = [];

    for (const item of logs) {
      const recalculated = recomputeHash(item, expectedPrev);
      if (item.prevHash !== expectedPrev || item.hash !== recalculated) {
        broken.push({
          id: String(item._id),
          expectedPrev,
          actualPrev: String(item.prevHash || ''),
          expectedHash: recalculated,
          actualHash: String(item.hash || ''),
          createdAt: item.createdAt,
        });
      }
      expectedPrev = String(item.hash || expectedPrev);
    }

    return res.json({
      success: true,
      verified: broken.length === 0,
      scanned: logs.length,
      brokenCount: broken.length,
      broken,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to verify audit chain.' });
  }
});

module.exports = router;
