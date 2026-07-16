/**
 * Express Training Cold Email MVP orchestrator.
 * Chains pure modules and I/O modules for the Phase 1 import-to-draft workflow.
 * Modules: ImportService, Cleaner, Deduplicator, MassachusettsFilter, LeadScorer,
 * AuditLogger, TemplateEngine, ApprovalGate, and DraftService.
 * Modules:
 * - ImportService: imports CSV/paste data into COMPANIES.
 * - Cleaner: normalizes company and contact fields.
 * - Deduplicator: checks duplicate companies and contacts.
 * - MassachusettsFilter: enforces Massachusetts-only scope.
 * - LeadScorer: calculates lead scores and approval readiness.
 * - AuditLogger: writes structured ACTIVITY_LOG entries.
 * - TemplateEngine: merges approved templates with contact fields.
 * - ApprovalGate: checks all pre-send requirements.
 * - DraftService: prepares approved subject/body rows for manual Hostinger sends.
 * - SuppressionService: tracks opt-outs, bounces, and exclusions.
 * - CampaignStateService: records manual sends, replies, bounces, and opt-outs.
 * - ReplyMonitor/BounceMonitor: compatibility no-ops after the Hostinger migration.
 * - FollowUpScheduler: identifies follow-up eligible contacts.
 * - DashboardService: calculates campaign metrics.
 * - ZeroBounceClient: verifies emails through ZeroBounce.
 * - ApolloClient: discovers contacts through Apollo.
 * - HunterClient: discovers and verifies emails through Hunter.
 */

/**
 * Runs the import pipeline entry point.
 * @param {Array<Array<string>>} rawRows - Raw company rows from CSV paste or caller-provided staging data.
 * @returns {{imported: number, skipped: number}}
 */
function runImportPipeline(rawRows) {
  try {
    const spreadsheet = openCampaignSpreadsheet();
    readSettings(spreadsheet);
    const existingDomains = readColumnValues(spreadsheet, 'COMPANIES', 'website');
    const rows = rawRows || [];
    const importRows = [];
    let skipped = 0;

    rows.forEach(function(row) {
      const cleaned = cleanCompany({
        company: row[0],
        website: row[1],
        industry: row[2],
        city: row[3],
        state: row[4],
        employeeSize: row[5],
        sourceUrl: row[6],
        wtfpRelevance: row[7]
      });

      if (!isMassachusetts(cleaned.state, cleaned.city) || isDuplicateCompany(cleaned.website, existingDomains)) {
        skipped += 1;
        return;
      }

      importRows.push([
        cleaned.company,
        cleaned.website,
        cleaned.industry,
        cleaned.city,
        cleaned.state,
        cleaned.employeeSize,
        cleaned.sourceUrl,
        cleaned.wtfpRelevance
      ]);
    });

    const result = importCompanies(importRows);
    return { imported: result.imported, skipped: result.skipped + skipped };
  } catch (error) {
    auditLog('Orchestrator', 'IMPORT_PIPELINE_ERROR', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Prepares approved QUEUE rows for manual sending through Hostinger Webmail.
 * @returns {{processed: number, prepared: number, skipped: number}}
 */
function runPreparationPipeline() {
  try {
    const spreadsheet = openCampaignSpreadsheet();
    const settings = readSettings(spreadsheet);
    const dailySentCount = countTodayActivity(spreadsheet, 'EMAIL_SENT');
    const template = readTemplate(spreadsheet);
    const contacts = readRecords(spreadsheet, 'QUEUE');
    let processed = 0;
    let prepared = 0;
    let skipped = 0;

    contacts.forEach(function(contact) {
      const status = String(contact.status || '').trim().toUpperCase();
      if (status && status !== 'QUEUED') {
        return;
      }
      processed += 1;
      const score = scoreLead({
        maConfirmed: contact.maConfirmed === true || contact.maConfirmed === 'TRUE',
        relevantRole: contact.roleIsRelevant === true || contact.roleIsRelevant === 'TRUE',
        validEmail: contact.verificationResult === 'valid',
        wtfpRelevance: contact.wtfpRelevance === true || contact.wtfpRelevance === 'TRUE',
        employeeSizeFit: contact.employeeSizeFit === true || contact.employeeSizeFit === 'TRUE',
        industryFit: contact.industryFit === true || contact.industryFit === 'TRUE',
        hasPersonalizationFact: Boolean(String(contact.personalizationLine || '').trim())
      }, Number(settings.approvalThreshold));
      const approval = checkApproval(contact, settings, dailySentCount + prepared, isContactSuppressed_(contact));

      if (!score.approved || !approval.approved) {
        skipped += 1;
        auditLog('Orchestrator', 'EMAIL_PREPARATION_SKIPPED', contact.contactId || '', 'Score approved: ' + score.approved + '; failed checks: ' + approval.failedChecks.join(', '), 'SKIP');
        return;
      }

      const body = mergeTemplate(template.body, {
        firstName: contact.firstName || '',
        company: contact.company || '',
        personalizationLine: contact.personalizationLine || '',
        senderName: settings.senderName || ''
      });
      const preparationResult = prepareEmailForHostinger(contact, template.subject, body, settings);

      if (preparationResult.success && preparationResult.prepared) {
        prepared += 1;
      } else if (!preparationResult.success) {
        skipped += 1;
      } else {
        auditLog('Orchestrator', 'EMAIL_ALREADY_PREPARED', contact.contactId || '', String(contact.email || ''), 'SKIP');
      }
    });

    return { processed: processed, prepared: prepared, skipped: skipped };
  } catch (error) {
    auditLog('Orchestrator', 'PREPARATION_PIPELINE_ERROR', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Runs the full pipeline entry point.
 * @param {Array<Array<string>>} rawRows - Raw company rows from CSV paste or caller-provided staging data.
 * @returns {{importResult: Object, preparationResult: Object}}
 */
function runFullPipeline(rawRows) {
  try {
    const importResult = runImportPipeline(rawRows);
    const preparationResult = runPreparationPipeline();

    return { importResult: importResult, preparationResult: preparationResult };
  } catch (error) {
    auditLog('Orchestrator', 'FULL_PIPELINE_ERROR', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Schedules follow-ups and refreshes dashboard metrics.
 * @returns {{replyResult: Object, bounceResult: Object, followUpResult: Object, dashboardResult: Object}}
 */
function runTrackingPipeline() {
  try {
    const replyResult = getReplyMonitorDisabledSummary_();
    const bounceResult = getBounceMonitorDisabledSummary_();
    const followUpResult = scheduleFollowUps();
    const dashboardResult = refreshDashboard();

    return {
      replyResult: replyResult,
      bounceResult: bounceResult,
      followUpResult: followUpResult,
      dashboardResult: dashboardResult,
    };
  } catch (error) {
    auditLog('Orchestrator', 'TRACKING_PIPELINE_ERROR', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Compatibility trigger entry point retained so an installed legacy trigger does not fail.
 * @returns {{scanned: number, repliesDetected: number, updated: number}}
 */
function runReplyMonitorTrigger() {
  return getReplyMonitorDisabledSummary_();
}

/**
 * Compatibility trigger entry point retained so an installed legacy trigger does not fail.
 * @returns {{scanned: number, bouncesDetected: number, updated: number}}
 */
function runBounceMonitorTrigger() {
  return getBounceMonitorDisabledSummary_();
}

/**
 * Time-driven trigger entry point for follow-up scheduling.
 * @returns {{scanned: number, eligible: number, queued: number, skipped: number}}
 */
function runFollowUpSchedulerTrigger() {
  try {
    return scheduleFollowUps();
  } catch (error) {
    auditLog('Orchestrator', 'FOLLOW_UP_SCHEDULER_TRIGGER_ERROR', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Time-driven trigger entry point for dashboard refreshes.
 * @returns {{metricsWritten: number}}
 */
function runDashboardRefreshTrigger() {
  try {
    return refreshDashboard();
  } catch (error) {
    auditLog('Orchestrator', 'DASHBOARD_REFRESH_TRIGGER_ERROR', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Determines whether a QUEUE contact is suppressed.
 * Trusts a pre-computed isSuppressed column when set, and otherwise checks the
 * live SUPPRESSION tab so bounces/opt-outs are honored even if the column is stale.
 * @param {Object} contact - QUEUE contact record.
 * @returns {boolean}
 */
function isContactSuppressed_(contact) {
  const flagged = contact.isSuppressed === true || contact.isSuppressed === 'TRUE';
  if (flagged) {
    return true;
  }

  const email = String(contact.email || '').trim();
  if (!email) {
    return false;
  }

  try {
    return isSuppressed(email);
  } catch (error) {
    auditLog('Orchestrator', 'SUPPRESSION_CHECK_FALLBACK', contact.contactId || '', error && error.message ? error.message : String(error), 'WARN');
    return flagged;
  }
}

/**
 * Canonical record header names the import/draft pipeline reads by exact key.
 * Used to tolerate case, spacing, and punctuation differences in sheet headers.
 * @type {string[]}
 */
const CANONICAL_RECORD_HEADERS = [
  'key', 'value', 'setting', 'name',
  'company', 'website', 'industry', 'city', 'state', 'employeeSize', 'sourceUrl', 'wtfpRelevance',
  'firstName', 'lastName', 'title', 'email', 'linkedinUrl', 'contactId',
  'maConfirmed', 'roleIsRelevant', 'verificationResult', 'catchAll', 'status',
  'personalizationLine', 'emailsSent', 'employeeSizeFit', 'industryFit', 'isSuppressed',
  'subject', 'body', 'template', 'templateBody', 'senderName', 'lastSentAt',
  'sequenceStep', 'preparedAt', 'sentAt'
];

/**
 * Builds a normalized-header to canonical-header lookup.
 * @returns {Object} Map of normalized header to canonical camelCase header.
 */
function canonicalRecordHeaderMap_() {
  const map = {};
  CANONICAL_RECORD_HEADERS.forEach(function(canonical) {
    map[canonical.toLowerCase().replace(/[^a-z0-9]/g, '')] = canonical;
  });
  return map;
}

/**
 * Opens the configured campaign spreadsheet.
 * @returns {SpreadsheetApp.Spreadsheet}
 */
function openCampaignSpreadsheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return SpreadsheetApp.openById(spreadsheetId);
}

/**
 * Reads SETTINGS tab key/value rows into an object.
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet - Campaign spreadsheet.
 * @returns {Object}
 */
function readSettings(spreadsheet) {
  const records = readRecords(spreadsheet, 'SETTINGS');
  const settings = {};

  records.forEach(function(record) {
    const key = record.key || record.setting || record.name;
    const value = record.value;

    if (key) {
      settings[key] = value;
    }
  });

  settings.dailyLimit = Number(settings.dailyLimit || settings.DAILY_LIMIT || 0);
  const threshold = Number(settings.approvalThreshold || settings.APPROVAL_THRESHOLD);
  settings.approvalThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 75;
  settings.senderName = settings.senderName || settings.SENDER_NAME || '';

  return settings;
}

/**
 * Reads a tab with a header row into record objects.
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet - Campaign spreadsheet.
 * @param {string} tabName - Sheet tab name.
 * @returns {Object[]}
 */
function readRecords(spreadsheet, tabName) {
  const sheet = spreadsheet.getSheetByName(tabName);
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  const canonicalMap = canonicalRecordHeaderMap_();
  const headers = values[0].map(function(header) {
    const trimmed = String(header || '').trim();
    const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    return canonicalMap[normalized] || trimmed;
  });

  return values.slice(1).map(function(row, rowIndex) {
    const record = { _rowNumber: rowIndex + 2 };

    headers.forEach(function(header, index) {
      if (header) {
        record[header] = row[index];
      }
    });

    return record;
  });
}

/**
 * Reads one column from a tab by header name.
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet - Campaign spreadsheet.
 * @param {string} tabName - Sheet tab name.
 * @param {string} headerName - Header name to read.
 * @returns {string[]}
 */
function readColumnValues(spreadsheet, tabName, headerName) {
  const records = readRecords(spreadsheet, tabName);

  return records.map(function(record) {
    return record[headerName] || '';
  });
}

/**
 * Reads the first approved template from TEMPLATES tab.
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet - Campaign spreadsheet.
 * @returns {{subject: string, body: string}}
 */
function readTemplate(spreadsheet) {
  const templates = readRecords(spreadsheet, 'TEMPLATES');
  const template = templates[0] || {};

  return {
    subject: template.subject || '',
    body: template.body || template.template || template.templateBody || ''
  };
}

/**
 * Counts today's ACTIVITY_LOG rows for a specific action.
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet - Campaign spreadsheet.
 * @param {string} action - Activity action to count.
 * @returns {number}
 */
function countTodayActivity(spreadsheet, action) {
  const sheet = spreadsheet.getSheetByName('ACTIVITY_LOG');
  const values = sheet.getDataRange().getValues();
  const today = new Date().toDateString();

  return values.filter(function(row) {
    const timestamp = row[0];
    const rowAction = row[2];

    return timestamp instanceof Date && timestamp.toDateString() === today && rowAction === action;
  }).length;
}
