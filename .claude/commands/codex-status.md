Print the Codex Bootstrap Banner on demand.

Read in parallel:
- AGENTS.md
- PHASES.md
- PLAYBOOK.md
- NOTES.md
- ERRORS.md
- docs/codex/REVIEW_STANDARDS.md
- docs/codex/TRACKING.md

Check repo state:
- Current Phase and Current Task from PHASES.md
- Open Codex PRs (use `gh pr list --search "head:codex/"` if available, else note "unknown — no gh CLI access")
- Existence of EMERGENCY.md
- PHASES.md fill state (filled / template / empty)
- Last 5 entries in NOTES.md and ERRORS.md (date + first line of each)
- Last entry in PHASES.md "Codex Calibration Log"
- Pattern Watch table from docs/codex/TRACKING.md (any patterns hitting threshold)

Output:

```
Codex workflow status — [YYYY-MM-DD]
─────────────────────────────────────
Phase / Task   : [X] / [X.X]
Open Codex PRs : [list]
EMERGENCY.md   : [present / absent]
PHASES.md      : [filled / template / empty]

Recent NOTES   : [count] entries — last: [date — first line]
Recent ERRORS  : [count] entries — last: [date — first line]
Last calibration: [date — what changed]

Pattern Watch  :
  - [pattern 1: count]
  - [or "No patterns flagged"]

Stale PRs (>7 days old): [list or "None"]
```

If any pattern is at threshold (2+ occurrences), end with:
> ⚠️ Pattern at threshold — recommend tightening AGENTS.md before next Codex task.

Keep under 30 lines.
