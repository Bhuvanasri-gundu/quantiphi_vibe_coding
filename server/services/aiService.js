import openai, { getModel } from '../config/openai.js';
import { getGeminiClient, getGeminiModel } from '../config/gemini.js';

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
 * Stream completion using Google Gemini SDK.
 */
async function* streamFromGemini(messages, tone) {
  const gemini = getGeminiClient();
  if (!gemini) {
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

  // If there are no user messages, at least provide an initial prompt
  if (contents.length === 0) {
    contents.push({
      role: 'user',
      parts: [{ text: 'Hello' }],
    });
  }

  const responseStream = await gemini.models.generateContentStream({
    model: modelName,
    contents,
    config: {
      systemInstruction: systemMessage.content,
    },
  });

  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
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
 *
 * @param {Array} messages - Array of { role, content } message objects from conversation history.
 * @param {string} tone - The desired response tone.
 * @yields {string} Content delta from each streamed chunk.
 */
export async function* streamChatCompletion(messages, tone) {
  const gemini = getGeminiClient();

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
      console.warn(`⚠️  OpenAI stream failed (${openAiError.message}). Checking Gemini fallback...`);

      // If Gemini is available, fall back to it immediately
      if (gemini) {
        console.log(`🔄 Seamlessly falling back to Google Gemini (${getGeminiModel()})...`);
        for await (const chunk of streamFromGemini(messages, tone)) {
          yield chunk;
        }
        return;
      }

      // If Gemini is not configured, rethrow OpenAI error with helpful instructions
      throw openAiError;
    }
  }

  // If OpenAI is not configured or didn't yield, use Gemini directly
  if (gemini) {
    console.log(`🤖 Generating response using Google Gemini (${getGeminiModel()})...`);
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
