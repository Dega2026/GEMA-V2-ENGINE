const jwt = require('jsonwebtoken');
const { authenticateToken, requireRoles } = require('../../middleware/auth');

describe('middleware/auth', () => {
  const JWT_SECRET = process.env.JWT_SECRET;

  function makeRes() {
    const res = {
      statusCode: 200,
      body: null,
      status(code) { res.statusCode = code; return res; },
      json(data) { res.body = data; return res; },
    };
    return res;
  }

  describe('authenticateToken', () => {
    it('calls next() with a valid token', () => {
      const token = jwt.sign({ id: 'u1', role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = makeRes();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('u1');
      expect(req.user.role).toBe('admin');
    });

    it('returns 401 when no authorization header', () => {
      const req = { headers: {} };
      const res = makeRes();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when header does not start with Bearer', () => {
      const req = { headers: { authorization: 'Basic abc' } };
      const res = makeRes();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for an expired token', () => {
      const token = jwt.sign({ id: 'u1', role: 'admin' }, JWT_SECRET, { expiresIn: '0s' });
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = makeRes();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/Invalid or expired/);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for a token signed with wrong secret', () => {
      const token = jwt.sign({ id: 'u1' }, 'wrong-secret');
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = makeRes();
      const next = jest.fn();

      authenticateToken(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRoles', () => {
    it('calls next() when user has an allowed role', () => {
      const middleware = requireRoles(['admin', 'superadmin']);
      const req = { user: { role: 'admin' } };
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('returns 403 when user role is not in allowed list', () => {
      const middleware = requireRoles(['admin']);
      const req = { user: { role: 'viewer' } };
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when req.user is undefined', () => {
      const middleware = requireRoles(['admin']);
      const req = {};
      const res = makeRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
