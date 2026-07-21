const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const srcDir = path.join(__dirname, '..', 'src');
const sourceFiles = fs.readdirSync(srcDir).filter((file) => file.endsWith('.gs')).sort();
const context = vm.createContext({ Date, JSON, Math, Number, Object, String, console });

for (const file of sourceFiles) {
  const source = fs.readFileSync(path.join(srcDir, file), 'utf8');
  assert.equal(source.includes('GmailApp'), false, `${file} must not use GmailApp`);
  new vm.Script(source, { filename: file }).runInContext(context);
}

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'appsscript.json'), 'utf8'));
assert.equal(manifest.oauthScopes.includes('https://mail.google.com/'), false, 'manifest must not carry the Gmail scope');

const config = vm.runInContext('WARMUP_SCHEDULER_DEFAULTS', context);

// Ramp: day 0 starts at startPerDay, past rampDays plateaus at maxPerDay (no jitter at random=0.5).
const noJitter = () => 0.5;
assert.equal(context.computeWarmupDailySendTarget(0, 2, config, noJitter), config.startPerDay);
assert.equal(context.computeWarmupDailySendTarget(config.rampDays + 10, 2, config, noJitter), config.maxPerDay);
assert.equal(context.computeWarmupDailySendTarget(-1, 2, config, noJitter), 0);

// Weekend damping reduces the weekday target.
const weekday = context.computeWarmupDailySendTarget(config.rampDays, 2, config, noJitter);
const weekend = context.computeWarmupDailySendTarget(config.rampDays, 0, config, noJitter);
assert.ok(weekend <= weekday, 'weekend target must not exceed weekday target');

// Jitter can move the target but never below zero.
assert.ok(context.computeWarmupDailySendTarget(0, 2, config, () => 0.0) >= 0);

// Reply rate ramps from startReplyRate to maxReplyRate and clamps.
assert.equal(context.computeWarmupReplyRate(0, config), config.startReplyRate);
assert.equal(context.computeWarmupReplyRate(config.rampDays * 2, config), config.maxReplyRate);
assert.equal(context.computeWarmupReplyRate(-5, config), 0);

// Skip decision honors the configured rate.
assert.equal(context.shouldSkipWarmupEngagement(config, () => 0.05), true);
assert.equal(context.shouldSkipWarmupEngagement(config, () => 0.95), false);

// Engagement delay stays within configured bounds.
const minDelay = context.pickWarmupEngageDelayMinutes(config, () => 0);
const maxDelay = context.pickWarmupEngageDelayMinutes(config, () => 0.999999);
assert.equal(minDelay, config.minEngageDelayMinutes);
assert.ok(maxDelay <= config.maxEngageDelayMinutes);

// Content hash is stable and content-sensitive.
assert.equal(context.computeWarmupContentHash('hello'), context.computeWarmupContentHash('hello'));
assert.notEqual(context.computeWarmupContentHash('hello'), context.computeWarmupContentHash('hello!'));

// Day index math.
const start = new Date('2026-07-01T09:00:00Z');
assert.equal(context.computeWarmupDayIndex(start, new Date('2026-07-01T15:00:00Z')), 0);
assert.equal(context.computeWarmupDayIndex(start, new Date('2026-07-08T09:00:00Z')), 7);
assert.equal(context.computeWarmupDayIndex(new Date('invalid'), new Date()), -1);
assert.equal(context.computeWarmupDayIndex(new Date('2027-01-01T00:00:00Z'), new Date('2026-07-01T00:00:00Z')), -1);

// Fallback content pools produce varied, well-formed output.
const contentA = context.buildFallbackWarmupContent(() => 0.1);
const contentB = context.buildFallbackWarmupContent(() => 0.9);
assert.ok(contentA.subject && contentA.body && contentA.source === 'fallback');
assert.notEqual(contentA.subject, contentB.subject);
assert.ok(context.pickFallbackWarmupReply(() => 0.2).length > 0);

// From-header parsing.
assert.equal(context.parseSeedFromAddress_('Adam <Adam@Example-Outreach.com>'), 'adam@example-outreach.com');
assert.equal(context.parseSeedFromAddress_('plain@example.com'), 'plain@example.com');

// The command-center mappings use the configured descriptive Script Property names verbatim.
const configuredSeeds = [
  { email: 'gfais.demo@gmail.com', tokenPropertyKey: 'SEED_TOKEN_GFAIS' },
  { email: 'adamagdev.data@gmail.com', tokenPropertyKey: 'SEED_TOKEN_ADAMG' },
  { email: 'goldflamingo.arti@gmail.com', tokenPropertyKey: 'SEED_TOKEN_GOLD' },
  { email: 'kitkatm.0208@gmail.com', tokenPropertyKey: 'SEED_TOKEN_KITKAT' },
];
context.getWarmupSheet_ = () => ({
  getDataRange: () => ({
    getValues: () => [
      ['email', 'tokenPropertyKey', 'active'],
      ...configuredSeeds.map((seed) => [seed.email, seed.tokenPropertyKey, true]),
    ],
  }),
});
assert.deepEqual(
  JSON.parse(JSON.stringify(context.getSeedAccounts())),
  configuredSeeds,
  'seed mappings must preserve the exact Script Property names configured in SEED_ACCOUNTS'
);

// Preflight reports the entire configuration at once, and the seed test verifies token identity
// without reading or modifying messages.
const propertyValues = {
  WARMUP_SHEET_ID: 'test-sheet-id',
  WARMUP_FROM_EMAIL: 'adam@goldflamingoailabs.com',
  WARMUP_START_DATE: '2026-07-28',
  HOSTINGER_API_TOKEN: 'hostinger-token',
  OAUTH_CLIENT_ID: 'oauth-client-id',
  OAUTH_CLIENT_SECRET: 'oauth-client-secret',
  OAUTH_PROJECT_OWNER_EMAIL: 'owner@gmail.com',
};
configuredSeeds.forEach((seed, index) => {
  propertyValues[seed.tokenPropertyKey] = `1//refresh-${index}`;
});
context.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => propertyValues[key] || null,
  }),
};
const requiredWarmupSheets = new Set(['WARMUP_LOG', 'ENGAGEMENT', 'SEED_ACCOUNTS', 'DAILY_SUMMARY']);
context.getWarmupSpreadsheet_ = () => ({
  getSheetByName: (name) => (requiredWarmupSheets.has(name) ? {} : null),
});
const logEntries = [];
context.warmupLog = (...args) => logEntries.push(args);
const preflightSummary = JSON.parse(JSON.stringify(context.validateWarmupConfiguration()));
assert.equal(preflightSummary.success, true);
assert.deepEqual(preflightSummary.errors, []);
assert.equal(preflightSummary.warnings.length, 1, 'missing optional project label should only warn');

context.UrlFetchApp = {
  fetch: (url, options) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      const index = Number(String(options.payload.refresh_token).split('-').pop());
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ access_token: `access-${index}` }),
      };
    }
    if (url === 'https://gmail.googleapis.com/gmail/v1/users/me/profile') {
      const index = Number(String(options.headers.Authorization).split('-').pop());
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ emailAddress: configuredSeeds[index].email }),
      };
    }
    throw new Error(`Unexpected test URL: ${url}`);
  },
};
const connectionSummary = JSON.parse(JSON.stringify(context.testSeedAccountConnections()));
assert.equal(connectionSummary.success, true);
assert.equal(connectionSummary.tested, 4);
assert.ok(connectionSummary.results.every((result) => result.success));

propertyValues.WARMUP_FROM_EMAIL = '';
assert.throws(
  () => context.validateWarmupConfiguration(),
  /Missing Script Property WARMUP_FROM_EMAIL/
);

console.log(`Validated ${sourceFiles.length} warm-up Apps Script files and scheduler behavior.`);
