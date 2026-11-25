/**
 * Course Reminders — shared constants. Pure: no Google services referenced here.
 */

const CR_TABS = {
  COHORTS: 'Cohorts',
  CALENDAR: 'Calendar',
  RECIPIENTS: 'Recipients',
  TEMPLATES: 'Templates',
  SETTINGS: 'Settings',
  LOG: 'Send Log',
  UPCOMING: 'Upcoming'
};

const CR_TEMPLATE_KEYS = {
  WELCOME: 'WELCOME',
  CHECKIN: 'CHECKIN',
  SESSION: 'SESSION',
  FOLLOWUP: 'FOLLOWUP'
};

const CR_RESOURCE_DAYS = 8;

const CR_MS_MINUTE = 60 * 1000;
const CR_MS_HOUR = 60 * CR_MS_MINUTE;
const CR_MS_DAY = 24 * CR_MS_HOUR;

// A failing send is retried on later runs, then abandoned so it can't loop forever.
const CR_MAX_ERROR_ATTEMPTS = 3;
// The follow-up email is still worth sending a few days late; after that it's stale.
const CR_FOLLOWUP_WINDOW_MS = 3 * CR_MS_DAY;

const CR_TEST_KEY_PREFIX = 'TEST|';

const CR_SETTING_DEFAULTS = {
  'Timezone': 'America/New_York',
  'Sender Name': 'Express Training',
  'Reply-To': '',
  'Internal Emails': '',
  'Internal Summary Email': 'TRUE',
  'BCC Internal On Every Email': 'FALSE',
  'Test Mode': 'TRUE',
  'Test Email': '',
  'Welcome Email Days Before': '14',
  'Check-in Email Days Before': '5',
  'Session Reminder Minutes Before': '60',
  'Follow-up Email Hours After Last Session': '3',
  'Max Emails Per Run': '100'
};
