/**
 * Normalizes fields on a raw company object.
 * @param {{company: string, website: string, industry: string, city: string, state: string, employeeSize: string, sourceUrl: string, wtfpRelevance: string}} raw - Raw company object.
 * @returns {Object} Cleaned company object with same shape.
 */
function cleanCompany(raw) {
  const titleCase = function(value) {
    return String(value || '').trim().toLowerCase().replace(/\b\w/g, function(letter) {
      return letter.toUpperCase();
    });
  };
  const trimValue = function(value) {
    return String(value || '').trim();
  };

  return {
    company: titleCase(raw.company),
    website: trimValue(raw.website).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''),
    industry: trimValue(raw.industry),
    city: titleCase(raw.city),
    state: trimValue(raw.state).toUpperCase(),
    employeeSize: trimValue(raw.employeeSize),
    sourceUrl: trimValue(raw.sourceUrl),
    wtfpRelevance: trimValue(raw.wtfpRelevance)
  };
}

/**
 * Normalizes fields on a raw contact object.
 * @param {{name: string, title: string, email: string, linkedinUrl: string}} raw - Raw contact object.
 * @returns {Object} Cleaned contact object with same shape.
 */
function cleanContact(raw) {
  const titleCase = function(value) {
    return String(value || '').trim().toLowerCase().replace(/\b\w/g, function(letter) {
      return letter.toUpperCase();
    });
  };
  const trimValue = function(value) {
    return String(value || '').trim();
  };

  return {
    name: titleCase(raw.name),
    title: titleCase(raw.title),
    email: trimValue(raw.email).toLowerCase(),
    linkedinUrl: trimValue(raw.linkedinUrl)
  };
}
