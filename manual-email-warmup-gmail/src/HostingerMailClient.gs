const HOSTINGER_MAIL_STAGE = 'HostingerMailClient';
const HOSTINGER_MAIL_DEFAULT_BASE_URL = 'https://api.mail.hostinger.com';

/**
 * Sends one warm-up email from the outreach domain through the Hostinger Email API.
 * The API token is order-scoped; generate it in Hostinger Panel -> Emails ->
 * the outreach domain -> Agentic mail -> API.
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

    const account = getHostingerMailAccount_(properties, token);
    const mailbox = findHostingerMailbox_(account, fromEmail);
    const response = UrlFetchApp.fetch(getHostingerMailSendUrl_(properties, mailbox.resourceId), {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({
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
 * Discovers the authenticated Hostinger account and confirms that the token can
 * manage WARMUP_FROM_EMAIL before the first scheduled run.
 * @returns {{success: boolean, httpStatus: number, mailbox: string, mailboxResourceId: string, error: string|null}}
 */
function testHostingerConnection() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const token = properties.getProperty('HOSTINGER_API_TOKEN');
    const fromEmail = properties.getProperty('WARMUP_FROM_EMAIL');
    if (!token || !fromEmail) {
      throw new Error('HOSTINGER_API_TOKEN and WARMUP_FROM_EMAIL script properties are required.');
    }
    const account = getHostingerMailAccount_(properties, token);
    const mailbox = findHostingerMailbox_(account, fromEmail);
    const details = {
      httpStatus: 200,
      mailbox: mailbox.address,
      mailboxResourceId: mailbox.resourceId,
    };
    warmupLog(HOSTINGER_MAIL_STAGE, 'CONNECTION_TEST', mailbox.address, JSON.stringify(details), 'OK');
    return {
      success: true,
      httpStatus: 200,
      mailbox: mailbox.address,
      mailboxResourceId: mailbox.resourceId,
      error: null,
    };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    warmupLog(HOSTINGER_MAIL_STAGE, 'CONNECTION_TEST_FAILED', '', message, 'ERROR');
    return { success: false, httpStatus: 0, mailbox: '', mailboxResourceId: '', error: message };
  }
}

/**
 * Gets the account and mailbox list available to the bearer token.
 * @param {GoogleAppsScript.Properties.Properties} properties - Script properties.
 * @param {string} token - Hostinger Mail API bearer token.
 * @returns {{orderResourceId: string, mailboxes: Array<{resourceId: string, address: string}>}}
 */
function getHostingerMailAccount_(properties, token) {
  const response = UrlFetchApp.fetch(getHostingerMailBaseUrl_(properties) + '/api/v1/me', {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    const parsed = parseHostingerMailResponse_(response.getContentText());
    throw new Error('Hostinger account lookup failed with HTTP ' + status + ': ' +
      (parsed.error || response.getContentText()));
  }
  return parseHostingerMailAccount_(response.getContentText());
}

/**
 * Finds the exact outreach mailbox exposed by the scoped token.
 * @param {{mailboxes: Array<{resourceId: string, address: string}>}} account - Account response.
 * @param {string} fromEmail - Configured sender address.
 * @returns {{resourceId: string, address: string}}
 */
function findHostingerMailbox_(account, fromEmail) {
  const expected = String(fromEmail || '').trim().toLowerCase();
  const mailboxes = account && Array.isArray(account.mailboxes) ? account.mailboxes : [];
  const mailbox = mailboxes.find(function(candidate) {
    return String(candidate.address || '').trim().toLowerCase() === expected;
  });
  if (!mailbox || !mailbox.resourceId) {
    throw new Error('Hostinger API token cannot manage WARMUP_FROM_EMAIL (' + fromEmail +
      '). Recreate the token with this mailbox selected under Agentic mail -> API.');
  }
  return mailbox;
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
 * Returns the current mailbox-specific send endpoint URL.
 * @param {GoogleAppsScript.Properties.Properties} properties - Script properties.
 * @param {string} mailboxResourceId - Resource ID returned by GET /api/v1/me.
 * @returns {string} Full send endpoint URL.
 */
function getHostingerMailSendUrl_(properties, mailboxResourceId) {
  const configured = String(properties.getProperty('HOSTINGER_SEND_ENDPOINT') || '').trim();
  if (configured) {
    return configured.replace('{mailboxResourceId}', encodeURIComponent(mailboxResourceId));
  }
  return getHostingerMailBaseUrl_(properties) + '/api/v1/mailboxes/' +
    encodeURIComponent(mailboxResourceId) + '/send';
}

/**
 * Parses GET /api/v1/me and normalizes its mailbox collection.
 * @param {string} contentText - Raw response body.
 * @returns {{orderResourceId: string, mailboxes: Array<{resourceId: string, address: string}>}}
 */
function parseHostingerMailAccount_(contentText) {
  const parsed = JSON.parse(contentText);
  const data = parsed && parsed.data ? parsed.data : {};
  const mailboxes = Array.isArray(data.mailboxes) ? data.mailboxes : [];
  return {
    orderResourceId: String(data.orderResourceId || ''),
    mailboxes: mailboxes.map(function(mailbox) {
      return {
        resourceId: String(mailbox.resourceId || ''),
        address: String(mailbox.address || ''),
      };
    }),
  };
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
