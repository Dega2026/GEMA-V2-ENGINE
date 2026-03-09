const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const Regulatory = require('../models/Regulatory');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { deleteManagedFileByUrl } = require('../utils/fileCleanup');

// 1. إضافة شهادة جديدة
router.post('/add', authenticateToken, requireRoles(['SuperAdmin', 'Regulatory']), upload.single('documentFile'), async (req, res) => {
    try {
        const { title, type, issueDate, expiryDate, fee, currency } = req.body;
        const newReg = new Regulatory({
            title, type, issueDate, expiryDate,
            fee: parseFloat(fee) || 0,
            currency: currency === 'USD' ? 'USD' : 'EGP',
            documentFile: req.file ? `/uploads/${req.file.filename}` : ''
        });
        await newReg.save();
        res.json({ success: true, message: 'Certificate Uploaded!' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 2. 🆕 تحديث تاريخ الشهادة (هذا ما يحل مشكلة الـ 404 والـ Could not update)
router.put('/:id', authenticateToken, requireRoles(['SuperAdmin', 'Regulatory']), async (req, res) => {
    try {
        const { expiryDate, fee, currency } = req.body;
        const patch = { expiryDate };
        if (typeof fee !== 'undefined') patch.fee = parseFloat(fee) || 0;
        if (typeof currency !== 'undefined') patch.currency = currency === 'USD' ? 'USD' : 'EGP';
        const updated = await Regulatory.findByIdAndUpdate(
            req.params.id, 
            patch,
            { new: true }
        );
        if (updated) res.json({ success: true, message: 'Expiry Updated!' });
        else res.status(404).json({ success: false, message: 'Not Found' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 3. حذف شهادة
router.delete('/:id', authenticateToken, requireRoles(['SuperAdmin', 'Regulatory']), async (req, res) => {
    try {
        const deleted = await Regulatory.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Not Found' });
        }
        deleteManagedFileByUrl(deleted.documentFile);
        res.json({ success: true, message: 'Deleted!' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 4. جلب كل الشهادات
router.get('/', async (req, res) => {
    try {
        const items = await Regulatory.find().sort({ expiryDate: 1 });
        const normalized = items.map((item) => {
            const doc = item.toObject();
            return {
                ...doc,
                fee: Number.isFinite(Number(doc.fee)) ? Number(doc.fee) : 0,
                currency: ['USD', 'EGP'].includes(String(doc.currency || '').toUpperCase()) ? String(doc.currency).toUpperCase() : 'EGP'
            };
        });
        res.json(normalized);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;