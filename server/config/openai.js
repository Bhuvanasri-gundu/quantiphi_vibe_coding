import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn(
    '⚠️  WARNING: Missing OpenAI API key. Set OPENAI_API_KEY in your .env file.'
  );
}

// Set maxRetries to 0 so quota errors or invalid keys fall back to Gemini immediately without 15s retry delays
const openai = apiKey ? new OpenAI({ apiKey, maxRetries: 0 }) : null;

/**
 * Returns the configured OpenAI model name.
 * Falls back to 'gpt-4.1-mini' if OPENAI_MODEL is not set.
 */
export function getModel() {
  return process.env.OPENAI_MODEL || 'gpt-4.1-mini';
}

export default openai;
