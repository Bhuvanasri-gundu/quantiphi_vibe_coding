import openai, { getModel } from '../config/openai.js';
import { getGeminiApiKey, getGeminiModel } from '../config/gemini.js';

/**
 * Tone-specific system instructions that shape the AI's response style.
 */
const TONE_INSTRUCTIONS = {
  professional:
    'Respond in a professional, structured, clear, and respectful manner.',
  casual:
    'Respond in a friendly, natural, conversational, and approachable manner.',
  concise:
    'Respond with direct, short, and informative answers. Avoid unnecessary explanations.',
};

/**
 * Builds the system message for a given tone.
 */
export function getSystemMessage(tone) {
  const normalizedTone = (tone || 'professional').toLowerCase();
  return {
    role: 'system',
    content: TONE_INSTRUCTIONS[normalizedTone] || TONE_INSTRUCTIONS.professional,
  };
}

/**
 * Stream completion using Google Gemini REST SSE API.
 */
async function* streamFromGemini(messages, tone) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw Object.assign(
      new Error('Gemini API key is not configured. Set GEMINI_API_KEY in your .env file.'),
      { statusCode: 503 }
    );
  }

  const systemMessage = getSystemMessage(tone);
  const modelName = getGeminiModel();

  // Convert conversation history to Gemini format (role: 'user' | 'model')
  const validMessages = messages.filter(
    (msg) => msg && typeof msg.content === 'string' && msg.content.trim().length > 0
  );

  const contents = validMessages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: 'Hello' }],
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemMessage.content }],
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API returned status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data:')) {
        const jsonStr = trimmed.slice(5).trim();
        try {
          const parsed = JSON.parse(jsonStr);
          const candidates = parsed.candidates || [];
          for (const cand of candidates) {
            const parts = cand.content?.parts || [];
            for (const part of parts) {
              if (part.text) {
                yield part.text;
              }
            }
          }
        } catch {
          // Ignore incomplete chunk parse
        }
      }
    }
  }
}

/**
 * Stream completion using OpenAI SDK.
 */
async function* streamFromOpenAI(messages, tone) {
  if (!openai) {
    throw Object.assign(
      new Error('OpenAI is not configured. Set OPENAI_API_KEY in your .env file.'),
      { statusCode: 503 }
    );
  }

  const systemMessage = getSystemMessage(tone);
  const fullMessages = [
    systemMessage,
    ...messages
      .filter((msg) => msg && typeof msg.content === 'string' && msg.content.trim().length > 0)
      .map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
  ];

  const stream = await openai.chat.completions.create({
    model: getModel(),
    messages: fullMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}

/**
 * Async generator that streams chat completion chunks.
 * Attempts OpenAI first; seamlessly falls back to Google Gemini if OpenAI encounters quota/auth/network errors or is unconfigured.
 */
export async function* streamChatCompletion(messages, tone) {
  const geminiKey = getGeminiApiKey();

  // If OpenAI is configured, attempt OpenAI first
  if (openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
    try {
      let yieldedAny = false;
      for await (const chunk of streamFromOpenAI(messages, tone)) {
        yieldedAny = true;
        yield chunk;
      }
      if (yieldedAny) return;
    } catch (openAiError) {
      console.warn(`⚠️  OpenAI stream failed (${openAiError.message}). Falling back to Google Gemini...`);

      // If Gemini is available, fall back to it immediately
      if (geminiKey) {
        console.log(`🔄 Seamlessly streaming from Google Gemini (${getGeminiModel()})...`);
        for await (const chunk of streamFromGemini(messages, tone)) {
          yield chunk;
        }
        return;
      }

      throw openAiError;
    }
  }

  // If OpenAI is not configured, stream with Gemini directly
  if (geminiKey) {
    console.log(`🤖 Streaming response using Google Gemini (${getGeminiModel()})...`);
    for await (const chunk of streamFromGemini(messages, tone)) {
      yield chunk;
    }
    return;
  }

  throw Object.assign(
    new Error('Neither OpenAI nor Gemini API keys are configured. Set OPENAI_API_KEY or GEMINI_API_KEY in server/.env.'),
    { statusCode: 503 }
  );
}
