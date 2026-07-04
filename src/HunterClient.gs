const HUNTER_CLIENT_STAGE = 'HunterClient';
const HUNTER_CLIENT_SETTINGS_SHEET = 'SETTINGS';
const HUNTER_CLIENT_API_KEY_PROPERTY = 'HUNTER_API_KEY';
const HUNTER_CLIENT_DEFAULT_EMAIL_FINDER_URL = 'https://api.hunter.io/v2/email-finder';
const HUNTER_CLIENT_DEFAULT_EMAIL_VERIFIER_URL = 'https://api.hunter.io/v2/email-verifier';
const HUNTER_CLIENT_SETTING_EMAIL_FINDER_URL = 'HUNTER_EMAIL_FINDER_URL';
const HUNTER_CLIENT_SETTING_EMAIL_VERIFIER_URL = 'HUNTER_EMAIL_VERIFIER_URL';

/**
 * Finds a likely email address for a person at a company domain using Hunter.
 * @param {{domain: string, firstName: string=, lastName: string=, fullName: string=, company: string=}=} contact Contact search context.
 * @returns {{success: boolean, email: string, score: number|null, sources: Object[], raw: Object|null, error: string|null}}
 */
function findEmailWithHunter(contact) {
  const context = contact || {};
  const domain = String(context.domain || '').trim();

  try {
    if (!domain) {
      throw new Error('Domain is required for Hunter email finder.');
    }

    const settings = getHunterClientSettings_();
    const apiKey = getHunterClientApiKey_();
    const query = buildHunterEmailFinderQuery_(context, domain, apiKey);

    // NEEDS_WIFI_TEST: UrlFetchApp.fetch calls the live Hunter email finder API and consumes Hunter API credits.
    const response = UrlFetchApp.fetch(buildHunterClientUrl_(settings.emailFinderUrl, query), {
      method: 'get',
      muteHttpExceptions: true,
    });
    const result = parseHunterClientResponse_(response);

    if (result.error) {
      auditLog(HUNTER_CLIENT_STAGE, 'email_finder_failed', '', JSON.stringify({
        domain: domain,
        error: result.error,
      }), 'ERROR');
      return buildHunterEmailFinderFailure_('', result.error, result);
    }

    const data = result.data || {};
    auditLog(HUNTER_CLIENT_STAGE, 'email_finder_complete', data.email || '', JSON.stringify({
      domain: domain,
      email: data.email || '',
      score: data.score || null,
    }), 'OK');

    return {
      success: true,
      email: data.email || '',
      score: data.score || null,
      sources: data.sources || [],
      raw: result,
      error: null,
    };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    auditLog(HUNTER_CLIENT_STAGE, 'email_finder_error', '', JSON.stringify({
      domain: domain,
      message: message,
    }), 'ERROR');
    return buildHunterEmailFinderFailure_('', message, null);
  }
}

/**
 * Verifies one email address using Hunter.
 * @param {string} email Email address to verify.
 * @returns {{success: boolean, email: string, status: string, result: string, score: number|null, deliverable: boolean, raw: Object|null, error: string|null}}
 */
function verifyEmailWithHunter(email) {
  const normalizedEmail = String(email || '').trim();

  try {
    if (!normalizedEmail) {
      throw new Error('Email is required for Hunter email verifier.');
    }

    const settings = getHunterClientSettings_();
    const apiKey = getHunterClientApiKey_();
    const query = {
      email: normalizedEmail,
      api_key: apiKey,
    };

    // NEEDS_WIFI_TEST: UrlFetchApp.fetch calls the live Hunter email verifier API and consumes Hunter API credits.
    const response = UrlFetchApp.fetch(buildHunterClientUrl_(settings.emailVerifierUrl, query), {
      method: 'get',
      muteHttpExceptions: true,
    });
    const result = parseHunterClientResponse_(response);

    if (result.error) {
      auditLog(HUNTER_CLIENT_STAGE, 'email_verifier_failed', normalizedEmail, JSON.stringify({
        email: normalizedEmail,
        error: result.error,
      }), 'ERROR');
      return buildHunterEmailVerifierFailure_(normalizedEmail, result.error, result);
    }

    const data = result.data || {};
    auditLog(HUNTER_CLIENT_STAGE, 'email_verifier_complete', normalizedEmail, JSON.stringify({
      email: normalizedEmail,
      status: data.status || '',
      result: data.result || '',
      score: data.score || null,
    }), 'OK');

    return {
      success: true,
      email: data.email || normalizedEmail,
      status: data.status || '',
      result: data.result || '',
      score: data.score || null,
      deliverable: data.result === 'deliverable',
      raw: result,
      error: null,
    };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    auditLog(HUNTER_CLIENT_STAGE, 'email_verifier_error', normalizedEmail, JSON.stringify({
      email: normalizedEmail,
      message: message,
    }), 'ERROR');
    return buildHunterEmailVerifierFailure_(normalizedEmail, message, null);
  }
}

/**
 * Reads Hunter runtime settings from the SETTINGS tab.
 * @returns {{emailFinderUrl: string, emailVerifierUrl: string}} Parsed settings.
 */
function getHunterClientSettings_() {
  const spreadsheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  const sheet = spreadsheet.getSheetByName(HUNTER_CLIENT_SETTINGS_SHEET);
  if (!sheet) {
    throw new Error('Missing required sheet: ' + HUNTER_CLIENT_SETTINGS_SHEET);
  }

  const values = sheet.getDataRange().getValues();
  const settings = {};
  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const key = String(values[rowIndex][0] || '').trim();
    if (key) {
      settings[key] = values[rowIndex][1];
    }
  }

  return {
    emailFinderUrl: String(settings[HUNTER_CLIENT_SETTING_EMAIL_FINDER_URL] || HUNTER_CLIENT_DEFAULT_EMAIL_FINDER_URL).trim(),
    emailVerifierUrl: String(settings[HUNTER_CLIENT_SETTING_EMAIL_VERIFIER_URL] || HUNTER_CLIENT_DEFAULT_EMAIL_VERIFIER_URL).trim(),
  };
}

/**
 * Reads the Hunter API key from script properties.
 * @returns {string} Hunter API key.
 */
function getHunterClientApiKey_() {
  const apiKey = String(PropertiesService.getScriptProperties().getProperty(HUNTER_CLIENT_API_KEY_PROPERTY) || '').trim();
  if (!apiKey) {
    throw new Error('Missing script property: ' + HUNTER_CLIENT_API_KEY_PROPERTY);
  }
  return apiKey;
}

/**
 * Builds Hunter email finder query parameters from the contact context.
 * @param {Object} context Contact search context.
 * @param {string} domain Company domain.
 * @param {string} apiKey Hunter API key.
 * @returns {Object} Hunter email finder query parameters.
 */
function buildHunterEmailFinderQuery_(context, domain, apiKey) {
  const query = {
    domain: domain,
    api_key: apiKey,
  };

  if (context.firstName) {
    query.first_name = String(context.firstName).trim();
  }
  if (context.lastName) {
    query.last_name = String(context.lastName).trim();
  }
  if (context.fullName) {
    query.full_name = String(context.fullName).trim();
  }
  if (context.company) {
    query.company = String(context.company).trim();
  }

  return query;
}

/**
 * Builds a query-string URL.
 * @param {string} baseUrl Base endpoint URL.
 * @param {Object} params Query parameters.
 * @returns {string} URL with encoded query parameters.
 */
function buildHunterClientUrl_(baseUrl, params) {
  const query = Object.keys(params).filter(function(key) {
    return params[key] !== undefined && params[key] !== null && String(params[key]).trim() !== '';
  }).map(function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(String(params[key]));
  }).join('&');

  return baseUrl + (baseUrl.indexOf('?') === -1 ? '?' : '&') + query;
}

/**
 * Parses a Hunter HTTP response as JSON and annotates non-2xx failures.
 * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response UrlFetchApp response.
 * @returns {Object} Parsed response body.
 */
function parseHunterClientResponse_(response) {
  const statusCode = response.getResponseCode();
  const text = response.getContentText() || '{}';
  let result = {};

  try {
    result = JSON.parse(text);
  } catch (error) {
    auditLog(HUNTER_CLIENT_STAGE, 'parse_error', '', JSON.stringify({
      message: error && error.message ? error.message : String(error),
    }), 'ERROR');
    result = { error: 'Unable to parse Hunter response: ' + text };
  }

  if (statusCode < 200 || statusCode >= 300) {
    result.error = result.error || getHunterClientErrorMessage_(result) || 'Hunter HTTP error: ' + statusCode;
  }

  return result;
}

/**
 * Extracts a readable Hunter error message from a parsed response.
 * @param {Object} result Parsed Hunter response.
 * @returns {string} Error message, or an empty string when unavailable.
 */
function getHunterClientErrorMessage_(result) {
  const errors = result.errors || [];
  if (errors.length > 0) {
    return errors.map(function(error) {
      return error.details || error.message || error.id || '';
    }).filter(function(message) {
      return message !== '';
    }).join('; ');
  }

  return result.message || '';
}

/**
 * Builds a consistent Hunter email finder failure response.
 * @param {string} email Email address, when Hunter found one before failing.
 * @param {string} error Error message.
 * @param {Object|null} raw Raw API response.
 * @returns {{success: boolean, email: string, score: number|null, sources: Object[], raw: Object|null, error: string}}
 */
function buildHunterEmailFinderFailure_(email, error, raw) {
  return {
    success: false,
    email: email,
    score: null,
    sources: [],
    raw: raw,
    error: error,
  };
}

/**
 * Builds a consistent Hunter email verifier failure response.
 * @param {string} email Email address being verified.
 * @param {string} error Error message.
 * @param {Object|null} raw Raw API response.
 * @returns {{success: boolean, email: string, status: string, result: string, score: number|null, deliverable: boolean, raw: Object|null, error: string}}
 */
function buildHunterEmailVerifierFailure_(email, error, raw) {
  return {
    success: false,
    email: email,
    status: '',
    result: '',
    score: null,
    deliverable: false,
    raw: raw,
    error: error,
  };
}
