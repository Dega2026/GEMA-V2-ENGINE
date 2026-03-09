const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const Product = require('../models/Product');
const { authenticateToken, requireRoles } = require('../middleware/auth');
const { deleteManagedFileByUrl, replaceManagedFile } = require('../utils/fileCleanup');

const ALLOWED_IMAGE_MIMES = ['image/webp', 'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/avif'];
const FRONTEND_UPLOADS_DIR = path.join(__dirname, '../../frontend/public/assets/uploads/');
const PRODUCT_IMAGE_PREFIX = '/uploads/';
const DEFAULT_PRODUCT_IMAGE = '/assets/images/sectors/products.jpg';
const ALLOWED_PRODUCT_CATEGORIES = ['Manufacturing', 'Trading', 'Engineering', 'RawMaterial', 'Component', 'MedicalCosmetics'];
const ALLOWED_PRODUCT_SPECIALTIES = ['IV Fluids', 'Cardiology', 'OR Solutions', 'Dental', 'Consumables', 'General', 'Manufacturing Components', 'Imported Raw Materials', 'Pharmacies'];
const ALLOWED_PRODUCT_SECTORS = ['Equipment', 'RawMaterial', 'Component', 'Cosmetic'];
const ALLOWED_PRODUCT_ORIGINS = ['Internal', 'Commercial'];
const ALLOWED_PRODUCT_LOGISTICS = ['Import', 'Export', 'Local'];
const ALLOWED_CURRENCIES = ['USD', 'EGP'];

function normalizeProductForResponse(productDoc) {
    if (!productDoc) return null;
    const plain = typeof productDoc.toObject === 'function' ? productDoc.toObject() : { ...productDoc };
    const normalizedImage = typeof plain.imagePath === 'string' && plain.imagePath.trim().length > 0
        ? plain.imagePath.trim()
        : (typeof plain.image === 'string' && plain.image.trim().length > 0
            ? plain.image.trim()
            : DEFAULT_PRODUCT_IMAGE);

    return {
        ...plain,
        category: normalizeEnum(plain.category, ALLOWED_PRODUCT_CATEGORIES, 'Manufacturing'),
        specialty: normalizeEnum(plain.specialty, ALLOWED_PRODUCT_SPECIALTIES, 'General'),
        sector: normalizeEnum(plain.sector, ALLOWED_PRODUCT_SECTORS, 'Equipment'),
        origin: normalizeEnum(plain.origin, ALLOWED_PRODUCT_ORIGINS, 'Internal'),
        logistics: normalizeEnum(plain.logistics, ALLOWED_PRODUCT_LOGISTICS, 'Local'),
        currency: normalizeEnum(String(plain.currency || '').toUpperCase(), ALLOWED_CURRENCIES, 'EGP'),
        price: normalizePrice(plain.price),
        image: normalizedImage,
        imagePath: normalizedImage
    };
}

function safeUnlink(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.warn('Failed to delete file:', filePath, err.message);
    }
}

function cleanupLegacyProductImage(imageUrl) {
    if (!imageUrl || imageUrl === DEFAULT_PRODUCT_IMAGE) {
        return;
    }

    if (!imageUrl.startsWith(PRODUCT_IMAGE_PREFIX)) {
        return;
    }

    const relativeName = imageUrl.slice(PRODUCT_IMAGE_PREFIX.length);
    if (!relativeName || relativeName.includes('..')) {
        return;
    }

    const filePath = path.join(FRONTEND_UPLOADS_DIR, relativeName);
    safeUnlink(filePath);
}

async function convertUploadedImageToWebp(uploadedFile) {
    if (!uploadedFile) {
        return '';
    }

    const sourcePath = uploadedFile.path || path.join(FRONTEND_UPLOADS_DIR, uploadedFile.filename);
    const webpFilename = `${path.parse(uploadedFile.filename).name}.webp`;
    const targetPath = path.join(FRONTEND_UPLOADS_DIR, webpFilename);

    try {
        await sharp(sourcePath)
            .rotate()
            .webp({ quality: 82, effort: 4 })
            .toFile(targetPath);

        if (sourcePath !== targetPath) {
            safeUnlink(sourcePath);
        }

        return `${PRODUCT_IMAGE_PREFIX}${webpFilename}`;
    } catch (error) {
        // Fallback to the original uploaded image path if WEBP conversion fails.
        console.warn('Image conversion to WEBP failed, using original upload:', error.message);
        return `${PRODUCT_IMAGE_PREFIX}${uploadedFile.filename}`;
    }
}

function normalizeEnum(value, allowedValues, fallback) {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    return allowedValues.includes(raw) ? raw : fallback;
}

function normalizeText(value, fallback = '') {
    const text = String(value || '').trim();
    return text || fallback;
}

function normalizePrice(value) {
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount) || amount < 0) return 0;
    return amount;
}

// ==========================================================================
// 1. إعداد المخزن (توحيد المسار لقلب الفرونت إند)
// ==========================================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'datasheet') {
            const datasheetPath = path.join(__dirname, '../uploads/datasheets/');
            fs.mkdirSync(datasheetPath, { recursive: true });
            cb(null, datasheetPath);
            return;
        }
        // الخروج من فولدر routes ثم backend للوصول لـ frontend
        const imagePath = FRONTEND_UPLOADS_DIR;
        fs.mkdirSync(imagePath, { recursive: true });
        cb(null, imagePath);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // رفعنا الحد لـ 15 ميجا عشان الداتا شيت التقيلة
});

// ==========================================================================
// 2. مسار إضافة منتج جديد (POST /add)
// ==========================================================================
router.post('/add', authenticateToken, requireRoles(['SuperAdmin', 'ProductAdmin']), upload.fields([
    { name: 'productImage', maxCount: 1 },
    { name: 'datasheet', maxCount: 1 }
]), async (req, res) => {
    try {
        const { 
            name, category, specialty, description, price, currency,
            sector, productOrigin, logistics,
            material, compliance, origin, sizes, sterilization, components, datasheetUrl
        } = req.body;

        const productImage = req.files?.productImage?.[0];
        if (productImage && !ALLOWED_IMAGE_MIMES.includes(productImage.mimetype)) {
            safeUnlink(productImage.path);
            return res.status(400).json({
                success: false,
                message: 'Unsupported image format. Allowed: WEBP, JPG, PNG, GIF, AVIF.'
            });
        }

        let productImageUrl = DEFAULT_PRODUCT_IMAGE;
        if (productImage) {
            productImageUrl = await convertUploadedImageToWebp(productImage);
        }

        const uploadedDatasheet = req.files?.datasheet?.[0]
            ? `/datasheets/${req.files.datasheet[0].filename}`
            : '';
        const externalDatasheet = typeof datasheetUrl === 'string' ? datasheetUrl.trim() : '';
        const finalDatasheet = externalDatasheet || uploadedDatasheet;

        const normalizedName = normalizeText(name);
        const normalizedDescription = normalizeText(description);

        if (!normalizedName || !normalizedDescription) {
            return res.status(400).json({
                success: false,
                message: 'Name and description are required.'
            });
        }

        const normalizedCategory = normalizeEnum(category, ALLOWED_PRODUCT_CATEGORIES, 'Manufacturing');
        const normalizedSpecialty = normalizeEnum(specialty, ALLOWED_PRODUCT_SPECIALTIES, 'General');
        const normalizedCurrency = normalizeEnum(String(currency || '').toUpperCase(), ALLOWED_CURRENCIES, 'EGP');
        const normalizedSector = normalizeEnum(sector, ALLOWED_PRODUCT_SECTORS, 'Equipment');
        const normalizedOrigin = normalizeEnum(productOrigin, ALLOWED_PRODUCT_ORIGINS, 'Internal');
        const normalizedLogistics = normalizeEnum(logistics, ALLOWED_PRODUCT_LOGISTICS, 'Local');
        const normalizedPrice = normalizePrice(price);

        const newProduct = new Product({
            name: normalizedName,
            category: normalizedCategory,
            specialty: normalizedSpecialty,
            sector: normalizedSector,
            origin: normalizedOrigin,
            logistics: normalizedLogistics,
            description: normalizedDescription,
            price: normalizedPrice,
            currency: normalizedCurrency,
            image: productImageUrl,
            imagePath: productImageUrl,
            datasheet: finalDatasheet,
            datasheet_url: finalDatasheet,
            technicalSpecs: {
                material: normalizeText(material),
                compliance: normalizeText(compliance),
                origin: normalizeText(origin),
                sizes: normalizeText(sizes),
                sterilization: normalizeText(sterilization),
                components: normalizeText(components)
            }
        });

        const saved = await newProduct.save();
        res.status(201).json({ success: true, message: 'Product Deployed Successfully!', data: normalizeProductForResponse(saved) });
    } catch (err) {
        console.error("Deployment Error:", err);
        res.status(500).json({ success: false, error: 'Internal Matrix Error.' });
    }
});

// ==========================================================================
// 3. تحديث منتج (PUT /:id)
// ==========================================================================
router.put('/:id', authenticateToken, requireRoles(['SuperAdmin', 'ProductAdmin']), async (req, res) => {
    try {
        const {
            name, price, currency, category, specialty, description,
            sector, productOrigin, logistics,
            material, compliance, origin, sizes, sterilization, components,
            datasheetUrl, imagePath, image
        } = req.body;

        const updatePayload = {};

        if (typeof name === 'string' && name.trim().length > 0) {
            updatePayload.name = name.trim();
        }

        if (typeof description === 'string' && description.trim().length > 0) {
            updatePayload.description = description.trim();
        }

        if (typeof price !== 'undefined') {
            updatePayload.price = normalizePrice(price);
        }

        if (typeof currency !== 'undefined') {
            updatePayload.currency = normalizeEnum(String(currency || '').toUpperCase(), ALLOWED_CURRENCIES, 'EGP');
        }

        if (typeof category !== 'undefined') {
            updatePayload.category = normalizeEnum(category, ALLOWED_PRODUCT_CATEGORIES, 'Manufacturing');
        }

        if (typeof specialty !== 'undefined') {
            updatePayload.specialty = normalizeEnum(specialty, ALLOWED_PRODUCT_SPECIALTIES, 'General');
        }

        if (typeof sector !== 'undefined') {
            updatePayload.sector = normalizeEnum(sector, ALLOWED_PRODUCT_SECTORS, 'Equipment');
        }

        if (typeof productOrigin !== 'undefined') {
            updatePayload.origin = normalizeEnum(productOrigin, ALLOWED_PRODUCT_ORIGINS, 'Internal');
        }

        if (typeof logistics !== 'undefined') {
            updatePayload.logistics = normalizeEnum(logistics, ALLOWED_PRODUCT_LOGISTICS, 'Local');
        }

        const normalizedImagePath = typeof imagePath === 'string' && imagePath.trim().length > 0
            ? imagePath.trim()
            : (typeof image === 'string' && image.trim().length > 0 ? image.trim() : '');
        if (normalizedImagePath) {
            updatePayload.imagePath = normalizedImagePath;
            updatePayload.image = normalizedImagePath;
        }

        const specsPayload = {
            material,
            compliance,
            origin,
            sizes,
            sterilization,
            components
        };

        Object.entries(specsPayload).forEach(([key, value]) => {
            if (typeof value === 'string') {
                updatePayload[`technicalSpecs.${key}`] = value.trim();
            }
        });

        if (typeof datasheetUrl === 'string' && datasheetUrl.trim().length > 0) {
            updatePayload.datasheet = datasheetUrl.trim();
            updatePayload.datasheet_url = datasheetUrl.trim();
        }
        
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updatePayload,
            { new: true, runValidators: true }
        );
        
        if (updatedProduct) {
            res.json({ success: true, message: 'Product Updated Successfully', data: normalizeProductForResponse(updatedProduct) });
        } else {
            res.status(404).json({ success: false, message: 'Product not found.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error during update.' });
    }
});

router.put('/:id/image', authenticateToken, requireRoles(['SuperAdmin', 'ProductAdmin']), upload.single('productImage'), async (req, res) => {
    try {
        const productImage = req.file;

        if (!productImage) {
            return res.status(400).json({ success: false, message: 'Product image file is required.' });
        }

        if (!ALLOWED_IMAGE_MIMES.includes(productImage.mimetype)) {
            safeUnlink(productImage.path);
            return res.status(400).json({
                success: false,
                message: 'Unsupported image format. Allowed: WEBP, JPG, PNG, GIF, AVIF.'
            });
        }

        const existingProduct = await Product.findById(req.params.id);

        if (!existingProduct) {
            safeUnlink(productImage.path);
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        const previousImage = existingProduct.imagePath || existingProduct.image;
        const optimizedImageUrl = await convertUploadedImageToWebp(productImage);

        existingProduct.image = optimizedImageUrl;
        existingProduct.imagePath = optimizedImageUrl;
        const updated = await existingProduct.save();

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        cleanupLegacyProductImage(previousImage);

        return res.json({ success: true, message: 'Product image updated successfully', data: normalizeProductForResponse(updated) });
    } catch (err) {
        console.error('Image update error:', err);
        return res.status(500).json({ success: false, message: 'Server error during image update.' });
    }
});

router.put('/:id/datasheet', authenticateToken, requireRoles(['SuperAdmin', 'ProductAdmin']), upload.single('datasheet'), async (req, res) => {
    try {
        const existingProduct = await Product.findById(req.params.id);
        if (!existingProduct) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        const previousDatasheet = existingProduct.datasheet || existingProduct.datasheet_url || '';
        const filePath = req.file ? `/datasheets/${req.file.filename}` : '';
        const urlPath = typeof req.body?.datasheetUrl === 'string' ? req.body.datasheetUrl.trim() : '';
        const finalPath = filePath || urlPath;

        if (!finalPath) {
            return res.status(400).json({ success: false, message: 'Datasheet file or URL is required.' });
        }

        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            { datasheet: finalPath, datasheet_url: finalPath },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        if (req.file) {
            replaceManagedFile(previousDatasheet, finalPath);
        }

        return res.json({ success: true, message: 'Datasheet updated successfully', data: updated });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error during datasheet update.' });
    }
});

// ==========================================================================
// 4. حذف منتج (DELETE /:id)
// ==========================================================================
router.delete('/:id', authenticateToken, requireRoles(['SuperAdmin', 'ProductAdmin']), async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (deletedProduct) {
            cleanupLegacyProductImage(deletedProduct.imagePath || deletedProduct.image);
            deleteManagedFileByUrl(deletedProduct.datasheet || deletedProduct.datasheet_url || '');
            res.json({ success: true, message: 'Product Terminated Successfully.' });
        } else {
            res.status(404).json({ success: false, message: 'Product not found.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error during termination.' });
    }
});

// ==========================================================================
// 5. جلب كل المنتجات (GET /)
// ==========================================================================
router.get('/', async (req, res) => {
    try {
        const filters = {};
        const requestedSector = normalizeText(req.query?.sector);
        const requestedOrigin = normalizeText(req.query?.origin);

        if (requestedSector) {
            if (!ALLOWED_PRODUCT_SECTORS.includes(requestedSector)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid sector. Allowed values: ${ALLOWED_PRODUCT_SECTORS.join(', ')}`
                });
            }
            // Include legacy products missing `sector` as default Equipment.
            filters.$and = filters.$and || [];
            if (requestedSector === 'Equipment') {
                filters.$and.push({
                    $or: [
                        { sector: requestedSector },
                        { sector: { $exists: false } },
                        { sector: null },
                        { sector: '' }
                    ]
                });
            } else {
                filters.$and.push({ sector: requestedSector });
            }
        }

        if (requestedOrigin) {
            if (!ALLOWED_PRODUCT_ORIGINS.includes(requestedOrigin)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid origin. Allowed values: ${ALLOWED_PRODUCT_ORIGINS.join(', ')}`
                });
            }
            // Include legacy products missing `origin` as default Internal.
            filters.$and = filters.$and || [];
            if (requestedOrigin === 'Internal') {
                filters.$and.push({
                    $or: [
                        { origin: requestedOrigin },
                        { origin: { $exists: false } },
                        { origin: null },
                        { origin: '' }
                    ]
                });
            } else {
                filters.$and.push({ origin: requestedOrigin });
            }
        }

        const products = await Product.find(filters)
            .populate('partnerPharmacies', 'name logo slug landingPageUrl')
            .sort({ createdAt: -1 });
        res.json(products.map((product) => normalizeProductForResponse(product)));
    } catch (err) {
        res.status(500).json({ error: 'Error fetching products from database.' });
    }
});

// ==========================================================================
// 6. جلب منتج واحد (GET /:id)
// ==========================================================================
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('partnerPharmacies', 'name logo slug landingPageUrl');
        if (product) {
            res.json(normalizeProductForResponse(product));
        } else {
            res.status(404).json({ error: 'Product not found.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error fetching product.' });
    }
});

router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: err.message || 'Upload failed due to file constraints.'
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || 'Upload failed due to invalid file input.'
        });
    }

    return next();
});

module.exports = router;