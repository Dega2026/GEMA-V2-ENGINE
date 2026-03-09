const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Pharmacy name is required'],
            trim: true
        },
        slug: {
            type: String,
            required: [true, 'Pharmacy slug is required'],
            unique: true,
            trim: true,
            lowercase: true
        },
        logo: {
            type: String,
            default: '/assets/branding/logo-GEMA.png',
            trim: true
        },
        landingPageUrl: {
            type: String,
            default: '',
            trim: true
        },
        approvedProducts: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }]
    },
    { timestamps: true }
);

module.exports = mongoose.model('Pharmacy', pharmacySchema);
