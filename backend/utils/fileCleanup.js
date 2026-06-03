const fs = require('fs');
const { FRONTEND_UPLOADS_DIR, BACKEND_DATASHEETS_DIR } = require('./uploadConfig');

function resolveManagedFilePath(fileUrl) {
  if (typeof fileUrl !== 'string') return '';

  const normalized = fileUrl.trim();
  if (!normalized) return '';

  let fileName = '';
  let baseDir = '';

  if (normalized.startsWith('/uploads/')) {
    fileName = normalized.slice('/uploads/'.length);
    baseDir = FRONTEND_UPLOADS_DIR;
  } else if (normalized.startsWith('/datasheets/')) {
    fileName = normalized.slice('/datasheets/'.length);
    baseDir = BACKEND_DATASHEETS_DIR;
  } else {
    return '';
  }

  if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return '';
  }

  return path.join(baseDir, fileName);
}

function deleteManagedFileByUrl(fileUrl) {
  const absolutePath = resolveManagedFilePath(fileUrl);
  if (!absolutePath) return false;

  try {
    if (!fs.existsSync(absolutePath)) return false;
    fs.unlinkSync(absolutePath);
    return true;
  } catch (error) {
    console.warn('Failed to delete managed file:', absolutePath, error.message);
    return false;
  }
}

function replaceManagedFile(oldUrl, newUrl) {
  const oldValue = typeof oldUrl === 'string' ? oldUrl.trim() : '';
  const newValue = typeof newUrl === 'string' ? newUrl.trim() : '';

  if (!oldValue) return false;
  if (oldValue === newValue) return false;

  return deleteManagedFileByUrl(oldValue);
}

module.exports = {
  deleteManagedFileByUrl,
  replaceManagedFile
};
