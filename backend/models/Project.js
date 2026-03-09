const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    projectName: { 
        type: String, 
        required: true 
    },
    location: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['Planning', 'InProgress', 'Completed'], 
        default: 'Planning' 
    },
    progress: { 
        type: Number, 
        min: 0, 
        max: 100, 
        default: 0 
    },
    description: { 
        type: String 
    },
    projectImage: { 
        type: String 
    },
    // ✅ إضافة الأسعار والعملات للمشاريع
    price: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        enum: ['USD', 'EGP'],
        default: 'EGP'
    },
    // ✅ إضافة الملفات
    datasheet: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);