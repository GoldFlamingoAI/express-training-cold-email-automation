const CONTACT_VERIFICATION_STAGE = 'ContactVerificationService';
const CONTACT_VERIFICATION_CONTACTS_SHEET = 'CONTACTS';
const CONTACT_VERIFICATION_SETTING_BATCH_SIZE = 'CONTACT_VERIFICATION_BATCH_SIZE';
const CONTACT_VERIFICATION_WRITE_COLUMNS = ['verificationResult', 'catchAll'];

/**
 * Verifies CONTACTS rows that have an email but no verificationResult, through
 * ZeroBounce. Failed API calls leave the row blank so the next run retries it.
 * Batch-capped: ZeroBounce credits are budget-limited and Apps Script runs are
 * capped at 6 minutes.
 * @returns {{processed: number, verified: number, skipped: number}}
 */
function runContactVerification() {
  const summary = { processed: 0, verified: 0, skipped: 0 };

  try {
    const spreadsheet = openCampaignSpreadsheet();
    const settings = readSettings(spreadsheet);
    const batchSize = Number(settings[CONTACT_VERIFICATION_SETTING_BATCH_SIZE]);
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new Error('Missing required SETTINGS value: ' + CONTACT_VERIFICATION_SETTING_BATCH_SIZE);
    }

    const contactsSheet = spreadsheet.getSheetByName(CONTACT_VERIFICATION_CONTACTS_SHEET);
    if (!contactsSheet) {
      throw new Error('Missing required sheet: ' + CONTACT_VERIFICATION_CONTACTS_SHEET);
    }
    const columns = ensureContactVerificationColumns_(contactsSheet);
    const contacts = readRecords(spreadsheet, CONTACT_VERIFICATION_CONTACTS_SHEET);

    for (let index = 0; index < contacts.length && summary.processed < batchSize; index += 1) {
      const contact = contacts[index];
      const email = String(contact.email || '').trim();
      if (!email || String(contact.verificationResult || '').trim() !== '') {
        continue;
      }
      summary.processed += 1;
      const contactId = String(contact.contactId || email).trim();

      const result = verifyEmailWithZeroBounce(email);
      if (!result.success) {
        summary.skipped += 1;
        auditLog(CONTACT_VERIFICATION_STAGE, 'VERIFICATION_SKIPPED_API_FAILED', contactId, result.error || '', 'SKIP');
        continue;
      }

      const updates = { verificationResult: result.status };
      if (isZeroBounceCatchAll(result.status, result.subStatus)) {
        updates.catchAll = 'TRUE';
      }
      setContactVerificationRowValues_(contactsSheet, columns, contact._rowNumber, updates);
      summary.verified += 1;
      auditLog(CONTACT_VERIFICATION_STAGE, 'VERIFICATION_RECORDED', contactId, JSON.stringify({
        email: email,
        status: result.status,
        subStatus: result.subStatus,
      }), 'OK');
    }

    auditLog(CONTACT_VERIFICATION_STAGE, 'VERIFICATION_RUN_COMPLETE', '', JSON.stringify(summary), 'OK');
    return summary;
  } catch (error) {
    auditLog(CONTACT_VERIFICATION_STAGE, 'VERIFICATION_RUN_FAILED', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Returns true when a ZeroBounce result indicates a catch-all domain. Pure.
 * @param {string} status - ZeroBounce status.
 * @param {string} subStatus - ZeroBounce sub_status.
 * @returns {boolean}
 */
function isZeroBounceCatchAll(status, subStatus) {
  const normalizedStatus = String(status || '').trim().toLowerCase();
  const normalizedSubStatus = String(subStatus || '').trim().toLowerCase().replace(/[^a-z]/g, '');
  return normalizedStatus === 'catch-all' || normalizedSubStatus.indexOf('catchall') !== -1;
}

/**
 * Ensures the columns this service writes exist, appending headers as needed.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - CONTACTS sheet.
 * @returns {Object} Normalized header name to one-based column number.
 */
function ensureContactVerificationColumns_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const normalized = headers.map(normalizeContactVerificationHeader_);

  CONTACT_VERIFICATION_WRITE_COLUMNS.forEach(function(header) {
    if (normalized.indexOf(normalizeContactVerificationHeader_(header)) === -1) {
      headers.push(header);
      normalized.push(normalizeContactVerificationHeader_(header));
    }
  });
  if (headers.length > lastColumn) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  const columns = {};
  normalized.forEach(function(header, index) {
    if (header) {
      columns[header] = index + 1;
    }
  });
  return columns;
}

/**
 * Writes named values onto one CONTACTS row.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - CONTACTS sheet.
 * @param {Object} columns - Normalized header to one-based column number.
 * @param {number} rowNumber - One-based row number.
 * @param {Object} updates - Header names to values.
 * @returns {void}
 */
function setContactVerificationRowValues_(sheet, columns, rowNumber, updates) {
  Object.keys(updates).forEach(function(header) {
    const column = columns[normalizeContactVerificationHeader_(header)];
    if (!column) {
      throw new Error(CONTACT_VERIFICATION_CONTACTS_SHEET + ' is missing required column ' + header + '.');
    }
    sheet.getRange(rowNumber, column).setValue(updates[header]);
  });
}

/**
 * Normalizes a sheet header. Pure.
 * @param {*} header - Header value.
 * @returns {string} Normalized header.
 */
function normalizeContactVerificationHeader_(header) {
  return String(header || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
