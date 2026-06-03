const multer = require('multer');
const path = require('path');
const fs = require('fs');

const FRONTEND_UPLOADS_DIR = path.join(__dirname, '../../frontend/public/assets/uploads');
const BACKEND_DATASHEETS_DIR = path.join(__dirname, '../uploads/datasheets');

const ALLOWED_IMAGE_MIMES = ['image/webp', 'image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/avif'];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function createUploadStorage({ prefix = 'file', supportDatasheets = false } = {}) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      if (supportDatasheets && file.fieldname === 'datasheet') {
        ensureDir(BACKEND_DATASHEETS_DIR);
        cb(null, BACKEND_DATASHEETS_DIR);
        return;
      }

      ensureDir(FRONTEND_UPLOADS_DIR);
      cb(null, FRONTEND_UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });
}

function createUpload({ prefix = 'file', maxFileSize = 10 * 1024 * 1024, supportDatasheets = false } = {}) {
  return multer({
    storage: createUploadStorage({ prefix, supportDatasheets }),
    limits: { fileSize: maxFileSize }
  });
}

module.exports = {
  FRONTEND_UPLOADS_DIR,
  BACKEND_DATASHEETS_DIR,
  ALLOWED_IMAGE_MIMES,
  ensureDir,
  createUploadStorage,
  createUpload
};
