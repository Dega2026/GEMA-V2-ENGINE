const fs = require('fs');
const path = require('path');

jest.mock('fs');

const { deleteManagedFileByUrl, replaceManagedFile } = require('../../utils/fileCleanup');

describe('fileCleanup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deleteManagedFileByUrl', () => {
    it('returns false for non-string input', () => {
      expect(deleteManagedFileByUrl(null)).toBe(false);
      expect(deleteManagedFileByUrl(undefined)).toBe(false);
      expect(deleteManagedFileByUrl(123)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(deleteManagedFileByUrl('')).toBe(false);
    });

    it('returns false for unrecognized path prefix', () => {
      expect(deleteManagedFileByUrl('/images/photo.jpg')).toBe(false);
    });

    it('returns false for path traversal attempts', () => {
      expect(deleteManagedFileByUrl('/uploads/../secret.txt')).toBe(false);
    });

    it('returns false for paths with slashes in filename', () => {
      expect(deleteManagedFileByUrl('/uploads/subdir/file.jpg')).toBe(false);
    });

    it('deletes an existing file in /uploads/', () => {
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockReturnValue(undefined);

      const result = deleteManagedFileByUrl('/uploads/photo.jpg');
      expect(result).toBe(true);
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
    });

    it('deletes an existing file in /datasheets/', () => {
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockReturnValue(undefined);

      const result = deleteManagedFileByUrl('/datasheets/spec.pdf');
      expect(result).toBe(true);
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
    });

    it('returns false when file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const result = deleteManagedFileByUrl('/uploads/missing.jpg');
      expect(result).toBe(false);
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('returns false when unlinkSync throws', () => {
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => { throw new Error('EACCES'); });

      const result = deleteManagedFileByUrl('/uploads/locked.jpg');
      expect(result).toBe(false);
    });
  });

  describe('replaceManagedFile', () => {
    it('returns false when oldUrl is empty', () => {
      expect(replaceManagedFile('', '/uploads/new.jpg')).toBe(false);
    });

    it('returns false when oldUrl is null', () => {
      expect(replaceManagedFile(null, '/uploads/new.jpg')).toBe(false);
    });

    it('returns false when oldUrl equals newUrl', () => {
      expect(replaceManagedFile('/uploads/same.jpg', '/uploads/same.jpg')).toBe(false);
    });

    it('deletes the old file when URLs differ', () => {
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockReturnValue(undefined);

      const result = replaceManagedFile('/uploads/old.jpg', '/uploads/new.jpg');
      expect(result).toBe(true);
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
    });

    it('handles non-string newUrl gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockReturnValue(undefined);

      const result = replaceManagedFile('/uploads/old.jpg', null);
      expect(result).toBe(true);
    });
  });
});
