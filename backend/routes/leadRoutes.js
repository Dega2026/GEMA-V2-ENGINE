const express = require('express');
const Lead = require('../models/Lead');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { writeAuditLog } = require('../utils/auditLogger');

const router = express.Router();
const LEAD_MANAGER_ROLES = ['SuperAdmin', 'OperationsAdmin', 'Engineer', 'EngineeringOps', 'ProductAdmin', 'Regulatory', 'NewsEditor'];

router.get('/', authenticateToken, requireRoles(LEAD_MANAGER_ROLES), async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).limit(300).lean();
    await writeAuditLog(req, {
      module: 'Operations',
      action: 'lead.list',
      targetType: 'Lead',
      details: { count: leads.length }
    });
    return res.json({ success: true, data: leads });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch leads.' });
  }
});

router.post('/', authenticateToken, requireRoles(LEAD_MANAGER_ROLES), async (req, res) => {
  try {
    const payload = {
      fullName: String(req.body.fullName || '').trim(),
      email: String(req.body.email || '').trim().toLowerCase(),
      company: String(req.body.company || '').trim(),
      phone: String(req.body.phone || '').trim(),
      source: String(req.body.source || 'Admin Manual').trim(),
      module: String(req.body.module || 'General').trim(),
      specialty: String(req.body.specialty || '').trim(),
      notes: String(req.body.notes || '').trim(),
      assignedTo: String(req.body.assignedTo || '').trim(),
      valueEstimate: Number.parseFloat(req.body.valueEstimate) || 0,
      currency: String(req.body.currency || 'EGP').toUpperCase() === 'USD' ? 'USD' : 'EGP'
    };

    if (!payload.fullName || !payload.email) {
      return res.status(400).json({ success: false, message: 'Full name and email are required.' });
    }

    const created = await Lead.create(payload);
    await writeAuditLog(req, {
      module: 'Operations',
      action: 'lead.create',
      targetType: 'Lead',
      targetId: String(created._id),
      details: {
        module: created.module,
        specialty: created.specialty,
        status: created.status
      }
    });
    return res.status(201).json({ success: true, message: 'Lead created successfully.', data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create lead.' });
  }
});

router.put('/:id/status', authenticateToken, requireRoles(LEAD_MANAGER_ROLES), async (req, res) => {
  try {
    const status = String(req.body.status || '').trim().toLowerCase();
    const allowed = ['new', 'contacted', 'qualified', 'won', 'lost'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid lead status.' });
    }

    const updated = await Lead.findByIdAndUpdate(
      req.params.id,
      { status, assignedTo: String(req.body.assignedTo || '').trim() },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    await writeAuditLog(req, {
      module: 'Operations',
      action: 'lead.status_update',
      targetType: 'Lead',
      targetId: String(updated._id),
      details: {
        status: updated.status,
        assignedTo: updated.assignedTo
      }
    });

    return res.json({ success: true, message: 'Lead status updated.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update lead.' });
  }
});

module.exports = router;
