describe('config/env', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadEnv() {
    return require('../../config/env');
  }

  describe('requireEnv', () => {
    it('returns the trimmed value when the variable exists', () => {
      process.env.TEST_VAR = '  hello  ';
      const { requireEnv } = loadEnv();
      expect(requireEnv('TEST_VAR')).toBe('hello');
    });

    it('throws when the variable is missing', () => {
      delete process.env.MISSING_VAR;
      const { requireEnv } = loadEnv();
      expect(() => requireEnv('MISSING_VAR')).toThrow(/Missing required environment variable/);
    });

    it('throws when the variable is an empty string', () => {
      process.env.EMPTY_VAR = '';
      const { requireEnv } = loadEnv();
      expect(() => requireEnv('EMPTY_VAR')).toThrow(/Missing required environment variable/);
    });

    it('throws when the variable is only whitespace', () => {
      process.env.SPACE_VAR = '   ';
      const { requireEnv } = loadEnv();
      expect(() => requireEnv('SPACE_VAR')).toThrow(/Missing required environment variable/);
    });
  });

  describe('requireMany', () => {
    it('does not throw when all variables exist', () => {
      process.env.A = 'a';
      process.env.B = 'b';
      const { requireMany } = loadEnv();
      expect(() => requireMany(['A', 'B'])).not.toThrow();
    });

    it('throws listing all missing variables', () => {
      delete process.env.X;
      delete process.env.Y;
      process.env.Z = 'z';
      const { requireMany } = loadEnv();
      expect(() => requireMany(['X', 'Y', 'Z'])).toThrow(/X, Y/);
    });
  });

  describe('validateSecurityEnv', () => {
    it('succeeds when JWT_SECRET and REFRESH_TOKEN_SECRET are set', () => {
      process.env.JWT_SECRET = 'jwt';
      process.env.REFRESH_TOKEN_SECRET = 'refresh';
      const { validateSecurityEnv } = loadEnv();
      expect(() => validateSecurityEnv()).not.toThrow();
    });

    it('throws when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      process.env.REFRESH_TOKEN_SECRET = 'refresh';
      const { validateSecurityEnv } = loadEnv();
      expect(() => validateSecurityEnv()).toThrow(/JWT_SECRET/);
    });

    it('requires additional vars in production', () => {
      process.env.JWT_SECRET = 'jwt';
      process.env.REFRESH_TOKEN_SECRET = 'refresh';
      process.env.NODE_ENV = 'production';
      delete process.env.MONGO_URI;
      delete process.env.AUDIT_LOG_SIGNING_KEY;
      delete process.env.CORS_ALLOWED_ORIGINS;
      const { validateSecurityEnv } = loadEnv();
      expect(() => validateSecurityEnv()).toThrow(/MONGO_URI/);
    });
  });
});
