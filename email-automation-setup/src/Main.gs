/**
 * Course Reminders — entry points (menu, setup, trigger) and the send loop.
 */

/**
 * Adds the "Course Emails" menu when the sheet opens.
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Course Emails')
    .addItem('Run now', 'runScheduler')
    .addItem('Refresh Upcoming tab (no sending)', 'refreshUpcoming')
    .addItem('Email me a preview of every template', 'sendTemplatePreviews')
    .addSeparator()
    .addItem('Turn on automatic sending (every 10 min)', 'installTrigger')
    .addItem('Pause automatic sending', 'removeTrigger')
    .addSeparator()
    .addItem('Set up / repair tabs', 'setup')
    .addToUi();
}

/**
 * One-time setup: remembers this spreadsheet and creates any missing tabs.
 */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  const created = ensureTabs_(ss);
  onOpen();
  SpreadsheetApp.getUi().alert(
    'Course Emails is set up',
    (created.length ? 'Created tabs: ' + created.join(', ') + '.\n\n' : 'All tabs already existed — nothing overwritten.\n\n') +
    'Next:\n' +
    '1. Settings: fill in Test Email and Internal Emails (Test Mode is ON).\n' +
    '2. Add your cohort, its 8 Calendar dates, and recipients. Check "Confirmed".\n' +
    '3. Course Emails → Refresh Upcoming tab to check the schedule.\n' +
    '4. Course Emails → Turn on automatic sending.\n' +
    '5. When happy, set Test Mode to FALSE.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Installs the 10-minute timer (replacing any existing one).
 */
function installTrigger() {
  removeTriggers_();
  ScriptApp.newTrigger('runScheduler').timeBased().everyMinutes(10).create();
  notify_('Automatic sending is ON — the script checks every 10 minutes.');
}

/**
 * Removes the timer. Nothing sends until it's turned back on.
 */
function removeTrigger() {
  const removed = removeTriggers_();
  notify_(removed ? 'Automatic sending is paused.' : 'Automatic sending was already off.');
}

/**
 * @returns {number} How many runScheduler triggers were deleted.
 */
function removeTriggers_() {
  let count = 0;
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'runScheduler') {
      ScriptApp.deleteTrigger(trigger);
      count++;
    }
  });
  return count;
}

/**
 * Timer + "Run now" entry point: sends everything that's due.
 */
function runScheduler() {
  runCycle_(true);
}

/**
 * Recomputes the Upcoming tab without sending anything.
 */
function refreshUpcoming() {
  runCycle_(false);
  notify_('Upcoming tab refreshed.');
}

/**
 * Plans, sends what's due (if allowed), logs, and refreshes Upcoming. Locked so runs never overlap.
 * @param {boolean} allowSending
 */
function runCycle_(allowSending) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    const ss = openSpreadsheet_();
    const data = readAllData_(ss);
    const settings = data.settings;
    const plan = buildPlan(data, makeToInstant_(settings.timezone));
    const prefix = settings.testMode ? CR_TEST_KEY_PREFIX : '';
    const results = evaluatePlan(plan.sends, summarizeHistory(readLog_(ss)), Date.now(), prefix);

    if (settings.testMode && !settings.testEmail && !settings.internalEmails.length) {
      plan.problems.unshift('Test Mode is ON but there is no Test Email or Internal Email — nothing can send.');
    }

    if (allowSending) {
      const outcome = sendDue_(ss, results, data.templates, settings);
      if (outcome.quotaHit) plan.problems.unshift('Daily Google sending limit reached — remaining emails will go out on the next run after it resets.');
      sendSummary_(outcome, settings);
    }
    writeUpcoming_(ss, results, plan.problems, settings);
  } catch (error) {
    logFailure_('runCycle', error);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Sends every DUE email (oldest first) and records SKIP decisions.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object[]} results - Mutated: status updated to SENT/ERROR/SKIPPED.
 * @param {Object} templates
 * @param {Object} settings
 * @returns {{sent:Object[], errors:Object[], quotaHit:boolean}}
 */
function sendDue_(ss, results, templates, settings) {
  const mode = settings.testMode ? 'TEST' : 'LIVE';
  const fmt = makeFormatters_(settings.timezone);
  const logRows = [];
  const sent = [];
  const errors = [];
  const now = function() { return new Date(); };
  const log = function(r, status, detail) {
    logRows.push([now(), mode, status, r.template, r.day, r.cohortId, r.email, detail, r.logKey]);
  };

  results.forEach(function(r) {
    if (r.status === 'SKIP') {
      log(r, 'SKIPPED', r.note);
      r.status = 'SKIPPED';
    }
  });

  const testTo = settings.testEmail || settings.internalEmails[0] || '';
  const bcc = !settings.testMode && settings.bccInternal ? settings.internalEmails : [];
  const summaryCost = settings.internalSummary ? settings.internalEmails.length : 0;
  let quota = MailApp.getRemainingDailyQuota();
  let quotaHit = false;

  const due = results.filter(function(r) { return r.status === 'DUE'; });
  for (let i = 0; i < due.length && i < settings.maxPerRun; i++) {
    const r = due[i];
    if (settings.testMode && !testTo) break;
    if (quota - (1 + bcc.length) < summaryCost) { quotaHit = true; break; }
    try {
      const email = renderEmail(templates[r.template], buildMergeFields(r, settings, fmt));
      if (email.missing.length) {
        throw new Error('Template ' + r.template + ' has unknown placeholder(s): {{' + email.missing.join('}}, {{') + '}}');
      }
      const message = {
        to: settings.testMode ? testTo : r.email,
        subject: settings.testMode ? '[TEST → ' + r.email + '] ' + email.subject : email.subject,
        body: email.text,
        htmlBody: email.html,
        name: settings.senderName
      };
      if (settings.replyTo) message.replyTo = settings.replyTo;
      if (bcc.length) message.bcc = bcc.join(',');
      MailApp.sendEmail(message);
      quota -= 1 + bcc.length;
      r.status = 'SENT';
      log(r, 'SENT', settings.testMode ? 'Sent to ' + testTo + ' (test mode)' : '');
      sent.push(r);
    } catch (error) {
      r.status = 'ERROR';
      r.note = String(error && error.message || error);
      log(r, 'ERROR', r.note);
      errors.push(r);
    }
  }

  appendLog_(ss, logRows);
  return { sent: sent, errors: errors, quotaHit: quotaHit };
}

/**
 * One summary email to the internal team per batch, instead of BCCing every student email.
 * @param {{sent:Object[], errors:Object[], quotaHit:boolean}} outcome
 * @param {Object} settings
 */
function sendSummary_(outcome, settings) {
  if (!settings.internalSummary || !settings.internalEmails.length) return;
  if (!outcome.sent.length && !outcome.errors.length && !outcome.quotaHit) return;

  const groups = {};
  outcome.sent.forEach(function(r) {
    const label = r.cohortId + ' — ' + r.template + (r.day ? ' (Day ' + r.day + ')' : '');
    (groups[label] = groups[label] || []).push((r.firstName ? r.firstName + ' ' : '') + '<' + r.email + '>');
  });
  const lines = [];
  Object.keys(groups).forEach(function(label) {
    lines.push(label + ' → ' + groups[label].length + ' sent');
    groups[label].forEach(function(who) { lines.push('   • ' + who); });
  });
  if (outcome.errors.length) {
    lines.push('', 'ERRORS (will retry up to ' + CR_MAX_ERROR_ATTEMPTS + ' times):');
    outcome.errors.forEach(function(r) { lines.push('   • ' + r.cohortId + ' ' + r.template + ' ' + r.email + ': ' + r.note); });
  }
  if (outcome.quotaHit) lines.push('', 'Daily Google sending limit reached — the rest will go out after it resets.');

  const prefix = settings.testMode ? '[TEST] ' : '';
  const subject = prefix + 'Course emails: ' + outcome.sent.length + ' sent' +
    (outcome.errors.length ? ', ' + outcome.errors.length + ' error(s)' : '');
  try {
    MailApp.sendEmail({ to: settings.internalEmails.join(','), subject: subject, body: lines.join('\n'), name: settings.senderName });
  } catch (error) {
    logFailure_('sendSummary', error);
  }
}

/**
 * Emails the Test Email one rendered copy of every active template, using the first cohort with sessions.
 * Ignores schedule and Confirmed; logged as PREVIEW, so it never counts as a real send.
 */
function sendTemplatePreviews() {
  const ss = openSpreadsheet_();
  const data = readAllData_(ss);
  const settings = data.settings;
  const to = settings.testEmail || settings.internalEmails[0];
  if (!to) { notify_('Add a Test Email on the Settings tab first.'); return; }

  const plan = buildPlan(data, makeToInstant_(settings.timezone), { includeUnconfirmed: true });
  if (!plan.sends.length) { notify_('Need at least one cohort with Calendar dates and a recipient to preview.'); return; }

  const fmt = makeFormatters_(settings.timezone);
  const firstCohort = plan.sends[0].cohortId;
  const firstEmail = plan.sends[0].email;
  const seen = {};
  const logRows = [];
  plan.sends.forEach(function(send) {
    if (send.cohortId !== firstCohort || send.email !== firstEmail || seen[send.template]) return;
    seen[send.template] = true;
    const email = renderEmail(data.templates[send.template], buildMergeFields(send, settings, fmt));
    const warning = email.missing.length ? '⚠ Unknown placeholders: {{' + email.missing.join('}}, {{') + '}}\n\n' : '';
    MailApp.sendEmail({
      to: to,
      subject: '[PREVIEW ' + send.template + '] ' + email.subject,
      body: warning + email.text,
      htmlBody: textToHtml(warning) + email.html,
      name: settings.senderName
    });
    logRows.push([new Date(), 'PREVIEW', 'PREVIEW', send.template, send.day, send.cohortId, to, 'Template preview', '']);
  });
  appendLog_(ss, logRows);
  notify_('Sent ' + logRows.length + ' preview email(s) to ' + to + '.');
}

/**
 * @param {string} timezone - IANA name, e.g. America/New_York.
 * @returns {function({year,month,day},{hour,minute}):number}
 */
function makeToInstant_(timezone) {
  const pad = function(n) { return (n < 10 ? '0' : '') + n; };
  return function(d, t) {
    const text = d.year + '-' + pad(d.month) + '-' + pad(d.day) + ' ' + pad(t.hour) + ':' + pad(t.minute);
    return Utilities.parseDate(text, timezone, 'yyyy-MM-dd HH:mm').getTime();
  };
}

/**
 * @param {string} timezone
 * @returns {{date:function(number):string, time:function(number):string}}
 */
function makeFormatters_(timezone) {
  return {
    date: function(ms) { return Utilities.formatDate(new Date(ms), timezone, 'EEEE, MMMM d'); },
    time: function(ms) { return Utilities.formatDate(new Date(ms), timezone, 'h:mm a z'); }
  };
}

/**
 * Records an unexpected failure in the Send Log so it's visible without opening Apps Script.
 * @param {string} stage
 * @param {*} error
 */
function logFailure_(stage, error) {
  try {
    appendLog_(openSpreadsheet_(), [[new Date(), 'SYSTEM', 'ERROR', '', '', '', '', stage + ': ' + String(error && error.message || error), '']]);
  } catch (ignored) {
    // The log itself is unreachable (e.g. tab deleted); the thrown error still shows in Executions.
  }
}

/**
 * Toast when run from the sheet; harmless no-op from a timer.
 * @param {string} message
 */
function notify_(message) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(message, 'Course Emails', 6);
  } catch (ignored) {
    // No UI under time-driven triggers.
  }
}
