const express = require('express');
const Lead = require('../models/Lead');
const FollowUpJob = require('../models/FollowUpJob');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { sendRealEmail } = require('../utils/mailer');
const { writeAuditLog } = require('../utils/auditLogger');

const router = express.Router();
const AUTOMATION_ROLES = ['SuperAdmin', 'OperationsAdmin', 'Engineer', 'EngineeringOps', 'ProductAdmin', 'Regulatory'];

function buildTemplate(templateKey, lead, bodyMessage) {
  const key = String(templateKey || 'intro').trim().toLowerCase();
  const name = String(lead?.fullName || 'Valued Client').trim();
  const module = String(lead?.module || 'General').trim();
  const specialty = String(lead?.specialty || 'General').trim();

  if (bodyMessage) {
    return String(bodyMessage).trim();
  }

  if (key === 'proposal') {
    return `Dear ${name},\n\nFollowing our discussion, we prepared a tailored proposal for your ${module} requirements (${specialty}). Please reply with your preferred timeline so we can finalize commercial terms.\n\nBest regards,\nGEMA Team`;
  }

  if (key === 'reminder') {
    return `Dear ${name},\n\nThis is a gentle reminder regarding your ${module} inquiry (${specialty}). We are ready to proceed whenever your team confirms the next step.\n\nBest regards,\nGEMA Team`;
  }

  if (key === 'closure') {
    return `Dear ${name},\n\nWe are closing this follow-up cycle for your ${module} request (${specialty}) for now. If priorities reopen, we can restart immediately with an updated offer.\n\nBest regards,\nGEMA Team`;
  }

  return `Dear ${name},\n\nThank you for connecting with GEMA. We are preparing the next steps for your ${module} requirements (${specialty}) and will coordinate with you shortly.\n\nBest regards,\nGEMA Team`;
}

async function dispatchJob(job) {
  const htmlBody = `<div style="font-family:Segoe UI,Tahoma,Arial,sans-serif;line-height:1.5;color:#111;white-space:pre-wrap;">${job.message.replace(/[<>&]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]))}</div>`;
  const info = await sendRealEmail({
    to: job.leadEmail,
    subject: `[GEMA Follow-up] ${job.subject}`,
    text: job.message,
    html: htmlBody
  });

  job.status = 'sent';
  job.result = {
    messageId: String(info?.messageId || ''),
    error: '',
    sentAt: new Date()
  };
  await job.save();
  return job;
}

router.get('/follow-ups', authenticateToken, requireRoles(AUTOMATION_ROLES), async (req, res) => {
  try {
    const jobs = await FollowUpJob.find().sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ success: true, data: jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load follow-up jobs.' });
  }
});

router.post('/follow-ups', authenticateToken, requireRoles(AUTOMATION_ROLES), async (req, res) => {
  try {
    const leadId = String(req.body.leadId || '').trim();
    const templateKey = String(req.body.templateKey || 'intro').trim().toLowerCase();
    const subject = String(req.body.subject || '').trim();
    const customMessage = String(req.body.message || '').trim();
    const daysFromNowRaw = Number.parseInt(String(req.body.daysFromNow || '0').trim(), 10);
    const daysFromNow = Number.isFinite(daysFromNowRaw) ? Math.min(Math.max(daysFromNowRaw, 0), 30) : 0;
    const autoRun = String(req.body.autoRun || 'true').trim().toLowerCase() !== 'false';

    if (!leadId || !subject) {
      return res.status(400).json({ success: false, message: 'leadId and subject are required.' });
    }

    const lead = await Lead.findById(leadId).lean();
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const scheduledFor = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
    const message = buildTemplate(templateKey, lead, customMessage);

    const job = await FollowUpJob.create({
      leadId: lead._id,
      leadEmail: String(lead.email || '').toLowerCase(),
      leadName: String(lead.fullName || ''),
      templateKey,
      subject,
      message,
      relatedModule: String(lead.module || 'General'),
      specialty: String(lead.specialty || ''),
      scheduledFor,
      createdBy: {
        userId: String(req.user?.id || ''),
        role: String(req.user?.role || '')
      }
    });

    await writeAuditLog(req, {
      module: 'Automation',
      action: 'followup.create',
      targetType: 'FollowUpJob',
      targetId: String(job._id),
      details: {
        leadId: String(lead._id),
        templateKey,
        scheduledFor
      }
    });

    if (autoRun && daysFromNow === 0) {
      try {
        await dispatchJob(job);
        await writeAuditLog(req, {
          module: 'Automation',
          action: 'followup.dispatch',
          targetType: 'FollowUpJob',
          targetId: String(job._id),
          details: { immediate: true }
        });
      } catch (mailError) {
        job.status = 'failed';
        job.result = {
          messageId: '',
          error: String(mailError?.message || 'SMTP send failed'),
          sentAt: undefined
        };
        await job.save();

        await writeAuditLog(req, {
          module: 'Automation',
          action: 'followup.dispatch',
          targetType: 'FollowUpJob',
          targetId: String(job._id),
          status: 'failure',
          details: { immediate: true, error: String(mailError?.message || '') }
        });
      }
    }

    return res.status(201).json({ success: true, message: 'Follow-up job created.', data: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create follow-up job.' });
  }
});

router.post('/follow-ups/:id/run', authenticateToken, requireRoles(AUTOMATION_ROLES), async (req, res) => {
  try {
    const job = await FollowUpJob.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Follow-up job not found.' });
    }

    if (job.status === 'sent') {
      return res.status(409).json({ success: false, message: 'Follow-up already sent.' });
    }

    try {
      await dispatchJob(job);
      await writeAuditLog(req, {
        module: 'Automation',
        action: 'followup.dispatch',
        targetType: 'FollowUpJob',
        targetId: String(job._id),
        details: { immediate: false }
      });
      return res.json({ success: true, message: 'Follow-up sent.', data: job });
    } catch (mailError) {
      job.status = 'failed';
      job.result = {
        messageId: '',
        error: String(mailError?.message || 'SMTP send failed'),
        sentAt: undefined
      };
      await job.save();

      await writeAuditLog(req, {
        module: 'Automation',
        action: 'followup.dispatch',
        targetType: 'FollowUpJob',
        targetId: String(job._id),
        status: 'failure',
        details: { immediate: false, error: String(mailError?.message || '') }
      });

      return res.status(502).json({ success: false, message: 'SMTP send failed.', data: job });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to run follow-up job.' });
  }
});

module.exports = router;
