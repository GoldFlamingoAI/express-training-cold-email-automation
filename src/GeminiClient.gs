const GEMINI_CLIENT_STAGE = 'GeminiClient';
const GEMINI_CLIENT_API_KEY_PROPERTY = 'GEMINI_API_KEY';
const GEMINI_CLIENT_DEFAULT_MODEL = 'gemini-3.6-flash';

/**
 * Generates text through the Gemini API (Google AI Studio free tier).
 * @param {string} prompt - Generation prompt.
 * @returns {{success: boolean, text: string, error: string|null}}
 */
function generateGeminiText(prompt) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const apiKey = String(properties.getProperty(GEMINI_CLIENT_API_KEY_PROPERTY) || '').trim();
    if (!apiKey) {
      throw new Error('Missing script property: ' + GEMINI_CLIENT_API_KEY_PROPERTY);
    }
    const model = String(properties.getProperty('GEMINI_MODEL') || GEMINI_CLIENT_DEFAULT_MODEL).trim();

    // NEEDS_WIFI_TEST: UrlFetchApp.fetch calls the live Gemini API and consumes free-tier quota.
    const response = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey,
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
        muteHttpExceptions: true,
      }
    );

    const statusCode = response.getResponseCode();
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error('Gemini HTTP error: ' + statusCode);
    }
    const parsed = JSON.parse(response.getContentText());
    const text = parsed.candidates && parsed.candidates[0] &&
      parsed.candidates[0].content && parsed.candidates[0].content.parts &&
      parsed.candidates[0].content.parts[0] && parsed.candidates[0].content.parts[0].text;
    if (!text) {
      throw new Error('Gemini returned no text candidate.');
    }

    return { success: true, text: String(text).trim(), error: null };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    auditLog(GEMINI_CLIENT_STAGE, 'generation_failed', '', JSON.stringify({ message: message }), 'ERROR');
    return { success: false, text: '', error: message };
  }
}
