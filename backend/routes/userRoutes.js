const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { loginRateLimiter, loginHandler } = require('../controllers/authController');
const { isStrongPassword, getPasswordPolicyMessage } = require('../utils/passwordPolicy');

// ==========================================
// 1. مسار تسجيل الدخول (Login System) - POST /login (first)
// ==========================================
router.post('/login', loginRateLimiter, (req, res) => {
    res.setHeader('X-GEMA-Deprecated', 'Use /api/auth/login');
    return loginHandler(req, res);
});

// ==========================================
// 2. مسار إضافة موظف جديد (POST /add)
// ==========================================
router.post('/add', authenticateToken, requireRoles(['SuperAdmin']), async (req, res) => {
    try {
        let { name, email, password, role, department } = req.body;

        if (!isStrongPassword(password)) {
            return res.status(400).json({ success: false, message: getPasswordPolicyMessage() });
        }

        email = email.trim().toLowerCase();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists in GEMA system' });
        }

        const newUser = new User({
            name,
            email,
            password,
            role: role || 'Staff',
            department: department || 'Medical'
        });

        await newUser.save(); 
        res.status(201).json({ success: true, message: 'GEMA Staff Member Deployed Successfully' });

    } catch (err) {
        console.error("Add User Error:", err);
        res.status(500).json({ success: false, message: 'Server Error during GEMA deployment' });
    }
});

// ==========================================
// 3. مسار إعدام حساب موظف (DELETE /:id)
// ==========================================
router.delete('/:id', authenticateToken, requireRoles(['SuperAdmin']), async (req, res) => {
    try {
        const deleted = await User.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'GEMA Account Terminated Successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error terminating GEMA account' });
    }
});

// ==========================================
// 3.5. مسار تحديث كلمة مرور موظف (PUT /update-password/:id)
// ==========================================
router.put('/update-password/:id', authenticateToken, requireRoles(['SuperAdmin']), async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!isStrongPassword(password)) {
            return res.status(400).json({ success: false, message: getPasswordPolicyMessage() });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        user.password = password; // This will trigger the pre-save hook to hash the password
        await user.save();
        
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error("Update Password Error:", err);
        res.status(500).json({ success: false, message: 'Error updating password' });
    }
});

// ==========================================
// 4. مسار جلب كل الموظفين (GET /) - last
// ==========================================
router.get('/', authenticateToken, requireRoles(['SuperAdmin', 'OperationsAdmin']), async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching GEMA staff matrix' });
    }
});
// مسار تحديث رتبة الموظف (PUT)
router.put('/update-role/:id', authenticateToken, requireRoles(['SuperAdmin']), async (req, res) => {
    try {
        const { role } = req.body;
        const allowedRoles = ['SuperAdmin', 'Regulatory', 'Engineer', 'EngineeringOps', 'Staff', 'ProductAdmin', 'NewsEditor', 'OperationsAdmin'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role value' });
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
        if (updatedUser) res.json({ success: true, message: "Role Updated" });
        else res.status(404).json({ success: false, message: "User not found" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/freeze/:id', authenticateToken, requireRoles(['SuperAdmin']), async (req, res) => {
    try {
        const payload = req.body || {};
        const freezeValue = typeof payload.isFrozen === 'boolean' ? payload.isFrozen : true;

        const updated = await User.findByIdAndUpdate(
            req.params.id,
            { isFrozen: freezeValue },
            { new: true }
        ).select('-password');

        if (!updated) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.json({
            success: true,
            message: freezeValue ? 'Account frozen successfully.' : 'Account unfrozen successfully.',
            data: updated
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to update freeze status.' });
    }
});

router.get('/activity', authenticateToken, requireRoles(['SuperAdmin', 'OperationsAdmin']), async (req, res) => {
    try {
        const limitRaw = Number.parseInt(String(req.query.limit || '120').trim(), 10);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 120;

        const query = {};
        const userId = String(req.query.userId || '').trim();
        const moduleName = String(req.query.module || '').trim();
        const dateText = String(req.query.date || '').trim();

        if (userId) {
            query['actor.userId'] = userId;
        }

        if (moduleName) {
            query.module = moduleName;
        }

        if (dateText) {
            const fromDate = new Date(`${dateText}T00:00:00.000Z`);
            if (!Number.isNaN(fromDate.getTime())) {
                const toDate = new Date(fromDate);
                toDate.setUTCDate(toDate.getUTCDate() + 1);
                query.createdAt = { $gte: fromDate, $lt: toDate };
            }
        }

        const logs = await AuditLog.find(query)
            .sort({ timestamp: -1, createdAt: -1 })
            .limit(limit)
            .lean();

        return res.json({
            success: true,
            data: {
                logs,
                filters: {
                    userId,
                    module: moduleName,
                    date: dateText,
                    limit,
                }
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch filtered activity.' });
    }
});

router.get('/activity/:id', authenticateToken, requireRoles(['SuperAdmin', 'OperationsAdmin']), async (req, res) => {
    try {
        const limitRaw = Number.parseInt(String(req.query.limit || '20').trim(), 10);
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

        const user = await User.findById(req.params.id).select('name email role department lastLogin activityCount isFrozen');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const query = { 'actor.userId': String(req.params.id) };
        if (req.query.module) {
            query.module = String(req.query.module).trim();
        }
        if (req.query.date) {
            const day = String(req.query.date).trim();
            const fromDate = new Date(`${day}T00:00:00.000Z`);
            if (!Number.isNaN(fromDate.getTime())) {
                const toDate = new Date(fromDate);
                toDate.setUTCDate(toDate.getUTCDate() + 1);
                query.createdAt = { $gte: fromDate, $lt: toDate };
            }
        }

        const logs = await AuditLog.find(query)
            .sort({ timestamp: -1, createdAt: -1 })
            .limit(limit)
            .lean();

        return res.json({
            success: true,
            data: {
                user,
                logs
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch staff activity.' });
    }
});

module.exports = router;