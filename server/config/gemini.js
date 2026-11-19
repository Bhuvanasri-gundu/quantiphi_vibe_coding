import { GoogleGenAI } from '@google/genai';

/**
 * Returns a configured GoogleGenAI client if GEMINI_API_KEY is available.
 */
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim().length > 0 && apiKey !== 'your_gemini_api_key') {
    return new GoogleGenAI({ apiKey: apiKey.trim() });
  }
  return null;
}

/**
 * Returns configured Gemini model, defaulting to gemini-2.5-flash.
 */
export function getGeminiModel() {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

export default getGeminiClient;
