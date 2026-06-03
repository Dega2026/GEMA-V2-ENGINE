jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'real-msg-id' }),
  }),
}));

describe('mailer', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadMailer() {
    return require('../../utils/mailer');
  }

  function loadNodemailer() {
    return require('nodemailer');
  }

  describe('sendRealEmail — placeholder mode (no SMTP config)', () => {
    it('returns a placeholder response when SMTP_HOST is missing', async () => {
      delete process.env.SMTP_HOST;
      const { sendRealEmail } = loadMailer();

      const result = await sendRealEmail({ to: 'a@b.com', subject: 'Test', text: 'Hi' });
      expect(result.placeholder).toBe(true);
      expect(result.accepted).toEqual(['a@b.com']);
      expect(result.messageId).toBe('placeholder-smtp-message-id');
    });

    it('returns placeholder when SMTP_USER is missing', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PASS = 'pass';
      delete process.env.SMTP_USER;
      const { sendRealEmail } = loadMailer();

      const result = await sendRealEmail({ to: 'x@y.com', subject: 'S', text: 'T' });
      expect(result.placeholder).toBe(true);
    });

    it('handles array of recipients in placeholder mode', async () => {
      delete process.env.SMTP_HOST;
      const { sendRealEmail } = loadMailer();

      const result = await sendRealEmail({ to: ['a@b.com', 'c@d.com'], subject: 'S', text: 'T' });
      expect(result.accepted).toEqual(['a@b.com', 'c@d.com']);
    });
  });

  describe('sendRealEmail — real mode (SMTP configured)', () => {
    it('sends email via nodemailer when SMTP is fully configured', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user@test.com';
      process.env.SMTP_PASS = 'secret';
      process.env.SMTP_FROM = 'Sender <sender@test.com>';

      const { sendRealEmail } = loadMailer();
      const nodemailer = loadNodemailer();
      await sendRealEmail({ to: 'a@b.com', subject: 'Hello', text: 'World' });

      expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
      const transportConfig = nodemailer.createTransport.mock.calls[0][0];
      expect(transportConfig.host).toBe('smtp.test.com');
      expect(transportConfig.port).toBe(587);
      expect(transportConfig.auth.user).toBe('user@test.com');
    });

    it('uses SMTP_SECURE=true for SSL', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PORT = '465';
      process.env.SMTP_USER = 'user@test.com';
      process.env.SMTP_PASS = 'secret';
      process.env.SMTP_SECURE = 'true';

      const { sendRealEmail } = loadMailer();
      const nodemailer = loadNodemailer();
      await sendRealEmail({ to: 'a@b.com', subject: 'Test', text: 'Hi' });

      const transportConfig = nodemailer.createTransport.mock.calls[0][0];
      expect(transportConfig.secure).toBe(true);
    });
  });
});
