const DASHBOARD_SERVICE_STAGE = 'DashboardService';
const DASHBOARD_SERVICE_CONTACTS_SHEET = 'CONTACTS';
const DASHBOARD_SERVICE_QUEUE_SHEET = 'QUEUE';
const DASHBOARD_SERVICE_ACTIVITY_LOG_SHEET = 'ACTIVITY_LOG';
const DASHBOARD_SERVICE_SUPPRESSION_SHEET = 'SUPPRESSION';
const DASHBOARD_SERVICE_DASHBOARD_SHEET = 'DASHBOARD';
const DASHBOARD_SERVICE_SETTINGS_SHEET = 'SETTINGS';

/**
 * Refreshes the DASHBOARD tab with current campaign metrics.
 * @returns {{metricsWritten: number}} Dashboard refresh summary.
 */
function refreshDashboard() {
  const summary = {
    metricsWritten: 0,
  };

  try {
    const spreadsheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
    const settings = getDashboardServiceSettings_(spreadsheet);
    const contactsTable = getDashboardServiceTable_(getDashboardServiceSheet_(spreadsheet, DASHBOARD_SERVICE_CONTACTS_SHEET));
    const queueTable = getDashboardServiceTable_(getDashboardServiceSheet_(spreadsheet, DASHBOARD_SERVICE_QUEUE_SHEET));
    const activityTable = getDashboardServiceTable_(getDashboardServiceSheet_(spreadsheet, DASHBOARD_SERVICE_ACTIVITY_LOG_SHEET));
    const suppressionTable = getDashboardServiceTable_(getDashboardServiceSheet_(spreadsheet, DASHBOARD_SERVICE_SUPPRESSION_SHEET));
    const dashboardSheet = getDashboardServiceSheet_(spreadsheet, DASHBOARD_SERVICE_DASHBOARD_SHEET);
    const metrics = buildDashboardServiceMetrics_(contactsTable, queueTable, activityTable, suppressionTable, settings);
    const rows = [['metric', 'value', 'updatedAt']].concat(metrics.map(function(metric) {
      return [metric.name, metric.value, new Date()];
    }));

    dashboardSheet.clearContents();
    dashboardSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);

    summary.metricsWritten = metrics.length;
    auditLog(DASHBOARD_SERVICE_STAGE, 'dashboard_refreshed', '', JSON.stringify(summary), 'OK');
    return summary;
  } catch (error) {
    auditLog(DASHBOARD_SERVICE_STAGE, 'dashboard_refresh_failed', '', JSON.stringify({
      message: error.message,
      stack: error.stack,
      summary: summary,
    }), 'ERROR');
    throw error;
  }
}

/**
 * Reads DashboardService settings from the SETTINGS tab.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet Active spreadsheet.
 * @returns {{dailyLimit: number}} Parsed dashboard settings.
 */
function getDashboardServiceSettings_(spreadsheet) {
  const settingsSheet = getDashboardServiceSheet_(spreadsheet, DASHBOARD_SERVICE_SETTINGS_SHEET);
  const values = settingsSheet.getDataRange().getValues();
  const settings = {};

  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const key = String(values[rowIndex][0] || '').trim();
    if (key) {
      settings[key] = values[rowIndex][1];
    }
  }

  return {
    dailyLimit: Number(settings.dailyLimit || settings.DAILY_LIMIT || 0),
  };
}

/**
 * Returns a required sheet or throws when it is missing.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} spreadsheet Active spreadsheet.
 * @param {string} sheetName Sheet tab name.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Required sheet.
 */
function getDashboardServiceSheet_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Missing required sheet: ' + sheetName);
  }
  return sheet;
}

/**
 * Converts a sheet range into normalized headers and data rows.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Sheet to read.
 * @returns {{headers: string[], rows: Object[][]}} Sheet table data.
 */
function getDashboardServiceTable_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 1) {
    return {
      headers: [],
      rows: [],
    };
  }

  return {
    headers: values[0].map(function(header) {
      return normalizeDashboardServiceHeader_(header);
    }),
    rows: values.slice(1),
  };
}

/**
 * Builds dashboard metrics from campaign state tabs.
 * @param {{headers: string[], rows: Object[][]}} contactsTable CONTACTS table data.
 * @param {{headers: string[], rows: Object[][]}} queueTable QUEUE table data.
 * @param {{headers: string[], rows: Object[][]}} activityTable ACTIVITY_LOG table data.
 * @param {{headers: string[], rows: Object[][]}} suppressionTable SUPPRESSION table data.
 * @param {{dailyLimit: number}} settings Dashboard settings.
 * @returns {{name: string, value: *}[]} Dashboard metric rows.
 */
function buildDashboardServiceMetrics_(contactsTable, queueTable, activityTable, suppressionTable, settings) {
  const contactStatusCounts = countDashboardServiceStatuses_(contactsTable);
  const queueStatusCounts = countDashboardServiceStatuses_(queueTable);
  const preparedCount = countDashboardServiceActivity_(activityTable, ['emailprepared']);
  const sentCount = countDashboardServiceActivity_(activityTable, ['emailsent']);
  const todaySentCount = countDashboardServiceTodayActivity_(activityTable, ['emailsent']);
  const replyCount = contactStatusCounts.REPLIED || 0;
  const bounceCount = contactStatusCounts.BOUNCED || 0;

  return [
    { name: 'contacts_total', value: contactsTable.rows.length },
    { name: 'queue_total', value: queueTable.rows.length },
    { name: 'queue_queued', value: queueStatusCounts.QUEUED || 0 },
    { name: 'queue_prepared', value: queueStatusCounts.PREPARED || 0 },
    { name: 'emails_prepared_total', value: preparedCount },
    { name: 'emails_sent_total', value: sentCount },
    { name: 'emails_sent_today', value: todaySentCount },
    { name: 'daily_limit', value: settings.dailyLimit },
    { name: 'daily_remaining', value: Math.max(Number(settings.dailyLimit || 0) - todaySentCount, 0) },
    { name: 'replies_total', value: replyCount },
    { name: 'bounces_total', value: bounceCount },
    { name: 'suppression_total', value: suppressionTable.rows.length },
    { name: 'reply_rate', value: calculateDashboardServiceRate_(replyCount, sentCount) },
    { name: 'bounce_rate', value: calculateDashboardServiceRate_(bounceCount, sentCount) },
  ];
}

/**
 * Counts rows by status column.
 * @param {{headers: string[], rows: Object[][]}} table Sheet table data.
 * @returns {Object} Status counts keyed by uppercase status.
 */
function countDashboardServiceStatuses_(table) {
  const statusColumn = findDashboardServiceOptionalColumn_(table.headers, ['status']);
  const counts = {};

  if (statusColumn === -1) {
    return counts;
  }

  table.rows.forEach(function(row) {
    const status = String(row[statusColumn] || '').trim().toUpperCase();
    if (status) {
      counts[status] = (counts[status] || 0) + 1;
    }
  });

  return counts;
}

/**
 * Counts ACTIVITY_LOG rows matching accepted action names.
 * @param {{headers: string[], rows: Object[][]}} activityTable ACTIVITY_LOG table data.
 * @param {string[]} acceptedActions Accepted unnormalized action names.
 * @returns {number} Matching activity count.
 */
function countDashboardServiceActivity_(activityTable, acceptedActions) {
  const actionColumn = findDashboardServiceOptionalColumn_(activityTable.headers, ['action']);
  const normalizedActions = acceptedActions.map(function(action) {
    return normalizeDashboardServiceHeader_(action);
  });

  if (actionColumn === -1) {
    return 0;
  }

  return activityTable.rows.filter(function(row) {
    return normalizedActions.indexOf(normalizeDashboardServiceHeader_(row[actionColumn])) !== -1;
  }).length;
}

/**
 * Counts today's ACTIVITY_LOG rows matching accepted action names.
 * @param {{headers: string[], rows: Object[][]}} activityTable ACTIVITY_LOG table data.
 * @param {string[]} acceptedActions Accepted unnormalized action names.
 * @returns {number} Matching activity count for today.
 */
function countDashboardServiceTodayActivity_(activityTable, acceptedActions) {
  const timestampColumn = findDashboardServiceOptionalColumn_(activityTable.headers, ['timestamp', 'date']);
  const actionColumn = findDashboardServiceOptionalColumn_(activityTable.headers, ['action']);
  const normalizedActions = acceptedActions.map(function(action) {
    return normalizeDashboardServiceHeader_(action);
  });
  const today = new Date().toDateString();

  if (timestampColumn === -1 || actionColumn === -1) {
    return 0;
  }

  return activityTable.rows.filter(function(row) {
    const timestamp = row[timestampColumn];
    return timestamp instanceof Date
      && timestamp.toDateString() === today
      && normalizedActions.indexOf(normalizeDashboardServiceHeader_(row[actionColumn])) !== -1;
  }).length;
}

/**
 * Calculates a rounded rate.
 * @param {number} numerator Numerator count.
 * @param {number} denominator Denominator count.
 * @returns {number} Rate rounded to four decimal places.
 */
function calculateDashboardServiceRate_(numerator, denominator) {
  if (!denominator || denominator < 1) {
    return 0;
  }
  return Math.round((numerator / denominator) * 10000) / 10000;
}

/**
 * Finds an optional header column by accepted names.
 * @param {string[]} headers Normalized header names.
 * @param {string[]} acceptedNames Accepted unnormalized names.
 * @returns {number} Zero-based column index, or -1 when absent.
 */
function findDashboardServiceOptionalColumn_(headers, acceptedNames) {
  const normalizedNames = acceptedNames.map(function(name) {
    return normalizeDashboardServiceHeader_(name);
  });

  for (let index = 0; index < headers.length; index += 1) {
    if (normalizedNames.indexOf(headers[index]) !== -1) {
      return index;
    }
  }
  return -1;
}

/**
 * Normalizes a sheet header or cell value for resilient matching.
 * @param {*} value Sheet value.
 * @returns {string} Normalized value.
 */
function normalizeDashboardServiceHeader_(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
