/**
 * Checks all pre-send conditions before a Gmail draft may be created.
 * @param {Object} contact - Full contact record from CONTACTS tab.
 * @param {Object} settings - Campaign settings from SETTINGS tab.
 * @param {number} dailySentCount - Number of campaign emails sent today.
 * @param {boolean} isSuppressed - Result of suppression check.
 * @returns {{approved: boolean, failedChecks: string[]}}
 */
function checkApproval(contact, settings, dailySentCount, isSuppressed) {
  const failedChecks = [];
  const email = String(contact.email || '').trim().toLowerCase();
  const emailDomain = email.indexOf('@') === -1 ? '' : email.split('@').pop();
  const personalEmailDomains = ['gmail.com', 'yahoo.com', 'icloud.com', 'hotmail.com'];
  const emailsSent = Number(contact.emailsSent || 0);
  const dailyLimit = Number(settings.dailyLimit || 0);
  const maConfirmed = contact.maConfirmed === true || contact.maConfirmed === 'TRUE';
  const roleIsRelevant = contact.roleIsRelevant === true || contact.roleIsRelevant === 'TRUE';
  const catchAll = contact.catchAll === true || contact.catchAll === 'TRUE';

  if (!maConfirmed) {
    failedChecks.push('Company is not confirmed in Massachusetts');
  }

  if (!roleIsRelevant) {
    failedChecks.push('Contact does not have a relevant business role');
  }

  if (!emailDomain || personalEmailDomains.indexOf(emailDomain) !== -1) {
    failedChecks.push('Email does not use a business domain');
  }

  if (contact.verificationResult !== 'valid') {
    failedChecks.push('Email has not passed final verification');
  }

  if (catchAll) {
    failedChecks.push('Email is catch-all');
  }

  if (isSuppressed !== false) {
    failedChecks.push('Contact is suppressed');
  }

  if (contact.status === 'REPLIED') {
    failedChecks.push('Contact has already replied');
  }

  if (emailsSent >= 1) {
    failedChecks.push('Contact has already received this campaign');
  }

  if (!String(contact.personalizationLine || '').trim()) {
    failedChecks.push('Required personalization fields are missing');
  }

  if (dailySentCount >= dailyLimit) {
    failedChecks.push('Daily campaign limit reached');
  }

  return {
    approved: failedChecks.length === 0,
    failedChecks: failedChecks
  };
}
