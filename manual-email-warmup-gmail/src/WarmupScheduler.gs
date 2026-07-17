const WARMUP_SCHEDULER_DEFAULTS = {
  startPerDay: 2,
  maxPerDay: 3,
  rampDays: 21,
  startReplyRate: 0.25,
  maxReplyRate: 0.6,
  skipRate: 0.1,
  weekendFactor: 0.5,
  minEngageDelayMinutes: 12,
  maxEngageDelayMinutes: 300,
};

/**
 * Computes how many warm-up emails to send for a given day of the ramp.
 * Pure: all randomness is injected via the random argument.
 * @param {number} dayIndex - Zero-based days since WARMUP_START_DATE.
 * @param {number} dayOfWeek - 0 (Sunday) through 6 (Saturday).
 * @param {Object} config - Scheduler config (see WARMUP_SCHEDULER_DEFAULTS).
 * @param {function(): number} random - Random source returning [0, 1).
 * @returns {number} Emails to send today.
 */
function computeWarmupDailySendTarget(dayIndex, dayOfWeek, config, random) {
  if (!Number.isFinite(dayIndex) || dayIndex < 0) {
    return 0;
  }
  const rampDays = Math.max(Number(config.rampDays) || 1, 1);
  const startPerDay = Math.max(Number(config.startPerDay) || 0, 0);
  const maxPerDay = Math.max(Number(config.maxPerDay) || startPerDay, startPerDay);
  const progress = Math.min(dayIndex / rampDays, 1);
  let target = startPerDay + (maxPerDay - startPerDay) * progress;

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    target *= Number(config.weekendFactor) >= 0 ? Number(config.weekendFactor) : 1;
  }
  if (random() < 0.3) {
    target += random() < 0.5 ? -1 : 1;
  }
  return Math.max(Math.round(target), 0);
}

/**
 * Computes the fraction of received warm-up emails a seed account should reply to.
 * Ramps up gradually so early days do not show unnaturally perfect engagement.
 * @param {number} dayIndex - Zero-based days since WARMUP_START_DATE.
 * @param {Object} config - Scheduler config.
 * @returns {number} Reply rate in [0, 1].
 */
function computeWarmupReplyRate(dayIndex, config) {
  if (!Number.isFinite(dayIndex) || dayIndex < 0) {
    return 0;
  }
  const rampDays = Math.max(Number(config.rampDays) || 1, 1);
  const start = Math.min(Math.max(Number(config.startReplyRate) || 0, 0), 1);
  const max = Math.min(Math.max(Number(config.maxReplyRate) || start, start), 1);
  const progress = Math.min(dayIndex / rampDays, 1);
  return start + (max - start) * progress;
}

/**
 * Decides whether a received message should be deliberately left unread forever.
 * Perfect engagement across every send is itself a detectable pattern.
 * @param {Object} config - Scheduler config.
 * @param {function(): number} random - Random source returning [0, 1).
 * @returns {boolean} True to skip engagement entirely for this message.
 */
function shouldSkipWarmupEngagement(config, random) {
  const skipRate = Math.min(Math.max(Number(config.skipRate) || 0, 0), 1);
  return random() < skipRate;
}

/**
 * Picks a randomized delay before a seed account opens/replies to a message.
 * Instant round-trips are a bot signature; humans take minutes to hours.
 * @param {Object} config - Scheduler config.
 * @param {function(): number} random - Random source returning [0, 1).
 * @returns {number} Delay in whole minutes.
 */
function pickWarmupEngageDelayMinutes(config, random) {
  const min = Math.max(Number(config.minEngageDelayMinutes) || 0, 0);
  const max = Math.max(Number(config.maxEngageDelayMinutes) || min, min);
  return Math.floor(min + (max - min) * random());
}

/**
 * Computes a stable hash of message content so repeating patterns can be audited.
 * @param {string} content - Subject plus body text.
 * @returns {string} Hex djb2 hash.
 */
function computeWarmupContentHash(content) {
  const text = String(content || '');
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash * 33) ^ text.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

/**
 * Computes the zero-based day index between a start date and now.
 * @param {Date} startDate - Warm-up start date.
 * @param {Date} now - Current time.
 * @returns {number} Whole days elapsed, or -1 when the start date is invalid or future.
 */
function computeWarmupDayIndex(startDate, now) {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    return -1;
  }
  const elapsed = now.getTime() - startDate.getTime();
  if (elapsed < 0) {
    return -1;
  }
  return Math.floor(elapsed / 86400000);
}
