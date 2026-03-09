const express = require('express');
const upload = require('../middleware/upload');
const Maintenance = require('../models/Maintenance');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { deleteManagedFileByUrl, replaceManagedFile } = require('../utils/fileCleanup');

const router = express.Router();
const MANAGER_ROLES = ['SuperAdmin', 'Engineer', 'EngineeringOps'];

router.get('/', async (req, res) => {
  try {
    const items = await Maintenance.find({ isActive: true }).sort({ scheduledDate: 1, createdAt: -1 });
    return res.json({ success: true, data: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch maintenance records' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Maintenance.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    return res.json({ success: true, data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch maintenance record' });
  }
});

router.post(
  '/add',
  authenticateToken,
  requireRoles(MANAGER_ROLES),
  upload.single('reportFile'),
  async (req, res) => {
    try {
      const payload = {
        title: req.body.title,
        assetName: req.body.assetName,
        maintenanceType: req.body.maintenanceType || 'Preventive',
        status: req.body.status || 'Scheduled',
        priority: req.body.priority || 'Medium',
        scheduledDate: req.body.scheduledDate,
        completedDate: req.body.completedDate || null,
        engineer: req.body.engineer || '',
        notes: req.body.notes || '',
        reportFile: req.file ? `/uploads/${req.file.filename}` : req.body.reportFile || ''
      };

      const created = await Maintenance.create(payload);
      return res.status(201).json({ success: true, message: 'Maintenance record created', data: created });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to create maintenance record' });
    }
  }
);

router.put(
  '/:id',
  authenticateToken,
  requireRoles(MANAGER_ROLES),
  upload.single('reportFile'),
  async (req, res) => {
    try {
      const existing = await Maintenance.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Maintenance record not found' });
      }

      const update = {
        title: req.body.title,
        assetName: req.body.assetName,
        maintenanceType: req.body.maintenanceType,
        status: req.body.status,
        priority: req.body.priority,
        scheduledDate: req.body.scheduledDate,
        completedDate: req.body.completedDate || null,
        engineer: req.body.engineer,
        notes: req.body.notes
      };

      if (req.file) update.reportFile = `/uploads/${req.file.filename}`;
      if (!req.file && typeof req.body.reportFile === 'string') update.reportFile = req.body.reportFile;

      const updated = await Maintenance.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Maintenance record not found' });
      }

      if (req.file) {
        replaceManagedFile(existing.reportFile, update.reportFile);
      }

      return res.json({ success: true, message: 'Maintenance record updated', data: updated });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to update maintenance record' });
    }
  }
);

router.delete('/:id', authenticateToken, requireRoles(MANAGER_ROLES), async (req, res) => {
  try {
    const deleted = await Maintenance.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Maintenance record not found' });
    }

    deleteManagedFileByUrl(deleted.reportFile);

    return res.json({ success: true, message: 'Maintenance record deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete maintenance record' });
  }
});

module.exports = router;
