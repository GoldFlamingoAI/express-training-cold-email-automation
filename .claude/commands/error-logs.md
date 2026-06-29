Check the following sources for errors, issues, and flags:

1. EMERGENCY.md — if it exists at the repo root, surface it immediately at the top
2. NOTES.md — list all DEVIATION and BLOCKED entries from the last 14 days
3. Recent git log — scan the last 20 commits for BLOCKED or EMERGENCY signals in commit messages

Report findings grouped by severity:
- CRITICAL (EMERGENCY.md or security issues)
- WARNINGS (deviations, BLOCKED signals)
- CLEAR (if nothing found, confirm explicitly)
