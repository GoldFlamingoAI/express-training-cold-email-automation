/**
 * Writes one structured log entry to the ACTIVITY_LOG tab.
 * @param {string} stage - Calling module name (e.g. 'ImportService').
 * @param {string} action - What happened (e.g. 'IMPORT', 'DRAFT_CREATED', 'ERROR').
 * @param {string} contactId - Row ID from CONTACTS tab, or '' if not contact-specific.
 * @param {string} details - Human-readable detail string.
 * @param {string} status - 'OK' | 'ERROR' | 'SKIP' | 'WARN'.
 * @returns {void}
 */
function auditLog(stage, action, contactId, details, status) {
  const timestamp = new Date();
  const row = [timestamp, stage, action, contactId, details, status];

  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName('ACTIVITY_LOG');

    sheet.appendRow(row);
  } catch (error) {
    Logger.log(JSON.stringify(row));
    Logger.log(error && error.message ? error.message : error);
  }
}
