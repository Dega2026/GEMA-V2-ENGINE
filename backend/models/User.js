const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { isStrongPassword, getPasswordPolicyMessage } = require('../utils/passwordPolicy');

// 1. تصميم جدول الموظفين (GEMA Staff Schema)
const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, // تريكة: يضمن إن Mora@gema هو نفسه mora@gema
        trim: true       // يمسح أي مسافة زيادة من الكيبورد
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        // القائمة البيضاء: لازم تطابق الـ Logic والـ HTML بالظبط
        enum: ['SuperAdmin', 'Regulatory', 'Engineer', 'EngineeringOps', 'Staff', 'ProductAdmin', 'NewsEditor', 'OperationsAdmin'], 
        default: 'Staff' 
    },
    department: {
        type: String,
        enum: ['Medical', 'Industrial', 'Sourcing', 'Logistics'],
        default: 'Medical'
    },
    lastLogin: {
        type: Date,
        default: null
    },
    activityCount: {
        type: Number,
        default: 0,
        min: 0
    },
    isFrozen: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// 2. نظام التشفير التلقائي (Matrix Security)
userSchema.pre('save', async function() {
    // لو الباسورد متغيرش (زي تحديث اسم الموظف مثلاً) نخرج فوراً
    if (!this.isModified('password')) return;

    if (!isStrongPassword(this.password)) {
        throw new Error(getPasswordPolicyMessage());
    }
    
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    // لاحظ: لا نستخدم next() بناءً على تجربتك الناجحة مع async
});

// 3. تريكة اللوجين (Helper Method)
// دي بتسهل عليك كود تسجيل الدخول في الـ Routes
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);