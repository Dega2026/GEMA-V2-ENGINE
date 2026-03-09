const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Machinery = require('../models/Machinery');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { deleteManagedFileByUrl, replaceManagedFile } = require('../utils/fileCleanup');

const ALLOWED_IMAGE_MIMES = ['image/webp', 'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/avif'];

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'datasheet') {
      const datasheetPath = path.join(__dirname, '../uploads/datasheets/');
      fs.mkdirSync(datasheetPath, { recursive: true });
      cb(null, datasheetPath);
      return;
    }

    const imagePath = path.join(__dirname, '../../frontend/public/assets/uploads/');
    fs.mkdirSync(imagePath, { recursive: true });
    cb(null, imagePath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
});

function normalizeSpareParts(raw) {
  if (!raw) return [];

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  return Array.isArray(raw) ? raw : [];
}

function normalizeCategory(rawCategory, sourceText = '') {
  const category = String(rawCategory || '').trim().toLowerCase();
  const source = String(sourceText || '').trim().toLowerCase();
  const spareHint = /spare|parts?|maint|service/.test(`${category} ${source}`);

  if (spareHint) return 'Spare Parts & Maintenance';
  if (category.includes('machinery') || category.includes('production') || category.includes('line')) {
    return 'Machinery & Production Lines';
  }
  if (category.includes('engineering hub') || category.includes('engineering')) {
    return 'Machinery & Production Lines';
  }
  if (category.includes('trading')) return 'Trading Hub';
  if (category.includes('turnkey')) return 'Turnkey';

  return 'Machinery & Production Lines';
}

router.get('/', async (req, res) => {
  try {
    const items = await Machinery.find().sort({ createdAt: -1 });
    const normalized = items.map((item) => {
      const doc = item.toObject();
      return {
        ...doc,
        price: Number.isFinite(Number(doc.price)) ? Number(doc.price) : 0,
        currency: ['USD', 'EGP'].includes(String(doc.currency || '').toUpperCase()) ? String(doc.currency).toUpperCase() : 'EGP'
      };
    });
    return res.json({ success: true, data: normalized });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch machinery list' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Machinery.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Machinery item not found' });
    }

    return res.json({ success: true, data: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch machinery item' });
  }
});

router.post(
  '/add',
  authenticateToken,
  requireRoles(['SuperAdmin', 'Engineer', 'EngineeringOps']),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'datasheet', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const imageFile = req.files?.image?.[0];
      const datasheetFile = req.files?.datasheet?.[0];
      const spareParts = normalizeSpareParts(req.body.spareParts);

      if (imageFile && !ALLOWED_IMAGE_MIMES.includes(imageFile.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported image format. Allowed: WEBP, JPG, PNG, GIF, AVIF.'
        });
      }

      const payload = {
        name: String(req.body.name || '').trim(),
        slug: req.body.slug,
        category: normalizeCategory(req.body.category, `${req.body.name || ''} ${req.body.slug || ''}`),
        summary: String(req.body.summary || '').trim(),
        price: parseFloat(req.body.price) || 0,
        currency: req.body.currency === 'USD' ? 'USD' : 'EGP',
        image: imageFile ? `/uploads/${imageFile.filename}` : req.body.image || undefined,
        datasheet: datasheetFile
          ? `/datasheets/${datasheetFile.filename}`
          : (req.body.datasheetUrl || req.body.datasheet || ''),
        technicalSpecs: {
          model: req.body.model || '',
          origin: req.body.origin || '',
          output: req.body.output || '',
          power: req.body.power || '',
          compliance: req.body.compliance || ''
        },
        spareParts
      };

      if (req.user?.role === 'EngineeringOps') {
        payload.category = 'Machinery & Production Lines';
      }

      if (!payload.name) {
        return res.status(400).json({ success: false, message: 'Machine name is required' });
      }

      const created = await Machinery.create(payload);
      return res.status(201).json({ success: true, message: 'Machinery item created', data: created });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, message: 'Slug already exists. Use a different slug.' });
      }
      console.error('Machinery add error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create machinery item' });
    }
  }
);

router.put(
  '/:id',
  authenticateToken,
  requireRoles(['SuperAdmin', 'Engineer', 'EngineeringOps']),
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'datasheet', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const existing = await Machinery.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Machinery item not found' });
      }

      const imageFile = req.files?.image?.[0];
      const datasheetFile = req.files?.datasheet?.[0];
      const spareParts = normalizeSpareParts(req.body.spareParts);

      if (imageFile && !ALLOWED_IMAGE_MIMES.includes(imageFile.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported image format. Allowed: WEBP, JPG, PNG, GIF, AVIF.'
        });
      }

      const update = {
        name: String(req.body.name || '').trim() || existing.name,
        slug: req.body.slug || existing.slug,
        category: normalizeCategory(req.body.category, `${req.body.name || existing.name} ${req.body.slug || existing.slug}`),
        summary: typeof req.body.summary === 'string' ? req.body.summary.trim() : existing.summary,
        price: parseFloat(req.body.price) || 0,
        currency: req.body.currency === 'USD' ? 'USD' : 'EGP',
        technicalSpecs: {
          model: req.body.model || '',
          origin: req.body.origin || '',
          output: req.body.output || '',
          power: req.body.power || '',
          compliance: req.body.compliance || ''
        },
        spareParts
      };

      if (req.user?.role === 'EngineeringOps') {
        update.category = 'Machinery & Production Lines';
      }

      if (imageFile) update.image = `/uploads/${imageFile.filename}`;
      if (datasheetFile) update.datasheet = `/datasheets/${datasheetFile.filename}`;
      if (!datasheetFile && typeof req.body.datasheetUrl === 'string') update.datasheet = req.body.datasheetUrl;
      if (!datasheetFile && typeof req.body.datasheet === 'string' && !update.datasheet) update.datasheet = req.body.datasheet;

      const updated = await Machinery.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Machinery item not found' });
      }

      if (imageFile) {
        replaceManagedFile(existing.image, update.image);
      }

      if (datasheetFile) {
        replaceManagedFile(existing.datasheet, update.datasheet);
      }

      return res.json({ success: true, message: 'Machinery item updated', data: updated });
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(409).json({ success: false, message: 'Slug already exists. Use a different slug.' });
      }
      return res.status(500).json({ success: false, message: 'Failed to update machinery item' });
    }
  }
);

router.delete('/:id', authenticateToken, requireRoles(['SuperAdmin', 'Engineer', 'EngineeringOps']), async (req, res) => {
  try {
    const deleted = await Machinery.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Machinery item not found' });
    }

    deleteManagedFileByUrl(deleted.image);
    deleteManagedFileByUrl(deleted.datasheet);

    return res.json({ success: true, message: 'Machinery item deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete machinery item' });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Upload failed due to file constraints.'
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Upload failed due to invalid file input.'
    });
  }

  return next();
});

module.exports = router;
