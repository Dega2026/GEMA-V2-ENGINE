/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const AuditLog = require('../models/AuditLog');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { sendRealEmail } = require('../utils/mailer');
const { generateAiText } = require('../utils/aiClient');

dotenv.config({ path: path.join(__dirname, '../../.env') });

function formatDate(date) {
  return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
}

async function connectDbIfNeeded() {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  const mongoUri = String(process.env.MONGO_URI || '').trim() || 'mongodb://127.0.0.1:27017/gema_v2';
  await mongoose.connect(mongoUri);
}

async function buildSnapshot(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [auditLogs, leads] = await Promise.all([
    AuditLog.find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .lean(),
    Lead.find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .lean()
  ]);

  const auditByModule = auditLogs.reduce((acc, row) => {
    const key = String(row.module || 'General').trim() || 'General';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const leadBySource = leads.reduce((acc, row) => {
    const key = String(row.source || 'Unknown').trim() || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const leadByStatus = leads.reduce((acc, row) => {
    const key = String(row.status || 'new').trim() || 'new';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const leadBySpecialty = leads.reduce((acc, row) => {
    const key = String(row.specialty || 'General').trim() || 'General';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const totalLeadValue = leads.reduce((acc, row) => {
    const value = Number(row.valueEstimate || 0);
    return Number.isFinite(value) ? acc + value : acc;
  }, 0);

  return {
    since,
    generatedAt: new Date(),
    totalAuditLogs: auditLogs.length,
    totalLeads: leads.length,
    totalLeadValue,
    auditByModule,
    leadBySource,
    leadByStatus,
    leadBySpecialty,
    topAuditItems: auditLogs.slice(0, 8).map((item) => ({
      module: item.module,
      action: item.action,
      status: item.status,
      at: item.createdAt
    })),
    topLeads: leads.slice(0, 8).map((item) => ({
      fullName: item.fullName,
      source: item.source,
      specialty: item.specialty,
      status: item.status,
      valueEstimate: item.valueEstimate,
      currency: item.currency,
      createdAt: item.createdAt
    }))
  };
}

function fallbackNarrative(snapshot) {
  const topModule = Object.entries(snapshot.auditByModule)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';
  const topSource = Object.entries(snapshot.leadBySource)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';
  const topSpecialty = Object.entries(snapshot.leadBySpecialty)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';

  return [
    '[Mock Report Mode] AI key is missing, so this report uses fixed executive phrasing with live database metrics.',
    `In the last 24 hours, audit activity reached ${snapshot.totalAuditLogs} events, with the highest load in ${topModule}.`,
    `New leads recorded: ${snapshot.totalLeads}. Primary source: ${topSource}. Dominant specialty: ${topSpecialty}.`,
    `Current estimated pipeline value is ${snapshot.totalLeadValue.toLocaleString('en-US', { maximumFractionDigits: 2 })} (mixed currencies).`,
    'Recommended action: prioritize follow-up on high-intent leads and review the busiest module for workflow optimization before the next reporting window.'
  ].join(' ');
}

async function generateAiNarrative(snapshot) {
  const hasAiKey = Boolean(String(process.env.AI_API_KEY || '').trim());
  if (!hasAiKey) {
    return fallbackNarrative(snapshot);
  }

  const payloadForAi = {
    period: {
      since: snapshot.since,
      generatedAt: snapshot.generatedAt
    },
    totals: {
      totalAuditLogs: snapshot.totalAuditLogs,
      totalLeads: snapshot.totalLeads,
      totalLeadValue: snapshot.totalLeadValue
    },
    breakdowns: {
      auditByModule: snapshot.auditByModule,
      leadBySource: snapshot.leadBySource,
      leadByStatus: snapshot.leadByStatus,
      leadBySpecialty: snapshot.leadBySpecialty
    },
    topAuditItems: snapshot.topAuditItems,
    topLeads: snapshot.topLeads
  };

  const lang = String(process.env.DAILY_REPORT_LANG || 'en').trim();
  const systemPrompt = [
    'You are GEMA_Assistant writing an executive daily performance brief for administrators.',
    'Use the provided metrics to produce one professional paragraph (5-8 sentences).',
    'Be factual, business-focused, and include one actionable recommendation.',
    'Do not invent data. If data is low, state that clearly.',
    `Respond in language code: ${lang}.`
  ].join(' ');

  const userPrompt = `Daily snapshot JSON:\n${JSON.stringify(payloadForAi, null, 2)}`;
  const generated = await generateAiText({ systemPrompt, userPrompt, temperature: 0.2 });
  if (String(generated || '').includes('Placeholder Response')) {
    return fallbackNarrative(snapshot);
  }
  return generated;
}

function buildEmailHtml(snapshot, narrative) {
  return `
    <div style="font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#111;line-height:1.55;">
      <h2 style="margin:0 0 10px;color:#0a1c33;">GEMA AI Daily Report</h2>
      <p style="margin:0 0 14px;">Generated at: <strong>${formatDate(snapshot.generatedAt)}</strong><br/>Window start: <strong>${formatDate(snapshot.since)}</strong></p>
      <div style="padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;white-space:pre-wrap;">${String(narrative || '').replace(/[<>&]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]))}</div>
      <h3 style="margin:16px 0 8px;">Quick Metrics</h3>
      <ul>
        <li>Audit logs: ${snapshot.totalAuditLogs}</li>
        <li>Leads: ${snapshot.totalLeads}</li>
        <li>Lead value estimate: ${snapshot.totalLeadValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</li>
      </ul>
    </div>
  `;
}

async function resolveRecipients() {
  const raw = String(process.env.DAILY_REPORT_TO || '').trim();
  if (raw) {
    return raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  }

  const admins = await User.find({ role: 'SuperAdmin' }).select('email').lean();
  return admins
    .map((admin) => String(admin.email || '').trim().toLowerCase())
    .filter(Boolean);
}

async function runDailyReportOnce() {
  await connectDbIfNeeded();

  const snapshot = await buildSnapshot(24);
  let narrative = '';

  try {
    narrative = await generateAiNarrative(snapshot);
  } catch (error) {
    console.warn('AI daily summary fallback activated:', error.message);
    narrative = fallbackNarrative(snapshot);
  }

  const recipients = await resolveRecipients();
  if (!recipients.length) {
    throw new Error('No recipients found for DAILY_REPORT_TO or SuperAdmin users.');
  }

  const subjectDate = new Date().toISOString().slice(0, 10);
  const subject = `[GEMA] AI Daily Operations Report - ${subjectDate}`;
  const html = buildEmailHtml(snapshot, narrative);

  await sendRealEmail({
    to: recipients.join(','),
    subject,
    text: narrative,
    html
  });

  return {
    recipients,
    subject,
    snapshot
  };
}

function msUntilNext11Pm() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(23, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

function startDailyReportScheduler() {
  let isRunning = false;

  async function executeCycle() {
    if (isRunning) return;
    isRunning = true;

    try {
      const result = await runDailyReportOnce();
      console.log('Daily AI report sent:', {
        subject: result.subject,
        recipients: result.recipients.length
      });
    } catch (error) {
      console.error('Daily AI report failed:', error.message);
    } finally {
      isRunning = false;
      const waitMs = msUntilNext11Pm();
      console.log(`Next AI report cycle scheduled in ${Math.round(waitMs / 60000)} minute(s).`);
      const nextTimer = setTimeout(executeCycle, waitMs);
      if (typeof nextTimer?.unref === 'function') nextTimer.unref();
    }
  }

  const initialWait = msUntilNext11Pm();
  console.log(`AI daily report scheduler started. First run in ${Math.round(initialWait / 60000)} minute(s).`);
  const firstTimer = setTimeout(executeCycle, initialWait);
  if (typeof firstTimer?.unref === 'function') firstTimer.unref();
}

if (require.main === module) {
  const once = process.argv.includes('--once');
  if (once) {
    runDailyReportOnce()
      .then((result) => {
        console.log('Daily report sent successfully to:', result.recipients.join(', '));
        process.exit(0);
      })
      .catch((error) => {
        console.error(error.message);
        process.exit(1);
      });
  } else {
    startDailyReportScheduler();
  }
}

module.exports = {
  runDailyReportOnce,
  startDailyReportScheduler
};
