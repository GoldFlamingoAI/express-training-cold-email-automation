Print a quick repo status.

Read: AGENTS.md, PHASES.md, NOTES.md, ERRORS.md.
Check: EMERGENCY.md present? Open Codex PRs (`gh pr list --search "head:codex/"` if available)?
Last 5 entries in NOTES.md and ERRORS.md.

Output, under 20 lines:

```
Status — [YYYY-MM-DD]
─────────────────────
Open Codex PRs : [list or "None"]
EMERGENCY.md   : [present / absent]
Recent NOTES   : [last entry, or "none"]
Recent ERRORS  : [last entry, or "none"]
```
