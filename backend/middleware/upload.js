const multer = require('multer');
const path = require('path');
const fs = require('fs');

// تحديد مسار التخزين
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../frontend/public/assets/uploads');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // إنشاء اسم ملف فريد: timestamp + original name
        const timestamp = Date.now();
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
        cb(null, `${timestamp}_${sanitized}`);
    }
});

// تصفية الملفات المسموح بها
const fileFilter = (req, file, cb) => {
    // أنواع الملفات المسموح بها
    const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Only images and PDF/DOC files are allowed. Got: ${file.mimetype}`), false);
    }
};

// إعدادات multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB max
        files: 5 // حد أقصى 5 ملفات في الطلب الواحد
    }
});

module.exports = upload;
