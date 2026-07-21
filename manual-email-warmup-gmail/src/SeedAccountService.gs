const SEED_ACCOUNT_STAGE = 'SeedAccountService';
const SEED_ACCOUNT_SHEET = 'SEED_ACCOUNTS';
const SEED_ACCOUNT_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEED_ACCOUNT_GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const WARMUP_EXPECTED_SEED_MAPPINGS = [
  { email: 'gfais.demo@gmail.com', tokenPropertyKey: 'SEED_TOKEN_GFAIS' },
  { email: 'adamagdev.data@gmail.com', tokenPropertyKey: 'SEED_TOKEN_ADAMG' },
  { email: 'goldflamingo.arti@gmail.com', tokenPropertyKey: 'SEED_TOKEN_GOLD' },
  { email: 'kitkatm.0208@gmail.com', tokenPropertyKey: 'SEED_TOKEN_KITKAT' },
];

/**
 * Reads active seed accounts from the SEED_ACCOUNTS tab.
 * Columns: email | tokenPropertyKey | active
 * Each tokenPropertyKey names a script property holding that account's OAuth refresh token.
 * @returns {Array<{email: string, tokenPropertyKey: string}>} Active seed accounts.
 */
function getSeedAccounts() {
  const sheet = getWarmupSheet_(SEED_ACCOUNT_SHEET);
  const values = sheet.getDataRange().getValues();
  const accounts = [];
  for (let index = 1; index < values.length; index += 1) {
    const email = String(values[index][0] || '').trim().toLowerCase();
    const tokenPropertyKey = String(values[index][1] || '').trim();
    const active = String(values[index][2] || '').trim().toUpperCase() !== 'FALSE';
    if (email && tokenPropertyKey && active) {
      accounts.push({ email: email, tokenPropertyKey: tokenPropertyKey });
    }
  }
  return accounts;
}

/**
 * Exchanges a seed account's stored refresh token for a short-lived access token.
 * @param {string} tokenPropertyKey - Script property name holding the refresh token.
 * @returns {string} Access token.
 */
function getSeedAccessToken_(tokenPropertyKey) {
  const properties = PropertiesService.getScriptProperties();
  const clientId = properties.getProperty('OAUTH_CLIENT_ID');
  const clientSecret = properties.getProperty('OAUTH_CLIENT_SECRET');
  const refreshToken = properties.getProperty(tokenPropertyKey);
  if (!clientId || !clientSecret) {
    throw new Error('OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET script properties are required.');
  }
  if (!refreshToken) {
    throw new Error('Missing refresh token property: ' + tokenPropertyKey);
  }

  const response = UrlFetchApp.fetch(SEED_ACCOUNT_TOKEN_URL, {
    method: 'post',
    payload: {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    },
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Token refresh failed for ' + tokenPropertyKey + ': HTTP ' + response.getResponseCode());
  }
  const parsed = JSON.parse(response.getContentText());
  if (!parsed.access_token) {
    throw new Error('Token refresh returned no access_token for ' + tokenPropertyKey);
  }
  return parsed.access_token;
}

/**
 * Reads the Gmail identity behind an access token without modifying mailbox data.
 * @param {string} accessToken - Seed account access token.
 * @returns {{emailAddress: string, messagesTotal: number, threadsTotal: number}} Gmail profile.
 */
function getSeedProfile_(accessToken) {
  const response = UrlFetchApp.fetch(SEED_ACCOUNT_GMAIL_BASE + '/profile', {
    headers: { Authorization: 'Bearer ' + accessToken },
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Gmail profile check failed: HTTP ' + response.getResponseCode());
  }
  const parsed = JSON.parse(response.getContentText());
  return {
    emailAddress: String(parsed.emailAddress || '').trim().toLowerCase(),
    messagesTotal: Number(parsed.messagesTotal) || 0,
    threadsTotal: Number(parsed.threadsTotal) || 0,
  };
}

/**
 * Side-effect-free manual test for every active seed token and its Gmail identity.
 * Run from the Apps Script function dropdown after validateWarmupConfiguration().
 * @returns {{success: boolean, tested: number, results: Array<Object>}} Test summary.
 */
function testSeedAccountConnections() {
  const results = getSeedAccounts().map(function(seed) {
    try {
      const accessToken = getSeedAccessToken_(seed.tokenPropertyKey);
      const profile = getSeedProfile_(accessToken);
      const matches = profile.emailAddress === seed.email;
      const result = {
        email: seed.email,
        tokenPropertyKey: seed.tokenPropertyKey,
        actualEmail: profile.emailAddress,
        success: matches,
        error: matches ? '' : 'Token belongs to ' + profile.emailAddress + ', not ' + seed.email + '.',
      };
      warmupLog(SEED_ACCOUNT_STAGE, 'SEED_CONNECTION_TEST', seed.email, JSON.stringify(result), matches ? 'OK' : 'ERROR');
      return result;
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      const result = {
        email: seed.email,
        tokenPropertyKey: seed.tokenPropertyKey,
        actualEmail: '',
        success: false,
        error: message,
      };
      warmupLog(SEED_ACCOUNT_STAGE, 'SEED_CONNECTION_TEST', seed.email, JSON.stringify(result), 'ERROR');
      return result;
    }
  });
  const summary = {
    success: results.length === WARMUP_EXPECTED_SEED_MAPPINGS.length && results.every(function(result) { return result.success; }),
    tested: results.length,
    results: results,
  };
  warmupLog(SEED_ACCOUNT_STAGE, 'SEED_CONNECTION_TEST_COMPLETE', '', JSON.stringify(summary), summary.success ? 'OK' : 'ERROR');
  return summary;
}

/**
 * Lists unread messages from the warm-up domain in a seed account's inbox.
 * @param {string} accessToken - Seed account access token.
 * @param {string} warmupDomain - Sending domain to match (e.g. example-outreach.com).
 * @returns {Array<{id: string, threadId: string}>} Unread message references.
 */
function listUnreadWarmupMessages_(accessToken, warmupDomain) {
  const query = encodeURIComponent('from:' + warmupDomain + ' is:unread in:inbox');
  const response = UrlFetchApp.fetch(SEED_ACCOUNT_GMAIL_BASE + '/messages?q=' + query + '&maxResults=20', {
    headers: { Authorization: 'Bearer ' + accessToken },
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Gmail list failed: HTTP ' + response.getResponseCode());
  }
  const parsed = JSON.parse(response.getContentText());
  return (parsed.messages || []).map(function(message) {
    return { id: String(message.id), threadId: String(message.threadId) };
  });
}

/**
 * Fetches subject and sender metadata for one message.
 * @param {string} accessToken - Seed account access token.
 * @param {string} messageId - Gmail message ID.
 * @returns {{subject: string, from: string}} Message metadata.
 */
function getWarmupMessageMetadata_(accessToken, messageId) {
  const response = UrlFetchApp.fetch(
    SEED_ACCOUNT_GMAIL_BASE + '/messages/' + messageId + '?format=metadata&metadataHeaders=Subject&metadataHeaders=From',
    { headers: { Authorization: 'Bearer ' + accessToken }, muteHttpExceptions: true }
  );
  if (response.getResponseCode() !== 200) {
    throw new Error('Gmail metadata fetch failed: HTTP ' + response.getResponseCode());
  }
  const parsed = JSON.parse(response.getContentText());
  const headers = (parsed.payload && parsed.payload.headers) || [];
  const metadata = { subject: '', from: '' };
  headers.forEach(function(header) {
    if (String(header.name).toLowerCase() === 'subject') {
      metadata.subject = String(header.value || '');
    }
    if (String(header.name).toLowerCase() === 'from') {
      metadata.from = String(header.value || '');
    }
  });
  return metadata;
}

/**
 * Marks a message read, optionally starring it, to register an open signal.
 * @param {string} accessToken - Seed account access token.
 * @param {string} messageId - Gmail message ID.
 * @param {boolean} star - Whether to also star the message.
 * @returns {void}
 */
function markWarmupMessageOpened_(accessToken, messageId, star) {
  const payload = { removeLabelIds: ['UNREAD'] };
  if (star) {
    payload.addLabelIds = ['STARRED'];
  }
  const response = UrlFetchApp.fetch(SEED_ACCOUNT_GMAIL_BASE + '/messages/' + messageId + '/modify', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + accessToken },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Gmail modify failed: HTTP ' + response.getResponseCode());
  }
}

/**
 * Sends a reply from a seed account on the original thread.
 * @param {string} accessToken - Seed account access token.
 * @param {string} threadId - Gmail thread ID to reply on.
 * @param {string} fromEmail - Seed account address.
 * @param {string} toEmail - Warm-up sender address being replied to.
 * @param {string} subject - Original subject (Re: is prepended when absent).
 * @param {string} body - Reply body text.
 * @returns {void}
 */
function sendSeedReply_(accessToken, threadId, fromEmail, toEmail, subject, body) {
  const replySubject = /^re:/i.test(subject) ? subject : 'Re: ' + subject;
  const raw = [
    'From: ' + fromEmail,
    'To: ' + toEmail,
    'Subject: ' + replySubject,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ].join('\r\n');
  const encoded = Utilities.base64EncodeWebSafe(raw);
  const response = UrlFetchApp.fetch(SEED_ACCOUNT_GMAIL_BASE + '/messages/send', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + accessToken },
    payload: JSON.stringify({ raw: encoded, threadId: threadId }),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Gmail reply send failed: HTTP ' + response.getResponseCode());
  }
}

/**
 * Extracts a bare email address from a From header value.
 * @param {string} fromHeader - Raw From header (e.g. "Name <a@b.com>").
 * @returns {string} Lowercased email address.
 */
function parseSeedFromAddress_(fromHeader) {
  const match = String(fromHeader || '').match(/<([^>]+)>/);
  const address = match ? match[1] : String(fromHeader || '');
  return address.trim().toLowerCase();
}
