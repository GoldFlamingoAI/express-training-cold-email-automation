const CONTENT_VARIATION_STAGE = 'ContentVariationService';
const CONTENT_VARIATION_GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const CONTENT_VARIATION_FALLBACK_SUBJECTS = [
  'Quick thought from this morning',
  'Following up on that idea',
  'Article you might find interesting',
  'Notes from this week',
  'Circling back on scheduling',
  'That resource we discussed',
  'Weekend plans update',
  'Short question when you have a sec',
];

const CONTENT_VARIATION_FALLBACK_BODIES = [
  'Hey,\n\nWas thinking about what we talked about last week and wanted to jot it down before I forget. Nothing urgent — just keeping the thread going.\n\nTalk soon,',
  'Hi there,\n\nCame across something today that reminded me of our conversation. Will send more details when I have a minute to write them up properly.\n\nBest,',
  'Hey,\n\nQuick note — this week got busy but I have not forgotten about getting back to you. Expect something more substantial soon.\n\nCheers,',
  'Hi,\n\nHope the week is treating you well. I am putting together some notes and figured I would check in before the weekend.\n\nTake care,',
];

const CONTENT_VARIATION_FALLBACK_REPLIES = [
  'Sounds good — thanks for the heads up. Talk soon.',
  'Got it, appreciate you sending this over. I will take a look this week.',
  'Nice, thanks! Let me know when you have the rest.',
  'Perfect timing, I was just thinking about this. More later.',
  'Thanks for the note — no rush on my end.',
];

/**
 * Generates a varied subject/body pair for a warm-up send.
 * Uses Gemini when GEMINI_API_KEY is configured; falls back to local templates.
 * @returns {{subject: string, body: string, source: string}}
 */
function generateWarmupSendContent() {
  const generated = callGeminiForContent_(
    'Write one short, casual, personal-sounding email between two acquaintances. ' +
    'Plain text only. It must NOT mention warm-up, marketing, or anything commercial. ' +
    'Vary tone and topic freely (life updates, articles, scheduling, hobbies). ' +
    'Return strict JSON: {"subject": "...", "body": "..."} with a body of 2-4 sentences.'
  );
  if (generated && generated.subject && generated.body) {
    return { subject: generated.subject, body: generated.body, source: 'gemini' };
  }
  return buildFallbackWarmupContent(Math.random);
}

/**
 * Generates a varied short reply body for a seed account.
 * @param {string} subject - Original message subject, for context.
 * @returns {{body: string, source: string}}
 */
function generateWarmupReplyContent(subject) {
  const generated = callGeminiForContent_(
    'Write one short, casual reply (1-2 sentences, plain text) to a personal email ' +
    'with the subject "' + String(subject || '').replace(/"/g, '') + '". ' +
    'It must sound human and unremarkable. Return strict JSON: {"body": "..."}'
  );
  if (generated && generated.body) {
    return { body: generated.body, source: 'gemini' };
  }
  return { body: pickFallbackWarmupReply(Math.random), source: 'fallback' };
}

/**
 * Picks a fallback subject/body pair from the local template pools.
 * Pure: randomness is injected.
 * @param {function(): number} random - Random source returning [0, 1).
 * @returns {{subject: string, body: string, source: string}}
 */
function buildFallbackWarmupContent(random) {
  const subject = CONTENT_VARIATION_FALLBACK_SUBJECTS[Math.floor(random() * CONTENT_VARIATION_FALLBACK_SUBJECTS.length)];
  const body = CONTENT_VARIATION_FALLBACK_BODIES[Math.floor(random() * CONTENT_VARIATION_FALLBACK_BODIES.length)];
  return { subject: subject, body: body, source: 'fallback' };
}

/**
 * Picks a fallback reply from the local template pool.
 * Pure: randomness is injected.
 * @param {function(): number} random - Random source returning [0, 1).
 * @returns {string} Reply body.
 */
function pickFallbackWarmupReply(random) {
  return CONTENT_VARIATION_FALLBACK_REPLIES[Math.floor(random() * CONTENT_VARIATION_FALLBACK_REPLIES.length)];
}

/**
 * Calls Gemini and parses a strict-JSON content response.
 * Returns null on any failure so callers can fall back to templates.
 * @param {string} prompt - Generation prompt requesting strict JSON output.
 * @returns {Object|null} Parsed content object or null.
 */
function callGeminiForContent_(prompt) {
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) {
      return null;
    }
    const response = UrlFetchApp.fetch(CONTENT_VARIATION_GEMINI_URL + '?key=' + apiKey, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 1.2, responseMimeType: 'application/json' },
      }),
      muteHttpExceptions: true,
    });
    if (response.getResponseCode() !== 200) {
      warmupLog(CONTENT_VARIATION_STAGE, 'GEMINI_CALL_FAILED', '', 'HTTP ' + response.getResponseCode(), 'WARN');
      return null;
    }
    const parsed = JSON.parse(response.getContentText());
    const text = parsed.candidates && parsed.candidates[0] &&
      parsed.candidates[0].content && parsed.candidates[0].content.parts &&
      parsed.candidates[0].content.parts[0] && parsed.candidates[0].content.parts[0].text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    warmupLog(CONTENT_VARIATION_STAGE, 'GEMINI_CALL_FAILED', '', error && error.message ? error.message : String(error), 'WARN');
    return null;
  }
}
