const CONTACT_DISCOVERY_STAGE = 'ContactDiscoveryService';
const CONTACT_DISCOVERY_CONTACTS_SHEET = 'CONTACTS';
const CONTACT_DISCOVERY_COMPANIES_SHEET = 'COMPANIES';
const CONTACT_DISCOVERY_SETTING_BATCH_SIZE = 'CONTACT_DISCOVERY_BATCH_SIZE';
const CONTACT_DISCOVERY_SETTING_KEYWORDS = 'RELEVANT_TITLE_KEYWORDS';
const CONTACT_DISCOVERY_CATCH_ALL_SCORE_THRESHOLD = 50;
const CONTACT_DISCOVERY_WRITE_COLUMNS = ['email', 'catchAll', 'roleIsRelevant', 'maConfirmed', 'wtfpRelevance', 'employeeSizeFit', 'industryFit', 'source'];

/**
 * Fills in emails for CONTACTS rows that have none, using the company's domain
 * and Hunter's email finder. Also stamps the enrichment flags ApprovalGate and
 * LeadScorer read. Batch-capped: Hunter credits are budget-limited and Apps
 * Script runs are capped at 6 minutes.
 * @returns {{processed: number, discovered: number, skipped: number}}
 */
function runContactDiscovery() {
  const summary = { processed: 0, discovered: 0, skipped: 0 };

  try {
    const spreadsheet = openCampaignSpreadsheet();
    const settings = readSettings(spreadsheet);
    const batchSize = Number(settings[CONTACT_DISCOVERY_SETTING_BATCH_SIZE]);
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new Error('Missing required SETTINGS value: ' + CONTACT_DISCOVERY_SETTING_BATCH_SIZE);
    }
    const keywordsCsv = String(settings[CONTACT_DISCOVERY_SETTING_KEYWORDS] || '');

    const contactsSheet = spreadsheet.getSheetByName(CONTACT_DISCOVERY_CONTACTS_SHEET);
    if (!contactsSheet) {
      throw new Error('Missing required sheet: ' + CONTACT_DISCOVERY_CONTACTS_SHEET);
    }
    const columns = ensureContactDiscoveryColumns_(contactsSheet);
    const companiesByName = buildContactDiscoveryCompanyMap_(spreadsheet);
    const contacts = readRecords(spreadsheet, CONTACT_DISCOVERY_CONTACTS_SHEET);

    for (let index = 0; index < contacts.length && summary.processed < batchSize; index += 1) {
      const contact = contacts[index];
      if (String(contact.email || '').trim() !== '') {
        continue;
      }
      summary.processed += 1;
      const contactId = String(contact.contactId || '').trim() || (String(contact.firstName || '') + ' ' + String(contact.lastName || '')).trim();

      const company = companiesByName[normalizeContactDiscoveryCompany_(contact.company)];
      const domain = company ? extractContactDiscoveryDomain_(company.website) : '';
      if (!domain) {
        summary.skipped += 1;
        auditLog(CONTACT_DISCOVERY_STAGE, 'DISCOVERY_SKIPPED_NO_DOMAIN', contactId, String(contact.company || ''), 'SKIP');
        continue;
      }

      const result = findEmailWithHunter({
        domain: domain,
        firstName: String(contact.firstName || '').trim(),
        lastName: String(contact.lastName || '').trim(),
        company: String(contact.company || '').trim(),
      });
      if (!result.success || !result.email) {
        summary.skipped += 1;
        auditLog(CONTACT_DISCOVERY_STAGE, 'DISCOVERY_NO_EMAIL', contactId, JSON.stringify({
          domain: domain,
          error: result.error || 'Hunter returned no email',
        }), 'SKIP');
        continue;
      }

      const score = Number(result.score);
      setContactDiscoveryRowValues_(contactsSheet, columns, contact._rowNumber, {
        email: result.email,
        catchAll: (Number.isFinite(score) ? score : 0) < CONTACT_DISCOVERY_CATCH_ALL_SCORE_THRESHOLD ? 'TRUE' : 'FALSE',
        roleIsRelevant: isRelevantRole(contact.title, keywordsCsv) ? 'TRUE' : 'FALSE',
        maConfirmed: 'TRUE',
        wtfpRelevance: String(company.wtfpRelevance || '').trim().toUpperCase() === 'TRUE' ? 'TRUE' : 'FALSE',
        employeeSizeFit: 'TRUE',
        industryFit: 'TRUE',
        source: 'hunter',
      });
      summary.discovered += 1;
      auditLog(CONTACT_DISCOVERY_STAGE, 'DISCOVERY_EMAIL_FOUND', contactId, JSON.stringify({
        email: result.email,
        domain: domain,
        score: Number.isFinite(score) ? score : null,
      }), 'OK');
    }

    auditLog(CONTACT_DISCOVERY_STAGE, 'DISCOVERY_RUN_COMPLETE', '', JSON.stringify(summary), 'OK');
    return summary;
  } catch (error) {
    auditLog(CONTACT_DISCOVERY_STAGE, 'DISCOVERY_RUN_FAILED', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Maps normalized company names to their COMPANIES record fields used here.
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet - Campaign spreadsheet.
 * @returns {Object} Normalized company name to {website, wtfpRelevance}.
 */
function buildContactDiscoveryCompanyMap_(spreadsheet) {
  const map = {};
  readRecords(spreadsheet, CONTACT_DISCOVERY_COMPANIES_SHEET).forEach(function(record) {
    const name = normalizeContactDiscoveryCompany_(record.company);
    if (name && !map[name]) {
      map[name] = {
        website: String(record.website || '').trim(),
        wtfpRelevance: record.wtfpRelevance,
      };
    }
  });
  return map;
}

/**
 * Extracts a bare domain from a website value. Pure.
 * @param {string} website - Website URL or bare domain from COMPANIES.
 * @returns {string} Lowercased domain, or '' when unusable.
 */
function extractContactDiscoveryDomain_(website) {
  const domain = String(website || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[\/?#:]/)[0]
    .trim();
  return domain.indexOf('.') === -1 ? '' : domain;
}

/**
 * Normalizes a company name for matching. Pure.
 * @param {string} company - Raw company name.
 * @returns {string} Normalized key.
 */
function normalizeContactDiscoveryCompany_(company) {
  return String(company || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Ensures the columns this service writes exist, appending headers as needed.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - CONTACTS sheet.
 * @returns {Object} Normalized header name to one-based column number.
 */
function ensureContactDiscoveryColumns_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const normalized = headers.map(normalizeContactDiscoveryHeader_);

  CONTACT_DISCOVERY_WRITE_COLUMNS.forEach(function(header) {
    if (normalized.indexOf(normalizeContactDiscoveryHeader_(header)) === -1) {
      headers.push(header);
      normalized.push(normalizeContactDiscoveryHeader_(header));
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
function setContactDiscoveryRowValues_(sheet, columns, rowNumber, updates) {
  Object.keys(updates).forEach(function(header) {
    const column = columns[normalizeContactDiscoveryHeader_(header)];
    if (!column) {
      throw new Error(CONTACT_DISCOVERY_CONTACTS_SHEET + ' is missing required column ' + header + '.');
    }
    sheet.getRange(rowNumber, column).setValue(updates[header]);
  });
}

/**
 * Normalizes a sheet header. Pure.
 * @param {*} header - Header value.
 * @returns {string} Normalized header.
 */
function normalizeContactDiscoveryHeader_(header) {
  return String(header || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
