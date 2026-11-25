/**
 * Course Reminders — email rendering. Pure: formatting functions are passed in.
 */

/**
 * Builds the merge fields available to every template.
 * @param {Object} send - A planned send from buildPlan.
 * @param {Object} settings - From normalizeSettings.
 * @param {{date:function(number):string, time:function(number):string}} fmt - Timezone-aware formatters.
 * @returns {Object<string,string>}
 */
function buildMergeFields(send, settings, fmt) {
  const cohort = send.cohort;
  const sessions = send.sessions;
  const session = send.session;
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  const resourcesFor = function(day) {
    return String((cohort.resources || [])[day - 1] || '').trim();
  };
  const zoomFor = function(s) {
    return s.zoomLink || cohort.zoomLink || '';
  };

  return {
    FirstName: send.firstName || 'there',
    Email: send.email,
    CourseName: cohort.courseName || cohort.id,
    CohortId: cohort.id,
    ZoomLink: zoomFor(session),
    MeetingId: cohort.meetingId || '',
    Passcode: cohort.passcode || '',
    DayNumber: String(session.day),
    TotalDays: String(sessions.length),
    SessionDate: fmt.date(session.startMs),
    SessionTime: fmt.time(session.startMs),
    Resources: resourcesFor(session.day) || 'No resources for this session.',
    StartDate: fmt.date(first.startMs),
    StartTime: fmt.time(first.startMs),
    EndDate: fmt.date(last.startMs),
    Schedule: sessions.map(function(s) {
      return 'Day ' + s.day + ' — ' + fmt.date(s.startMs) + ' at ' + fmt.time(s.startMs);
    }).join('\n'),
    SenderName: settings.senderName
  };
}

/**
 * Replaces {{Field}} placeholders (case-insensitive). Unknown placeholders are reported, not sent.
 * @param {string} text
 * @param {Object<string,string>} fields
 * @returns {{text:string, missing:string[]}}
 */
function fillPlaceholders(text, fields) {
  const lookup = {};
  Object.keys(fields).forEach(function(name) { lookup[name.toLowerCase()] = fields[name]; });
  const missing = [];
  const filled = String(text || '').replace(/{{\s*([A-Za-z0-9_]+)\s*}}/g, function(match, name) {
    const key = name.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(lookup, key)) return String(lookup[key] == null ? '' : lookup[key]);
    if (missing.indexOf(name) === -1) missing.push(name);
    return match;
  });
  return { text: filled, missing: missing };
}

/**
 * Renders a template for one send.
 * @param {{subject:string, body:string}} template
 * @param {Object<string,string>} fields
 * @returns {{subject:string, text:string, html:string, missing:string[]}}
 */
function renderEmail(template, fields) {
  const subject = fillPlaceholders(template.subject, fields);
  const body = fillPlaceholders(template.body, fields);
  const missing = subject.missing.concat(body.missing.filter(function(name) {
    return subject.missing.indexOf(name) === -1;
  }));
  return {
    subject: subject.text.replace(/\s+/g, ' ').trim(),
    text: body.text,
    html: textToHtml(body.text),
    missing: missing
  };
}

/**
 * Plain text → simple HTML: escapes, turns URLs into links, keeps line breaks.
 * @param {string} text
 * @returns {string}
 */
function textToHtml(text) {
  const escaped = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const linked = escaped.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]]/g, function(url) {
    return '<a href="' + url + '">' + url + '</a>';
  });
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">' +
    linked.replace(/\r?\n/g, '<br>') + '</div>';
}
