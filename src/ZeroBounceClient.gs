const ZERO_BOUNCE_CLIENT_STAGE = 'ZeroBounceClient';
const ZERO_BOUNCE_CLIENT_SETTINGS_SHEET = 'SETTINGS';
const ZERO_BOUNCE_CLIENT_API_KEY_PROPERTY = 'ZEROBOUNCE_API_KEY';
const ZERO_BOUNCE_CLIENT_DEFAULT_VALIDATE_URL = 'https://api.zerobounce.net/v2/validate';
const ZERO_BOUNCE_CLIENT_SETTING_VALIDATE_URL = 'ZEROBOUNCE_VALIDATE_URL';
const ZERO_BOUNCE_CLIENT_SETTING_TIMEOUT = 'ZEROBOUNCE_TIMEOUT_SECONDS';
const ZERO_BOUNCE_CLIENT_VALID_STATUS = 'valid';

/**
 * Verifies one email address with the ZeroBounce v2 real-time validation API.
 * @param {string} email Email address to verify.
 * @param {{ipAddress: string}=} options Optional validation context.
 * @returns {{success: boolean, email: string, status: string, subStatus: string, valid: boolean, raw: Object|null, error: string|null}}
 */
function verifyEmailWithZeroBounce(email, options) {
  const normalizedEmail = String(email || '').trim();
  const context = options || {};

  try {
    if (!normalizedEmail) {
      throw new Error('Email is required for ZeroBounce verification.');
    }

    const settings = getZeroBounceClientSettings_();
    const apiKey = getZeroBounceClientApiKey_();
    const query = {
      api_key: apiKey,
      email: normalizedEmail,
    };

    if (context.ipAddress) {
      query.ip_address = String(context.ipAddress).trim();
    }
    if (settings.timeoutSeconds > 0) {
      query.timeout = String(settings.timeoutSeconds);
    }

    // NEEDS_WIFI_TEST: UrlFetchApp.fetch calls the live ZeroBounce validation API and consumes API credits for known results.
    const response = UrlFetchApp.fetch(buildZeroBounceClientUrl_(settings.validateUrl, query), {
      method: 'get',
      muteHttpExceptions: true,
    });
    const result = parseZeroBounceClientResponse_(response);

    if (result.error) {
      auditLog(ZERO_BOUNCE_CLIENT_STAGE, 'verification_failed', normalizedEmail, JSON.stringify({
        email: normalizedEmail,
        error: result.error,
      }), 'ERROR');
      return buildZeroBounceClientFailure_(normalizedEmail, result.error, result);
    }

    auditLog(ZERO_BOUNCE_CLIENT_STAGE, 'verification_complete', normalizedEmail, JSON.stringify({
      email: normalizedEmail,
      status: result.status || '',
      subStatus: result.sub_status || '',
    }), 'OK');

    return {
      success: true,
      email: normalizedEmail,
      status: result.status || '',
      subStatus: result.sub_status || '',
      valid: result.status === ZERO_BOUNCE_CLIENT_VALID_STATUS,
      raw: result,
      error: null,
    };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    auditLog(ZERO_BOUNCE_CLIENT_STAGE, 'verification_error', normalizedEmail, JSON.stringify({
      email: normalizedEmail,
      message: message,
    }), 'ERROR');
    return buildZeroBounceClientFailure_(normalizedEmail, message, null);
  }
}

/**
 * Reads ZeroBounce runtime settings from the SETTINGS tab.
 * @returns {{validateUrl: string, timeoutSeconds: number}} Parsed settings.
 */
function getZeroBounceClientSettings_() {
  const spreadsheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  const sheet = spreadsheet.getSheetByName(ZERO_BOUNCE_CLIENT_SETTINGS_SHEET);
  if (!sheet) {
    throw new Error('Missing required sheet: ' + ZERO_BOUNCE_CLIENT_SETTINGS_SHEET);
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
    validateUrl: String(settings[ZERO_BOUNCE_CLIENT_SETTING_VALIDATE_URL] || ZERO_BOUNCE_CLIENT_DEFAULT_VALIDATE_URL).trim(),
    timeoutSeconds: parseZeroBounceClientPositiveInteger_(settings[ZERO_BOUNCE_CLIENT_SETTING_TIMEOUT]),
  };
}

/**
 * Reads the ZeroBounce API key from script properties.
 * @returns {string} ZeroBounce API key.
 */
function getZeroBounceClientApiKey_() {
  const apiKey = String(PropertiesService.getScriptProperties().getProperty(ZERO_BOUNCE_CLIENT_API_KEY_PROPERTY) || '').trim();
  if (!apiKey) {
    throw new Error('Missing script property: ' + ZERO_BOUNCE_CLIENT_API_KEY_PROPERTY);
  }
  return apiKey;
}

/**
 * Builds a query-string URL.
 * @param {string} baseUrl Base endpoint URL.
 * @param {Object} params Query parameters.
 * @returns {string} URL with encoded query parameters.
 */
function buildZeroBounceClientUrl_(baseUrl, params) {
  const query = Object.keys(params).filter(function(key) {
    return params[key] !== undefined && params[key] !== null && String(params[key]).trim() !== '';
  }).map(function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(String(params[key]));
  }).join('&');

  return baseUrl + (baseUrl.indexOf('?') === -1 ? '?' : '&') + query;
}

/**
 * Parses a ZeroBounce HTTP response as JSON and annotates non-2xx failures.
 * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response UrlFetchApp response.
 * @returns {Object} Parsed response body.
 */
function parseZeroBounceClientResponse_(response) {
  const statusCode = response.getResponseCode();
  const text = response.getContentText() || '{}';
  let result = {};

  try {
    result = JSON.parse(text);
  } catch (error) {
    auditLog(ZERO_BOUNCE_CLIENT_STAGE, 'parse_error', '', JSON.stringify({
      message: error && error.message ? error.message : String(error),
    }), 'ERROR');
    result = { error: 'Unable to parse ZeroBounce response: ' + text };
  }

  if (statusCode < 200 || statusCode >= 300) {
    result.error = result.error || 'ZeroBounce HTTP error: ' + statusCode;
  }

  return result;
}

/**
 * Builds a consistent failure response for email verification.
 * @param {string} email Email address being verified.
 * @param {string} error Error message.
 * @param {Object|null} raw Raw API response.
 * @returns {{success: boolean, email: string, status: string, subStatus: string, valid: boolean, raw: Object|null, error: string}}
 */
function buildZeroBounceClientFailure_(email, error, raw) {
  return {
    success: false,
    email: email,
    status: '',
    subStatus: '',
    valid: false,
    raw: raw,
    error: error,
  };
}

/**
 * Parses a positive integer setting value.
 * @param {*} value SETTINGS value.
 * @returns {number} Positive integer, or 0 when unset or invalid.
 */
function parseZeroBounceClientPositiveInteger_(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 0;
  }
  return Math.floor(parsed);
}
