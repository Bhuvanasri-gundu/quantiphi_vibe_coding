/**
 * Returns Gemini API key if configured.
 */
export function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim().length > 0 && apiKey !== 'your_gemini_api_key') {
    return apiKey.trim();
  }
  return null;
}

/**
 * Returns configured Gemini model, defaulting to gemini-3.1-flash-lite.
 */
export function getGeminiModel() {
  return process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
}

export default getGeminiApiKey;
