/**
 * Scores a lead on a 100-point scale per the campaign scoring model.
 * @param {{maConfirmed: boolean, relevantRole: boolean, validEmail: boolean, wtfpRelevance: boolean, employeeSizeFit: boolean, industryFit: boolean, hasPersonalizationFact: boolean}} lead - Lead scoring inputs supplied by caller.
 * @param {number} approvalThreshold - Approval threshold read from SETTINGS tab by caller.
 * @returns {{score: number, breakdown: Object, approved: boolean}}
 */
function scoreLead(lead, approvalThreshold) {
  const breakdown = {
    maConfirmed: lead.maConfirmed ? 20 : 0,
    relevantRole: lead.relevantRole ? 20 : 0,
    validEmail: lead.validEmail ? 20 : 0,
    wtfpRelevance: lead.wtfpRelevance ? 15 : 0,
    employeeSizeFit: lead.employeeSizeFit ? 10 : 0,
    industryFit: lead.industryFit ? 10 : 0,
    hasPersonalizationFact: lead.hasPersonalizationFact ? 5 : 0
  };
  const score = breakdown.maConfirmed +
    breakdown.relevantRole +
    breakdown.validEmail +
    breakdown.wtfpRelevance +
    breakdown.employeeSizeFit +
    breakdown.industryFit +
    breakdown.hasPersonalizationFact;

  return {
    score: score,
    breakdown: breakdown,
    approved: score >= approvalThreshold
  };
}
