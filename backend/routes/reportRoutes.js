const express = require('express');
const PDFDocument = require('pdfkit');
const Report = require('../models/Report');
const User = require('../models/User');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { sendRealEmail } = require('../utils/mailer');
const { writeAuditLog } = require('../utils/auditLogger');

const router = express.Router();

const REPORT_MANAGER_ROLES = ['SuperAdmin', 'ProductAdmin', 'Regulatory', 'Engineer', 'EngineeringOps', 'NewsEditor', 'OperationsAdmin', 'Staff'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function buildReportMailPayload({ subject, message, relatedModule, specialty, senderRole }) {
  const normalizedModule = String(relatedModule || 'General').trim();
  const normalizedSpecialty = String(specialty || '').trim();
  const normalizedRole = String(senderRole || '').trim();

  const plain = [
    'GEMA Report Notification',
    `Module: ${normalizedModule}`,
    normalizedSpecialty ? `Specialty: ${normalizedSpecialty}` : 'Specialty: -',
    normalizedRole ? `Sent By Role: ${normalizedRole}` : 'Sent By Role: -',
    '',
    message
  ].join('\n');

  const html = `
    <div style="font-family:Segoe UI,Tahoma,Arial,sans-serif;line-height:1.5;color:#111;">
      <h2 style="margin:0 0 12px;">GEMA Report Notification</h2>
      <p style="margin:0 0 6px;"><strong>Module:</strong> ${normalizedModule}</p>
      <p style="margin:0 0 6px;"><strong>Specialty:</strong> ${normalizedSpecialty || '-'}</p>
      <p style="margin:0 0 14px;"><strong>Sent By Role:</strong> ${normalizedRole || '-'}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:12px 0;" />
      <p style="white-space:pre-wrap;">${String(message || '').replace(/[<>&]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]))}</p>
    </div>
  `;

  return {
    subject: `[GEMA] ${subject}`,
    text: plain,
    html
  };
}

router.post('/send', authenticateToken, requireRoles(REPORT_MANAGER_ROLES), async (req, res) => {
  try {
    const recipientType = String(req.body.recipientType || '').trim();
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();
    const clientName = String(req.body.clientName || '').trim();
    const clientEmail = String(req.body.clientEmail || '').trim().toLowerCase();
    const relatedModule = String(req.body.relatedModule || 'Engineering Hub').trim();
    const specialty = String(req.body.specialty || '').trim();

    if (!['Client', 'SuperAdmin'].includes(recipientType)) {
      return res.status(400).json({ success: false, message: 'Invalid recipient type.' });
    }

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required.' });
    }

    const recipients = [];

    if (recipientType === 'Client') {
      if (!clientEmail || !EMAIL_REGEX.test(clientEmail)) {
        return res.status(400).json({ success: false, message: 'Valid client email is required.' });
      }

      recipients.push({
        type: 'Client',
        name: clientName,
        email: clientEmail
      });
    } else {
      const superAdmins = await User.find({ role: 'SuperAdmin' }).select('name email').lean();
      if (!superAdmins.length) {
        return res.status(404).json({ success: false, message: 'No SuperAdmin recipients configured.' });
      }

      superAdmins.forEach((admin) => {
        recipients.push({
          type: 'SuperAdmin',
          name: String(admin.name || '').trim(),
          email: String(admin.email || '').trim().toLowerCase()
        });
      });
    }

    const mailPayload = buildReportMailPayload({
      subject,
      message,
      relatedModule,
      specialty,
      senderRole: String(req.user?.role || '')
    });

    const deliveryResults = [];
    const sentAt = new Date();

    for (const recipient of recipients) {
      try {
        const info = await sendRealEmail({
          to: recipient.email,
          subject: mailPayload.subject,
          text: mailPayload.text,
          html: mailPayload.html
        });

        deliveryResults.push({
          email: recipient.email,
          success: true,
          messageId: String(info?.messageId || '')
        });
      } catch (mailError) {
        deliveryResults.push({
          email: recipient.email,
          success: false,
          error: String(mailError?.message || 'SMTP send failed')
        });
      }
    }

    const successfulCount = deliveryResults.filter((item) => item.success).length;
    const failedCount = deliveryResults.length - successfulCount;
    const finalStatus = successfulCount > 0 ? 'sent' : 'failed';

    const created = await Report.create({
      subject,
      message,
      recipientType,
      clientName,
      clientEmail,
      relatedModule,
      specialty,
      sentBy: {
        userId: String(req.user?.id || ''),
        role: String(req.user?.role || '')
      },
      recipients,
      status: finalStatus,
      deliveryResults,
      sentAt
    });

    if (!successfulCount) {
      await writeAuditLog(req, {
        module: 'Reports',
        action: 'report.send',
        targetType: 'Report',
        targetId: String(created._id),
        status: 'failure',
        details: {
          recipientType,
          relatedModule,
          specialty,
          successfulCount,
          failedCount
        }
      });

      return res.status(502).json({
        success: false,
        message: 'SMTP delivery failed for all recipients. Check SMTP settings.',
        data: {
          id: created._id,
          recipientType: created.recipientType,
          successfulCount,
          failedCount,
          deliveryResults
        }
      });
    }

    await writeAuditLog(req, {
      module: 'Reports',
      action: 'report.send',
      targetType: 'Report',
      targetId: String(created._id),
      status: failedCount > 0 ? 'failure' : 'success',
      details: {
        recipientType,
        relatedModule,
        specialty,
        successfulCount,
        failedCount
      }
    });

    return res.status(201).json({
      success: true,
      message: failedCount > 0
        ? `Report sent to ${successfulCount} recipient(s), ${failedCount} failed.`
        : `Report dispatched to ${recipients.length} recipient(s).`,
      data: {
        id: created._id,
        recipientType: created.recipientType,
        recipients: created.recipients,
        successfulCount,
        failedCount,
        deliveryResults,
        sentAt: created.sentAt
      }
    });
  } catch (error) {
    console.error('Report send error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send report.' });
  }
});

router.get('/', authenticateToken, requireRoles(['SuperAdmin', 'OperationsAdmin']), async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).limit(100).lean();
    await writeAuditLog(req, {
      module: 'Reports',
      action: 'report.list',
      targetType: 'Report',
      details: { count: reports.length }
    });
    return res.json({ success: true, data: reports });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch reports.' });
  }
});

router.get('/:id/pdf', authenticateToken, requireRoles(['SuperAdmin', 'OperationsAdmin']), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).lean();
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const filenameSafe = String(report.subject || 'report')
      .replace(/[^a-z0-9\-_.\s]/gi, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'report';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameSafe}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    writeAuditLog(req, {
      module: 'Reports',
      action: 'report.export_pdf',
      targetType: 'Report',
      targetId: String(report._id),
      details: { subject: report.subject || '' }
    });

    doc.fontSize(20).text('GEMA Report', { underline: true });
    doc.moveDown(1);
    doc.fontSize(12).text(`Subject: ${report.subject || '-'}`);
    doc.text(`Recipient Type: ${report.recipientType || '-'}`);
    doc.text(`Module: ${report.relatedModule || '-'}`);
    doc.text(`Specialty: ${report.specialty || '-'}`);
    doc.text(`Status: ${report.status || '-'}`);
    doc.text(`Sent At: ${new Date(report.sentAt || report.createdAt || Date.now()).toLocaleString('en-GB')}`);
    doc.moveDown(1);

    doc.fontSize(13).text('Message', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).text(String(report.message || '-'), { align: 'left' });

    doc.moveDown(1);
    doc.fontSize(13).text('Recipients', { underline: true });
    doc.moveDown(0.5);

    const recipients = Array.isArray(report.recipients) ? report.recipients : [];
    if (!recipients.length) {
      doc.fontSize(11).text('-');
    } else {
      recipients.forEach((recipient, index) => {
        doc.fontSize(11).text(`${index + 1}. ${recipient.name || '-'} <${recipient.email || '-'}> [${recipient.type || '-'}]`);
      });
    }

    doc.end();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate report PDF.' });
  }
});

module.exports = router;
