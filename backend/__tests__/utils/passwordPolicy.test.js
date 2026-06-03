const { isStrongPassword, getPasswordPolicyMessage } = require('../../utils/passwordPolicy');

describe('passwordPolicy', () => {
  describe('isStrongPassword', () => {
    it('accepts a password meeting all criteria', () => {
      expect(isStrongPassword('Abcdef1!')).toBe(true);
    });

    it('accepts a long complex password', () => {
      expect(isStrongPassword('MyP@ssw0rd!123')).toBe(true);
    });

    it('rejects a password without uppercase', () => {
      expect(isStrongPassword('abcdef1!')).toBe(false);
    });

    it('rejects a password without lowercase', () => {
      expect(isStrongPassword('ABCDEF1!')).toBe(false);
    });

    it('rejects a password without a digit', () => {
      expect(isStrongPassword('Abcdefg!')).toBe(false);
    });

    it('rejects a password without a symbol', () => {
      expect(isStrongPassword('Abcdef12')).toBe(false);
    });

    it('rejects a password shorter than 8 characters', () => {
      expect(isStrongPassword('Ab1!xyz')).toBe(false);
    });

    it('rejects an empty string', () => {
      expect(isStrongPassword('')).toBe(false);
    });

    it('handles null gracefully', () => {
      expect(isStrongPassword(null)).toBe(false);
    });

    it('handles undefined gracefully', () => {
      expect(isStrongPassword(undefined)).toBe(false);
    });

    it('handles non-string input gracefully', () => {
      expect(isStrongPassword(12345678)).toBe(false);
    });
  });

  describe('getPasswordPolicyMessage', () => {
    it('returns a non-empty string', () => {
      const msg = getPasswordPolicyMessage();
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    });

    it('mentions minimum length requirement', () => {
      expect(getPasswordPolicyMessage()).toMatch(/8/);
    });
  });
});
