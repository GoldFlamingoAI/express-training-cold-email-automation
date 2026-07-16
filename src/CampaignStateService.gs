const CAMPAIGN_STATE_STAGE = 'CampaignStateService';
const CAMPAIGN_STATE_QUEUE_SHEET = 'QUEUE';
const CAMPAIGN_STATE_CONTACTS_SHEET = 'CONTACTS';
const CAMPAIGN_STATE_TERMINAL_STATUSES = ['REPLIED', 'BOUNCED', 'UNSUBSCRIBED'];

/**
 * Adds manual Hostinger workflow actions to the bound spreadsheet.
 * @returns {void}
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Cold Email')
    .addItem('Set up Hostinger columns', 'setupHostingerWorkflow')
    .addSeparator()
    .addItem('Prepare queued emails', 'runPreparationPipeline')
    .addItem('Mark selected email sent', 'markSelectedEmailSent')
    .addSeparator()
    .addItem('Mark selected contact replied', 'markSelectedContactReplied')
    .addItem('Mark selected contact bounced', 'markSelectedContactBounced')
    .addItem('Mark selected contact unsubscribed', 'markSelectedContactUnsubscribed')
    .addToUi();
}

/**
 * Adds the additive columns required for Hostinger preparation and state tracking.
 * @returns {{queueColumnsAdded: number, contactColumnsAdded: number}}
 */
function setupHostingerWorkflow() {
  try {
    const spreadsheet = getCampaignStateSpreadsheet_();
    const queueSheet = getCampaignStateSheet_(spreadsheet, CAMPAIGN_STATE_QUEUE_SHEET);
    const contactsSheet = getCampaignStateSheet_(spreadsheet, CAMPAIGN_STATE_CONTACTS_SHEET);
    const queueColumnsAdded = ensureCampaignStateColumns_(queueSheet, ['sequenceStep', 'subject', 'body', 'preparedAt', 'sentAt']);
    const contactColumnsAdded = ensureCampaignStateColumns_(contactsSheet, ['status', 'emailsSent', 'lastSentAt']);
    const result = { queueColumnsAdded: queueColumnsAdded, contactColumnsAdded: contactColumnsAdded };
    auditLog(CAMPAIGN_STATE_STAGE, 'HOSTINGER_WORKFLOW_CONFIGURED', '', JSON.stringify(result), 'OK');
    return result;
  } catch (error) {
    auditLog(CAMPAIGN_STATE_STAGE, 'HOSTINGER_WORKFLOW_CONFIGURATION_FAILED', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Marks the selected prepared QUEUE row as manually sent through Hostinger.
 * @returns {Object} State update summary.
 */
function markSelectedEmailSent() {
  const selection = getSelectedCampaignStateRecord_([CAMPAIGN_STATE_QUEUE_SHEET]);
  return markQueueEmailSent(selection.rowNumber, new Date());
}

/**
 * Marks the selected contact as replied.
 * @returns {Object} State update summary.
 */
function markSelectedContactReplied() {
  return markSelectedContactStatus_('REPLIED', '', 'manual_hostinger_review');
}

/**
 * Marks the selected contact as bounced and suppresses the address.
 * @returns {Object} State update summary.
 */
function markSelectedContactBounced() {
  return markSelectedContactStatus_('BOUNCED', 'bounce', 'manual_hostinger_review');
}

/**
 * Marks the selected contact as unsubscribed and suppresses the address.
 * @returns {Object} State update summary.
 */
function markSelectedContactUnsubscribed() {
  return markSelectedContactStatus_('UNSUBSCRIBED', 'opt-out', 'manual_hostinger_review');
}

/**
 * Records a manual Hostinger send and updates the matching CONTACTS row.
 * @param {number} queueRowNumber - One-based QUEUE row number.
 * @param {Date} sentAt - Actual send time.
 * @returns {{updated: boolean, alreadySent: boolean, contactId: string, email: string, sequenceStep: number}}
 */
function markQueueEmailSent(queueRowNumber, sentAt) {
  try {
    const spreadsheet = getCampaignStateSpreadsheet_();
    const queueSheet = getCampaignStateSheet_(spreadsheet, CAMPAIGN_STATE_QUEUE_SHEET);
    const contactsSheet = getCampaignStateSheet_(spreadsheet, CAMPAIGN_STATE_CONTACTS_SHEET);
    ensureCampaignStateColumns_(queueSheet, ['sequenceStep', 'subject', 'body', 'preparedAt', 'sentAt']);
    ensureCampaignStateColumns_(contactsSheet, ['status', 'emailsSent', 'lastSentAt']);

    const queueRecord = getCampaignStateRecordAtRow_(queueSheet, queueRowNumber);
    const currentStatus = String(queueRecord.status || '').trim().toUpperCase();
    const identity = getCampaignStateIdentity_(queueRecord);
    const sequenceStep = parseCampaignStateSequenceStep_(queueRecord);
    const effectiveSentAt = sentAt instanceof Date && !Number.isNaN(sentAt.getTime()) ? sentAt : new Date();

    if (currentStatus === 'SENT') {
      return { updated: false, alreadySent: true, contactId: identity.contactId, email: identity.email, sequenceStep: sequenceStep };
    }
    if (currentStatus !== 'PREPARED') {
      throw new Error('Only a PREPARED queue row can be marked sent. Current status: ' + (currentStatus || 'blank') + '.');
    }

    const contactMatch = findCampaignStateRecord_(contactsSheet, identity);
    if (!contactMatch) {
      throw new Error('No CONTACTS row matches ' + (identity.contactId || identity.email) + '.');
    }
    const contactStatus = String(contactMatch.record.status || '').trim().toUpperCase();
    if (CAMPAIGN_STATE_TERMINAL_STATUSES.indexOf(contactStatus) !== -1) {
      throw new Error('Contact is already in terminal status ' + contactStatus + '.');
    }
    const currentEmailsSent = Number(contactMatch.record.emailssent || contactMatch.record.emailsSent || 0);
    setCampaignStateRowValues_(queueSheet, queueRowNumber, {
      status: 'SENT',
      sentAt: effectiveSentAt,
      sequenceStep: sequenceStep,
    });
    setCampaignStateRowValues_(contactsSheet, contactMatch.rowNumber, {
      status: 'SENT',
      emailsSent: Math.max(Number.isFinite(currentEmailsSent) ? currentEmailsSent : 0, sequenceStep),
      lastSentAt: effectiveSentAt,
    });

    auditLog(CAMPAIGN_STATE_STAGE, 'EMAIL_SENT', identity.contactId || identity.email, JSON.stringify({
      email: identity.email,
      queueRow: queueRowNumber,
      sequenceStep: sequenceStep,
      sentAt: effectiveSentAt.toISOString(),
      provider: 'Hostinger',
    }), 'OK');

    return { updated: true, alreadySent: false, contactId: identity.contactId, email: identity.email, sequenceStep: sequenceStep };
  } catch (error) {
    auditLog(CAMPAIGN_STATE_STAGE, 'EMAIL_SENT_UPDATE_FAILED', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Applies a terminal status to the selected contact and any open queue rows.
 * @param {string} status - Terminal contact status.
 * @param {string} suppressionReason - Optional suppression reason.
 * @param {string} source - Manual source label.
 * @returns {{status: string, contactId: string, email: string, queueRowsUpdated: number}}
 */
function markSelectedContactStatus_(status, suppressionReason, source) {
  try {
    const selection = getSelectedCampaignStateRecord_([CAMPAIGN_STATE_QUEUE_SHEET, CAMPAIGN_STATE_CONTACTS_SHEET]);
    const spreadsheet = getCampaignStateSpreadsheet_();
    const contactsSheet = getCampaignStateSheet_(spreadsheet, CAMPAIGN_STATE_CONTACTS_SHEET);
    const queueSheet = getCampaignStateSheet_(spreadsheet, CAMPAIGN_STATE_QUEUE_SHEET);
    const identity = getCampaignStateIdentity_(selection.record);
    const contactMatch = findCampaignStateRecord_(contactsSheet, identity);
    if (!contactMatch) {
      throw new Error('No CONTACTS row matches ' + (identity.contactId || identity.email) + '.');
    }

    setCampaignStateRowValues_(contactsSheet, contactMatch.rowNumber, { status: status });
    const queueRowsUpdated = updateOpenCampaignStateQueueRows_(queueSheet, identity, status);
    if (suppressionReason) {
      addSuppression(identity.email, suppressionReason, source);
    }

    auditLog(CAMPAIGN_STATE_STAGE, 'CONTACT_' + status, identity.contactId || identity.email, JSON.stringify({
      email: identity.email,
      queueRowsUpdated: queueRowsUpdated,
      source: source,
    }), 'OK');
    return { status: status, contactId: identity.contactId, email: identity.email, queueRowsUpdated: queueRowsUpdated };
  } catch (error) {
    auditLog(CAMPAIGN_STATE_STAGE, 'CONTACT_STATUS_UPDATE_FAILED', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Returns the selected sheet record for a menu action.
 * @param {string[]} allowedSheets - Allowed sheet names.
 * @returns {{sheetName: string, rowNumber: number, record: Object}}
 */
function getSelectedCampaignStateRecord_(allowedSheets) {
  const range = SpreadsheetApp.getActiveRange();
  if (!range) {
    throw new Error('Select a campaign row first.');
  }
  const sheet = range.getSheet();
  const sheetName = sheet.getName();
  const rowNumber = range.getRow();
  if (allowedSheets.indexOf(sheetName) === -1 || rowNumber < 2) {
    throw new Error('Select a data row in ' + allowedSheets.join(' or ') + '.');
  }
  return { sheetName: sheetName, rowNumber: rowNumber, record: getCampaignStateRecordAtRow_(sheet, rowNumber) };
}

/**
 * Reads one sheet row into a normalized record.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Source sheet.
 * @param {number} rowNumber - One-based row number.
 * @returns {Object} Row record.
 */
function getCampaignStateRecordAtRow_(sheet, rowNumber) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    throw new Error(sheet.getName() + ' must include a header row.');
  }
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(normalizeCampaignStateHeader_);
  const values = sheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  const record = {};
  headers.forEach(function(header, index) {
    if (header) {
      record[header] = values[index];
    }
  });
  return record;
}

/**
 * Finds a row by contact ID first, then email.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet to scan.
 * @param {{contactId: string, email: string}} identity - Contact identity.
 * @returns {{rowNumber: number, record: Object}|null} Matching row.
 */
function findCampaignStateRecord_(sheet, identity) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return null;
  }
  const headers = values[0].map(normalizeCampaignStateHeader_);
  const contactIdColumn = headers.indexOf('contactid');
  const emailColumn = headers.indexOf('email');
  for (let index = 1; index < values.length; index += 1) {
    const row = values[index];
    const contactId = contactIdColumn === -1 ? '' : String(row[contactIdColumn] || '').trim().toLowerCase();
    const email = emailColumn === -1 ? '' : String(row[emailColumn] || '').trim().toLowerCase();
    const matches = (identity.contactId && contactId === identity.contactId.toLowerCase()) || (identity.email && email === identity.email.toLowerCase());
    if (matches) {
      return { rowNumber: index + 1, record: getCampaignStateRecordAtRow_(sheet, index + 1) };
    }
  }
  return null;
}

/**
 * Updates matching QUEUE rows that have not already been sent.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - QUEUE sheet.
 * @param {{contactId: string, email: string}} identity - Contact identity.
 * @param {string} status - New terminal status.
 * @returns {number} Rows updated.
 */
function updateOpenCampaignStateQueueRows_(sheet, identity, status) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return 0;
  }
  const headers = values[0].map(normalizeCampaignStateHeader_);
  const contactIdColumn = headers.indexOf('contactid');
  const emailColumn = headers.indexOf('email');
  const statusColumn = headers.indexOf('status');
  if (statusColumn === -1) {
    throw new Error('QUEUE tab must include a status column.');
  }
  let updated = 0;
  for (let index = 1; index < values.length; index += 1) {
    const row = values[index];
    const contactId = contactIdColumn === -1 ? '' : String(row[contactIdColumn] || '').trim().toLowerCase();
    const email = emailColumn === -1 ? '' : String(row[emailColumn] || '').trim().toLowerCase();
    const rowStatus = String(row[statusColumn] || '').trim().toUpperCase();
    const matches = (identity.contactId && contactId === identity.contactId.toLowerCase()) || (identity.email && email === identity.email.toLowerCase());
    if (matches && rowStatus !== 'SENT') {
      sheet.getRange(index + 1, statusColumn + 1).setValue(status);
      updated += 1;
    }
  }
  return updated;
}

/**
 * Sets named values on one sheet row.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Target sheet.
 * @param {number} rowNumber - One-based row number.
 * @param {Object} updates - Normalized header names and values.
 * @returns {void}
 */
function setCampaignStateRowValues_(sheet, rowNumber, updates) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(normalizeCampaignStateHeader_);
  Object.keys(updates).forEach(function(header) {
    const column = headers.indexOf(normalizeCampaignStateHeader_(header));
    if (column === -1) {
      throw new Error(sheet.getName() + ' is missing required column ' + header + '.');
    }
    sheet.getRange(rowNumber, column + 1).setValue(updates[header]);
  });
}

/**
 * Adds missing headers without changing existing column order.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Target sheet.
 * @param {string[]} requiredHeaders - Headers to ensure.
 * @returns {number} Number of columns added.
 */
function ensureCampaignStateColumns_(sheet, requiredHeaders) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const normalizedHeaders = headers.map(normalizeCampaignStateHeader_);
  let added = 0;
  requiredHeaders.forEach(function(header) {
    if (normalizedHeaders.indexOf(normalizeCampaignStateHeader_(header)) === -1) {
      headers.push(header);
      normalizedHeaders.push(normalizeCampaignStateHeader_(header));
      added += 1;
    }
  });
  if (added > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return added;
}

/**
 * Returns contact identity from a record.
 * @param {Object} record - Contact or queue record.
 * @returns {{contactId: string, email: string}}
 */
function getCampaignStateIdentity_(record) {
  const identity = {
    contactId: String(record.contactid || record.contactId || '').trim(),
    email: String(record.email || '').trim().toLowerCase(),
  };
  if (!identity.contactId && !identity.email) {
    throw new Error('Selected row must include contactId or email.');
  }
  return identity;
}

/**
 * Returns a positive sequence step.
 * @param {Object} record - Queue record.
 * @returns {number} Sequence step.
 */
function parseCampaignStateSequenceStep_(record) {
  const sequenceStep = Number(record.sequencestep || record.sequenceStep);
  return Number.isInteger(sequenceStep) && sequenceStep > 0 ? sequenceStep : 1;
}

/**
 * Opens the configured campaign spreadsheet.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet} Campaign spreadsheet.
 */
function getCampaignStateSpreadsheet_() {
  return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
}

/**
 * Returns a required campaign sheet.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet - Campaign spreadsheet.
 * @param {string} sheetName - Required sheet name.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Sheet.
 */
function getCampaignStateSheet_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Missing required sheet: ' + sheetName);
  }
  return sheet;
}

/**
 * Normalizes a sheet header.
 * @param {*} header - Header value.
 * @returns {string} Normalized header.
 */
function normalizeCampaignStateHeader_(header) {
  return String(header || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
