jest.mock('../../utils/securityLogger', () => ({
  appendSecurityLog: jest.fn(),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
}));

describe('middleware/securityHardening', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
    process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-for-unit-tests';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadModule() {
    return require('../../middleware/securityHardening');
  }

  function makeRes() {
    const res = {
      statusCode: 200,
      body: null,
      headers: {},
      status(code) { res.statusCode = code; return res; },
      json(data) { res.body = data; return res; },
      setHeader(k, v) { res.headers[k] = v; },
    };
    return res;
  }

  describe('isSecurityBypassed', () => {
    it('returns false when BYPASS_SECURITY is not set', () => {
      delete process.env.BYPASS_SECURITY;
      const { isSecurityBypassed } = loadModule();
      expect(isSecurityBypassed()).toBe(false);
    });

    it('returns true when BYPASS_SECURITY is true and not production', () => {
      process.env.BYPASS_SECURITY = 'true';
      process.env.NODE_ENV = 'development';
      const { isSecurityBypassed } = loadModule();
      expect(isSecurityBypassed()).toBe(true);
    });

    it('returns false when BYPASS_SECURITY is true but NODE_ENV is production', () => {
      process.env.BYPASS_SECURITY = 'true';
      process.env.NODE_ENV = 'production';
      const { isSecurityBypassed } = loadModule();
      expect(isSecurityBypassed()).toBe(false);
    });
  });

  describe('isNgrokRequest', () => {
    it('detects ngrok-free.app in host', () => {
      const { isNgrokRequest } = loadModule();
      const req = { headers: { host: 'abc.ngrok-free.app', origin: '', referer: '' } };
      expect(isNgrokRequest(req)).toBe(true);
    });

    it('detects ngrok.io in origin', () => {
      const { isNgrokRequest } = loadModule();
      const req = { headers: { host: 'localhost', origin: 'https://abc.ngrok.io', referer: '' } };
      expect(isNgrokRequest(req)).toBe(true);
    });

    it('returns false for regular requests', () => {
      const { isNgrokRequest } = loadModule();
      const req = { headers: { host: 'localhost:3000', origin: 'http://localhost:3000', referer: '' } };
      expect(isNgrokRequest(req)).toBe(false);
    });

    it('detects ngrok in x-forwarded-host', () => {
      const { isNgrokRequest } = loadModule();
      const req = { headers: { host: 'localhost', origin: '', referer: '', 'x-forwarded-host': 'test.ngrok-free.app' } };
      expect(isNgrokRequest(req)).toBe(true);
    });
  });

  describe('buildCorsOptions', () => {
    it('returns an object with expected CORS fields', () => {
      const { buildCorsOptions } = loadModule();
      const opts = buildCorsOptions();
      expect(opts.origin).toBe(true);
      expect(opts.methods).toContain('GET');
      expect(opts.methods).toContain('POST');
      expect(opts.allowedHeaders).toContain('Authorization');
      expect(opts.credentials).toBe(false);
      expect(typeof opts.maxAge).toBe('number');
    });
  });

  describe('attachRequestId', () => {
    it('generates a request ID when none is provided', () => {
      const { attachRequestId } = loadModule();
      const req = { headers: {} };
      const res = makeRes();
      const next = jest.fn();

      attachRequestId(req, res, next);

      expect(req.requestId).toBeTruthy();
      expect(res.headers['X-Request-Id']).toBe(req.requestId);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('preserves an incoming x-request-id', () => {
      const { attachRequestId } = loadModule();
      const req = { headers: { 'x-request-id': 'incoming-id-123' } };
      const res = makeRes();
      const next = jest.fn();

      attachRequestId(req, res, next);

      expect(req.requestId).toBe('incoming-id-123');
      expect(res.headers['X-Request-Id']).toBe('incoming-id-123');
    });
  });

  describe('shouldSkipSecurity', () => {
    it('returns true when security is bypassed', () => {
      process.env.BYPASS_SECURITY = 'true';
      process.env.NODE_ENV = 'development';
      const { shouldSkipSecurity } = loadModule();
      const req = { headers: {} };
      expect(shouldSkipSecurity(req)).toBe(true);
    });
  });

  describe('wafGuard', () => {
    it('allows normal requests through', () => {
      const { wafGuard } = loadModule();
      const req = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        originalUrl: '/api/products',
        query: {},
        body: { name: 'Widget' },
        method: 'GET',
      };
      const res = makeRes();
      const next = jest.fn();

      wafGuard(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('blocks requests with SQL injection patterns', () => {
      const securityLogger = require('../../utils/securityLogger');
      securityLogger.getClientIp.mockReturnValue('10.0.0.1');

      const { wafGuard } = loadModule();
      const req = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        originalUrl: '/api/products?q=union select * from users',
        query: { q: 'union select * from users' },
        body: {},
        method: 'GET',
      };
      const res = makeRes();
      const next = jest.fn();

      wafGuard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('blocks requests with XSS patterns', () => {
      const securityLogger = require('../../utils/securityLogger');
      securityLogger.getClientIp.mockReturnValue('10.0.0.1');

      const { wafGuard } = loadModule();
      const req = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        originalUrl: '/api/data',
        query: {},
        body: { comment: '<script>alert(1)</script>' },
        method: 'POST',
      };
      const res = makeRes();
      const next = jest.fn();

      wafGuard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
    });

    it('blocks path traversal attempts', () => {
      const securityLogger = require('../../utils/securityLogger');
      securityLogger.getClientIp.mockReturnValue('10.0.0.1');

      const { wafGuard } = loadModule();
      const req = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        originalUrl: '/api/../../../etc/passwd',
        query: {},
        body: {},
        method: 'GET',
      };
      const res = makeRes();
      const next = jest.fn();

      wafGuard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
    });

    it('skips WAF when security is bypassed', () => {
      process.env.BYPASS_SECURITY = 'true';
      process.env.NODE_ENV = 'development';
      const mod = loadModule();
      const req = {
        headers: { 'user-agent': 'Mozilla/5.0' },
        originalUrl: '/api/products?q=union select * from users',
        query: { q: 'union select * from users' },
        body: {},
        method: 'GET',
      };
      const res = makeRes();
      const next = jest.fn();

      mod.wafGuard(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
