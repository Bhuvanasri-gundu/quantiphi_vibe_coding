import openai, { getModel } from '../config/openai.js';

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
 * Async generator that streams chat completion chunks from OpenAI.
 * Yields each content delta string as it arrives.
 *
 * @param {Array} messages - Array of { role, content } message objects from conversation history.
 * @param {string} tone - The desired response tone.
 * @yields {string} Content delta from each streamed chunk.
 */
export async function* streamChatCompletion(messages, tone) {
  if (!openai) {
    throw Object.assign(
      new Error('OpenAI is not configured. Set OPENAI_API_KEY in your .env file.'),
      { statusCode: 503 }
    );
  }

  const systemMessage = getSystemMessage(tone);

  // Build the full messages array: system prompt + sanitized conversation history
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
