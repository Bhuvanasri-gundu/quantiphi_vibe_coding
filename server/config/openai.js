import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn(
    '⚠️  WARNING: Missing OpenAI API key. Set OPENAI_API_KEY in your .env file.'
  );
}

const openai = apiKey ? new OpenAI({ apiKey }) : null;

/**
 * Returns the configured OpenAI model name.
 * Falls back to 'gpt-4.1-mini' if OPENAI_MODEL is not set.
 */
export function getModel() {
  return process.env.OPENAI_MODEL || 'gpt-4.1-mini';
}

export default openai;
