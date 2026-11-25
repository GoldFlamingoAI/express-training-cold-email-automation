/**
 * Course Reminders — all spreadsheet reads/writes. I/O only, no scheduling decisions.
 */

/**
 * Opens the spreadsheet by stored ID (time-driven triggers have no "active" sheet).
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function openSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) throw new Error('Spreadsheet not found — open the sheet and run Course Emails → Set up tabs.');
  return active;
}

/**
 * Returns a tab or throws a readable error.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} name
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function requireSheet_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Missing tab "' + name + '" — run Course Emails → Set up tabs.');
  return sheet;
}

/**
 * Reads a tab as objects keyed by lower-cased header text, using displayed values.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {Object[]} Each with a `row` (1-based sheet row) and `get(header)`.
 */
function readTable_(sheet) {
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  const headers = values[0].map(function(h) { return String(h).trim().toLowerCase(); });
  return values.slice(1).map(function(cells, index) {
    const record = { row: index + 2 };
    headers.forEach(function(header, col) { if (header) record[header] = String(cells[col]).trim(); });
    return record;
  });
}

/**
 * Reads every input tab into the shape buildPlan expects.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @returns {{cohorts:Object[], sessions:Object[], recipients:Object[], templates:Object, settings:Object}}
 */
function readAllData_(ss) {
  const rawSettings = {};
  readTable_(requireSheet_(ss, CR_TABS.SETTINGS)).forEach(function(r) {
    if (r['setting']) rawSettings[r['setting']] = r['value'];
  });

  const cohorts = readTable_(requireSheet_(ss, CR_TABS.COHORTS)).map(function(r) {
    const resources = [];
    for (let day = 1; day <= CR_RESOURCE_DAYS; day++) resources.push(r['day ' + day + ' resources'] || '');
    return {
      id: r['cohort id'] || '',
      courseName: r['course name'] || '',
      confirmed: parseBool(r['confirmed'], false),
      zoomLink: r['zoom link'] || '',
      meetingId: r['meeting id'] || '',
      passcode: r['passcode'] || '',
      resources: resources,
      row: r.row
    };
  });

  const sessions = readTable_(requireSheet_(ss, CR_TABS.CALENDAR)).map(function(r) {
    return {
      cohortId: r['cohort id'] || '',
      day: r['day'] || '',
      date: r['date'] || '',
      time: r['start time'] || '',
      zoomLink: r['zoom link override'] || '',
      row: r.row
    };
  });

  const recipients = readTable_(requireSheet_(ss, CR_TABS.RECIPIENTS)).map(function(r) {
    return {
      firstName: r['first name'] || '',
      email: r['email'] || '',
      cohortId: r['cohort id'] || '',
      active: !parseBool(r['paused'], false),
      row: r.row
    };
  });

  const templates = {};
  readTable_(requireSheet_(ss, CR_TABS.TEMPLATES)).forEach(function(r) {
    const key = String(r['template'] || '').toUpperCase();
    if (!key || templates[key]) return;
    templates[key] = { active: parseBool(r['active'], true), subject: r['subject'] || '', body: r['body'] || '' };
  });

  return {
    cohorts: cohorts,
    sessions: sessions,
    recipients: recipients,
    templates: templates,
    settings: normalizeSettings(rawSettings)
  };
}

/**
 * Reads the Send Log as {key, status} rows.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @returns {{key:string, status:string}[]}
 */
function readLog_(ss) {
  return readTable_(requireSheet_(ss, CR_TABS.LOG)).map(function(r) {
    return { key: r['send key'] || '', status: r['status'] || '' };
  });
}

/**
 * Appends rows to the Send Log in one write.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Array[]} rows - Each matches LOG_HEADERS_.
 */
function appendLog_(ss, rows) {
  if (!rows.length) return;
  const sheet = requireSheet_(ss, CR_TABS.LOG);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

/**
 * Rewrites the Upcoming tab: every planned email and its status, plus setup problems.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {Object[]} results - From evaluatePlan (statuses may be updated after sending).
 * @param {string[]} problems
 * @param {Object} settings
 */
function writeUpcoming_(ss, results, problems, settings) {
  let sheet = ss.getSheetByName(CR_TABS.UPCOMING);
  if (!sheet) sheet = ss.insertSheet(CR_TABS.UPCOMING);
  sheet.clear();
  const stamp = Utilities.formatDate(new Date(), settings.timezone, 'MMM d, yyyy h:mm a z');
  const header = [['Send Time', 'Status', 'Template', 'Day', 'Cohort ID', 'First Name', 'Email', 'Note']];
  const rows = results.map(function(r) {
    return [
      Utilities.formatDate(new Date(r.dueMs), settings.timezone, 'EEE MMM d, yyyy h:mm a'),
      r.status, r.template, r.day, r.cohortId, r.firstName, r.email, r.note || ''
    ];
  });
  sheet.getRange(1, 1, 1, header[0].length).setValues(header).setFontWeight('bold');
  if (rows.length) sheet.getRange(2, 1, rows.length, header[0].length).setValues(rows);

  const problemRows = [['Setup problems (updated ' + stamp + (settings.testMode ? ' — TEST MODE ON' : '') + ')']]
    .concat(problems.length ? problems.map(function(p) { return [p]; }) : [['None 🎉']]);
  sheet.getRange(1, 10, problemRows.length, 1).setValues(problemRows);
  sheet.getRange(1, 10).setFontWeight('bold');
  sheet.setFrozenRows(1);
}

const LOG_HEADERS_ = ['Timestamp', 'Mode', 'Status', 'Template', 'Day', 'Cohort ID', 'Email', 'Detail', 'Send Key'];

/**
 * Creates any missing tabs with headers, formatting and sample rows. Never touches existing tabs.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @returns {string[]} Names of tabs created.
 */
function ensureTabs_(ss) {
  const created = [];
  const make = function(name, headers, rows, format) {
    if (ss.getSheetByName(name)) return;
    const sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e8eaf6');
    // Format first: inserting checkboxes after writing would reset the sample values.
    if (format) format(sheet);
    if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sheet.setFrozenRows(1);
    created.push(name);
  };

  const resourceHeaders = [];
  for (let day = 1; day <= CR_RESOURCE_DAYS; day++) resourceHeaders.push('Day ' + day + ' Resources');
  const sampleResources = resourceHeaders.map(function(h, i) {
    return 'Day ' + (i + 1) + ' slides: https://example.com/day' + (i + 1);
  });

  make(CR_TABS.COHORTS,
    ['Cohort ID', 'Course Name', 'Confirmed', 'Zoom Link', 'Meeting ID', 'Passcode'].concat(resourceHeaders),
    [['SAMPLE-01', 'Express AI Fundamentals', false, 'https://zoom.us/j/1234567890', '123 456 7890', 'abc123'].concat(sampleResources)],
    function(sheet) {
      sheet.getRange(2, 3, 200, 1).insertCheckboxes();
      sheet.getRange(1, 3).setNote('Nothing sends for a cohort until this is checked.');
      sheet.setColumnWidths(1, 6 + CR_RESOURCE_DAYS, 180);
    });

  const sampleDates = ['2027-01-11', '2027-01-12', '2027-01-13', '2027-01-14', '2027-01-15', '2027-01-18', '2027-01-19', '2027-01-20'];
  make(CR_TABS.CALENDAR,
    ['Cohort ID', 'Day', 'Date', 'Start Time', 'Zoom Link Override'],
    sampleDates.map(function(date, i) { return ['SAMPLE-01', i + 1, date, '6:00 PM', '']; }),
    function(sheet) {
      sheet.getRange('C2:C').setNumberFormat('yyyy-mm-dd');
      sheet.getRange('D2:D').setNumberFormat('h:mm AM/PM');
      sheet.getRange(1, 5).setNote('Optional — only if this one session uses a different Zoom link.');
      sheet.setColumnWidths(1, 5, 160);
    });

  make(CR_TABS.RECIPIENTS,
    ['First Name', 'Email', 'Cohort ID', 'Paused'],
    [['Jane', 'jane@example.com', 'SAMPLE-01', false]],
    function(sheet) {
      sheet.getRange(2, 4, 500, 1).insertCheckboxes();
      sheet.getRange(1, 4).setNote('Check to stop emailing someone without deleting them.');
      sheet.setColumnWidths(1, 4, 200);
    });

  make(CR_TABS.TEMPLATES, ['Template', 'Active', 'Subject', 'Body'], defaultTemplates_(), function(sheet) {
    sheet.getRange(2, 2, 10, 1).insertCheckboxes();
    sheet.setColumnWidth(1, 110);
    sheet.setColumnWidth(3, 320);
    sheet.setColumnWidth(4, 600);
    sheet.getRange('D2:D').setWrap(true);
    sheet.getRange('A1:D').setVerticalAlignment('top');
    sheet.getRange(1, 4).setNote(
      'Placeholders: {{FirstName}} {{Email}} {{CourseName}} {{CohortId}} {{ZoomLink}} {{MeetingId}} {{Passcode}} ' +
      '{{DayNumber}} {{TotalDays}} {{SessionDate}} {{SessionTime}} {{Resources}} {{StartDate}} {{StartTime}} ' +
      '{{EndDate}} {{Schedule}} {{SenderName}}');
  });

  make(CR_TABS.SETTINGS, ['Setting', 'Value', 'Notes'], [
    ['Test Mode', 'TRUE', 'TRUE = every email goes to Test Email instead of students. Set FALSE to go live.'],
    ['Test Email', '', 'Where test-mode emails go (usually you).'],
    ['Internal Emails', '', 'Your team, comma-separated. They get one summary email per batch.'],
    ['Internal Summary Email', 'TRUE', 'Send the team a summary after each batch that sends something.'],
    ['BCC Internal On Every Email', 'FALSE', 'TRUE = also BCC the team on every student email (uses more daily quota).'],
    ['Sender Name', CR_SETTING_DEFAULTS['Sender Name'], 'Display name on outgoing emails.'],
    ['Reply-To', '', 'Optional reply-to address.'],
    ['Timezone', CR_SETTING_DEFAULTS['Timezone'], 'All Calendar dates/times are in this timezone (e.g. America/Chicago).'],
    ['Welcome Email Days Before', '14', 'Days before Day 1.'],
    ['Check-in Email Days Before', '5', 'Days before Day 1.'],
    ['Session Reminder Minutes Before', '60', 'Minutes before each session.'],
    ['Follow-up Email Hours After Last Session', '3', 'Only if the FOLLOWUP template is Active.'],
    ['Max Emails Per Run', '100', 'Safety cap per 10-minute run.']
  ], function(sheet) {
    sheet.getRange('B2:B').setNumberFormat('@');
    sheet.setColumnWidth(1, 280);
    sheet.setColumnWidth(2, 260);
    sheet.setColumnWidth(3, 560);
  });

  make(CR_TABS.LOG, LOG_HEADERS_, [], function(sheet) {
    sheet.setColumnWidths(1, LOG_HEADERS_.length, 150);
    sheet.getRange(1, 1).setNote('Written by the script. Deleting a row lets that email send again.');
  });

  const blank = ss.getSheetByName('Sheet1');
  if (blank && created.length && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  return created;
}

/**
 * Starter templates written by setup.
 * @returns {Array[]} Rows of [Template, Active, Subject, Body].
 */
function defaultTemplates_() {
  return [
    [CR_TEMPLATE_KEYS.WELCOME, true, "You're in! {{CourseName}} starts {{StartDate}}",
      'Hi {{FirstName}},\n\n' +
      "Welcome to {{CourseName}} — we're excited to have you!\n\n" +
      'Here is your full schedule ({{TotalDays}} sessions):\n{{Schedule}}\n\n' +
      'Every session is on Zoom:\nLink: {{ZoomLink}}\nMeeting ID: {{MeetingId}}\nPasscode: {{Passcode}}\n\n' +
      "Please block these times on your calendar now. We'll also send a reminder about an hour before each session.\n\n" +
      'Questions? Just reply to this email.\n\n{{SenderName}}'],
    [CR_TEMPLATE_KEYS.CHECKIN, true, 'Quick check-in: {{CourseName}} starts {{StartDate}}',
      'Hi {{FirstName}},\n\n' +
      'Just checking in — {{CourseName}} kicks off on {{StartDate}} at {{StartTime}}.\n\n' +
      'To get ready for Day 1:\n{{Resources}}\n\n' +
      'Zoom link (same for every session): {{ZoomLink}}\nPasscode: {{Passcode}}\n\n' +
      "If anything has changed on your end, reply and let us know.\n\nSee you soon,\n{{SenderName}}"],
    [CR_TEMPLATE_KEYS.SESSION, true, 'Today at {{SessionTime}}: {{CourseName}} — Day {{DayNumber}} of {{TotalDays}}',
      'Hi {{FirstName}},\n\n' +
      'Day {{DayNumber}} of {{CourseName}} starts in about an hour ({{SessionTime}}).\n\n' +
      'Join on Zoom: {{ZoomLink}}\nMeeting ID: {{MeetingId}}\nPasscode: {{Passcode}}\n\n' +
      "Today's resources:\n{{Resources}}\n\nSee you there,\n{{SenderName}}"],
    [CR_TEMPLATE_KEYS.FOLLOWUP, false, 'Thank you for completing {{CourseName}}!',
      'Hi {{FirstName}},\n\n' +
      'Congratulations on finishing {{CourseName}}! Thank you for showing up and putting in the work.\n\n' +
      "We'd love your feedback — just reply to this email with what worked and what we could improve.\n\n" +
      '{{SenderName}}']
  ];
}
