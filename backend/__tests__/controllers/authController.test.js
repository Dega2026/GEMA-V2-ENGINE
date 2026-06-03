jest.mock('../../models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../../utils/securityLogger', () => ({
  appendSecurityLog: jest.fn(),
  getClientIp: jest.fn().mockReturnValue('127.0.0.1'),
}));

jest.mock('../../utils/auditLogger', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../middleware/securityHardening', () => ({
  shouldSkipSecurity: jest.fn().mockReturnValue(false),
  isNgrokRequest: jest.fn().mockReturnValue(false),
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

const { loginHandler, refreshTokenHandler } = require('../../controllers/authController');

describe('controllers/authController', () => {
  function makeReq(overrides = {}) {
    return {
      headers: { 'user-agent': 'test-agent', ...overrides.headers },
      ip: '127.0.0.1',
      body: { username: 'admin', password: 'P@ssw0rd!', ...overrides.body },
      ...overrides,
    };
  }

  function makeRes() {
    const res = {
      statusCode: 200,
      body: null,
      cookies: {},
      status(code) { res.statusCode = code; return res; },
      json(data) { res.body = data; return res; },
      cookie(name, val, opts) { res.cookies[name] = { val, opts }; },
    };
    return res;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loginHandler', () => {
    it('returns 400 when username is missing', async () => {
      const req = makeReq({ body: { username: '', password: 'P@ssw0rd!' } });
      const res = makeRes();

      await loginHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 when password is missing', async () => {
      const req = makeReq({ body: { username: 'admin', password: '' } });
      const res = makeRes();

      await loginHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when user is not found', async () => {
      User.findOne.mockResolvedValue(null);
      const req = makeReq();
      const res = makeRes();

      await loginHandler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Invalid GEMA Access ID/);
    });

    it('returns 403 when account is frozen', async () => {
      User.findOne.mockResolvedValue({
        _id: 'u1',
        isFrozen: true,
        password: 'hashed',
      });
      const req = makeReq();
      const res = makeRes();

      await loginHandler(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/frozen/i);
    });

    it('returns 401 on wrong password', async () => {
      const hashed = await bcrypt.hash('CorrectPassword1!', 10);
      User.findOne.mockResolvedValue({
        _id: 'u1',
        isFrozen: false,
        password: hashed,
        name: 'admin',
        role: 'admin',
      });

      const req = makeReq({ body: { username: 'admin', password: 'WrongPassword' } });
      const res = makeRes();

      await loginHandler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Invalid Security Key/);
    });

    it('returns 200 with tokens on successful login', async () => {
      const hashed = await bcrypt.hash('P@ssw0rd!', 10);
      const mockUser = {
        _id: 'u1',
        isFrozen: false,
        password: hashed,
        name: 'admin',
        role: 'admin',
        department: 'Medical',
        lastLogin: null,
        activityCount: 0,
        save: jest.fn().mockResolvedValue(undefined),
      };
      User.findOne.mockResolvedValue(mockUser);

      const req = makeReq();
      const res = makeRes();

      await loginHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
      expect(res.body.user.name).toBe('admin');
      expect(res.cookies.gema_access_token).toBeDefined();
      expect(res.cookies.gema_refresh_token).toBeDefined();
    });

    it('handles database errors gracefully', async () => {
      User.findOne.mockRejectedValue(new Error('DB connection lost'));

      const req = makeReq();
      const res = makeRes();

      await loginHandler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('refreshTokenHandler', () => {
    it('returns 400 when refresh token is missing', async () => {
      const req = makeReq({ body: { refreshToken: '' } });
      const res = makeRes();

      await refreshTokenHandler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('returns 401 when refresh token is invalid', async () => {
      const req = makeReq({ body: { refreshToken: 'bad-token' } });
      const res = makeRes();

      await refreshTokenHandler(req, res);

      expect(res.statusCode).toBe(401);
    });

    it('returns 401 when token type is not refresh', async () => {
      const token = jwt.sign(
        { id: 'u1', role: 'admin', type: 'access' },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '1h' },
      );
      const req = makeReq({ body: { refreshToken: token } });
      const res = makeRes();

      await refreshTokenHandler(req, res);

      expect(res.statusCode).toBe(401);
    });

    it('returns 401 when user no longer exists', async () => {
      const token = jwt.sign(
        { id: 'deleted-user', role: 'admin', type: 'refresh' },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '1h' },
      );
      User.findById.mockResolvedValue(null);

      const req = makeReq({ body: { refreshToken: token } });
      const res = makeRes();

      await refreshTokenHandler(req, res);

      expect(res.statusCode).toBe(401);
    });

    it('returns new tokens on valid refresh', async () => {
      const token = jwt.sign(
        { id: 'u1', role: 'admin', type: 'refresh' },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '1h' },
      );
      User.findById.mockResolvedValue({
        _id: 'u1',
        name: 'admin',
        role: 'admin',
      });

      const req = makeReq({ body: { refreshToken: token } });
      const res = makeRes();

      await refreshTokenHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
    });
  });
});
