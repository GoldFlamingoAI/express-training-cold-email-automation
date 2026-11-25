// Run: node email-automation-setup/tests/email-automation.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const srcDir = path.resolve(__dirname, '..', 'src');
const PURE = ['Config.gs', 'Schedule.gs', 'Render.gs'];
const ALL = PURE.concat(['SheetStore.gs', 'Main.gs']);

for (const file of PURE) {
  const source = fs.readFileSync(path.join(srcDir, file), 'utf8');
  assert.equal(/SpreadsheetApp|MailApp|GmailApp|Utilities|PropertiesService|ScriptApp/.test(source), false,
    `${file} must stay pure (no Google services)`);
}

// ---------- Fake Google services (enough for an end-to-end run) ----------
function makeFakes() {
  const sheets = {};
  const sent = [];
  const pad = (n) => String(n).padStart(2, '0');
  const display = (v) => {
    if (v === true) return 'TRUE';
    if (v === false) return 'FALSE';
    if (v instanceof Date) return v.toISOString();
    return v == null ? '' : String(v);
  };
  function makeSheet(name) {
    const data = [];
    const sheet = {
      name,
      data,
      getDataRange: () => ({ getDisplayValues: () => data.map((row) => row.map(display)) }),
      getLastRow: () => data.length,
      getRange(r, c, nr, nc) {
        if (typeof r === 'string') return chain();
        const range = chain();
        range.setValues = (values) => {
          values.forEach((row, i) => {
            const target = data[r - 1 + i] || (data[r - 1 + i] = []);
            row.forEach((v, j) => { target[c - 1 + j] = v; });
          });
          for (let i = 0; i < data.length; i++) if (!data[i]) data[i] = [];
          return range;
        };
        return range;
      },
      clear: () => { data.length = 0; },
      setFrozenRows() {}, setColumnWidth() {}, setColumnWidths() {}
    };
    return sheet;
  }
  function chain() {
    return new Proxy({}, { get: (t, prop) => (prop in t ? t[prop] : () => chain()) });
  }
  const ss = {
    getId: () => 'sheet-id',
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => (sheets[n] = makeSheet(n)),
    getSheets: () => Object.values(sheets),
    deleteSheet: (s) => { delete sheets[s.name]; },
    toast() {}
  };
  // Treat the configured timezone as UTC so expectations are easy to reason about.
  const Utilities = {
    parseDate(text) {
      const [d, t] = text.split(' ');
      return new Date(`${d}T${t}:00Z`);
    },
    formatDate(date, tz, pattern) {
      return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
    }
  };
  return {
    sheets, sent, ss,
    globals: {
      SpreadsheetApp: { openById: () => ss, getActiveSpreadsheet: () => ss, getUi: () => ({}) },
      PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'sheet-id', setProperty() {} }) },
      MailApp: { getRemainingDailyQuota: () => 1500, sendEmail: (m) => sent.push(m) },
      LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
      Utilities
    }
  };
}

function load(fakes) {
  const context = vm.createContext(Object.assign({ Date, JSON, Math, Number, Object, String, Array, Error }, fakes ? fakes.globals : {}));
  for (const file of ALL) {
    new vm.Script(fs.readFileSync(path.join(srcDir, file), 'utf8'), { filename: file }).runInContext(context);
  }
  return context;
}

// ---------- Pure parsing ----------
const ctx = load();
assert.deepEqual({ ...ctx.parseDateParts('2027-01-11') }, { year: 2027, month: 1, day: 11 });
assert.deepEqual({ ...ctx.parseDateParts('1/11/2027') }, { year: 2027, month: 1, day: 11 });
assert.deepEqual({ ...ctx.parseDateParts('1/11/27') }, { year: 2027, month: 1, day: 11 });
assert.equal(ctx.parseDateParts('2027-02-30'), null);
assert.equal(ctx.parseDateParts('next tuesday'), null);
assert.deepEqual({ ...ctx.parseTimeParts('6:00 PM') }, { hour: 18, minute: 0 });
assert.deepEqual({ ...ctx.parseTimeParts('6pm') }, { hour: 18, minute: 0 });
assert.deepEqual({ ...ctx.parseTimeParts('12:30 AM') }, { hour: 0, minute: 30 });
assert.deepEqual({ ...ctx.parseTimeParts('12:15 pm') }, { hour: 12, minute: 15 });
assert.deepEqual({ ...ctx.parseTimeParts('18:05') }, { hour: 18, minute: 5 });
assert.deepEqual({ ...ctx.parseTimeParts('6:00:00 PM') }, { hour: 18, minute: 0 });
assert.equal(ctx.parseTimeParts('25:00'), null);
assert.deepEqual([...ctx.parseEmailList('a@x.com, b@y.com;bad')], ['a@x.com', 'b@y.com']);
assert.equal(ctx.parseBool('', true), true);
assert.equal(ctx.parseBool('FALSE', true), false);

const defaults = ctx.normalizeSettings({});
assert.equal(defaults.testMode, true);
assert.equal(defaults.welcomeDaysBefore, 14);
assert.equal(defaults.reminderMinutesBefore, 60);

// ---------- Plan + evaluation ----------
const utcInstant = (d, t) => Date.UTC(d.year, d.month - 1, d.day, t.hour, t.minute);
const H = 3600 * 1000;
const D = 24 * H;
function sampleData(overrides) {
  const sessions = [];
  for (let day = 1; day <= 8; day++) {
    sessions.push({ cohortId: 'C1', day: String(day), date: `2027-01-${String(10 + day).padStart(2, '0')}`, time: '6:00 PM', zoomLink: '', row: day + 1 });
  }
  return Object.assign({
    cohorts: [{ id: 'C1', courseName: 'Express AI', confirmed: true, zoomLink: 'https://zoom.us/j/1', meetingId: '1', passcode: 'pw',
      resources: ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'], row: 2 }],
    sessions,
    recipients: [{ firstName: 'Ann', email: 'ann@example.com', cohortId: 'C1', active: true, row: 2 }],
    templates: {
      WELCOME: { active: true, subject: 'Welcome {{FirstName}}', body: '{{Schedule}}' },
      CHECKIN: { active: true, subject: 'Check-in', body: 'Prep: {{Resources}}' },
      SESSION: { active: true, subject: 'Day {{DayNumber}}', body: '{{ZoomLink}} {{Resources}}' },
      FOLLOWUP: { active: false, subject: 'Thanks', body: 'Thanks' }
    },
    settings: ctx.normalizeSettings({})
  }, overrides || {});
}

const day1 = Date.UTC(2027, 0, 11, 18, 0);
let plan = ctx.buildPlan(sampleData(), utcInstant);
assert.equal(plan.sends.length, 1 + 1 + 8, 'welcome + check-in + 8 sessions (follow-up inactive)');
assert.deepEqual([...plan.problems], []);
const welcome = plan.sends.find((s) => s.template === 'WELCOME');
assert.equal(welcome.dueMs, day1 - 14 * D);
assert.equal(plan.sends.find((s) => s.template === 'CHECKIN').dueMs, day1 - 5 * D);
assert.equal(plan.sends.find((s) => s.template === 'SESSION' && s.day === 1).dueMs, day1 - H);
assert.equal(welcome.key, 'C1|WELCOME|0|ann@example.com');

// Unconfirmed cohorts plan nothing.
const unconfirmed = sampleData();
unconfirmed.cohorts[0].confirmed = false;
assert.equal(ctx.buildPlan(unconfirmed, utcInstant).sends.length, 0);
assert.equal(ctx.buildPlan(unconfirmed, utcInstant, { includeUnconfirmed: true }).sends.length, 10);

// Bad rows are reported, not silently dropped.
const messy = sampleData();
messy.sessions[7].date = 'soon';
messy.recipients.push({ firstName: 'Bob', email: 'bob-at-example', cohortId: 'C1', active: true, row: 3 });
messy.recipients.push({ firstName: 'Ann2', email: 'ANN@example.com', cohortId: 'C1', active: true, row: 4 });
messy.recipients.push({ firstName: 'Paused', email: 'p@example.com', cohortId: 'C1', active: false, row: 5 });
plan = ctx.buildPlan(messy, utcInstant);
assert.equal(plan.problems.length, 4, plan.problems.join('\n'));
assert.equal(new Set(plan.sends.map((s) => s.email.toLowerCase())).size, 1);

plan = ctx.buildPlan(sampleData(), utcInstant);
let results = ctx.evaluatePlan(plan.sends, {}, day1 - 20 * D, '');
assert.ok(results.every((r) => r.status === 'WAITING'));

results = ctx.evaluatePlan(plan.sends, {}, day1 - 14 * D + 1, '');
assert.deepEqual([...results.filter((r) => r.status === 'DUE').map((r) => r.template)], ['WELCOME']);

// Late joiner (3 days out): welcome goes, check-in is skipped as redundant.
results = ctx.evaluatePlan(plan.sends, {}, day1 - 3 * D, '');
assert.equal(results.find((r) => r.template === 'WELCOME').status, 'DUE');
assert.equal(results.find((r) => r.template === 'CHECKIN').status, 'SKIP');

// Already-sent welcome → check-in goes normally.
const history = ctx.summarizeHistory([{ key: 'C1|WELCOME|0|ann@example.com', status: 'SENT' }]);
results = ctx.evaluatePlan(plan.sends, history, day1 - 3 * D, '');
assert.equal(results.find((r) => r.template === 'CHECKIN').status, 'DUE');

// Session reminder: due within the hour, missed once the session starts.
results = ctx.evaluatePlan(plan.sends, history, day1 - 30 * 60 * 1000, '');
assert.equal(results.find((r) => r.template === 'SESSION' && r.day === 1).status, 'DUE');
results = ctx.evaluatePlan(plan.sends, history, day1 + 1, '');
assert.equal(results.find((r) => r.template === 'SESSION' && r.day === 1).status, 'MISSED');
assert.equal(results.find((r) => r.template === 'WELCOME').status, 'DONE');

// Test-mode history is separate from live history.
results = ctx.evaluatePlan(plan.sends, history, day1 - 3 * D, 'TEST|');
assert.equal(results.find((r) => r.template === 'WELCOME').status, 'DUE');

// Errors retry, then give up.
const errs = ctx.summarizeHistory([1, 2, 3].map(() => ({ key: 'C1|WELCOME|0|ann@example.com', status: 'ERROR' })));
results = ctx.evaluatePlan(plan.sends, errs, day1 - 10 * D, '');
assert.equal(results.find((r) => r.template === 'WELCOME').status, 'FAILED');

// ---------- Rendering ----------
const fmt = { date: (ms) => new Date(ms).toISOString().slice(0, 10), time: () => '6:00 PM' };
const session3 = plan.sends.find((s) => s.template === 'SESSION' && s.day === 3);
const fields = ctx.buildMergeFields(session3, defaults, fmt);
assert.equal(fields.Resources, 'R3');
assert.equal(fields.DayNumber, '3');
assert.equal(fields.TotalDays, '8');
assert.equal(fields.ZoomLink, 'https://zoom.us/j/1');
assert.ok(fields.Schedule.startsWith('Day 1 — 2027-01-11 at 6:00 PM\nDay 2'));
const rendered = ctx.renderEmail({ subject: 'Day {{ daynumber }} for {{FirstName}}', body: 'Hi {{FirstName}} {{Oops}}\nhttps://zoom.us/j/1.' }, fields);
assert.equal(rendered.subject, 'Day 3 for Ann');
assert.deepEqual([...rendered.missing], ['Oops']);
assert.ok(rendered.html.includes('<a href="https://zoom.us/j/1">https://zoom.us/j/1</a>.'));
assert.ok(ctx.textToHtml('<b>').includes('&lt;b&gt;'));

// ---------- End to end against fake Sheets/Mail ----------
{
  const fakes = makeFakes();
  const app = load(fakes);
  app.ensureTabs_(fakes.ss);
  for (const tab of ['Cohorts', 'Calendar', 'Recipients', 'Templates', 'Settings', 'Send Log']) {
    assert.ok(fakes.sheets[tab], `setup creates ${tab}`);
  }

  // Templates written by setup must only use placeholders the renderer knows.
  const templateRows = fakes.sheets.Templates.data.slice(1);
  const known = Object.keys(fields).map((k) => k.toLowerCase());
  for (const row of templateRows) {
    const used = `${row[2]} ${row[3]}`.match(/{{\s*([A-Za-z0-9_]+)\s*}}/g) || [];
    for (const token of used) assert.ok(known.includes(token.replace(/[{}\s]/g, '').toLowerCase()), `${row[0]} uses unknown ${token}`);
  }

  // Confirm the sample cohort, set test + internal emails.
  fakes.sheets.Cohorts.data[1][2] = true;
  const settingsRows = fakes.sheets.Settings.data;
  const setSetting = (name, value) => { settingsRows.find((r) => r[0] === name)[1] = value; };
  setSetting('Test Email', 'me@example.org');
  setSetting('Internal Emails', 'team1@example.org, team2@example.org');

  const realNow = Date.now;
  const sampleDay1 = Date.UTC(2027, 0, 11, 18, 0);
  try {
    Date.now = () => sampleDay1 - 3 * D; // late in the cycle: welcome due, check-in redundant
    app.runScheduler();
    assert.equal(fakes.sent.length, 2, 'one test email + one team summary');
    assert.equal(fakes.sent[0].to, 'me@example.org');
    assert.ok(fakes.sent[0].subject.startsWith('[TEST → jane@example.com] You\'re in!'));
    assert.ok(!/{{/.test(fakes.sent[0].body), 'no unfilled placeholders');
    assert.ok(fakes.sent[0].body.includes('Day 8 —'));
    assert.equal(fakes.sent[1].to, 'team1@example.org,team2@example.org');
    assert.ok(fakes.sent[1].subject.startsWith('[TEST] Course emails: 1 sent'));
    const log = fakes.sheets['Send Log'].data.slice(1).map((r) => r[2]);
    assert.deepEqual([...log], ['SKIPPED', 'SENT']);

    // Running again sends nothing new.
    app.runScheduler();
    assert.equal(fakes.sent.length, 2, 'idempotent re-run');

    // Go live: an hour before Day 1, the real student gets the reminder (live history is separate).
    setSetting('Test Mode', 'FALSE');
    Date.now = () => sampleDay1 - 50 * 60 * 1000;
    fakes.sent.length = 0;
    app.runScheduler();
    const toStudent = fakes.sent.filter((m) => m.to === 'jane@example.com');
    assert.deepEqual(toStudent.map((m) => m.subject), ['You\'re in! Express AI Fundamentals starts 2027-01-11 18:00', 'Today at 2027-01-11 18:00: Express AI Fundamentals — Day 1 of 8']);
    assert.ok(toStudent[1].body.includes('Day 1 slides: https://example.com/day1'));
    assert.equal(toStudent[1].bcc, undefined, 'no BCC by default');

    const upcoming = fakes.sheets.Upcoming.data;
    assert.equal(upcoming[0][0], 'Send Time');
    assert.equal(upcoming[1][9], 'None 🎉');
  } finally {
    Date.now = realNow;
  }
}

console.log('email-automation-setup: all tests passed');
