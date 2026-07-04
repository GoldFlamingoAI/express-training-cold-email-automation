const REPLY_MONITOR_STAGE = 'ReplyMonitor';
const REPLY_MONITOR_CONTACTS_SHEET = 'CONTACTS';
const REPLY_MONITOR_SETTINGS_SHEET = 'SETTINGS';
const REPLY_MONITOR_REPLIED_STATUS = 'REPLIED';
const REPLY_MONITOR_SETTING_LOOKBACK_DAYS = 'REPLY_MONITOR_LOOKBACK_DAYS';
const REPLY_MONITOR_SETTING_MAX_THREADS = 'REPLY_MONITOR_MAX_THREADS';

/**
 * Scans Gmail for campaign contact replies and marks matching contacts as replied.
 * @returns {{scanned: number, repliesDetected: number, updated: number}} Reply monitoring summary.
 */
function monitorReplies() {
  const summary = {
    scanned: 0,
    repliesDetected: 0,
    updated: 0,
  };

  try {
    const spreadsheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    const settings = getReplyMonitorSettings_(spreadsheet);
    const contactsSheet = getReplyMonitorSheet_(spreadsheet, REPLY_MONITOR_CONTACTS_SHEET);
    const table = getReplyMonitorTable_(contactsSheet);
    const emailColumn = findReplyMonitorColumn_(table.headers, ['email', 'emailAddress', 'contactEmail']);
    const statusColumn = findReplyMonitorColumn_(table.headers, ['status']);
    const contactIdColumn = findReplyMonitorOptionalColumn_(table.headers, ['contactId', 'id']);

    for (let index = 0; index < table.rows.length; index += 1) {
      const row = table.rows[index];
      const email = String(row[emailColumn] || '').trim();
      const currentStatus = String(row[statusColumn] || '').trim();
      const contactId = contactIdColumn === -1 ? email : String(row[contactIdColumn] || email).trim();

      if (!email || currentStatus === REPLY_MONITOR_REPLIED_STATUS) {
        continue;
      }

      summary.scanned += 1;
      const query = buildReplyMonitorQuery_(email, settings.lookbackDays);
      // NEEDS_WIFI_TEST: GmailApp.search requires a live Workspace mailbox with campaign traffic.
      const threads = settings.maxThreads > 0
        ? GmailApp.search(query, 0, settings.maxThreads)
        : GmailApp.search(query);

      if (threads.length === 0) {
        auditLog(REPLY_MONITOR_STAGE, 'reply_not_detected', contactId, JSON.stringify({ email: email }), 'OK');
        continue;
      }

      summary.repliesDetected += 1;
      contactsSheet.getRange(table.firstDataRow + index, statusColumn + 1).setValue(REPLY_MONITOR_REPLIED_STATUS);
      summary.updated += 1;
      auditLog(REPLY_MONITOR_STAGE, 'reply_detected', contactId, JSON.stringify({
        email: email,
        threadsFound: threads.length,
      }), 'OK');
    }

    auditLog(REPLY_MONITOR_STAGE, 'monitor_complete', '', JSON.stringify(summary), 'OK');
    return summary;
  } catch (error) {
    auditLog(REPLY_MONITOR_STAGE, 'monitor_failed', '', JSON.stringify({
      message: error.message,
      stack: error.stack,
      summary: summary,
    }), 'ERROR');
    throw error;
  }
}

/**
 * Reads ReplyMonitor runtime settings from the SETTINGS tab.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet Active spreadsheet.
 * @returns {{lookbackDays: number, maxThreads: number}} Parsed ReplyMonitor settings.
 */
function getReplyMonitorSettings_(spreadsheet) {
  const settingsSheet = getReplyMonitorSheet_(spreadsheet, REPLY_MONITOR_SETTINGS_SHEET);
  const values = settingsSheet.getDataRange().getValues();
  const settings = {};

  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const key = String(values[rowIndex][0] || '').trim();
    if (!key) {
      continue;
    }
    settings[key] = values[rowIndex][1];
  }

  return {
    lookbackDays: parseReplyMonitorPositiveInteger_(settings[REPLY_MONITOR_SETTING_LOOKBACK_DAYS]),
    maxThreads: parseReplyMonitorPositiveInteger_(settings[REPLY_MONITOR_SETTING_MAX_THREADS]),
  };
}

/**
 * Returns a required sheet or throws when it is missing.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet Active spreadsheet.
 * @param {string} sheetName Sheet tab name.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Required sheet.
 */
function getReplyMonitorSheet_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Missing required sheet: ' + sheetName);
  }
  return sheet;
}

/**
 * Converts a sheet range into headers and data rows.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Sheet to read.
 * @returns {{headers: string[], rows: Object[][], firstDataRow: number}} Sheet table data.
 */
function getReplyMonitorTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error('CONTACTS tab must include a header row and at least one data row.');
  }

  return {
    headers: values[0].map(function(header) {
      return normalizeReplyMonitorHeader_(header);
    }),
    rows: values.slice(1),
    firstDataRow: 2,
  };
}

/**
 * Finds a required header column by accepted names.
 * @param {string[]} headers Normalized header names.
 * @param {string[]} acceptedNames Accepted unnormalized names.
 * @returns {number} Zero-based column index.
 */
function findReplyMonitorColumn_(headers, acceptedNames) {
  const column = findReplyMonitorOptionalColumn_(headers, acceptedNames);
  if (column === -1) {
    throw new Error('Missing required column: ' + acceptedNames.join(' or '));
  }
  return column;
}

/**
 * Finds an optional header column by accepted names.
 * @param {string[]} headers Normalized header names.
 * @param {string[]} acceptedNames Accepted unnormalized names.
 * @returns {number} Zero-based column index, or -1 when absent.
 */
function findReplyMonitorOptionalColumn_(headers, acceptedNames) {
  const normalizedNames = acceptedNames.map(function(name) {
    return normalizeReplyMonitorHeader_(name);
  });
  for (let index = 0; index < headers.length; index += 1) {
    if (normalizedNames.indexOf(headers[index]) !== -1) {
      return index;
    }
  }
  return -1;
}

/**
 * Normalizes a sheet header for resilient column matching.
 * @param {*} header Header value.
 * @returns {string} Normalized header.
 */
function normalizeReplyMonitorHeader_(header) {
  return String(header || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Builds the Gmail search query for a contact reply.
 * @param {string} email Contact email address.
 * @param {number} lookbackDays SETTINGS-provided lookback window.
 * @returns {string} Gmail search query.
 */
function buildReplyMonitorQuery_(email, lookbackDays) {
  const escapedEmail = email.replace(/"/g, '');
  const parts = ['from:("' + escapedEmail + '")'];
  if (lookbackDays > 0) {
    parts.push('newer_than:' + lookbackDays + 'd');
  }
  return parts.join(' ');
}

/**
 * Parses a positive integer setting value.
 * @param {*} value SETTINGS value.
 * @returns {number} Positive integer, or 0 when unset or invalid.
 */
function parseReplyMonitorPositiveInteger_(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 0;
  }
  return Math.floor(parsed);
}
