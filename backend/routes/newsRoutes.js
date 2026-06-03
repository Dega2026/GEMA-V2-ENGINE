const express = require('express');
const router = express.Router();
const News = require('../models/News');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { deleteManagedFileByUrl } = require('../utils/fileCleanup');
const { writeAuditLog } = require('../utils/auditLogger');
const { createUpload } = require('../utils/uploadConfig');

const upload = createUpload({ prefix: 'news', maxFileSize: 8 * 1024 * 1024 });
const NEWS_EDITOR_ROLES = ['SuperAdmin', 'NewsEditor'];

router.get('/', async (req, res) => {
    try {
        const news = await News.find().sort({ createdAt: -1 });
        return res.json(news);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch news' });
    }
});

router.post('/add', authenticateToken, requireRoles(NEWS_EDITOR_ROLES), upload.single('image'), async (req, res) => {
    try {
        const { title, postLink } = req.body;

        if (!title || !postLink || !req.file) {
            return res.status(400).json({ success: false, message: 'Title, link and image are required' });
        }

        const newsItem = new News({
            title,
            postLink,
            image: `/uploads/${req.file.filename}`
        });

        await newsItem.save();
        await writeAuditLog(req, {
            module: 'Newsroom',
            action: 'news.create',
            targetType: 'News',
            targetId: String(newsItem._id),
            details: { title: newsItem.title }
        });
        return res.status(201).json({ success: true, message: 'News created successfully', data: newsItem });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create news item' });
    }
});

router.put('/:id', authenticateToken, requireRoles(NEWS_EDITOR_ROLES), upload.single('image'), async (req, res) => {
    try {
        const existing = await News.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'News item not found' });
        }

        const title = String(req.body?.title || '').trim();
        const postLink = String(req.body?.postLink || '').trim();

        if (!title || !postLink) {
            return res.status(400).json({ success: false, message: 'Title and link are required' });
        }

        const update = {
            title,
            postLink
        };

        if (req.file) {
            update.image = `/uploads/${req.file.filename}`;
        }

        const updated = await News.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!updated) {
            return res.status(404).json({ success: false, message: 'News item not found' });
        }

        if (req.file && existing.image) {
            deleteManagedFileByUrl(existing.image);
        }

        await writeAuditLog(req, {
            module: 'Newsroom',
            action: 'news.update',
            targetType: 'News',
            targetId: String(updated._id),
            details: { title: updated.title }
        });

        return res.json({ success: true, message: 'News updated successfully', data: updated });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update news item' });
    }
});

router.delete('/:id', authenticateToken, requireRoles(NEWS_EDITOR_ROLES), async (req, res) => {
    try {
        const deleted = await News.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'News item not found' });
        }

        deleteManagedFileByUrl(deleted.image);

        await writeAuditLog(req, {
            module: 'Newsroom',
            action: 'news.delete',
            targetType: 'News',
            targetId: String(deleted._id),
            details: { title: deleted.title }
        });

        return res.json({ success: true, message: 'News deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete news item' });
    }
});

module.exports = router;
