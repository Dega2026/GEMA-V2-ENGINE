const mongoose = require('mongoose');
const DEFAULT_PRODUCT_IMAGE = '/assets/images/sectors/products.jpg';

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'اسم المنتج مطلوب'],
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Manufacturing', 'Trading', 'Engineering', 'RawMaterial', 'Component', 'MedicalCosmetics']
    },
    sector: {
        type: String,
        enum: ['Equipment', 'RawMaterial', 'Component', 'Cosmetic'],
        default: 'Equipment'
    },
    origin: {
        type: String,
        enum: ['Internal', 'Commercial'],
        default: 'Internal'
    },
    logistics: {
        type: String,
        enum: ['Import', 'Export', 'Local'],
        default: 'Local'
    },
    // 🔥 التخصص الطبي
    specialty: {
        type: String,
        required: true,
        enum: ['IV Fluids', 'Cardiology', 'OR Solutions', 'Dental', 'Consumables', 'General', 'Manufacturing Components', 'Imported Raw Materials', 'Pharmacies'],
        default: 'General'
    },
    description: {
        type: String,
        required: true
    },
    // ✅ إضافة الأسعار والعملات
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
    image: {
        type: String, 
        default: DEFAULT_PRODUCT_IMAGE
    },
    imagePath: {
        type: String,
        default: DEFAULT_PRODUCT_IMAGE
    },
    datasheet: {
        type: String 
    },
    datasheet_url: {
        type: String,
        default: ''
    },
    partnerPharmacies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy'
    }],
    technicalSpecs: {
        material: String,
        compliance: String, 
        origin: String,        
        components: String,    
        sizes: String,         
        sterilization: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Keep legacy `image` and new `imagePath` synchronized to avoid breaking existing UI/admin flows.
ProductSchema.pre('validate', function syncImageFields() {
    const safeImage = typeof this.image === 'string' ? this.image.trim() : '';
    const safeImagePath = typeof this.imagePath === 'string' ? this.imagePath.trim() : '';

    if (!safeImage && safeImagePath) {
        this.image = safeImagePath;
    }

    if (!safeImagePath && safeImage) {
        this.imagePath = safeImage;
    }

    if (!this.image && !this.imagePath) {
        this.image = DEFAULT_PRODUCT_IMAGE;
        this.imagePath = DEFAULT_PRODUCT_IMAGE;
    }
});

module.exports = mongoose.model('Product', ProductSchema);