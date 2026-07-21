/**
 * Manual Email Warm-Up — orchestrator.
 *
 * Standalone Apps Script project, deliberately separate from the cold-email
 * campaign automation in this repo's root src/. It warms the dedicated
 * outreach domain by sending Gemini-varied emails through the Hostinger Email
 * API to a pool of owned Gmail seed accounts, which then open and reply on
 * randomized, ramped schedules.
 *
 * Entry points:
 * - setupWarmupSheet()          one-time tab creation
 * - validateWarmupConfiguration() checks every required property, tab, and seed mapping
 * - testSeedAccountConnections() verifies all seed tokens without changing mailbox data
 * - runWarmupSendTrigger()      daily time trigger — sends the day's ramped volume
 * - runWarmupEngagementTrigger() hourly time trigger — opens/replies as seed accounts
 * - refreshWarmupSummary()      rebuilds the DAILY_SUMMARY dashboard tab
 * - testHostingerConnection()   manual API verification before first run
 */

const WARMUP_STAGE = 'WarmupOrchestrator';
const WARMUP_LOG_SHEET = 'WARMUP_LOG';
const WARMUP_ENGAGEMENT_SHEET = 'ENGAGEMENT';
const WARMUP_SUMMARY_SHEET = 'DAILY_SUMMARY';
const WARMUP_LOG_HEADERS = ['timestamp', 'stage', 'action', 'target', 'details', 'status'];
const WARMUP_ENGAGEMENT_HEADERS = ['messageId', 'threadId', 'seedEmail', 'subject', 'state', 'engageAfter', 'updatedAt'];

/**
 * Creates the required tabs in the warm-up spreadsheet if missing.
 * @returns {{created: string[]}} Names of tabs created.
 */
function setupWarmupSheet() {
  const spreadsheet = getWarmupSpreadsheet_();
  const created = [];
  const required = [
    { name: WARMUP_LOG_SHEET, headers: WARMUP_LOG_HEADERS },
    { name: WARMUP_ENGAGEMENT_SHEET, headers: WARMUP_ENGAGEMENT_HEADERS },
    { name: SEED_ACCOUNT_SHEET, headers: ['email', 'tokenPropertyKey', 'active'] },
    { name: WARMUP_SUMMARY_SHEET, headers: ['metric', 'value'] },
  ];
  required.forEach(function(tab) {
    if (!spreadsheet.getSheetByName(tab.name)) {
      const sheet = spreadsheet.insertSheet(tab.name);
      sheet.getRange(1, 1, 1, tab.headers.length).setValues([tab.headers]);
      created.push(tab.name);
    }
  });
  warmupLog(WARMUP_STAGE, 'SHEET_SETUP', '', JSON.stringify({ created: created }), 'OK');
  return { created: created };
}

/**
 * Checks every required Script Property, tab, seed mapping, and refresh-token property at once.
 * This does not call Hostinger or Gmail; run the connection tests after it passes.
 * @returns {{success: boolean, errors: string[], warnings: string[]}} Preflight summary.
 */
function validateWarmupConfiguration() {
  const properties = PropertiesService.getScriptProperties();
  const errors = [];
  const warnings = [];
  const requiredProperties = [
    'WARMUP_SHEET_ID',
    'WARMUP_FROM_EMAIL',
    'WARMUP_START_DATE',
    'HOSTINGER_API_TOKEN',
    'OAUTH_CLIENT_ID',
    'OAUTH_CLIENT_SECRET',
  ];

  requiredProperties.forEach(function(key) {
    if (!String(properties.getProperty(key) || '').trim()) {
      errors.push('Missing Script Property ' + key + ' in Apps Script > Project Settings > Script Properties.');
    }
  });

  const fromEmail = String(properties.getProperty('WARMUP_FROM_EMAIL') || '').trim().toLowerCase();
  if (fromEmail && fromEmail !== 'adam@goldflamingoailabs.com') {
    errors.push('WARMUP_FROM_EMAIL must be adam@goldflamingoailabs.com, not ' + fromEmail + '.');
  }

  const startDate = String(properties.getProperty('WARMUP_START_DATE') || '').trim();
  if (startDate && (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(new Date(startDate + 'T00:00:00').getTime()))) {
    errors.push('WARMUP_START_DATE must use YYYY-MM-DD, for example 2026-07-28.');
  }

  if (!String(properties.getProperty('OAUTH_PROJECT_OWNER_EMAIL') || '').trim()) {
    warnings.push('OAUTH_PROJECT_OWNER_EMAIL is missing; optional, but recommended as a human-readable label.');
  }
  if (!String(properties.getProperty('OAUTH_CLOUD_PROJECT_ID') || '').trim()) {
    warnings.push('OAUTH_CLOUD_PROJECT_ID is missing; optional, but recommended as a human-readable label.');
  }

  let spreadsheet;
  try {
    spreadsheet = getWarmupSpreadsheet_();
  } catch (error) {
    errors.push('WARMUP_SHEET_ID cannot be opened: ' + (error && error.message ? error.message : String(error)));
  }
  if (spreadsheet) {
    [WARMUP_LOG_SHEET, WARMUP_ENGAGEMENT_SHEET, SEED_ACCOUNT_SHEET, WARMUP_SUMMARY_SHEET].forEach(function(sheetName) {
      if (!spreadsheet.getSheetByName(sheetName)) {
        errors.push('Missing Sheet tab ' + sheetName + '; run setupWarmupSheet().');
      }
    });
  }

  let accounts = [];
  if (spreadsheet && spreadsheet.getSheetByName(SEED_ACCOUNT_SHEET)) {
    accounts = getSeedAccounts();
    const accountsByEmail = {};
    accounts.forEach(function(account) { accountsByEmail[account.email] = account; });
    WARMUP_EXPECTED_SEED_MAPPINGS.forEach(function(expected) {
      const account = accountsByEmail[expected.email];
      if (!account) {
        errors.push('SEED_ACCOUNTS is missing active row: ' + expected.email + ' | ' + expected.tokenPropertyKey + ' | TRUE.');
        return;
      }
      if (account.tokenPropertyKey !== expected.tokenPropertyKey) {
        errors.push('SEED_ACCOUNTS tokenPropertyKey for ' + expected.email + ' must be ' + expected.tokenPropertyKey + '.');
      }
      const refreshToken = String(properties.getProperty(expected.tokenPropertyKey) || '').trim();
      if (!refreshToken) {
        errors.push('Missing Script Property ' + expected.tokenPropertyKey + ' for ' + expected.email + '.');
      } else if (refreshToken.indexOf('1//') !== 0) {
        warnings.push(expected.tokenPropertyKey + ' does not begin with 1//; confirm it is the OAuth refresh token, not the access token.');
      }
    });
    if (accounts.length !== WARMUP_EXPECTED_SEED_MAPPINGS.length) {
      errors.push('SEED_ACCOUNTS must contain exactly 4 active rows; found ' + accounts.length + '.');
    }
  }

  const result = { success: errors.length === 0, errors: errors, warnings: warnings };
  warmupLog(WARMUP_STAGE, 'CONFIGURATION_TEST', '', JSON.stringify(result), result.success ? (warnings.length ? 'WARN' : 'OK') : 'ERROR');
  if (!result.success) {
    throw new Error('Warm-up configuration failed:\n- ' + errors.join('\n- '));
  }
  return result;
}

/**
 * Daily trigger: sends today's ramped warm-up volume to randomly chosen seed accounts.
 * @returns {{dayIndex: number, target: number, sent: number, failed: number}}
 */
function runWarmupSendTrigger() {
  try {
    const config = getWarmupConfig_();
    const now = new Date();
    const dayIndex = computeWarmupDayIndex(config.startDate, now);
    if (dayIndex < 0) {
      warmupLog(WARMUP_STAGE, 'SEND_SKIPPED', '', 'WARMUP_START_DATE is unset or in the future.', 'SKIP');
      return { dayIndex: dayIndex, target: 0, sent: 0, failed: 0 };
    }

    const target = computeWarmupDailySendTarget(dayIndex, now.getDay(), config, Math.random);
    const alreadySentToday = countWarmupLogActionsToday_('WARMUP_EMAIL_SENT', now);
    const remaining = Math.max(target - alreadySentToday, 0);
    const seeds = getSeedAccounts();
    if (seeds.length === 0) {
      throw new Error('No active seed accounts configured in ' + SEED_ACCOUNT_SHEET + '.');
    }

    let sent = 0;
    let failed = 0;
    for (let index = 0; index < remaining; index += 1) {
      const seed = seeds[Math.floor(Math.random() * seeds.length)];
      const content = generateWarmupSendContent();
      const result = sendWarmupEmail(seed.email, content.subject, content.body);
      if (result.success) {
        sent += 1;
      } else {
        failed += 1;
      }
    }

    const summary = { dayIndex: dayIndex, target: target, sent: sent, failed: failed };
    warmupLog(WARMUP_STAGE, 'SEND_RUN_COMPLETE', '', JSON.stringify(summary), failed > 0 ? 'WARN' : 'OK');
    return summary;
  } catch (error) {
    warmupLog(WARMUP_STAGE, 'SEND_RUN_FAILED', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Hourly trigger: as each seed account, discovers new warm-up mail, then opens and
 * replies once each message's randomized delay has elapsed. Some messages are
 * deliberately skipped forever so engagement never looks perfect.
 * @returns {{discovered: number, opened: number, replied: number, skipped: number}}
 */
function runWarmupEngagementTrigger() {
  try {
    const config = getWarmupConfig_();
    const now = new Date();
    const dayIndex = computeWarmupDayIndex(config.startDate, now);
    const replyRate = computeWarmupReplyRate(dayIndex, config);
    const engagement = readWarmupEngagementState_();
    const summary = { discovered: 0, opened: 0, replied: 0, skipped: 0 };

    getSeedAccounts().forEach(function(seed) {
      let accessToken;
      try {
        accessToken = getSeedAccessToken_(seed.tokenPropertyKey);
      } catch (error) {
        warmupLog(WARMUP_STAGE, 'SEED_AUTH_FAILED', seed.email, error && error.message ? error.message : String(error), 'ERROR');
        return;
      }

      listUnreadWarmupMessages_(accessToken, config.warmupDomain).forEach(function(message) {
        if (!engagement.byMessageId[message.id]) {
          summary.discovered += 1;
          if (shouldSkipWarmupEngagement(config, Math.random)) {
            appendWarmupEngagementRow_(message, seed.email, '', 'SKIPPED', null, now);
            summary.skipped += 1;
          } else {
            const delayMinutes = pickWarmupEngageDelayMinutes(config, Math.random);
            const engageAfter = new Date(now.getTime() + delayMinutes * 60000);
            const metadata = getWarmupMessageMetadata_(accessToken, message.id);
            appendWarmupEngagementRow_(message, seed.email, metadata.subject, 'PENDING', engageAfter, now);
          }
          return;
        }

        const record = engagement.byMessageId[message.id];
        if (record.state !== 'PENDING' || !(record.engageAfter instanceof Date) || now < record.engageAfter) {
          return;
        }

        markWarmupMessageOpened_(accessToken, message.id, Math.random() < 0.3);
        summary.opened += 1;
        let state = 'OPENED';
        if (Math.random() < replyRate) {
          const reply = generateWarmupReplyContent(record.subject);
          sendSeedReply_(accessToken, message.threadId, seed.email, config.warmupFromEmail, record.subject, reply.body);
          warmupLog(WARMUP_STAGE, 'SEED_REPLY_SENT', seed.email, JSON.stringify({
            messageId: message.id,
            replyHash: computeWarmupContentHash(reply.body),
            source: reply.source,
          }), 'OK');
          summary.replied += 1;
          state = 'REPLIED';
        }
        updateWarmupEngagementState_(record.rowNumber, state, now);
      });
    });

    warmupLog(WARMUP_STAGE, 'ENGAGEMENT_RUN_COMPLETE', '', JSON.stringify(summary), 'OK');
    return summary;
  } catch (error) {
    warmupLog(WARMUP_STAGE, 'ENGAGEMENT_RUN_FAILED', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Rebuilds the DAILY_SUMMARY tab from the raw log.
 * @returns {Array<{metric: string, value: number}>} Metrics written.
 */
function refreshWarmupSummary() {
  const now = new Date();
  const config = getWarmupConfig_();
  const dayIndex = computeWarmupDayIndex(config.startDate, now);
  const metrics = [
    { metric: 'day_index', value: dayIndex },
    { metric: 'sent_total', value: countWarmupLogActions_('WARMUP_EMAIL_SENT') },
    { metric: 'sent_today', value: countWarmupLogActionsToday_('WARMUP_EMAIL_SENT', now) },
    { metric: 'replies_total', value: countWarmupLogActions_('SEED_REPLY_SENT') },
    { metric: 'send_failures_total', value: countWarmupLogActions_('WARMUP_EMAIL_SEND_FAILED') },
    { metric: 'today_target', value: dayIndex < 0 ? 0 : computeWarmupDailySendTarget(dayIndex, now.getDay(), config, function() { return 0.5; }) },
  ];
  const sheet = getWarmupSheet_(WARMUP_SUMMARY_SHEET);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, 2).setValues([['metric', 'value']]);
  sheet.getRange(2, 1, metrics.length, 2).setValues(metrics.map(function(entry) {
    return [entry.metric, entry.value];
  }));
  return metrics;
}

/**
 * Appends one structured entry to the WARMUP_LOG tab.
 * @param {string} stage - Calling module name.
 * @param {string} action - What happened.
 * @param {string} target - Email or account acted on, or ''.
 * @param {string} details - Human-readable detail string (JSON.stringify objects).
 * @param {string} status - 'OK' | 'ERROR' | 'SKIP' | 'WARN'.
 * @returns {void}
 */
function warmupLog(stage, action, target, details, status) {
  try {
    getWarmupSheet_(WARMUP_LOG_SHEET).appendRow([new Date(), stage, action, target, details, status]);
  } catch (ignored) {
    // Logging must never break a run; the sheet may not exist yet during setup.
  }
}

/**
 * Reads scheduler config from script properties, applying defaults.
 * @returns {Object} Config with startDate, warmupDomain, warmupFromEmail, and ramp fields.
 */
function getWarmupConfig_() {
  const properties = PropertiesService.getScriptProperties();
  const fromEmail = String(properties.getProperty('WARMUP_FROM_EMAIL') || '').trim();
  const config = {
    startDate: new Date(String(properties.getProperty('WARMUP_START_DATE') || '')),
    warmupFromEmail: fromEmail,
    warmupDomain: fromEmail.indexOf('@') === -1 ? '' : fromEmail.split('@').pop(),
    startPerDay: Number(properties.getProperty('WARMUP_START_PER_DAY')) || WARMUP_SCHEDULER_DEFAULTS.startPerDay,
    maxPerDay: Number(properties.getProperty('WARMUP_MAX_PER_DAY')) || WARMUP_SCHEDULER_DEFAULTS.maxPerDay,
    rampDays: Number(properties.getProperty('WARMUP_RAMP_DAYS')) || WARMUP_SCHEDULER_DEFAULTS.rampDays,
    startReplyRate: WARMUP_SCHEDULER_DEFAULTS.startReplyRate,
    maxReplyRate: WARMUP_SCHEDULER_DEFAULTS.maxReplyRate,
    skipRate: WARMUP_SCHEDULER_DEFAULTS.skipRate,
    weekendFactor: WARMUP_SCHEDULER_DEFAULTS.weekendFactor,
    minEngageDelayMinutes: WARMUP_SCHEDULER_DEFAULTS.minEngageDelayMinutes,
    maxEngageDelayMinutes: WARMUP_SCHEDULER_DEFAULTS.maxEngageDelayMinutes,
  };
  if (!config.warmupDomain) {
    throw new Error('Set WARMUP_FROM_EMAIL=adam@goldflamingoailabs.com in Apps Script > Project Settings > Script Properties. Do not edit this source line.');
  }
  return config;
}

/**
 * Reads the ENGAGEMENT tab into a lookup keyed by messageId.
 * @returns {{byMessageId: Object}} Engagement state lookup.
 */
function readWarmupEngagementState_() {
  const values = getWarmupSheet_(WARMUP_ENGAGEMENT_SHEET).getDataRange().getValues();
  const byMessageId = {};
  for (let index = 1; index < values.length; index += 1) {
    const row = values[index];
    const messageId = String(row[0] || '').trim();
    if (messageId) {
      byMessageId[messageId] = {
        rowNumber: index + 1,
        threadId: String(row[1] || ''),
        seedEmail: String(row[2] || ''),
        subject: String(row[3] || ''),
        state: String(row[4] || '').trim().toUpperCase(),
        engageAfter: row[5] instanceof Date ? row[5] : null,
      };
    }
  }
  return { byMessageId: byMessageId };
}

/**
 * Appends one engagement-state row for a newly discovered message.
 * @param {{id: string, threadId: string}} message - Gmail message reference.
 * @param {string} seedEmail - Seed account address.
 * @param {string} subject - Message subject.
 * @param {string} state - Initial state (PENDING or SKIPPED).
 * @param {Date|null} engageAfter - Earliest engagement time, or null.
 * @param {Date} now - Current time.
 * @returns {void}
 */
function appendWarmupEngagementRow_(message, seedEmail, subject, state, engageAfter, now) {
  getWarmupSheet_(WARMUP_ENGAGEMENT_SHEET).appendRow([
    message.id, message.threadId, seedEmail, subject, state, engageAfter || '', now,
  ]);
}

/**
 * Updates the state and updatedAt columns of one engagement row.
 * @param {number} rowNumber - One-based ENGAGEMENT row number.
 * @param {string} state - New state.
 * @param {Date} now - Current time.
 * @returns {void}
 */
function updateWarmupEngagementState_(rowNumber, state, now) {
  const sheet = getWarmupSheet_(WARMUP_ENGAGEMENT_SHEET);
  sheet.getRange(rowNumber, 5).setValue(state);
  sheet.getRange(rowNumber, 7).setValue(now);
}

/**
 * Counts WARMUP_LOG entries with a given action.
 * @param {string} action - Action to count.
 * @returns {number} Total matching entries.
 */
function countWarmupLogActions_(action) {
  const values = getWarmupSheet_(WARMUP_LOG_SHEET).getDataRange().getValues();
  let count = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][2] || '').trim() === action) {
      count += 1;
    }
  }
  return count;
}

/**
 * Counts WARMUP_LOG entries with a given action logged today.
 * @param {string} action - Action to count.
 * @param {Date} now - Current time.
 * @returns {number} Matching entries stamped today.
 */
function countWarmupLogActionsToday_(action, now) {
  const values = getWarmupSheet_(WARMUP_LOG_SHEET).getDataRange().getValues();
  let count = 0;
  for (let index = 1; index < values.length; index += 1) {
    const timestamp = values[index][0];
    const matchesAction = String(values[index][2] || '').trim() === action;
    if (matchesAction && timestamp instanceof Date &&
        timestamp.getFullYear() === now.getFullYear() &&
        timestamp.getMonth() === now.getMonth() &&
        timestamp.getDate() === now.getDate()) {
      count += 1;
    }
  }
  return count;
}

/**
 * Opens the configured warm-up spreadsheet.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet} Warm-up spreadsheet.
 */
function getWarmupSpreadsheet_() {
  const sheetId = PropertiesService.getScriptProperties().getProperty('WARMUP_SHEET_ID');
  if (!sheetId) {
    throw new Error('WARMUP_SHEET_ID script property is required.');
  }
  return SpreadsheetApp.openById(sheetId);
}

/**
 * Returns a required tab of the warm-up spreadsheet.
 * @param {string} sheetName - Tab name.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Sheet.
 */
function getWarmupSheet_(sheetName) {
  const sheet = getWarmupSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Missing required sheet: ' + sheetName + '. Run setupWarmupSheet() first.');
  }
  return sheet;
}
