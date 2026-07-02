/**
 * Returns true if the company's location fields confirm Massachusetts.
 * @param {string} state - Normalized state field (e.g. 'MA', 'Massachusetts').
 * @param {string} city - Normalized city field (used as fallback check).
 * @returns {boolean}
 */
function isMassachusetts(state, city) {
  const normalizedState = String(state || '').trim().toLowerCase();
  const normalizedCity = String(city || '').trim().toLowerCase();
  const massachusettsCities = [
    'boston',
    'worcester',
    'springfield',
    'lowell',
    'cambridge',
    'new bedford',
    'brockton',
    'quincy',
    'lynn',
    'fall river',
    'newton',
    'somerville',
    'lawrence',
    'framingham',
    'waltham',
    'haverhill',
    'malden',
    'medford',
    'taunton',
    'chicopee'
  ];

  if (normalizedState === 'ma' || normalizedState === 'massachusetts') {
    return true;
  }

  if (normalizedState && normalizedState !== 'unknown' && normalizedState !== 'n/a') {
    return false;
  }

  return massachusettsCities.indexOf(normalizedCity) !== -1;
}
