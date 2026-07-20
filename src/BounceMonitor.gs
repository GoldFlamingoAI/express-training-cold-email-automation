/**
 * Returns the disabled bounce-monitor state for the Hostinger manual-send workflow.
 * Hostinger IMAP is not available from Apps Script without an HTTPS bridge.
 * @returns {{disabled: boolean, provider: string, scanned: number, bouncesDetected: number, updated: number}}
 */
function getBounceMonitorDisabledSummary_() {
  return {
    disabled: true,
    provider: 'Hostinger',
    scanned: 0,
    bouncesDetected: 0,
    updated: 0,
  };
}
