# Errors — [PROJECT-NAME]

Running log of every caught error during testing or live runs.
Codex appends an entry in the same commit as the bug fix or recovery code.
Claude reads this on every PR review.

## Format

```
[YYYY-MM-DD] ERROR: Stage [stage name] | [error class] | [message]
  Tried: [what fixes were attempted]
  Resolved: [yes/no — if yes, how]
  Task: [TASK_X.X]
  PR: [#NN]
```

## Stages
<!-- Replace with your project's pipeline stage names -->
- `[stage-1]` — [description]
- `[stage-2]` — [description]
- `[stage-3]` — [description]

---

(empty — first entry will be logged on first failed run)
