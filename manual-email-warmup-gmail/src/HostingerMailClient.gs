const HOSTINGER_MAIL_STAGE = 'HostingerMailClient';
const HOSTINGER_MAIL_DEFAULT_BASE_URL = 'https://api.mail.hostinger.com';

/**
 * Sends one warm-up email from the outreach domain through the Hostinger Email API.
 * The API token is order-scoped; generate it in Hostinger Panel -> Emails -> API.
 * @param {string} toEmail - Seed recipient address.
 * @param {string} subject - Email subject.
 * @param {string} body - Plain-text email body.
 * @returns {{success: boolean, messageId: string, error: string|null}}
 */
function sendWarmupEmail(toEmail, subject, body) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const token = properties.getProperty('HOSTINGER_API_TOKEN');
    const fromEmail = properties.getProperty('WARMUP_FROM_EMAIL');
    if (!token || !fromEmail) {
      throw new Error('HOSTINGER_API_TOKEN and WARMUP_FROM_EMAIL script properties are required.');
    }

    const response = UrlFetchApp.fetch(getHostingerMailSendUrl_(properties), {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: subject,
        text: body,
      }),
      muteHttpExceptions: true,
    });

    const status = response.getResponseCode();
    const parsed = parseHostingerMailResponse_(response.getContentText());
    if (status < 200 || status >= 300) {
      throw new Error('Hostinger send failed with HTTP ' + status + ': ' + (parsed.error || response.getContentText()));
    }

    warmupLog(HOSTINGER_MAIL_STAGE, 'WARMUP_EMAIL_SENT', toEmail, JSON.stringify({
      subjectHash: computeWarmupContentHash(subject),
      messageId: parsed.messageId,
    }), 'OK');
    return { success: true, messageId: parsed.messageId, error: null };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    warmupLog(HOSTINGER_MAIL_STAGE, 'WARMUP_EMAIL_SEND_FAILED', toEmail, message, 'ERROR');
    return { success: false, messageId: '', error: message };
  }
}

/**
 * Sends a minimal API request so the operator can verify token, scope, and endpoint
 * before the first scheduled run.
 * @returns {{success: boolean, httpStatus: number, error: string|null}}
 */
function testHostingerConnection() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const token = properties.getProperty('HOSTINGER_API_TOKEN');
    if (!token) {
      throw new Error('HOSTINGER_API_TOKEN script property is required.');
    }
    const baseUrl = getHostingerMailBaseUrl_(properties);
    const response = UrlFetchApp.fetch(baseUrl + '/v1/mailboxes', {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true,
    });
    const status = response.getResponseCode();
    const success = status >= 200 && status < 300;
    warmupLog(HOSTINGER_MAIL_STAGE, 'CONNECTION_TEST', '', JSON.stringify({ httpStatus: status }), success ? 'OK' : 'ERROR');
    return { success: success, httpStatus: status, error: success ? null : response.getContentText() };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    warmupLog(HOSTINGER_MAIL_STAGE, 'CONNECTION_TEST_FAILED', '', message, 'ERROR');
    return { success: false, httpStatus: 0, error: message };
  }
}

/**
 * Returns the configured Hostinger API base URL.
 * @param {GoogleAppsScript.Properties.Properties} properties - Script properties.
 * @returns {string} Base URL without a trailing slash.
 */
function getHostingerMailBaseUrl_(properties) {
  const configured = String(properties.getProperty('HOSTINGER_API_BASE_URL') || '').trim();
  return (configured || HOSTINGER_MAIL_DEFAULT_BASE_URL).replace(/\/+$/, '');
}

/**
 * Returns the send endpoint URL. Overridable because Hostinger may version or
 * rename the path; verify against https://api.mail.hostinger.com/ docs on setup.
 * @param {GoogleAppsScript.Properties.Properties} properties - Script properties.
 * @returns {string} Full send endpoint URL.
 */
function getHostingerMailSendUrl_(properties) {
  const configured = String(properties.getProperty('HOSTINGER_SEND_ENDPOINT') || '').trim();
  return configured || getHostingerMailBaseUrl_(properties) + '/v1/messages/send';
}

/**
 * Parses the Hostinger data/error response envelope defensively.
 * @param {string} contentText - Raw response body.
 * @returns {{messageId: string, error: string}}
 */
function parseHostingerMailResponse_(contentText) {
  try {
    const parsed = JSON.parse(contentText);
    const data = parsed && parsed.data ? parsed.data : parsed;
    return {
      messageId: String((data && (data.id || data.messageId)) || ''),
      error: String((parsed && parsed.error) || ''),
    };
  } catch (ignored) {
    return { messageId: '', error: '' };
  }
}
