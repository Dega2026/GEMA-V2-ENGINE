const DEFAULT_MODEL = String(process.env.AI_MODEL || 'gpt-4.1-mini').trim();
const DEFAULT_BASE_URL = String(process.env.AI_API_BASE_URL || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
const DEFAULT_PLACEHOLDER_RESPONSE = String(
  process.env.AI_PLACEHOLDER_RESPONSE
    || 'Placeholder Response: AI service is running in safe test mode until AI_API_KEY is configured.'
).trim();

function buildHeaders(apiKey) {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${apiKey}`
  };
}

function extractTextFromResponse(payload) {
  if (!payload || typeof payload !== 'object') return '';

  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const block of content) {
      if (typeof block?.text === 'string' && block.text.trim()) {
        return block.text.trim();
      }
    }
  }

  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const firstChoice = choices[0];
  const messageText = firstChoice?.message?.content;
  if (typeof messageText === 'string' && messageText.trim()) {
    return messageText.trim();
  }

  return '';
}

async function generateAiText({ systemPrompt, userPrompt, temperature = 0.25 }) {
  const apiKey = String(process.env.AI_API_KEY || '').trim();
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn('[Warning] AI_API_KEY is not configured. Returning placeholder AI response.');
    return DEFAULT_PLACEHOLDER_RESPONSE;
  }

  const requestBody = {
    model: DEFAULT_MODEL,
    temperature,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: String(systemPrompt || '').trim() }] },
      { role: 'user', content: [{ type: 'input_text', text: String(userPrompt || '').trim() }] }
    ]
  };

  try {
    const response = await fetch(`${DEFAULT_BASE_URL}/responses`, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      // eslint-disable-next-line no-console
      console.warn(`[Warning] AI provider request failed (${response.status}). Using placeholder response.`);
      // eslint-disable-next-line no-console
      console.warn(errorText.slice(0, 500));
      return DEFAULT_PLACEHOLDER_RESPONSE;
    }

    const payload = await response.json();
    const text = extractTextFromResponse(payload);
    if (!text) {
      // eslint-disable-next-line no-console
      console.warn('[Warning] AI provider returned an empty response. Using placeholder response.');
      return DEFAULT_PLACEHOLDER_RESPONSE;
    }

    return text;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[Warning] AI provider call crashed. Using placeholder response.');
    // eslint-disable-next-line no-console
    console.warn(String(error?.message || error));
    return DEFAULT_PLACEHOLDER_RESPONSE;
  }
}

module.exports = {
  generateAiText
};
