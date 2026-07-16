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
