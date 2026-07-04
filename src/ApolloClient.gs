const APOLLO_CLIENT_STAGE = 'ApolloClient';
const APOLLO_CLIENT_SETTINGS_SHEET = 'SETTINGS';
const APOLLO_CLIENT_API_KEY_PROPERTY = 'APOLLO_API_KEY';
const APOLLO_CLIENT_DEFAULT_SEARCH_URL = 'https://api.apollo.io/api/v1/mixed_people/search';
const APOLLO_CLIENT_SETTING_SEARCH_URL = 'APOLLO_CONTACT_SEARCH_URL';
const APOLLO_CLIENT_SETTING_PAGE_SIZE = 'APOLLO_CONTACT_SEARCH_PAGE_SIZE';

/**
 * Searches Apollo for contacts matching the supplied criteria.
 * @param {{organizationDomains: string[]=, organizationNames: string[]=, personTitles: string[]=, personSeniorities: string[]=, locations: string[]=, keywords: string=, page: number=}=} criteria Apollo people search filters.
 * @returns {{success: boolean, contacts: Object[], pagination: Object|null, raw: Object|null, error: string|null}}
 */
function searchApolloContacts(criteria) {
  const filters = criteria || {};

  try {
    const settings = getApolloClientSettings_();
    const apiKey = getApolloClientApiKey_();
    const payload = buildApolloContactSearchPayload_(filters, settings.pageSize);

    // NEEDS_WIFI_TEST: UrlFetchApp.fetch calls the live Apollo people search API and consumes Apollo API credits.
    const response = UrlFetchApp.fetch(settings.searchUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Cache-Control': 'no-cache',
        'X-Api-Key': apiKey,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const result = parseApolloClientResponse_(response);

    if (result.error) {
      auditLog(APOLLO_CLIENT_STAGE, 'contact_search_failed', '', JSON.stringify({
        error: result.error,
        page: payload.page,
        perPage: payload.per_page,
      }), 'ERROR');
      return buildApolloClientFailure_(result.error, result);
    }

    const contacts = normalizeApolloContacts_(result.people || result.contacts || []);
    const pagination = result.pagination || null;
    auditLog(APOLLO_CLIENT_STAGE, 'contact_search_complete', '', JSON.stringify({
      count: contacts.length,
      page: payload.page,
      perPage: payload.per_page,
    }), 'OK');

    return {
      success: true,
      contacts: contacts,
      pagination: pagination,
      raw: result,
      error: null,
    };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    auditLog(APOLLO_CLIENT_STAGE, 'contact_search_error', '', JSON.stringify({ message: message }), 'ERROR');
    return buildApolloClientFailure_(message, null);
  }
}

/**
 * Reads Apollo runtime settings from the SETTINGS tab.
 * @returns {{searchUrl: string, pageSize: number}} Parsed settings.
 */
function getApolloClientSettings_() {
  const spreadsheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  const sheet = spreadsheet.getSheetByName(APOLLO_CLIENT_SETTINGS_SHEET);
  if (!sheet) {
    throw new Error('Missing required sheet: ' + APOLLO_CLIENT_SETTINGS_SHEET);
  }

  const values = sheet.getDataRange().getValues();
  const settings = {};
  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const key = String(values[rowIndex][0] || '').trim();
    if (key) {
      settings[key] = values[rowIndex][1];
    }
  }

  const pageSize = parseApolloClientPositiveInteger_(settings[APOLLO_CLIENT_SETTING_PAGE_SIZE]);
  if (!pageSize) {
    throw new Error('Missing required SETTINGS value: ' + APOLLO_CLIENT_SETTING_PAGE_SIZE);
  }

  return {
    searchUrl: String(settings[APOLLO_CLIENT_SETTING_SEARCH_URL] || APOLLO_CLIENT_DEFAULT_SEARCH_URL).trim(),
    pageSize: pageSize,
  };
}

/**
 * Reads the Apollo API key from script properties.
 * @returns {string} Apollo API key.
 */
function getApolloClientApiKey_() {
  const apiKey = String(PropertiesService.getScriptProperties().getProperty(APOLLO_CLIENT_API_KEY_PROPERTY) || '').trim();
  if (!apiKey) {
    throw new Error('Missing script property: ' + APOLLO_CLIENT_API_KEY_PROPERTY);
  }
  return apiKey;
}

/**
 * Builds Apollo people search request JSON from accepted filters.
 * @param {Object} filters Caller-provided Apollo filters.
 * @param {number} defaultPageSize SETTINGS fallback page size.
 * @returns {Object} Apollo people search payload.
 */
function buildApolloContactSearchPayload_(filters, defaultPageSize) {
  const payload = {
    page: parseApolloClientPositiveInteger_(filters.page) || 1,
    per_page: defaultPageSize,
  };

  addApolloPayloadArray_(payload, 'q_organization_domains', filters.organizationDomains);
  addApolloPayloadArray_(payload, 'organization_names', filters.organizationNames);
  addApolloPayloadArray_(payload, 'person_titles', filters.personTitles);
  addApolloPayloadArray_(payload, 'person_seniorities', filters.personSeniorities);
  addApolloPayloadArray_(payload, 'person_locations', filters.locations);

  if (filters.keywords) {
    payload.q_keywords = String(filters.keywords).trim();
  }

  return payload;
}

/**
 * Adds a non-empty normalized array filter to an Apollo payload.
 * @param {Object} payload Apollo request payload.
 * @param {string} key Apollo request key.
 * @param {*[]=} values Candidate values.
 */
function addApolloPayloadArray_(payload, key, values) {
  if (!Array.isArray(values)) {
    return;
  }

  const normalizedValues = values.map(function(value) {
    return String(value || '').trim();
  }).filter(function(value) {
    return value !== '';
  });

  if (normalizedValues.length > 0) {
    payload[key] = normalizedValues;
  }
}

/**
 * Parses an Apollo HTTP response as JSON and annotates non-2xx failures.
 * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response UrlFetchApp response.
 * @returns {Object} Parsed response body.
 */
function parseApolloClientResponse_(response) {
  const statusCode = response.getResponseCode();
  const text = response.getContentText() || '{}';
  let result = {};

  try {
    result = JSON.parse(text);
  } catch (error) {
    auditLog(APOLLO_CLIENT_STAGE, 'parse_error', '', JSON.stringify({
      message: error && error.message ? error.message : String(error),
    }), 'ERROR');
    result = { error: 'Unable to parse Apollo response: ' + text };
  }

  if (statusCode < 200 || statusCode >= 300) {
    result.error = result.error || result.message || 'Apollo HTTP error: ' + statusCode;
  }

  return result;
}

/**
 * Normalizes Apollo people into stable contact objects for downstream import code.
 * @param {Object[]} contacts Apollo people or contact records.
 * @returns {Object[]} Normalized contact records.
 */
function normalizeApolloContacts_(contacts) {
  return contacts.map(function(contact) {
    const organization = contact.organization || contact.account || {};
    return {
      apolloId: contact.id || '',
      firstName: contact.first_name || '',
      lastName: contact.last_name || '',
      name: contact.name || '',
      title: contact.title || '',
      email: contact.email || '',
      emailStatus: contact.email_status || '',
      linkedinUrl: contact.linkedin_url || '',
      organizationName: organization.name || contact.organization_name || '',
      organizationWebsite: organization.website_url || contact.organization_website_url || '',
      raw: contact,
    };
  });
}

/**
 * Builds a consistent Apollo contact search failure response.
 * @param {string} error Error message.
 * @param {Object|null} raw Raw API response.
 * @returns {{success: boolean, contacts: Object[], pagination: Object|null, raw: Object|null, error: string}}
 */
function buildApolloClientFailure_(error, raw) {
  return {
    success: false,
    contacts: [],
    pagination: null,
    raw: raw,
    error: error,
  };
}

/**
 * Parses a positive integer setting value.
 * @param {*} value SETTINGS value.
 * @returns {number} Positive integer, or 0 when unset or invalid.
 */
function parseApolloClientPositiveInteger_(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 0;
  }
  return Math.floor(parsed);
}
