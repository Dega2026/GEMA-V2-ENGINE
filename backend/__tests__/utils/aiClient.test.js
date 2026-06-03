describe('aiClient', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.AI_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function loadAiClient() {
    return require('../../utils/aiClient');
  }

  describe('generateAiText — no API key', () => {
    it('returns placeholder when AI_API_KEY is not set', async () => {
      const { generateAiText } = loadAiClient();
      const result = await generateAiText({ systemPrompt: 'sys', userPrompt: 'user' });
      expect(result).toMatch(/Placeholder Response/i);
    });
  });

  describe('generateAiText — with API key', () => {
    it('returns extracted text on successful response', async () => {
      process.env.AI_API_KEY = 'test-key';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ output_text: 'Hello from AI' }),
      });

      const { generateAiText } = loadAiClient();
      const result = await generateAiText({ systemPrompt: 'sys', userPrompt: 'user' });
      expect(result).toBe('Hello from AI');

      delete global.fetch;
    });

    it('returns placeholder on non-ok response', async () => {
      process.env.AI_API_KEY = 'test-key';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const { generateAiText } = loadAiClient();
      const result = await generateAiText({ systemPrompt: 'sys', userPrompt: 'user' });
      expect(result).toMatch(/Placeholder Response/i);

      delete global.fetch;
    });

    it('returns placeholder when fetch throws', async () => {
      process.env.AI_API_KEY = 'test-key';
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const { generateAiText } = loadAiClient();
      const result = await generateAiText({ systemPrompt: 'sys', userPrompt: 'user' });
      expect(result).toMatch(/Placeholder Response/i);

      delete global.fetch;
    });

    it('extracts text from choices format', async () => {
      process.env.AI_API_KEY = 'test-key';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Choice text' } }],
        }),
      });

      const { generateAiText } = loadAiClient();
      const result = await generateAiText({ systemPrompt: 'sys', userPrompt: 'user' });
      expect(result).toBe('Choice text');

      delete global.fetch;
    });

    it('extracts text from output array format', async () => {
      process.env.AI_API_KEY = 'test-key';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          output: [{ content: [{ text: 'Output text' }] }],
        }),
      });

      const { generateAiText } = loadAiClient();
      const result = await generateAiText({ systemPrompt: 'sys', userPrompt: 'user' });
      expect(result).toBe('Output text');

      delete global.fetch;
    });

    it('returns placeholder when response has empty text', async () => {
      process.env.AI_API_KEY = 'test-key';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { generateAiText } = loadAiClient();
      const result = await generateAiText({ systemPrompt: 'sys', userPrompt: 'user' });
      expect(result).toMatch(/Placeholder Response/i);

      delete global.fetch;
    });
  });
});
