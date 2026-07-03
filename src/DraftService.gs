/**
 * Creates a Gmail draft for an approved contact.
 * @param {string} toEmail - Recipient email.
 * @param {string} subject - Email subject line.
 * @param {string} body - Plain-text email body.
 * @param {string} contactId - Contact row ID for audit logging.
 * @returns {{success: boolean, draftId: string, error: string|null}}
 */
function createDraft(toEmail, subject, body, contactId) {
  try {
    // NEEDS_WIFI_TEST: GmailApp.createDraft requires a live Workspace account.
    const draft = GmailApp.createDraft(toEmail, subject, body);
    auditLog('DraftService', 'DRAFT_CREATED', contactId, toEmail, 'OK');

    return { success: true, draftId: draft.getId(), error: null };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    auditLog('DraftService', 'DRAFT_FAILED', contactId, message, 'ERROR');

    return { success: false, draftId: '', error: message };
  }
}
