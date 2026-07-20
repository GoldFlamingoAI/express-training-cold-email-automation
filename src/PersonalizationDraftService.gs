const PERSONALIZATION_DRAFT_STAGE = 'PersonalizationDraftService';
const PERSONALIZATION_DRAFT_CONTACTS_SHEET = 'CONTACTS';
const PERSONALIZATION_DRAFT_COMPANIES_SHEET = 'COMPANIES';
const PERSONALIZATION_DRAFT_COLUMN = 'personalizationDraft';
const PERSONALIZATION_DRAFT_SETTING_BATCH_SIZE = 'PERSONALIZATION_BATCH_SIZE';
const PERSONALIZATION_DRAFT_MAX_SITE_CHARS = 6000;

/**
 * Drafts a personalization line for each CONTACTS row that has neither a
 * personalizationLine nor a pending draft, using the company website's text
 * and Gemini. Drafts land in the personalizationDraft column only — a human
 * reviews and copies each approved draft into personalizationLine, so
 * ApprovalGate's personalization requirement always reflects human judgment.
 * @returns {{processed: number, drafted: number, skipped: number}}
 */
function runPersonalizationDrafts() {
  const summary = { processed: 0, drafted: 0, skipped: 0 };

  try {
    const spreadsheet = openCampaignSpreadsheet();
    const settings = readSettings(spreadsheet);
    const batchSize = Number(settings[PERSONALIZATION_DRAFT_SETTING_BATCH_SIZE]);
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new Error('Missing required SETTINGS value: ' + PERSONALIZATION_DRAFT_SETTING_BATCH_SIZE);
    }

    const contactsSheet = spreadsheet.getSheetByName(PERSONALIZATION_DRAFT_CONTACTS_SHEET);
    if (!contactsSheet) {
      throw new Error('Missing required sheet: ' + PERSONALIZATION_DRAFT_CONTACTS_SHEET);
    }
    const draftColumn = ensurePersonalizationDraftColumn_(contactsSheet);
    const websiteByCompany = buildPersonalizationWebsiteMap_(spreadsheet);
    const contacts = readRecords(spreadsheet, PERSONALIZATION_DRAFT_CONTACTS_SHEET);

    for (let index = 0; index < contacts.length && summary.processed < batchSize; index += 1) {
      const contact = contacts[index];
      const hasLine = String(contact.personalizationLine || '').trim() !== '';
      const hasDraft = String(contact.personalizationDraft || '').trim() !== '';
      if (hasLine || hasDraft) {
        continue;
      }
      summary.processed += 1;
      const contactId = String(contact.contactId || contact.email || '').trim();

      const website = websiteByCompany[normalizePersonalizationCompany_(contact.company)] || '';
      if (!website) {
        summary.skipped += 1;
        auditLog(PERSONALIZATION_DRAFT_STAGE, 'DRAFT_SKIPPED_NO_WEBSITE', contactId, String(contact.company || ''), 'SKIP');
        continue;
      }

      let siteText;
      try {
        siteText = fetchPersonalizationSiteText_(website);
      } catch (error) {
        summary.skipped += 1;
        auditLog(PERSONALIZATION_DRAFT_STAGE, 'DRAFT_SKIPPED_FETCH_FAILED', contactId, error && error.message ? error.message : String(error), 'SKIP');
        continue;
      }

      const result = generateGeminiText(buildPersonalizationPrompt(contact.company, contact.title, siteText), { temperature: 0.7 });
      if (!result.success) {
        summary.skipped += 1;
        auditLog(PERSONALIZATION_DRAFT_STAGE, 'DRAFT_SKIPPED_GENERATION_FAILED', contactId, result.error || '', 'SKIP');
        continue;
      }

      const draft = result.text.split('\n')[0].trim();
      contactsSheet.getRange(contact._rowNumber, draftColumn).setValue(draft);
      summary.drafted += 1;
      auditLog(PERSONALIZATION_DRAFT_STAGE, 'DRAFT_WRITTEN', contactId, String(contact.company || ''), 'OK');
    }

    auditLog(PERSONALIZATION_DRAFT_STAGE, 'DRAFT_RUN_COMPLETE', '', JSON.stringify(summary), 'OK');
    return summary;
  } catch (error) {
    auditLog(PERSONALIZATION_DRAFT_STAGE, 'DRAFT_RUN_FAILED', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Ensures CONTACTS has a personalizationDraft column, appending the header if missing.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - CONTACTS sheet.
 * @returns {number} One-based draft column number.
 */
function ensurePersonalizationDraftColumn_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const wanted = PERSONALIZATION_DRAFT_COLUMN.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (let index = 0; index < headers.length; index += 1) {
    if (String(headers[index] || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '') === wanted) {
      return index + 1;
    }
  }
  sheet.getRange(1, headers.length + 1).setValue(PERSONALIZATION_DRAFT_COLUMN);
  return headers.length + 1;
}

/**
 * Maps normalized company names to websites from the COMPANIES tab.
 * @param {SpreadsheetApp.Spreadsheet} spreadsheet - Campaign spreadsheet.
 * @returns {Object} Normalized company name to website.
 */
function buildPersonalizationWebsiteMap_(spreadsheet) {
  const map = {};
  readRecords(spreadsheet, PERSONALIZATION_DRAFT_COMPANIES_SHEET).forEach(function(record) {
    const company = normalizePersonalizationCompany_(record.company);
    const website = String(record.website || '').trim();
    if (company && website && !map[company]) {
      map[company] = website;
    }
  });
  return map;
}

/**
 * Fetches a company site and returns cleaned text for prompting.
 * Site fetches are allowed here by REVIEW_STANDARDS as a named exception.
 * @param {string} website - Company website from COMPANIES.
 * @returns {string} Cleaned page text.
 */
function fetchPersonalizationSiteText_(website) {
  const url = /^https?:\/\//i.test(website) ? website : 'https://' + website;
  // NEEDS_WIFI_TEST: UrlFetchApp.fetch retrieves the live company website.
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  const statusCode = response.getResponseCode();
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error('Website fetch failed with HTTP ' + statusCode + ' for ' + url);
  }
  return stripPersonalizationHtml(response.getContentText());
}

/**
 * Strips HTML to whitespace-collapsed text, capped for prompt size. Pure.
 * @param {string} html - Raw page HTML.
 * @returns {string} Cleaned text.
 */
function stripPersonalizationHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PERSONALIZATION_DRAFT_MAX_SITE_CHARS);
}

/**
 * Builds the Gemini prompt for one personalization draft. Pure.
 * @param {string} company - Company name.
 * @param {string} title - Contact title.
 * @param {string} siteText - Cleaned website text.
 * @returns {string} Prompt.
 */
function buildPersonalizationPrompt(company, title, siteText) {
  return 'You are helping personalize a short business email. Based only on the website text below, ' +
    'write ONE specific, factual sentence (25 words max) about ' + String(company || 'the company').trim() +
    ' that shows the sender actually looked at their site. No flattery, no adjectives like "impressive", ' +
    'no guessing beyond the text. Recipient title: ' + String(title || 'unknown').trim() + '. ' +
    'Return only the sentence, plain text.\n\nWEBSITE TEXT:\n' + String(siteText || '');
}

/**
 * Normalizes a company name for matching. Pure.
 * @param {string} company - Raw company name.
 * @returns {string} Normalized key.
 */
function normalizePersonalizationCompany_(company) {
  return String(company || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
