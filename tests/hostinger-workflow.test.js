const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const sourceFiles = fs.readdirSync(srcDir).filter((file) => file.endsWith('.gs')).sort();
const context = vm.createContext({
  Date,
  JSON,
  Math,
  Number,
  Object,
  String,
  console,
  auditLog() {},
});

for (const file of sourceFiles) {
  const source = fs.readFileSync(path.join(srcDir, file), 'utf8');
  assert.equal(source.includes('GmailApp'), false, `${file} still uses GmailApp`);
  new vm.Script(source, { filename: file }).runInContext(context);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'appsscript.json'), 'utf8'));
assert.equal(manifest.oauthScopes.includes('https://mail.google.com/'), false);

const approvedInitial = context.checkApproval({
  email: 'owner@example.com',
  maConfirmed: 'TRUE',
  roleIsRelevant: 'TRUE',
  verificationResult: 'valid',
  catchAll: false,
  status: 'QUEUED',
  emailsSent: 0,
  sequenceStep: 1,
  personalizationLine: 'Runs a Massachusetts apprenticeship program.',
}, { dailyLimit: 5 }, 0, false);
assert.equal(approvedInitial.approved, true);

const approvedFollowUp = context.checkApproval({
  email: 'owner@example.com',
  maConfirmed: 'TRUE',
  roleIsRelevant: 'TRUE',
  verificationResult: 'valid',
  catchAll: false,
  status: 'QUEUED',
  emailsSent: 1,
  sequenceStep: 2,
  personalizationLine: 'Runs a Massachusetts apprenticeship program.',
}, { dailyLimit: 5 }, 0, false);
assert.equal(approvedFollowUp.approved, true);

const duplicateStep = context.checkApproval({
  email: 'owner@example.com',
  maConfirmed: 'TRUE',
  roleIsRelevant: 'TRUE',
  verificationResult: 'valid',
  catchAll: false,
  status: 'QUEUED',
  emailsSent: 1,
  sequenceStep: 1,
  personalizationLine: 'Runs a Massachusetts apprenticeship program.',
}, { dailyLimit: 5 }, 0, false);
assert.equal(duplicateStep.approved, false);
assert.equal(duplicateStep.failedChecks.some((check) => check.includes('sequence step 1')), true);

const oldDate = new Date(Date.now() - 6 * 86400000);
const contactRow = ['c1', 'owner@example.com', 'SENT', 1, oldDate];
const contactColumns = {
  contactIdColumn: 0,
  emailColumn: 1,
  statusColumn: 2,
  emailsSentColumn: 3,
  lastSentColumn: 4,
};
const followUp = context.getFollowUpSchedulerEligibility_(contactRow, contactColumns, { delayDays: 4, maxEmails: 3 }, ['id:c1|step:1'], new Date());
assert.equal(followUp.eligible, true);
assert.equal(followUp.sequenceStep, 2);
assert.equal(followUp.queueKey, 'id:c1|step:2');

const duplicateFollowUp = context.getFollowUpSchedulerEligibility_(contactRow, contactColumns, { delayDays: 4, maxEmails: 3 }, ['id:c1|step:2'], new Date());
assert.equal(duplicateFollowUp.eligible, false);
assert.equal(duplicateFollowUp.reason, 'already_queued');

const now = new Date();
const metrics = context.buildDashboardServiceMetrics_(
  { headers: ['status'], rows: [['REPLIED']] },
  { headers: ['status'], rows: [['PREPARED']] },
  { headers: ['timestamp', 'action'], rows: [[now, 'EMAIL_PREPARED'], [now, 'EMAIL_SENT']] },
  { headers: ['timestamp', 'email'], rows: [] },
  { dailyLimit: 5 },
);
const metricMap = Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
assert.equal(metricMap.emails_prepared_total, 1);
assert.equal(metricMap.emails_sent_total, 1);
assert.equal(metricMap.emails_sent_today, 1);
assert.equal(metricMap.daily_remaining, 4);
assert.equal(metricMap.reply_rate, 1);

// Per-step template selection: exact match wins, blank step is the step-1 default,
// and a follow-up step without its own template returns null (preparation skips it).
const templates = [
  { subject: 'Intro', body: 'intro body', sequenceStep: null },
  { subject: 'Follow up', body: 'follow-up body', sequenceStep: 2 },
];
assert.equal(context.selectTemplateForStep(templates, 1).subject, 'Intro');
assert.equal(context.selectTemplateForStep(templates, 2).subject, 'Follow up');
assert.equal(context.selectTemplateForStep(templates, 3), null);
assert.equal(context.selectTemplateForStep([{ subject: 'Only', body: 'b', sequenceStep: 1 }], 1).subject, 'Only');

// Personalization pure helpers.
const stripped = context.stripPersonalizationHtml('<html><style>x{}</style><script>bad()</script><h1>Forklift &amp; Safety Training</h1><p>Serving  Worcester</p></html>');
assert.equal(stripped, 'Forklift & Safety Training Serving Worcester');
const prompt = context.buildPersonalizationPrompt('Acme Corp', 'Owner', 'site text here');
assert.ok(prompt.includes('Acme Corp') && prompt.includes('Owner') && prompt.includes('site text here'));

// Per-source bounce metrics appear when CONTACTS has a source column, and are absent otherwise.
const sourcedMetrics = context.buildDashboardServiceMetrics_(
  { headers: ['status', 'source'], rows: [['BOUNCED', 'scraper'], ['SENT', 'scraper'], ['SENT', 'hunter']] },
  { headers: ['status'], rows: [] },
  { headers: ['timestamp', 'action'], rows: [] },
  { headers: ['timestamp', 'email'], rows: [] },
  { dailyLimit: 5 },
);
const sourcedMap = Object.fromEntries(sourcedMetrics.map((metric) => [metric.name, metric.value]));
assert.equal(sourcedMap.source_scraper_contacts, 2);
assert.equal(sourcedMap.source_scraper_bounce_rate, 0.5);
assert.equal(sourcedMap.source_hunter_contacts, 1);
assert.equal(sourcedMap.source_hunter_bounce_rate, 0);
assert.equal(Object.keys(sourcedMap).some((name) => name.startsWith('source_')), true);

// Phase 4 pure logic: role relevance, domain extraction, catch-all detection, queue eligibility.
assert.equal(context.isRelevantRole('Director of Operations', 'owner, operations, hr'), true);
assert.equal(context.isRelevantRole('OWNER / Founder', 'owner'), true);
assert.equal(context.isRelevantRole('Software Engineer', 'owner, operations, hr'), false);
assert.equal(context.isRelevantRole('Owner', ''), false);
assert.equal(context.isRelevantRole('', 'owner'), false);

assert.equal(context.extractContactDiscoveryDomain_('https://www.Example.com/about?x=1'), 'example.com');
assert.equal(context.extractContactDiscoveryDomain_('example.com'), 'example.com');
assert.equal(context.extractContactDiscoveryDomain_('not-a-domain'), '');
assert.equal(context.extractContactDiscoveryDomain_(''), '');

assert.equal(context.isZeroBounceCatchAll('catch-all', ''), true);
assert.equal(context.isZeroBounceCatchAll('valid', 'catch_all'), true);
assert.equal(context.isZeroBounceCatchAll('valid', 'alternate'), false);

const eligibleContact = {
  email: 'owner@example.com',
  verificationResult: 'valid',
  roleIsRelevant: 'TRUE',
  maConfirmed: 'TRUE',
  catchAll: 'FALSE',
  emailsSent: 0,
};
assert.equal(context.isQueueBuilderEligible(eligibleContact, false).eligible, true);
assert.equal(context.isQueueBuilderEligible(Object.assign({}, eligibleContact, { verificationResult: 'invalid' }), false).reason, 'not_verified_valid');
assert.equal(context.isQueueBuilderEligible(Object.assign({}, eligibleContact, { roleIsRelevant: 'FALSE' }), false).reason, 'role_not_relevant');
assert.equal(context.isQueueBuilderEligible(Object.assign({}, eligibleContact, { catchAll: 'TRUE' }), false).reason, 'catch_all');
assert.equal(context.isQueueBuilderEligible(Object.assign({}, eligibleContact, { emailsSent: 1 }), false).reason, 'already_emailed');
assert.equal(context.isQueueBuilderEligible(eligibleContact, true).reason, 'suppressed');
assert.equal(context.isQueueBuilderEligible(Object.assign({}, eligibleContact, { email: '' }), false).reason, 'missing_email');

// Queue rows align contact values to QUEUE headers with status/step/prep fields set.
const queueRow = context.buildQueueBuilderRow_(
  ['contactid', 'email', 'status', 'sequencestep', 'subject', 'body', 'preparedat', 'sentat', 'company'],
  { contactId: 'c9', email: 'owner@example.com', company: 'Acme', _rowNumber: 5 },
);
assert.deepEqual(queueRow, ['c9', 'owner@example.com', 'QUEUED', 1, '', '', '', '', 'Acme']);

assert.deepEqual(
  JSON.parse(JSON.stringify(context.runReplyMonitorTrigger())),
  { disabled: true, provider: 'Hostinger', scanned: 0, repliesDetected: 0, updated: 0 },
);
assert.deepEqual(
  JSON.parse(JSON.stringify(context.runBounceMonitorTrigger())),
  { disabled: true, provider: 'Hostinger', scanned: 0, bouncesDetected: 0, updated: 0 },
);

class FakeRange {
  constructor(sheet, row, column, numRows = 1, numColumns = 1) {
    this.sheet = sheet;
    this.row = row;
    this.column = column;
    this.numRows = numRows;
    this.numColumns = numColumns;
  }

  getValues() {
    return Array.from({ length: this.numRows }, (_, rowOffset) =>
      Array.from({ length: this.numColumns }, (_, columnOffset) =>
        this.sheet.getCell(this.row + rowOffset, this.column + columnOffset),
      ),
    );
  }

  setValues(values) {
    values.forEach((row, rowOffset) => row.forEach((value, columnOffset) => {
      this.sheet.setCell(this.row + rowOffset, this.column + columnOffset, value);
    }));
    return this;
  }

  getValue() {
    return this.getValues()[0][0];
  }

  setValue(value) {
    this.sheet.setCell(this.row, this.column, value);
    return this;
  }
}

class FakeSheet {
  constructor(name, rows) {
    this.name = name;
    this.rows = rows.map((row) => row.slice());
  }

  getName() {
    return this.name;
  }

  getLastColumn() {
    return this.rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  }

  getLastRow() {
    return this.rows.length;
  }

  getRange(row, column, numRows, numColumns) {
    return new FakeRange(this, row, column, numRows, numColumns);
  }

  getDataRange() {
    return new FakeRange(this, 1, 1, Math.max(this.rows.length, 1), Math.max(this.getLastColumn(), 1));
  }

  getCell(row, column) {
    return this.rows[row - 1]?.[column - 1] ?? '';
  }

  setCell(row, column, value) {
    while (this.rows.length < row) this.rows.push([]);
    while (this.rows[row - 1].length < column) this.rows[row - 1].push('');
    this.rows[row - 1][column - 1] = value;
  }

  appendRow(row) {
    this.rows.push(row.slice());
  }
}

const queueSheet = new FakeSheet('QUEUE', [
  ['contactId', 'email', 'status', 'emailsSent'],
  ['c1', 'owner@example.com', 'QUEUED', 0],
]);
const contactsSheet = new FakeSheet('CONTACTS', [
  ['contactId', 'email', 'status', 'emailsSent', 'lastSentAt'],
  ['c1', 'owner@example.com', '', 0, ''],
]);
const activitySheet = new FakeSheet('ACTIVITY_LOG', [
  ['timestamp', 'stage', 'action', 'contactId', 'details', 'status'],
]);
const fakeSpreadsheet = {
  getId() {
    return 'canonical-spreadsheet-id';
  },
  getSheetByName(name) {
    return { QUEUE: queueSheet, CONTACTS: contactsSheet, ACTIVITY_LOG: activitySheet }[name] || null;
  },
};
let storedSpreadsheetId = 'spreadsheet-id';
context.PropertiesService = {
  getScriptProperties() {
    return {
      getProperty() {
        return storedSpreadsheetId;
      },
      setProperty(name, value) {
        if (name === 'SPREADSHEET_ID') storedSpreadsheetId = value;
      },
    };
  },
};
context.SpreadsheetApp = {
  getActiveSpreadsheet() {
    return fakeSpreadsheet;
  },
  openById() {
    return fakeSpreadsheet;
  },
};
context.Logger = { log() {} };

assert.equal(context.openCampaignSpreadsheet(), fakeSpreadsheet);
assert.equal(context.repairCampaignSpreadsheetId(), 'canonical-spreadsheet-id');
assert.equal(storedSpreadsheetId, 'canonical-spreadsheet-id');

assert.deepEqual(
  JSON.parse(JSON.stringify(context.setupHostingerWorkflow())),
  { queueColumnsAdded: 5, contactColumnsAdded: 0 },
);
const prepared = context.prepareEmailForHostinger({
  _rowNumber: 2,
  contactId: 'c1',
  email: 'owner@example.com',
  emailsSent: 0,
}, 'Quick question', 'Hello from the test.', { senderName: 'Adam Graney' });
assert.equal(prepared.success, true);
assert.equal(prepared.prepared, true);
assert.equal(context.getCampaignStateRecordAtRow_(queueSheet, 2).status, 'PREPARED');

const sentAt = new Date('2026-07-16T15:00:00.000Z');
const sent = context.markQueueEmailSent(2, sentAt);
assert.equal(sent.updated, true);
assert.equal(context.getCampaignStateRecordAtRow_(queueSheet, 2).status, 'SENT');
const updatedContact = context.getCampaignStateRecordAtRow_(contactsSheet, 2);
assert.equal(updatedContact.status, 'SENT');
assert.equal(updatedContact.emailssent, 1);
assert.equal(updatedContact.lastsentat.toISOString(), sentAt.toISOString());

const duplicateSent = context.markQueueEmailSent(2, sentAt);
assert.equal(duplicateSent.updated, false);
assert.equal(duplicateSent.alreadySent, true);

console.log(`Validated ${sourceFiles.length} Apps Script files and Hostinger workflow behavior.`);
