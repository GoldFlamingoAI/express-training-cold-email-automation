const EMAIL_PREPARATION_STAGE = 'EmailPreparationService';
const EMAIL_PREPARATION_QUEUE_SHEET = 'QUEUE';
const EMAIL_PREPARATION_REQUIRED_COLUMNS = ['sequenceStep', 'subject', 'body', 'preparedAt', 'sentAt'];

/**
 * Prepares one QUEUE row for manual sending through Hostinger Webmail.
 * @param {Object} contact - QUEUE record including its internal _rowNumber.
 * @param {string} subject - Rendered email subject.
 * @param {string} body - Rendered plain-text email body.
 * @param {Object} settings - Campaign settings.
 * @returns {{success: boolean, prepared: boolean, queueRow: number, error: string|null}}
 */
function prepareEmailForHostinger(contact, subject, body, settings) {
  try {
    const spreadsheet = openCampaignSpreadsheet();
    const queueSheet = spreadsheet.getSheetByName(EMAIL_PREPARATION_QUEUE_SHEET);
    if (!queueSheet) {
      throw new Error('Missing required sheet: ' + EMAIL_PREPARATION_QUEUE_SHEET);
    }

    const columns = ensureEmailPreparationColumns_(queueSheet);
    const rowNumber = Number(contact && contact._rowNumber);
    if (!Number.isInteger(rowNumber) || rowNumber < 2) {
      throw new Error('QUEUE row number is required to prepare an email.');
    }

    const currentStatus = String(queueSheet.getRange(rowNumber, columns.status + 1).getValue() || '').trim().toUpperCase();
    if (currentStatus === 'PREPARED') {
      return { success: true, prepared: false, queueRow: rowNumber, error: null };
    }
    if (['SENT', 'REPLIED', 'BOUNCED', 'UNSUBSCRIBED'].indexOf(currentStatus) !== -1) {
      throw new Error('QUEUE row cannot be prepared from status ' + currentStatus + '.');
    }

    const sequenceStep = parseEmailPreparationSequenceStep_(contact);
    const preparedAt = new Date();
    queueSheet.getRange(rowNumber, columns.sequencestep + 1).setValue(sequenceStep);
    queueSheet.getRange(rowNumber, columns.subject + 1).setValue(subject);
    queueSheet.getRange(rowNumber, columns.body + 1).setValue(body);
    queueSheet.getRange(rowNumber, columns.preparedat + 1).setValue(preparedAt);
    queueSheet.getRange(rowNumber, columns.status + 1).setValue('PREPARED');

    const contactId = String(contact.contactId || contact.email || '').trim();
    auditLog(EMAIL_PREPARATION_STAGE, 'EMAIL_PREPARED', contactId, JSON.stringify({
      email: String(contact.email || '').trim(),
      queueRow: rowNumber,
      sequenceStep: sequenceStep,
      senderName: String(settings && settings.senderName || '').trim(),
    }), 'OK');

    return { success: true, prepared: true, queueRow: rowNumber, error: null };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    auditLog(EMAIL_PREPARATION_STAGE, 'EMAIL_PREPARATION_FAILED', contact && (contact.contactId || contact.email) || '', message, 'ERROR');
    return { success: false, prepared: false, queueRow: 0, error: message };
  }
}

/**
 * Backward-compatible replacement for the retired Gmail draft function.
 * @param {string} toEmail - Recipient email.
 * @param {string} subject - Rendered email subject.
 * @param {string} body - Rendered plain-text email body.
 * @param {string} contactId - Contact ID.
 * @param {Object} settings - Campaign settings.
 * @returns {{success: boolean, prepared: boolean, queueRow: number, error: string|null}}
 */
function createDraft(toEmail, subject, body, contactId, settings) {
  try {
    const spreadsheet = openCampaignSpreadsheet();
    const queueSheet = spreadsheet.getSheetByName(EMAIL_PREPARATION_QUEUE_SHEET);
    if (!queueSheet) {
      throw new Error('Missing required sheet: ' + EMAIL_PREPARATION_QUEUE_SHEET);
    }

    const record = findEmailPreparationQueueRecord_(queueSheet, contactId, toEmail);
    if (!record) {
      throw new Error('No QUEUED row found for ' + String(contactId || toEmail || '').trim() + '.');
    }
    return prepareEmailForHostinger(record, subject, body, settings);
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    auditLog(EMAIL_PREPARATION_STAGE, 'EMAIL_PREPARATION_FAILED', contactId || toEmail || '', message, 'ERROR');
    return { success: false, prepared: false, queueRow: 0, error: message };
  }
}

/**
 * Ensures QUEUE has the columns required by the manual-send workflow.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - QUEUE sheet.
 * @returns {Object} Normalized column-name to zero-based index map.
 */
function ensureEmailPreparationColumns_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const rawHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const headers = rawHeaders.map(normalizeEmailPreparationHeader_);
  if (headers.indexOf('status') === -1) {
    throw new Error('QUEUE tab must include a status column.');
  }

  EMAIL_PREPARATION_REQUIRED_COLUMNS.forEach(function(header) {
    const normalized = normalizeEmailPreparationHeader_(header);
    if (headers.indexOf(normalized) === -1) {
      rawHeaders.push(header);
      headers.push(normalized);
    }
  });

  if (rawHeaders.length > lastColumn) {
    sheet.getRange(1, 1, 1, rawHeaders.length).setValues([rawHeaders]);
  }

  const columns = {};
  headers.forEach(function(header, index) {
    columns[header] = index;
  });
  return columns;
}

/**
 * Finds the first unsent QUEUE row matching a contact ID or email.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - QUEUE sheet.
 * @param {string} contactId - Contact ID.
 * @param {string} email - Contact email.
 * @returns {Object|null} Queue record with _rowNumber or null.
 */
function findEmailPreparationQueueRecord_(sheet, contactId, email) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return null;
  }

  const headers = values[0].map(normalizeEmailPreparationHeader_);
  const contactIdColumn = headers.indexOf('contactid');
  const emailColumn = headers.indexOf('email');
  const statusColumn = headers.indexOf('status');
  const wantedContactId = String(contactId || '').trim().toLowerCase();
  const wantedEmail = String(email || '').trim().toLowerCase();

  for (let index = 1; index < values.length; index += 1) {
    const row = values[index];
    const rowContactId = contactIdColumn === -1 ? '' : String(row[contactIdColumn] || '').trim().toLowerCase();
    const rowEmail = emailColumn === -1 ? '' : String(row[emailColumn] || '').trim().toLowerCase();
    const rowStatus = statusColumn === -1 ? '' : String(row[statusColumn] || '').trim().toUpperCase();
    const identityMatches = (wantedContactId && rowContactId === wantedContactId) || (wantedEmail && rowEmail === wantedEmail);
    if (identityMatches && ['', 'QUEUED'].indexOf(rowStatus) !== -1) {
      const record = { _rowNumber: index + 1 };
      headers.forEach(function(header, columnIndex) {
        record[header] = row[columnIndex];
      });
      record.contactId = contactIdColumn === -1 ? '' : row[contactIdColumn];
      record.email = emailColumn === -1 ? '' : row[emailColumn];
      return record;
    }
  }
  return null;
}

/**
 * Returns the intended sequence step for a queue record.
 * @param {Object} contact - Queue record.
 * @returns {number} Positive sequence step.
 */
function parseEmailPreparationSequenceStep_(contact) {
  const explicitStep = Number(contact && (contact.sequenceStep || contact.sequencestep));
  if (Number.isInteger(explicitStep) && explicitStep > 0) {
    return explicitStep;
  }
  const emailsSent = Number(contact && (contact.emailsSent || contact.emailssent) || 0);
  return Number.isFinite(emailsSent) && emailsSent >= 0 ? Math.floor(emailsSent) + 1 : 1;
}

/**
 * Normalizes a sheet header.
 * @param {*} header - Header value.
 * @returns {string} Normalized header.
 */
function normalizeEmailPreparationHeader_(header) {
  return String(header || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
