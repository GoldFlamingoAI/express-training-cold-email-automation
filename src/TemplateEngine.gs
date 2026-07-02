/**
 * Merges a static email template string with contact merge field values.
 * @param {string} template - Raw template body with {{fieldName}} placeholders.
 * @param {{firstName: string, company: string, personalizationLine: string, senderName: string}} fields - Merge field values.
 * @returns {string} Merged email body, plain text.
 */
function mergeTemplate(template, fields) {
  return String(template || '').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, function(match, fieldName) {
    if (Object.prototype.hasOwnProperty.call(fields, fieldName)) {
      return String(fields[fieldName] || '');
    }

    return match;
  });
}
