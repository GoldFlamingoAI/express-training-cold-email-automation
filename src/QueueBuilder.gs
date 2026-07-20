const QUEUE_BUILDER_STAGE = 'QueueBuilder';
const QUEUE_BUILDER_CONTACTS_SHEET = 'CONTACTS';
const QUEUE_BUILDER_QUEUE_SHEET = 'QUEUE';
const QUEUE_BUILDER_QUEUED_STATUS = 'QUEUED';

/**
 * Promotes verified, approved CONTACTS rows into QUEUE with status QUEUED.
 * Deliberately does not check personalizationLine or daily limits — that is
 * ApprovalGate's job at preparation time.
 * @returns {{evaluated: number, queued: number, skipped: number, skipReasons: Object}}
 */
function buildInitialQueue() {
  const summary = { evaluated: 0, queued: 0, skipped: 0, skipReasons: {} };

  try {
    const spreadsheet = openCampaignSpreadsheet();
    const queueSheet = spreadsheet.getSheetByName(QUEUE_BUILDER_QUEUE_SHEET);
    if (!queueSheet) {
      throw new Error('Missing required sheet: ' + QUEUE_BUILDER_QUEUE_SHEET);
    }
    const queueValues = queueSheet.getDataRange().getValues();
    if (queueValues.length < 1 || queueValues[0].every(function(cell) { return String(cell || '').trim() === ''; })) {
      throw new Error(QUEUE_BUILDER_QUEUE_SHEET + ' tab must include a header row.');
    }
    const queueHeaders = queueValues[0].map(normalizeQueueBuilderHeader_);
    const queuedKeys = buildQueueBuilderExistingKeys_(queueHeaders, queueValues.slice(1));
    const contacts = readRecords(spreadsheet, QUEUE_BUILDER_CONTACTS_SHEET);

    contacts.forEach(function(contact) {
      summary.evaluated += 1;
      const email = String(contact.email || '').trim().toLowerCase();
      const suppressed = email ? isSuppressed(email) : false;
      const eligibility = isQueueBuilderEligible(contact, suppressed);

      if (!eligibility.eligible) {
        summary.skipped += 1;
        summary.skipReasons[eligibility.reason] = (summary.skipReasons[eligibility.reason] || 0) + 1;
        return;
      }

      const key = buildQueueBuilderKey_(String(contact.contactId || ''), email);
      if (queuedKeys.indexOf(key) !== -1) {
        summary.skipped += 1;
        summary.skipReasons.already_queued = (summary.skipReasons.already_queued || 0) + 1;
        return;
      }

      queueSheet.appendRow(buildQueueBuilderRow_(queueHeaders, contact));
      queuedKeys.push(key);
      summary.queued += 1;
      auditLog(QUEUE_BUILDER_STAGE, 'CONTACT_QUEUED', String(contact.contactId || email), JSON.stringify({
        email: email,
        company: String(contact.company || ''),
      }), 'OK');
    });

    auditLog(QUEUE_BUILDER_STAGE, 'QUEUE_BUILD_COMPLETE', '', JSON.stringify(summary), 'OK');
    return summary;
  } catch (error) {
    auditLog(QUEUE_BUILDER_STAGE, 'QUEUE_BUILD_FAILED', '', error && error.message ? error.message : String(error), 'ERROR');
    throw error;
  }
}

/**
 * Decides whether a contact is ready for the initial queue. Pure — the
 * suppression check result is injected.
 * @param {Object} contact - CONTACTS record.
 * @param {boolean} suppressed - Result of isSuppressed(email).
 * @returns {{eligible: boolean, reason: string}}
 */
function isQueueBuilderEligible(contact, suppressed) {
  const email = String(contact.email || '').trim();
  const emailsSent = Number(contact.emailsSent || 0);

  if (!email) {
    return { eligible: false, reason: 'missing_email' };
  }
  if (String(contact.verificationResult || '').trim().toLowerCase() !== 'valid') {
    return { eligible: false, reason: 'not_verified_valid' };
  }
  if (!(contact.roleIsRelevant === true || String(contact.roleIsRelevant || '').trim().toUpperCase() === 'TRUE')) {
    return { eligible: false, reason: 'role_not_relevant' };
  }
  if (!(contact.maConfirmed === true || String(contact.maConfirmed || '').trim().toUpperCase() === 'TRUE')) {
    return { eligible: false, reason: 'not_ma_confirmed' };
  }
  if (contact.catchAll === true || String(contact.catchAll || '').trim().toUpperCase() === 'TRUE') {
    return { eligible: false, reason: 'catch_all' };
  }
  if (Number.isFinite(emailsSent) && emailsSent >= 1) {
    return { eligible: false, reason: 'already_emailed' };
  }
  if (suppressed !== false) {
    return { eligible: false, reason: 'suppressed' };
  }
  return { eligible: true, reason: '' };
}

/**
 * Builds a dedupe key from contact ID first, then email. Pure.
 * @param {string} contactId - Contact ID.
 * @param {string} email - Lowercased email.
 * @returns {string} Stable key, or '' when neither is present.
 */
function buildQueueBuilderKey_(contactId, email) {
  const normalizedId = String(contactId || '').trim().toLowerCase();
  if (normalizedId) {
    return 'id:' + normalizedId;
  }
  return email ? 'email:' + email : '';
}

/**
 * Collects dedupe keys for rows already in QUEUE.
 * @param {string[]} queueHeaders - Normalized QUEUE headers.
 * @param {Object[][]} queueRows - QUEUE data rows.
 * @returns {string[]} Existing keys.
 */
function buildQueueBuilderExistingKeys_(queueHeaders, queueRows) {
  const contactIdColumn = queueHeaders.indexOf('contactid');
  const emailColumn = queueHeaders.indexOf('email');
  const keys = [];
  queueRows.forEach(function(row) {
    const contactId = contactIdColumn === -1 ? '' : String(row[contactIdColumn] || '');
    const email = emailColumn === -1 ? '' : String(row[emailColumn] || '').trim().toLowerCase();
    const key = buildQueueBuilderKey_(contactId, email);
    if (key && keys.indexOf(key) === -1) {
      keys.push(key);
    }
  });
  return keys;
}

/**
 * Builds a QUEUE append row from a contact, aligned to QUEUE's headers.
 * @param {string[]} queueHeaders - Normalized QUEUE headers.
 * @param {Object} contact - CONTACTS record.
 * @returns {Object[]} Row values in QUEUE column order.
 */
function buildQueueBuilderRow_(queueHeaders, contact) {
  const contactByHeader = {};
  Object.keys(contact).forEach(function(key) {
    if (key !== '_rowNumber') {
      contactByHeader[normalizeQueueBuilderHeader_(key)] = contact[key];
    }
  });

  return queueHeaders.map(function(header) {
    if (header === 'status') {
      return QUEUE_BUILDER_QUEUED_STATUS;
    }
    if (header === 'sequencestep') {
      return 1;
    }
    if (['subject', 'body', 'preparedat', 'sentat'].indexOf(header) !== -1) {
      return '';
    }
    return contactByHeader[header] !== undefined ? contactByHeader[header] : '';
  });
}

/**
 * Normalizes a sheet header. Pure.
 * @param {*} header - Header value.
 * @returns {string} Normalized header.
 */
function normalizeQueueBuilderHeader_(header) {
  return String(header || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
