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
 * - DraftService: creates Gmail drafts for human review.
 * - SuppressionService: tracks opt-outs, bounces, and exclusions.
 * - ReplyMonitor: detects replies through Gmail search.
 * - BounceMonitor: detects NDR bounce messages through Gmail search.
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
 * @returns {void}
 */
function runImportPipeline() {
  // TODO: wire modules in TaskX.X
}

/**
 * Runs the draft pipeline entry point.
 * @returns {{processed: number, drafted: number, skipped: number}}
 */
function runDraftPipeline() {
  try {
    const spreadsheet = openCampaignSpreadsheet();
    const settings = readSettings(spreadsheet);
    const dailySentCount = countTodayActivity(spreadsheet, 'DRAFT_CREATED');
    const template = readTemplate(spreadsheet);
    const contacts = readRecords(spreadsheet, 'QUEUE');
    let processed = 0;
    let drafted = 0;
    let skipped = 0;

    contacts.forEach(function(contact) {
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
      const approval = checkApproval(contact, settings, dailySentCount + drafted, contact.isSuppressed === true || contact.isSuppressed === 'TRUE');

      if (!score.approved || !approval.approved) {
        skipped += 1;
        auditLog('Orchestrator', 'DRAFT_SKIPPED', contact.contactId || '', 'Score approved: ' + score.approved + '; failed checks: ' + approval.failedChecks.join(', '), 'SKIP');
        return;
      }

      const body = mergeTemplate(template.body, {
        firstName: contact.firstName || '',
        company: contact.company || '',
        personalizationLine: contact.personalizationLine || '',
        senderName: settings.senderName || ''
      });
      const draftResult = createDraft(contact.email, template.subject, body, contact.contactId || '', settings);

      if (draftResult.success) {
        drafted += 1;
      } else {
        skipped += 1;
      }
    });

    return { processed: processed, drafted: drafted, skipped: skipped };
  } catch (error) {
    auditLog('Orchestrator', 'DRAFT_PIPELINE_ERROR', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
 * @returns {void}
 */
function runDraftPipeline() {
  // TODO: wire modules in TaskX.X
}

/**
 * Runs the full pipeline entry point.
 * @param {Array<Array<string>>} rawRows - Raw company rows from CSV paste or caller-provided staging data.
 * @returns {{importResult: Object, draftResult: Object}}
 */
function runFullPipeline(rawRows) {
  try {
    const importResult = runImportPipeline(rawRows);
    const draftResult = runDraftPipeline();

    return { importResult: importResult, draftResult: draftResult };
  } catch (error) {
    auditLog('Orchestrator', 'FULL_PIPELINE_ERROR', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
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
  settings.approvalThreshold = Number(settings.approvalThreshold || settings.APPROVAL_THRESHOLD);
  settings.draftOnly = String(settings.draftOnly || settings.DRAFT_ONLY || 'TRUE').toUpperCase() !== 'FALSE';
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

  const headers = values[0].map(function(header) {
    return String(header || '').trim();
  });

  return values.slice(1).map(function(row) {
    const record = {};

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
 * @returns {void}
 */
function runFullPipeline() {
  // TODO: wire modules in TaskX.X
}
