const FOLLOW_UP_SCHEDULER_STAGE = 'FollowUpScheduler';
const FOLLOW_UP_SCHEDULER_CONTACTS_SHEET = 'CONTACTS';
const FOLLOW_UP_SCHEDULER_QUEUE_SHEET = 'QUEUE';
const FOLLOW_UP_SCHEDULER_SETTINGS_SHEET = 'SETTINGS';
const FOLLOW_UP_SCHEDULER_REPLIED_STATUS = 'REPLIED';
const FOLLOW_UP_SCHEDULER_BOUNCED_STATUS = 'BOUNCED';
const FOLLOW_UP_SCHEDULER_UNSUBSCRIBED_STATUS = 'UNSUBSCRIBED';
const FOLLOW_UP_SCHEDULER_QUEUED_STATUS = 'QUEUED';
const FOLLOW_UP_SCHEDULER_SETTING_DELAY_DAYS = 'FOLLOW_UP_DELAY_DAYS';
const FOLLOW_UP_SCHEDULER_SETTING_MAX_EMAILS = 'FOLLOW_UP_MAX_EMAILS';

/**
 * Finds contacts eligible for follow-up and appends them to the QUEUE tab.
 * @returns {{scanned: number, eligible: number, queued: number, skipped: number}} Scheduling summary.
 */
function scheduleFollowUps() {
  const summary = {
    scanned: 0,
    eligible: 0,
    queued: 0,
    skipped: 0,
  };

  try {
    const spreadsheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    const settings = getFollowUpSchedulerSettings_(spreadsheet);
    const contactsSheet = getFollowUpSchedulerSheet_(spreadsheet, FOLLOW_UP_SCHEDULER_CONTACTS_SHEET);
    const queueSheet = getFollowUpSchedulerSheet_(spreadsheet, FOLLOW_UP_SCHEDULER_QUEUE_SHEET);
    const contactsTable = getFollowUpSchedulerTable_(contactsSheet, FOLLOW_UP_SCHEDULER_CONTACTS_SHEET);
    const queueTable = getFollowUpSchedulerTable_(queueSheet, FOLLOW_UP_SCHEDULER_QUEUE_SHEET);
    const queuedKeys = getFollowUpSchedulerQueuedKeys_(queueTable);
    const contactColumns = getFollowUpSchedulerContactColumns_(contactsTable.headers);
    const queueStatusColumn = findFollowUpSchedulerOptionalColumn_(queueTable.headers, ['status']);
    const now = new Date();

    for (let index = 0; index < contactsTable.rows.length; index += 1) {
      const row = contactsTable.rows[index];
      const contactId = getFollowUpSchedulerContactId_(row, contactColumns.contactIdColumn, contactColumns.emailColumn);
      const email = String(row[contactColumns.emailColumn] || '').trim();
      const eligibility = getFollowUpSchedulerEligibility_(row, contactColumns, settings, queuedKeys, now);

      summary.scanned += 1;

      if (!eligibility.eligible) {
        summary.skipped += 1;
        auditLog(FOLLOW_UP_SCHEDULER_STAGE, 'follow_up_skipped', contactId, JSON.stringify({
          email: email,
          reason: eligibility.reason,
        }), 'SKIP');
        continue;
      }

      summary.eligible += 1;
      const queueRow = buildFollowUpSchedulerQueueRow_(queueTable.headers, contactsTable.headers, row, queueStatusColumn);
      queueSheet.appendRow(queueRow);
      queuedKeys.push(eligibility.queueKey);
      summary.queued += 1;
      auditLog(FOLLOW_UP_SCHEDULER_STAGE, 'follow_up_queued', contactId, JSON.stringify({
        email: email,
        emailsSent: eligibility.emailsSent,
        daysSinceLastSent: eligibility.daysSinceLastSent,
      }), 'OK');
    }

    auditLog(FOLLOW_UP_SCHEDULER_STAGE, 'schedule_complete', '', JSON.stringify(summary), 'OK');
    return summary;
  } catch (error) {
    auditLog(FOLLOW_UP_SCHEDULER_STAGE, 'schedule_failed', '', JSON.stringify({
      message: error.message,
      stack: error.stack,
      summary: summary,
    }), 'ERROR');
    throw error;
  }
}

/**
 * Reads FollowUpScheduler runtime settings from the SETTINGS tab.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet Active spreadsheet.
 * @returns {{delayDays: number, maxEmails: number}} Parsed FollowUpScheduler settings.
 */
function getFollowUpSchedulerSettings_(spreadsheet) {
  const settingsSheet = getFollowUpSchedulerSheet_(spreadsheet, FOLLOW_UP_SCHEDULER_SETTINGS_SHEET);
  const values = settingsSheet.getDataRange().getValues();
  const settings = {};

  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const key = String(values[rowIndex][0] || '').trim();
    if (key) {
      settings[key] = values[rowIndex][1];
    }
  }

  return {
    delayDays: parseFollowUpSchedulerPositiveInteger_(settings[FOLLOW_UP_SCHEDULER_SETTING_DELAY_DAYS]),
    maxEmails: parseFollowUpSchedulerPositiveInteger_(settings[FOLLOW_UP_SCHEDULER_SETTING_MAX_EMAILS]),
  };
}

/**
 * Returns a required sheet or throws when it is missing.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet Active spreadsheet.
 * @param {string} sheetName Sheet tab name.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Required sheet.
 */
function getFollowUpSchedulerSheet_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Missing required sheet: ' + sheetName);
  }
  return sheet;
}

/**
 * Converts a sheet range into normalized headers and data rows.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Sheet to read.
 * @param {string} sheetName Sheet tab name for error messages.
 * @returns {{headers: string[], rows: Object[][], firstDataRow: number}} Sheet table data.
 */
function getFollowUpSchedulerTable_(sheet, sheetName) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 1) {
    throw new Error(sheetName + ' tab must include a header row.');
  }

  return {
    headers: values[0].map(function(header) {
      return normalizeFollowUpSchedulerHeader_(header);
    }),
    rows: values.slice(1),
    firstDataRow: 2,
  };
}

/**
 * Finds required CONTACTS columns for follow-up decisions.
 * @param {string[]} headers Normalized CONTACTS headers.
 * @returns {Object} Required and optional zero-based column indexes.
 */
function getFollowUpSchedulerContactColumns_(headers) {
  return {
    emailColumn: findFollowUpSchedulerColumn_(headers, ['email', 'emailAddress', 'contactEmail']),
    statusColumn: findFollowUpSchedulerColumn_(headers, ['status']),
    emailsSentColumn: findFollowUpSchedulerColumn_(headers, ['emailsSent', 'touchCount']),
    lastSentColumn: findFollowUpSchedulerColumn_(headers, ['lastSentAt', 'lastSentDate', 'lastEmailSentAt']),
    contactIdColumn: findFollowUpSchedulerOptionalColumn_(headers, ['contactId', 'id']),
  };
}

/**
 * Finds a required header column by accepted names.
 * @param {string[]} headers Normalized header names.
 * @param {string[]} acceptedNames Accepted unnormalized names.
 * @returns {number} Zero-based column index.
 */
function findFollowUpSchedulerColumn_(headers, acceptedNames) {
  const column = findFollowUpSchedulerOptionalColumn_(headers, acceptedNames);
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
function findFollowUpSchedulerOptionalColumn_(headers, acceptedNames) {
  const normalizedNames = acceptedNames.map(function(name) {
    return normalizeFollowUpSchedulerHeader_(name);
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
function normalizeFollowUpSchedulerHeader_(header) {
  return String(header || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Builds queue keys from existing queued rows to prevent duplicate follow-up entries.
 * @param {{headers: string[], rows: Object[][]}} queueTable QUEUE table data.
 * @returns {string[]} Existing normalized queue keys.
 */
function getFollowUpSchedulerQueuedKeys_(queueTable) {
  const emailColumn = findFollowUpSchedulerOptionalColumn_(queueTable.headers, ['email', 'emailAddress', 'contactEmail']);
  const contactIdColumn = findFollowUpSchedulerOptionalColumn_(queueTable.headers, ['contactId', 'id']);
  const keys = [];

  queueTable.rows.forEach(function(row) {
    const key = buildFollowUpSchedulerQueueKey_(row, contactIdColumn, emailColumn);
    if (key && keys.indexOf(key) === -1) {
      keys.push(key);
    }
  });

  return keys;
}

/**
 * Determines whether a contact is eligible for follow-up.
 * @param {Object[]} row CONTACTS row values.
 * @param {Object} columns CONTACTS column indexes.
 * @param {{delayDays: number, maxEmails: number}} settings Scheduler settings.
 * @param {string[]} queuedKeys Existing queue keys.
 * @param {Date} now Current scheduler time.
 * @returns {{eligible: boolean, reason: string, queueKey: string, emailsSent: number, daysSinceLastSent: number}}
 */
function getFollowUpSchedulerEligibility_(row, columns, settings, queuedKeys, now) {
  const email = String(row[columns.emailColumn] || '').trim();
  const status = String(row[columns.statusColumn] || '').trim().toUpperCase();
  const emailsSent = Number(row[columns.emailsSentColumn] || 0);
  const lastSentAt = parseFollowUpSchedulerDate_(row[columns.lastSentColumn]);
  const queueKey = buildFollowUpSchedulerQueueKey_(row, columns.contactIdColumn, columns.emailColumn);
  const daysSinceLastSent = lastSentAt ? Math.floor((now.getTime() - lastSentAt.getTime()) / 86400000) : -1;

  if (!email) {
    return { eligible: false, reason: 'missing_email', queueKey: queueKey, emailsSent: emailsSent, daysSinceLastSent: daysSinceLastSent };
  }
  if (status === FOLLOW_UP_SCHEDULER_REPLIED_STATUS || status === FOLLOW_UP_SCHEDULER_BOUNCED_STATUS || status === FOLLOW_UP_SCHEDULER_UNSUBSCRIBED_STATUS) {
    return { eligible: false, reason: 'terminal_status', queueKey: queueKey, emailsSent: emailsSent, daysSinceLastSent: daysSinceLastSent };
  }
  if (emailsSent < 1) {
    return { eligible: false, reason: 'no_initial_email_sent', queueKey: queueKey, emailsSent: emailsSent, daysSinceLastSent: daysSinceLastSent };
  }
  if (settings.maxEmails > 0 && emailsSent >= settings.maxEmails) {
    return { eligible: false, reason: 'max_emails_reached', queueKey: queueKey, emailsSent: emailsSent, daysSinceLastSent: daysSinceLastSent };
  }
  if (!lastSentAt) {
    return { eligible: false, reason: 'missing_last_sent_at', queueKey: queueKey, emailsSent: emailsSent, daysSinceLastSent: daysSinceLastSent };
  }
  if (settings.delayDays > 0 && daysSinceLastSent < settings.delayDays) {
    return { eligible: false, reason: 'delay_not_elapsed', queueKey: queueKey, emailsSent: emailsSent, daysSinceLastSent: daysSinceLastSent };
  }
  if (queuedKeys.indexOf(queueKey) !== -1) {
    return { eligible: false, reason: 'already_queued', queueKey: queueKey, emailsSent: emailsSent, daysSinceLastSent: daysSinceLastSent };
  }

  return { eligible: true, reason: '', queueKey: queueKey, emailsSent: emailsSent, daysSinceLastSent: daysSinceLastSent };
}

/**
 * Builds a QUEUE row by matching QUEUE headers to CONTACTS headers.
 * @param {string[]} queueHeaders Normalized QUEUE headers.
 * @param {string[]} contactHeaders Normalized CONTACTS headers.
 * @param {Object[]} contactRow CONTACTS row values.
 * @param {number} queueStatusColumn Optional QUEUE status column index.
 * @returns {Object[]} QUEUE append row.
 */
function buildFollowUpSchedulerQueueRow_(queueHeaders, contactHeaders, contactRow, queueStatusColumn) {
  return queueHeaders.map(function(queueHeader, index) {
    if (index === queueStatusColumn) {
      return FOLLOW_UP_SCHEDULER_QUEUED_STATUS;
    }

    const contactColumn = contactHeaders.indexOf(queueHeader);
    if (contactColumn === -1) {
      return '';
    }
    return contactRow[contactColumn];
  });
}

/**
 * Builds a stable queue identity key from contact ID or email.
 * @param {Object[]} row Sheet row values.
 * @param {number} contactIdColumn Optional contact ID column index.
 * @param {number} emailColumn Optional email column index.
 * @returns {string} Stable lowercased key.
 */
function buildFollowUpSchedulerQueueKey_(row, contactIdColumn, emailColumn) {
  if (contactIdColumn !== -1) {
    const contactId = String(row[contactIdColumn] || '').trim().toLowerCase();
    if (contactId) {
      return 'id:' + contactId;
    }
  }

  if (emailColumn !== -1) {
    const email = String(row[emailColumn] || '').trim().toLowerCase();
    if (email) {
      return 'email:' + email;
    }
  }

  return '';
}

/**
 * Returns the contact ID used for audit logging.
 * @param {Object[]} row CONTACTS row values.
 * @param {number} contactIdColumn Optional contact ID column index.
 * @param {number} emailColumn Email column index.
 * @returns {string} Contact ID or email fallback.
 */
function getFollowUpSchedulerContactId_(row, contactIdColumn, emailColumn) {
  if (contactIdColumn !== -1) {
    const contactId = String(row[contactIdColumn] || '').trim();
    if (contactId) {
      return contactId;
    }
  }
  return String(row[emailColumn] || '').trim();
}

/**
 * Parses a sheet value into a Date when possible.
 * @param {*} value Date-like sheet value.
 * @returns {Date|null} Parsed date or null.
 */
function parseFollowUpSchedulerDate_(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

/**
 * Parses a positive integer setting value.
 * @param {*} value SETTINGS value.
 * @returns {number} Positive integer, or 0 when unset or invalid.
 */
function parseFollowUpSchedulerPositiveInteger_(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 0;
  }
  return Math.floor(parsed);
}
