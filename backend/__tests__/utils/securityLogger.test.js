const fs = require('fs');

jest.mock('fs');

const { getClientIp, appendSecurityLog } = require('../../utils/securityLogger');

describe('securityLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getClientIp', () => {
    it('extracts IP from x-forwarded-for header', () => {
      const req = { headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' }, ip: '127.0.0.1' };
      expect(getClientIp(req)).toBe('10.0.0.1');
    });

    it('falls back to req.ip when x-forwarded-for is absent', () => {
      const req = { headers: {}, ip: '192.168.1.1' };
      expect(getClientIp(req)).toBe('192.168.1.1');
    });

    it('falls back to socket.remoteAddress', () => {
      const req = { headers: {}, socket: { remoteAddress: '172.16.0.1' } };
      expect(getClientIp(req)).toBe('172.16.0.1');
    });

    it('returns unknown when no IP source available', () => {
      const req = { headers: {} };
      expect(getClientIp(req)).toBe('unknown');
    });

    it('trims whitespace from x-forwarded-for', () => {
      const req = { headers: { 'x-forwarded-for': '  10.0.0.1 , 10.0.0.2 ' }, ip: '127.0.0.1' };
      expect(getClientIp(req)).toBe('10.0.0.1');
    });

    it('ignores empty x-forwarded-for', () => {
      const req = { headers: { 'x-forwarded-for': '  ' }, ip: '1.2.3.4' };
      expect(getClientIp(req)).toBe('1.2.3.4');
    });
  });

  describe('appendSecurityLog', () => {
    it('creates log directory and appends a JSON line', () => {
      fs.mkdirSync.mockReturnValue(undefined);
      fs.appendFileSync.mockReturnValue(undefined);

      appendSecurityLog('test.event', { ip: '10.0.0.1' });

      expect(fs.mkdirSync).toHaveBeenCalledTimes(1);
      expect(fs.appendFileSync).toHaveBeenCalledTimes(1);

      const writtenLine = fs.appendFileSync.mock.calls[0][1];
      const parsed = JSON.parse(writtenLine.trim());
      expect(parsed.event).toBe('test.event');
      expect(parsed.ip).toBe('10.0.0.1');
      expect(parsed.ts).toBeTruthy();
    });

    it('does not throw when fs operations fail', () => {
      fs.mkdirSync.mockImplementation(() => { throw new Error('EACCES'); });

      expect(() => appendSecurityLog('test.event')).not.toThrow();
    });

    it('handles empty meta', () => {
      fs.mkdirSync.mockReturnValue(undefined);
      fs.appendFileSync.mockReturnValue(undefined);

      appendSecurityLog('simple.event');

      const writtenLine = fs.appendFileSync.mock.calls[0][1];
      const parsed = JSON.parse(writtenLine.trim());
      expect(parsed.event).toBe('simple.event');
    });
  });
});
