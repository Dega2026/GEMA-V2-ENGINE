const crypto = require('crypto');
const express = require('express');
const Report = require('../models/Report');
const ClientPortalSession = require('../models/ClientPortalSession');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { writeAuditLog } = require('../utils/auditLogger');

const router = express.Router();
const PORTAL_MANAGER_ROLES = ['SuperAdmin', 'OperationsAdmin', 'Engineer', 'EngineeringOps'];

function getSiteBaseUrl(req) {
  const envBase = String(process.env.SITE_BASE_URL || '').trim().replace(/\/+$/, '');
  if (envBase) return envBase;
  return `${req.protocol}://${req.get('host')}`;
}

router.get('/links', authenticateToken, requireRoles(PORTAL_MANAGER_ROLES), async (req, res) => {
  try {
    const items = await ClientPortalSession.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('reportId', 'subject relatedModule specialty status sentAt')
      .lean();

    return res.json({ success: true, data: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch portal links.' });
  }
});

router.post('/links', authenticateToken, requireRoles(PORTAL_MANAGER_ROLES), async (req, res) => {
  try {
    const reportId = String(req.body.reportId || '').trim();
    const clientEmail = String(req.body.clientEmail || '').trim().toLowerCase();
    const clientName = String(req.body.clientName || '').trim();
    const expiresInDaysRaw = Number.parseInt(String(req.body.expiresInDays || '10').trim(), 10);
    const expiresInDays = Number.isFinite(expiresInDaysRaw)
      ? Math.min(Math.max(expiresInDaysRaw, 1), 90)
      : 10;

    if (!reportId || !clientEmail) {
      return res.status(400).json({ success: false, message: 'reportId and clientEmail are required.' });
    }

    const report = await Report.findById(reportId).lean();
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const created = await ClientPortalSession.create({
      reportId: report._id,
      clientEmail,
      clientName,
      token,
      expiresAt,
      createdBy: {
        userId: String(req.user?.id || ''),
        role: String(req.user?.role || '')
      }
    });

    const portalUrl = `${getSiteBaseUrl(req)}/client-portal/${created.token}`;

    await writeAuditLog(req, {
      module: 'ClientPortal',
      action: 'portal.link_create',
      targetType: 'ClientPortalSession',
      targetId: String(created._id),
      details: {
        reportId,
        clientEmail,
        expiresAt
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Client portal link created successfully.',
      data: {
        ...created.toObject(),
        portalUrl
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create portal link.' });
  }
});

router.get('/public/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required.' });
    }

    const session = await ClientPortalSession.findOne({ token }).populate('reportId').exec();
    if (!session || !session.isActive) {
      return res.status(404).json({ success: false, message: 'Portal link is invalid.' });
    }

    if (session.expiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'Portal link has expired.' });
    }

    session.viewCount += 1;
    session.lastViewedAt = new Date();
    await session.save();

    const report = session.reportId;
    if (!report) {
      return res.status(404).json({ success: false, message: 'Linked report is not available.' });
    }

    return res.json({
      success: true,
      data: {
        clientName: session.clientName,
        clientEmail: session.clientEmail,
        expiresAt: session.expiresAt,
        report: {
          id: report._id,
          subject: report.subject,
          message: report.message,
          relatedModule: report.relatedModule,
          specialty: report.specialty,
          status: report.status,
          sentAt: report.sentAt,
          createdAt: report.createdAt
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load portal data.' });
  }
});

module.exports = router;
