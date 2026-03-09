const mongoose = require('mongoose'); // 👈 تأكيد الاستدعاء هنا كمان

const regulatorySchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, enum: ['ISO', 'CE', 'FDA', 'Local'], required: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    fee: { type: Number, default: 0, min: 0 },
    currency: { type: String, enum: ['USD', 'EGP'], default: 'EGP' },
    documentFile: { type: String }, // رابط ملف الـ PDF
}, { timestamps: true });

module.exports = mongoose.model('Regulatory', regulatorySchema);