const REPLY_MONITOR_STAGE = 'ReplyMonitor';

/**
 * Returns the disabled reply-monitor state for the Hostinger manual-send workflow.
 * Hostinger IMAP is not available from Apps Script without an HTTPS bridge.
 * @returns {{disabled: boolean, provider: string, scanned: number, repliesDetected: number, updated: number}}
 */
function getReplyMonitorDisabledSummary_() {
  return {
    disabled: true,
    provider: 'Hostinger',
    scanned: 0,
    repliesDetected: 0,
    updated: 0,
  };
}

/**
 * Backward-compatible manual entry point.
 * @returns {{disabled: boolean, provider: string, scanned: number, repliesDetected: number, updated: number}}
 */
function monitorReplies() {
  const summary = getReplyMonitorDisabledSummary_();
  auditLog(REPLY_MONITOR_STAGE, 'MONITOR_DISABLED', '', 'Use the Cold Email menu to mark Hostinger replies.', 'SKIP');
  return summary;
}
