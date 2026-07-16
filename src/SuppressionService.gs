/**
 * Returns true if the email address is present in the SUPPRESSION tab.
 * @param {string} email - Email address to check.
 * @returns {boolean}
 */
function isSuppressed(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName('SUPPRESSION');
    const values = sheet.getDataRange().getValues();

    return values.some(function(row, index) {
      if (index === 0 && String(row[0] || '').trim().toLowerCase() === 'timestamp') {
        return false;
      }

      const firstColumn = String(row[0] || '').trim().toLowerCase();
      const secondColumn = String(row[1] || '').trim().toLowerCase();

      return firstColumn === normalizedEmail || secondColumn === normalizedEmail;
    });
  } catch (error) {
    auditLog('SuppressionService', 'SUPPRESSION_CHECK', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Adds one email address to the SUPPRESSION tab.
 * @param {string} email - Email address to suppress.
 * @param {string} reason - Suppression reason, such as opt-out, bounce, or negative reply.
 * @param {string} source - Source module or manual source for the suppression entry.
 * @returns {void}
 */
function addSuppression(email, reason, source) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  try {
    if (!normalizedEmail) {
      throw new Error('Suppression email is required.');
    }
    if (isSuppressed(normalizedEmail)) {
      auditLog('SuppressionService', 'SUPPRESSION_ALREADY_EXISTS', '', normalizedEmail, 'SKIP');
      return;
    }
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName('SUPPRESSION');

    sheet.appendRow([new Date(), normalizedEmail, reason, source]);
    auditLog('SuppressionService', 'SUPPRESSION_ADD', '', normalizedEmail + ' — ' + reason, 'OK');
  } catch (error) {
    auditLog('SuppressionService', 'SUPPRESSION_ADD', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}
