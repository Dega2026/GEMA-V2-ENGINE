jest.mock('../../models/AuditLog', () => {
  const mockCreate = jest.fn().mockResolvedValue({});
  const mockLean = jest.fn().mockResolvedValue(null);
  const mockSelect = jest.fn().mockReturnValue({ lean: mockLean });
  const mockSort = jest.fn().mockReturnValue({ select: mockSelect });
  const mockFindOne = jest.fn().mockReturnValue({ sort: mockSort });

  return {
    findOne: mockFindOne,
    create: mockCreate,
    __mocks: { mockFindOne, mockSort, mockSelect, mockLean, mockCreate },
  };
});

const AuditLog = require('../../models/AuditLog');
const { writeAuditLog } = require('../../utils/auditLogger');

describe('auditLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeReq(overrides = {}) {
    return {
      headers: { 'user-agent': 'test-agent', ...overrides.headers },
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      user: { id: 'user123', role: 'admin', username: 'testuser', ...overrides.user },
      requestId: 'req-001',
      ...overrides,
    };
  }

  describe('writeAuditLog', () => {
    it('creates an audit log entry with correct fields', async () => {
      await writeAuditLog(makeReq(), {
        action: 'test.action',
        module: 'TestModule',
        targetType: 'User',
        targetId: 'target-1',
        details: { key: 'value' },
      });

      expect(AuditLog.create).toHaveBeenCalledTimes(1);
      const arg = AuditLog.create.mock.calls[0][0];
      expect(arg.action).toBe('test.action');
      expect(arg.module).toBe('TestModule');
      expect(arg.targetType).toBe('User');
      expect(arg.targetId).toBe('target-1');
      expect(arg.status).toBe('success');
      expect(arg.actor.userId).toBe('user123');
      expect(arg.actor.role).toBe('admin');
      expect(arg.hash).toBeTruthy();
      expect(arg.prevHash).toBe('GENESIS');
    });

    it('chains hashes from previous record', async () => {
      AuditLog.__mocks.mockLean.mockResolvedValueOnce({ hash: 'abc123' });

      await writeAuditLog(makeReq(), { action: 'chained.action' });

      const arg = AuditLog.create.mock.calls[0][0];
      expect(arg.prevHash).toBe('abc123');
    });

    it('redacts sensitive fields in details', async () => {
      await writeAuditLog(makeReq(), {
        action: 'sensitive.action',
        details: { password: 'secret123', username: 'john', token: 'abc' },
      });

      const arg = AuditLog.create.mock.calls[0][0];
      expect(arg.details.password).toBe('[REDACTED]');
      expect(arg.details.token).toBe('[REDACTED]');
      expect(arg.details.username).toBe('john');
    });

    it('handles nested sensitive fields', async () => {
      await writeAuditLog(makeReq(), {
        action: 'nested.action',
        details: { user: { apiKey: 'secret', name: 'john' } },
      });

      const arg = AuditLog.create.mock.calls[0][0];
      expect(arg.details.user.apiKey).toBe('[REDACTED]');
      expect(arg.details.user.name).toBe('john');
    });

    it('handles arrays in details', async () => {
      await writeAuditLog(makeReq(), {
        action: 'array.action',
        details: [{ secret: 'hidden' }, { name: 'visible' }],
      });

      const arg = AuditLog.create.mock.calls[0][0];
      expect(arg.details[0].secret).toBe('[REDACTED]');
      expect(arg.details[1].name).toBe('visible');
    });

    it('defaults to status success', async () => {
      await writeAuditLog(makeReq(), { action: 'test' });
      const arg = AuditLog.create.mock.calls[0][0];
      expect(arg.status).toBe('success');
    });

    it('records failure status', async () => {
      await writeAuditLog(makeReq(), { action: 'test', status: 'failure' });
      const arg = AuditLog.create.mock.calls[0][0];
      expect(arg.status).toBe('failure');
    });

    it('extracts IP from x-forwarded-for header', async () => {
      const req = makeReq({ headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' } });
      await writeAuditLog(req, { action: 'test' });
      const arg = AuditLog.create.mock.calls[0][0];
      expect(arg.request.ip).toBe('10.0.0.1');
    });

    it('does not throw when AuditLog.create fails', async () => {
      AuditLog.create.mockRejectedValueOnce(new Error('DB down'));
      await expect(writeAuditLog(makeReq(), { action: 'test' })).resolves.toBeUndefined();
    });

    it('handles null payload gracefully', async () => {
      await writeAuditLog(makeReq(), null);
      expect(AuditLog.create).toHaveBeenCalledTimes(1);
      const arg = AuditLog.create.mock.calls[0][0];
      expect(arg.action).toBe('unknown');
    });

    it('handles missing req.user', async () => {
      const req = makeReq();
      delete req.user;
      await writeAuditLog(req, { action: 'test' });
      const arg = AuditLog.create.mock.calls[0][0];
      expect(arg.actor.userId).toBe('');
    });
  });
});
