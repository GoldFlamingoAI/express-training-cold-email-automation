# Aider — <Project Name>

## Stack
- [Language + version]
- [Framework]
- [Database / storage]
- [Deploy target]

## File Structure
- [directory] → [purpose]
- [directory] → [purpose]

## Patterns to Follow
- [Pattern name]: follow [file/location]
- [Pattern name]: follow [file/location]

## Style Rules
- Formatter: [tool]
- Type hints: [yes/no]
- Import order: [rule]

## Never Do
- Never push to main — feature/* branches only
- Never commit .env or secrets
- Never add a dependency without user approval first
- Never make architecture decisions — flag in PHASES.md
- Never create or modify `.github/workflows/` — Claude only
- [Stack-specific rules]

---

## Session Start

Before anything else, output:

```
Loaded: AIDER.md ✓  PHASES.md ✓  PLAYBOOK.md ✓
Phase: [from PHASES.md]  Task: [from PHASES.md]
Ready.
```

Stop and say so if any file is missing.

---

## New Dependency

Before adding any package, stop and ask:

```
Need: [package] — [reason]
Approve?
  y = add and flag in commit message
  n = I'll find an alternative
```

Never install without approval.

---

## Deviation Logging

Any judgment call or pattern not covered by PLAYBOOK.md: write to
NOTES.md in the same edit turn as the code. Never split across commits.

```
[YYYY-MM-DD] DEVIATION: [what and why]
```

When in doubt, log it. Unlogged deviations Claude catches become EMERGENCY.md entries.

---

## Context Management — Keep It Lean

Only keep files in chat that are needed for the current task.
Use `/drop [file]` to remove files once you're done with them.
Never load the whole codebase — targeted context = faster responses.

---

## After Every Task — Summary Required

Before the push prompt, always output this summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Completed : [what was built in one sentence]
Confidence: [High / Medium / Low]
            [one line reason — did it follow all rules and patterns?]
Concerns  : [any deviations logged, edge cases, or things Claude should watch]
            [None if clean]
Next task : [exact next task from PHASES.md]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Be honest on confidence. Low = something felt uncertain or was improvised.
