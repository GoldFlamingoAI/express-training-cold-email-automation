/**
 * Returns true if the normalized domain already exists in the provided list.
 * @param {string} domain - Normalized company domain (e.g. 'example.com').
 * @param {string[]} existingDomains - Domains already in COMPANIES tab.
 * @returns {boolean}
 */
function isDuplicateCompany(domain, existingDomains) {
  const normalizedDomain = String(domain || '').trim().toLowerCase();

  return existingDomains.some(function(existingDomain) {
    return String(existingDomain || '').trim().toLowerCase() === normalizedDomain;
  });
}

/**
 * Returns true if the normalized email already exists in the provided list.
 * @param {string} email - Normalized contact email.
 * @param {string[]} existingEmails - Emails already in CONTACTS tab.
 * @returns {boolean}
 */
function isDuplicateContact(email, existingEmails) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  return existingEmails.some(function(existingEmail) {
    return String(existingEmail || '').trim().toLowerCase() === normalizedEmail;
  });
}
