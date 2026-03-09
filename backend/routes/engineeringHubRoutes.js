const express = require('express');
const upload = require('../middleware/upload');
const EngineeringHub = require('../models/EngineeringHub');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { deleteManagedFileByUrl, replaceManagedFile } = require('../utils/fileCleanup');

const router = express.Router();
const MANAGER_ROLES = ['SuperAdmin', 'Engineer', 'EngineeringOps'];

router.get('/', async (req, res) => {
  try {
    const items = await EngineeringHub.find({ isActive: true }).sort({ createdAt: -1 });
    return res.json({ success: true, data: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch engineering hub items' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await EngineeringHub.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Engineering hub item not found' });
    }

    return res.json({ success: true, data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch engineering hub item' });
  }
});

router.post(
  '/add',
  authenticateToken,
  requireRoles(MANAGER_ROLES),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'datasheet', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const existing = await EngineeringHub.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Engineering hub item not found' });
      }

      const imageFile = req.files?.image?.[0];
      const datasheetFile = req.files?.datasheet?.[0];

      const payload = {
        title: req.body.title,
        slug: req.body.slug,
        category: req.body.category || 'Engineering Hub',
        summary: req.body.summary || '',
        image: imageFile ? `/uploads/${imageFile.filename}` : req.body.image || undefined,
        datasheet: datasheetFile ? `/uploads/${datasheetFile.filename}` : req.body.datasheet || '',
        technicalSpecs: {
          model: req.body.model || '',
          origin: req.body.origin || '',
          output: req.body.output || '',
          power: req.body.power || '',
          compliance: req.body.compliance || ''
        }
      };

      const created = await EngineeringHub.create(payload);
      return res.status(201).json({ success: true, message: 'Engineering hub item created', data: created });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to create engineering hub item' });
    }
  }
);

router.put(
  '/:id',
  authenticateToken,
  requireRoles(MANAGER_ROLES),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'datasheet', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const imageFile = req.files?.image?.[0];
      const datasheetFile = req.files?.datasheet?.[0];

      const update = {
        title: req.body.title,
        slug: req.body.slug,
        category: req.body.category,
        summary: req.body.summary,
        technicalSpecs: {
          model: req.body.model || '',
          origin: req.body.origin || '',
          output: req.body.output || '',
          power: req.body.power || '',
          compliance: req.body.compliance || ''
        }
      };

      if (imageFile) update.image = `/uploads/${imageFile.filename}`;
      if (datasheetFile) update.datasheet = `/uploads/${datasheetFile.filename}`;
      if (!datasheetFile && typeof req.body.datasheet === 'string') update.datasheet = req.body.datasheet;

      const updated = await EngineeringHub.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true
      });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Engineering hub item not found' });
      }

      if (imageFile) {
        replaceManagedFile(existing.image, update.image);
      }

      if (datasheetFile) {
        replaceManagedFile(existing.datasheet, update.datasheet);
      }

      return res.json({ success: true, message: 'Engineering hub item updated', data: updated });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to update engineering hub item' });
    }
  }
);

router.delete('/:id', authenticateToken, requireRoles(MANAGER_ROLES), async (req, res) => {
  try {
    const deleted = await EngineeringHub.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Engineering hub item not found' });
    }

    deleteManagedFileByUrl(deleted.image);
    deleteManagedFileByUrl(deleted.datasheet);

    return res.json({ success: true, message: 'Engineering hub item deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete engineering hub item' });
  }
});

module.exports = router;
