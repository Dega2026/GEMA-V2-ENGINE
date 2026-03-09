const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const Project = require('../models/Project');
const mongoose = require('mongoose');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { deleteManagedFileByUrl } = require('../utils/fileCleanup');

// 1. مسار إضافة مشروع جديد (POST /add)
router.post('/add', upload.fields([
    { name: 'projectImage', maxCount: 1 },
    { name: 'datasheet', maxCount: 1 }
]), authenticateToken, requireRoles(['SuperAdmin', 'Engineer', 'EngineeringOps', 'OperationsAdmin']), async (req, res) => {
    try {
        const { projectName, location, status, progress, description, price, currency } = req.body;

        const newProject = new Project({
            projectName,
            location,
            status,
            progress: parseInt(progress) || 0,
            description,
            price: parseFloat(price) || 0,
            currency: currency || 'EGP',
            projectImage: req.files['projectImage'] ? `/uploads/${req.files['projectImage'][0].filename}` : '/assets/images/default-project.jpg',
            datasheet: req.files['datasheet'] ? `/uploads/${req.files['datasheet'][0].filename}` : ''
        });

        await newProject.save();
        res.status(201).json({ success: true, message: 'Project Deployed Successfully!' });
    } catch (err) {
        console.error("❌ Deployment Error:", err);
        res.status(500).json({ success: false, error: 'Internal Matrix Error.' });
    }
});

// 2. تحديث مشروع (PUT /:id)
router.put('/:id', authenticateToken, requireRoles(['SuperAdmin', 'Engineer', 'EngineeringOps', 'OperationsAdmin']), async (req, res) => {
    try {
        // التأكد من صحة الـ ID أولاً لمنع أخطاء CastError
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid Project ID format' });
        }

        const { progress, status } = req.body;
        const parsedProgress = Number.parseInt(progress, 10);
        const allowedStatuses = ['Planning', 'InProgress', 'Completed'];

        if (!Number.isFinite(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
            return res.status(400).json({ success: false, message: 'Progress must be between 0 and 100' });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid project status' });
        }

        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            { progress: parsedProgress, status },
            { new: true }
        );

        if (updatedProject) {
            res.json({ success: true, message: 'Matrix Updated!', project: updatedProject });
        } else {
            console.log(`⚠️ Project with ID ${req.params.id} not found for update`);
            res.status(404).json({ success: false, message: 'Project not found in Matrix' });
        }
    } catch (err) {
        console.error("❌ Update Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. جلب مشروع واحد (GET /:id)
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }

        const project = await Project.findById(req.params.id);
        if (project) {
            res.json(project);
        } else {
            console.log(`⚠️ Fetch failed: ID ${req.params.id} does not exist in DB`);
            res.status(404).json({ message: "Project missing from database" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. حذف مشروع (DELETE /:id)
router.delete('/:id', authenticateToken, requireRoles(['SuperAdmin', 'Engineer', 'EngineeringOps', 'OperationsAdmin']), async (req, res) => {
    try {
        const deleted = await Project.findByIdAndDelete(req.params.id);
        if (deleted) {
            deleteManagedFileByUrl(deleted.projectImage);
            deleteManagedFileByUrl(deleted.datasheet);
            res.json({ success: true, message: 'Project Terminated Successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Project not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error deleting project' });
    }
});

// 5. جلب كل المشاريع (GET /)
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching projects' });
    }
});

module.exports = router;