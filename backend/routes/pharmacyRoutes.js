const express = require('express');
const Pharmacy = require('../models/Pharmacy');

const router = express.Router();

router.get('/:slug', async (req, res) => {
    try {
        const slug = String(req.params.slug || '').trim().toLowerCase();

        if (!slug) {
            return res.status(400).json({ success: false, message: 'Pharmacy slug is required.' });
        }

        const pharmacy = await Pharmacy.findOne({ slug })
            .populate('approvedProducts')
            .exec();

        if (!pharmacy) {
            return res.status(404).json({ success: false, message: 'Pharmacy not found.' });
        }

        return res.json({ success: true, data: pharmacy });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch pharmacy data.' });
    }
});

module.exports = router;
