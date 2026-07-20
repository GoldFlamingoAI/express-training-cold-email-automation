/**
 * Returns true when a contact title matches any keyword from a comma-separated
 * list (case-insensitive substring match). An empty keyword list confirms
 * nothing — relevance must be opted into via SETTINGS.RELEVANT_TITLE_KEYWORDS.
 * @param {string} title - Contact job title.
 * @param {string} keywordsCsv - Comma-separated keyword list (e.g. 'owner, hr, operations').
 * @returns {boolean}
 */
function isRelevantRole(title, keywordsCsv) {
  const normalizedTitle = String(title || '').trim().toLowerCase();
  if (!normalizedTitle) {
    return false;
  }

  return String(keywordsCsv || '')
    .split(',')
    .map(function(keyword) {
      return keyword.trim().toLowerCase();
    })
    .filter(function(keyword) {
      return keyword !== '';
    })
    .some(function(keyword) {
      return normalizedTitle.indexOf(keyword) !== -1;
    });
}
