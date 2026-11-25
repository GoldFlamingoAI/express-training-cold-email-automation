/**
 * Course Reminders — scheduling logic. Pure: accepts plain data, returns plain data.
 * Anything that needs a timezone is handed in as a function (toInstant / formatters),
 * so this file never touches Google services and can be unit tested in Node.
 */

/**
 * Parses a cell's displayed date ("2027-01-11", "1/11/2027", "1/11/27").
 * @param {*} value - Display value from the sheet.
 * @returns {?{year:number, month:number, day:number}} Date parts, or null if unreadable.
 */
function parseDateParts(value) {
  const text = String(value == null ? '' : value).trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return validDateParts_(Number(match[1]), Number(match[2]), Number(match[3]));
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (match) {
    const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    return validDateParts_(year, Number(match[1]), Number(match[2]));
  }
  return null;
}

/**
 * Rejects impossible dates such as 2/30.
 * @param {number} year
 * @param {number} month - 1-12.
 * @param {number} day
 * @returns {?{year:number, month:number, day:number}}
 */
function validDateParts_(year, month, day) {
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  return { year: year, month: month, day: day };
}

/**
 * Parses a cell's displayed time ("18:00", "6:00 PM", "6pm", "6:00:00 PM").
 * @param {*} value - Display value from the sheet.
 * @returns {?{hour:number, minute:number}} 24-hour time parts, or null if unreadable.
 */
function parseTimeParts(value) {
  const text = String(value == null ? '' : value).trim().toLowerCase().replace(/\s+/g, ' ');
  let match = text.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})? ?([ap])\.?m?\.?$/);
  if (match) {
    let hour = Number(match[1]);
    const minute = match[2] ? Number(match[2]) : 0;
    if (hour < 1 || hour > 12 || minute > 59) return null;
    if (hour === 12) hour = 0;
    if (match[3] === 'p') hour += 12;
    return { hour: hour, minute: minute };
  }
  match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return null;
    return { hour: hour, minute: minute };
  }
  return null;
}

/**
 * Reads checkbox-ish values. Blank returns the fallback.
 * @param {*} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function parseBool(value, fallback) {
  const text = String(value == null ? '' : value).trim().toLowerCase();
  if (text === '') return fallback;
  return ['true', 'yes', 'y', '1', 'x', '✅', 'on'].indexOf(text) !== -1;
}

/**
 * Splits "a@x.com, b@y.com; c@z.com" into a clean list.
 * @param {*} value
 * @returns {string[]}
 */
function parseEmailList(value) {
  return String(value == null ? '' : value)
    .split(/[,;\s]+/)
    .map(function(email) { return email.trim(); })
    .filter(function(email) { return isValidEmail(email); });
}

/**
 * Basic shape check — catches typos like missing @ or domain, not deliverability.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(String(email || '').trim());
}

/**
 * Converts the raw Settings tab (name → value) into typed settings with defaults.
 * @param {Object<string,string>} raw
 * @returns {Object} Typed settings.
 */
function normalizeSettings(raw) {
  const source = raw || {};
  const get = function(name) {
    const value = source[name];
    return value == null || String(value).trim() === '' ? CR_SETTING_DEFAULTS[name] : String(value).trim();
  };
  const num = function(name) {
    const parsed = Number(get(name));
    return isFinite(parsed) && parsed >= 0 ? parsed : Number(CR_SETTING_DEFAULTS[name]);
  };
  return {
    timezone: get('Timezone'),
    senderName: get('Sender Name'),
    replyTo: isValidEmail(get('Reply-To')) ? get('Reply-To') : '',
    internalEmails: parseEmailList(get('Internal Emails')),
    internalSummary: parseBool(get('Internal Summary Email'), true),
    bccInternal: parseBool(get('BCC Internal On Every Email'), false),
    testMode: parseBool(get('Test Mode'), true),
    testEmail: isValidEmail(get('Test Email')) ? get('Test Email') : '',
    welcomeDaysBefore: num('Welcome Email Days Before'),
    checkinDaysBefore: num('Check-in Email Days Before'),
    reminderMinutesBefore: num('Session Reminder Minutes Before'),
    followupHoursAfter: num('Follow-up Email Hours After Last Session'),
    maxPerRun: Math.max(1, Math.floor(num('Max Emails Per Run')))
  };
}

/**
 * Builds every email the system will ever send for confirmed cohorts.
 * @param {{cohorts:Object[], sessions:Object[], recipients:Object[], templates:Object, settings:Object}} data
 *   Rows already mapped by SheetStore (display strings, with `row` numbers).
 * @param {function({year,month,day},{hour,minute}):number} toInstant - Wall-clock → epoch ms in the course timezone.
 * @param {{includeUnconfirmed:boolean}=} options
 * @returns {{sends:Object[], problems:string[]}}
 */
function buildPlan(data, toInstant, options) {
  const opts = options || {};
  const settings = data.settings;
  const problems = [];
  const sends = [];
  const cohortsById = {};

  data.cohorts.forEach(function(cohort) {
    if (!cohort.id) return;
    if (cohortsById[cohort.id]) {
      problems.push('Cohorts row ' + cohort.row + ': duplicate Cohort ID "' + cohort.id + '" — ignored.');
      return;
    }
    cohortsById[cohort.id] = cohort;
  });

  const sessionsByCohort = groupSessions_(data.sessions, cohortsById, toInstant, problems);
  const recipientsByCohort = groupRecipients_(data.recipients, cohortsById, problems);
  const templates = data.templates || {};

  Object.keys(cohortsById).forEach(function(cohortId) {
    const cohort = cohortsById[cohortId];
    if (!cohort.confirmed && !opts.includeUnconfirmed) return;
    const sessions = sessionsByCohort[cohortId] || [];
    const recipients = recipientsByCohort[cohortId] || [];
    const label = 'Cohort "' + cohortId + '"';

    if (!sessions.length) {
      if (cohort.confirmed) problems.push(label + ' is confirmed but has no sessions on the Calendar tab — nothing will send.');
      return;
    }
    if (cohort.confirmed && sessions.length !== CR_RESOURCE_DAYS) {
      problems.push(label + ' has ' + sessions.length + ' sessions on the Calendar (expected ' + CR_RESOURCE_DAYS + ').');
    }
    if (cohort.confirmed && !recipients.length) problems.push(label + ' is confirmed but has no active recipients.');
    if (cohort.confirmed && !cohort.zoomLink && sessions.some(function(s) { return !s.zoomLink; })) {
      problems.push(label + ' has no Zoom Link.');
    }

    const first = sessions[0];
    const last = sessions[sessions.length - 1];

    recipients.forEach(function(recipient) {
      const add = function(templateKey, session, dueMs, deadlineMs) {
        const template = templates[templateKey];
        if (!template || !template.active) return;
        sends.push({
          key: [cohortId, templateKey, templateKey === CR_TEMPLATE_KEYS.SESSION ? session.day : 0, recipient.email.toLowerCase()].join('|'),
          template: templateKey,
          day: templateKey === CR_TEMPLATE_KEYS.SESSION ? session.day : '',
          cohortId: cohortId,
          email: recipient.email,
          firstName: recipient.firstName,
          dueMs: dueMs,
          deadlineMs: deadlineMs,
          cohort: cohort,
          session: session,
          sessions: sessions,
          recipient: recipient
        });
      };

      add(CR_TEMPLATE_KEYS.WELCOME, first, first.startMs - settings.welcomeDaysBefore * CR_MS_DAY, first.startMs);
      add(CR_TEMPLATE_KEYS.CHECKIN, first, first.startMs - settings.checkinDaysBefore * CR_MS_DAY, first.startMs);
      sessions.forEach(function(session) {
        add(CR_TEMPLATE_KEYS.SESSION, session, session.startMs - settings.reminderMinutesBefore * CR_MS_MINUTE, session.startMs);
      });
      const followupDue = last.startMs + settings.followupHoursAfter * CR_MS_HOUR;
      add(CR_TEMPLATE_KEYS.FOLLOWUP, last, followupDue, followupDue + CR_FOLLOWUP_WINDOW_MS);
    });
  });

  const sessionTemplate = templates[CR_TEMPLATE_KEYS.SESSION];
  if (!sessionTemplate || !sessionTemplate.active) {
    problems.push('The SESSION template is missing or inactive — no session reminders will send.');
  }

  sends.sort(function(a, b) { return a.dueMs - b.dueMs; });
  return { sends: sends, problems: problems };
}

/**
 * Parses Calendar rows into sorted, de-duplicated sessions per cohort.
 * @param {Object[]} rows
 * @param {Object} cohortsById
 * @param {function} toInstant
 * @param {string[]} problems - Appended to.
 * @returns {Object<string, Object[]>}
 */
function groupSessions_(rows, cohortsById, toInstant, problems) {
  const byCohort = {};
  rows.forEach(function(row) {
    if (!row.cohortId && !row.date && !row.time) return;
    const where = 'Calendar row ' + row.row;
    if (!cohortsById[row.cohortId]) {
      problems.push(where + ': Cohort ID "' + row.cohortId + '" is not on the Cohorts tab.');
      return;
    }
    const day = Number(row.day);
    if (!(day >= 1 && day === Math.floor(day))) {
      problems.push(where + ': Day must be a whole number like 1-8 (got "' + row.day + '").');
      return;
    }
    const dateParts = parseDateParts(row.date);
    const timeParts = parseTimeParts(row.time);
    if (!dateParts) { problems.push(where + ': can\'t read the Date "' + row.date + '".'); return; }
    if (!timeParts) { problems.push(where + ': can\'t read the Start Time "' + row.time + '".'); return; }

    const list = byCohort[row.cohortId] || (byCohort[row.cohortId] = []);
    if (list.some(function(s) { return s.day === day; })) {
      problems.push(where + ': Day ' + day + ' is listed twice for "' + row.cohortId + '" — later row ignored.');
      return;
    }
    list.push({
      day: day,
      startMs: toInstant(dateParts, timeParts),
      zoomLink: String(row.zoomLink || '').trim(),
      row: row.row
    });
  });
  Object.keys(byCohort).forEach(function(id) {
    byCohort[id].sort(function(a, b) { return a.startMs - b.startMs; });
  });
  return byCohort;
}

/**
 * Validates recipients and groups the active ones by cohort.
 * @param {Object[]} rows
 * @param {Object} cohortsById
 * @param {string[]} problems - Appended to.
 * @returns {Object<string, Object[]>}
 */
function groupRecipients_(rows, cohortsById, problems) {
  const byCohort = {};
  rows.forEach(function(row) {
    if (!row.email && !row.firstName && !row.cohortId) return;
    if (!row.active) return;
    const where = 'Recipients row ' + row.row;
    if (!isValidEmail(row.email)) { problems.push(where + ': "' + row.email + '" doesn\'t look like an email.'); return; }
    if (!cohortsById[row.cohortId]) {
      problems.push(where + ': Cohort ID "' + row.cohortId + '" is not on the Cohorts tab.');
      return;
    }
    const list = byCohort[row.cohortId] || (byCohort[row.cohortId] = []);
    const email = row.email.trim();
    if (list.some(function(r) { return r.email.toLowerCase() === email.toLowerCase(); })) {
      problems.push(where + ': ' + email + ' is already in "' + row.cohortId + '" — duplicate ignored.');
      return;
    }
    if (!row.firstName) problems.push(where + ': ' + email + ' has no First Name.');
    list.push({ firstName: String(row.firstName || '').trim(), email: email, row: row.row });
  });
  return byCohort;
}

/**
 * Decides what each planned email should do right now.
 * Statuses: DONE (already sent/skipped), FAILED (gave up after errors), MISSED (window passed),
 * DUE (send now), WAITING (not yet), SKIP (record as skipped now).
 * @param {Object[]} sends - From buildPlan.
 * @param {Object<string,{done:boolean, errors:number}>} history - From the Send Log, by key.
 * @param {number} nowMs
 * @param {string} keyPrefix - '' for live, CR_TEST_KEY_PREFIX in test mode.
 * @returns {Object[]} Sends with logKey, status and note added.
 */
function evaluatePlan(sends, history, nowMs, keyPrefix) {
  const results = sends.map(function(send) {
    const logKey = keyPrefix + send.key;
    const past = history[logKey] || { done: false, errors: 0 };
    let status = 'WAITING';
    let note = '';
    if (past.done) {
      status = 'DONE';
    } else if (past.errors >= CR_MAX_ERROR_ATTEMPTS) {
      status = 'FAILED';
      note = 'Gave up after ' + past.errors + ' errors — see Send Log.';
    } else if (nowMs >= send.deadlineMs) {
      status = 'MISSED';
      note = 'Send window passed before it could go out.';
    } else if (nowMs >= send.dueMs) {
      status = 'DUE';
    }
    return Object.assign({}, send, { logKey: logKey, status: status, note: note });
  });

  // Someone added late gets the welcome; sending the check-in minutes later would be redundant.
  const welcomeDue = {};
  results.forEach(function(r) {
    if (r.template === CR_TEMPLATE_KEYS.WELCOME && r.status === 'DUE') welcomeDue[r.cohortId + '|' + r.email.toLowerCase()] = true;
  });
  results.forEach(function(r) {
    if (r.template === CR_TEMPLATE_KEYS.CHECKIN && r.status === 'DUE' && welcomeDue[r.cohortId + '|' + r.email.toLowerCase()]) {
      r.status = 'SKIP';
      r.note = 'Covered by the welcome email (joined late).';
    }
  });
  return results;
}

/**
 * Turns Send Log rows into a lookup of what has already happened.
 * @param {{key:string, status:string}[]} rows
 * @returns {Object<string,{done:boolean, errors:number}>}
 */
function summarizeHistory(rows) {
  const history = {};
  rows.forEach(function(row) {
    if (!row.key) return;
    const entry = history[row.key] || (history[row.key] = { done: false, errors: 0 });
    const status = String(row.status || '').toUpperCase();
    if (status === 'SENT' || status === 'SKIPPED') entry.done = true;
    if (status === 'ERROR') entry.errors += 1;
  });
  return history;
}
