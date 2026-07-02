/**
 * Imports an array of raw company rows into the COMPANIES tab.
 * Skips rows that fail basic validation (empty company name or website).
 * @param {Array<Array<string>>} rows - Raw rows: [company, website, industry, city, state, employeeSize, sourceUrl, wtfpRelevance].
 * @returns {{imported: number, skipped: number}}
 */
function importCompanies(rows) {
  let imported = 0;
  let skipped = 0;

  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName('COMPANIES');

    rows.forEach(function(row, index) {
      const company = row[0] || '';
      const website = row[1] || '';

      if (!company.trim() || !website.trim()) {
        skipped += 1;
        auditLog('ImportService', 'IMPORT_SKIP', '', 'Skipped row ' + (index + 1) + ': missing company name or website', 'SKIP');
        return;
      }

      sheet.appendRow(row);
      imported += 1;
    });

    auditLog('ImportService', 'IMPORT', '', 'Imported ' + imported + ' rows, skipped ' + skipped, 'OK');
    return { imported: imported, skipped: skipped };
  } catch (error) {
    auditLog('ImportService', 'IMPORT', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}
