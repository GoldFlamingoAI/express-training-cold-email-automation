const BOUNCE_MONITOR_STAGE = 'BounceMonitor';
const BOUNCE_MONITOR_CONTACTS_SHEET = 'CONTACTS';
const BOUNCE_MONITOR_SETTINGS_SHEET = 'SETTINGS';
const BOUNCE_MONITOR_SUPPRESSION_SHEET = 'SUPPRESSION';
const BOUNCE_MONITOR_BOUNCED_STATUS = 'BOUNCED';
const BOUNCE_MONITOR_SUPPRESSION_REASON = 'bounce';
const BOUNCE_MONITOR_SETTING_LOOKBACK_DAYS = 'BOUNCE_MONITOR_LOOKBACK_DAYS';
const BOUNCE_MONITOR_SETTING_MAX_THREADS = 'BOUNCE_MONITOR_MAX_THREADS';

/**
 * Scans Gmail for NDR/bounce messages for campaign contacts, then marks and suppresses matches.
 * @returns {{scanned: number, bouncesDetected: number, updated: number}} Bounce monitoring summary.
 */
function monitorBounces() {
  const summary = {
    scanned: 0,
    bouncesDetected: 0,
    updated: 0,
  };

  try {
    const spreadsheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    const settings = getBounceMonitorSettings_(spreadsheet);
    const contactsSheet = getBounceMonitorSheet_(spreadsheet, BOUNCE_MONITOR_CONTACTS_SHEET);
    const suppressionSheet = getBounceMonitorSheet_(spreadsheet, BOUNCE_MONITOR_SUPPRESSION_SHEET);
    const contactsTable = getBounceMonitorTable_(contactsSheet, BOUNCE_MONITOR_CONTACTS_SHEET);
    const emailColumn = findBounceMonitorColumn_(contactsTable.headers, ['email', 'emailAddress', 'contactEmail']);
    const statusColumn = findBounceMonitorColumn_(contactsTable.headers, ['status']);
    const contactIdColumn = findBounceMonitorOptionalColumn_(contactsTable.headers, ['contactId', 'id']);
    const suppressedEmails = getBounceMonitorSuppressedEmails_(suppressionSheet);

    for (let index = 0; index < contactsTable.rows.length; index += 1) {
      const row = contactsTable.rows[index];
      const email = String(row[emailColumn] || '').trim();
      const normalizedEmail = email.toLowerCase();
      const currentStatus = String(row[statusColumn] || '').trim();
      const contactId = contactIdColumn === -1 ? email : String(row[contactIdColumn] || email).trim();

      if (!email || currentStatus === BOUNCE_MONITOR_BOUNCED_STATUS) {
        continue;
      }

      summary.scanned += 1;
      const query = buildBounceMonitorQuery_(email, settings.lookbackDays);
      // NEEDS_WIFI_TEST: GmailApp.search requires a live Workspace mailbox with actual NDR traffic.
      const threads = settings.maxThreads > 0
        ? GmailApp.search(query, 0, settings.maxThreads)
        : GmailApp.search(query);

      if (threads.length === 0) {
        auditLog(BOUNCE_MONITOR_STAGE, 'bounce_not_detected', contactId, JSON.stringify({ email: email }), 'OK');
        continue;
      }

      summary.bouncesDetected += 1;
      contactsSheet.getRange(contactsTable.firstDataRow + index, statusColumn + 1).setValue(BOUNCE_MONITOR_BOUNCED_STATUS);

      if (suppressedEmails.indexOf(normalizedEmail) === -1) {
        suppressionSheet.appendRow([new Date(), normalizedEmail, BOUNCE_MONITOR_SUPPRESSION_REASON, BOUNCE_MONITOR_STAGE]);
        suppressedEmails.push(normalizedEmail);
      }

      summary.updated += 1;
      auditLog(BOUNCE_MONITOR_STAGE, 'bounce_detected', contactId, JSON.stringify({
        email: email,
        threadsFound: threads.length,
      }), 'OK');
    }

    auditLog(BOUNCE_MONITOR_STAGE, 'monitor_complete', '', JSON.stringify(summary), 'OK');
    return summary;
  } catch (error) {
    auditLog(BOUNCE_MONITOR_STAGE, 'monitor_failed', '', JSON.stringify({
      message: error.message,
      stack: error.stack,
      summary: summary,
    }), 'ERROR');
    throw error;
  }
}

/**
 * Reads BounceMonitor runtime settings from the SETTINGS tab.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet Active spreadsheet.
 * @returns {{lookbackDays: number, maxThreads: number}} Parsed BounceMonitor settings.
 */
function getBounceMonitorSettings_(spreadsheet) {
  const settingsSheet = getBounceMonitorSheet_(spreadsheet, BOUNCE_MONITOR_SETTINGS_SHEET);
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
    lookbackDays: parseBounceMonitorPositiveInteger_(settings[BOUNCE_MONITOR_SETTING_LOOKBACK_DAYS]),
    maxThreads: parseBounceMonitorPositiveInteger_(settings[BOUNCE_MONITOR_SETTING_MAX_THREADS]),
  };
}

/**
 * Returns a required sheet or throws when it is missing.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet Active spreadsheet.
 * @param {string} sheetName Sheet tab name.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Required sheet.
 */
function getBounceMonitorSheet_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Missing required sheet: ' + sheetName);
  }
  return sheet;
}

/**
 * Converts a sheet range into headers and data rows.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Sheet to read.
 * @param {string} sheetName Sheet tab name for error messages.
 * @returns {{headers: string[], rows: Object[][], firstDataRow: number}} Sheet table data.
 */
function getBounceMonitorTable_(sheet, sheetName) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error(sheetName + ' tab must include a header row and at least one data row.');
  }

  return {
    headers: values[0].map(function(header) {
      return normalizeBounceMonitorHeader_(header);
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
function findBounceMonitorColumn_(headers, acceptedNames) {
  const column = findBounceMonitorOptionalColumn_(headers, acceptedNames);
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
function findBounceMonitorOptionalColumn_(headers, acceptedNames) {
  const normalizedNames = acceptedNames.map(function(name) {
    return normalizeBounceMonitorHeader_(name);
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
function normalizeBounceMonitorHeader_(header) {
  return String(header || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Reads already suppressed emails from the SUPPRESSION tab.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} suppressionSheet SUPPRESSION sheet.
 * @returns {string[]} Lowercase suppressed email addresses.
 */
function getBounceMonitorSuppressedEmails_(suppressionSheet) {
  const values = suppressionSheet.getDataRange().getValues();
  const emails = [];

  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const firstColumn = String(values[rowIndex][0] || '').trim().toLowerCase();
    const secondColumn = String(values[rowIndex][1] || '').trim().toLowerCase();

    if (rowIndex === 0 && (firstColumn === 'timestamp' || secondColumn === 'email')) {
      continue;
    }

    if (firstColumn && firstColumn.indexOf('@') !== -1 && emails.indexOf(firstColumn) === -1) {
      emails.push(firstColumn);
    }
    if (secondColumn && secondColumn.indexOf('@') !== -1 && emails.indexOf(secondColumn) === -1) {
      emails.push(secondColumn);
    }
  }

  return emails;
}

/**
 * Builds the Gmail search query for bounce/NDR messages mentioning a contact email.
 * @param {string} email Contact email address.
 * @param {number} lookbackDays SETTINGS-provided lookback window.
 * @returns {string} Gmail search query.
 */
function buildBounceMonitorQuery_(email, lookbackDays) {
  const escapedEmail = email.replace(/"/g, '');
  const parts = [
    '(' + escapedEmail + ')',
    '(from:(mailer-daemon OR postmaster) OR subject:(undeliverable OR bounced OR "delivery status notification" OR "delivery failure"))',
  ];
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
function parseBounceMonitorPositiveInteger_(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 0;
  }
  return Math.floor(parsed);
}
