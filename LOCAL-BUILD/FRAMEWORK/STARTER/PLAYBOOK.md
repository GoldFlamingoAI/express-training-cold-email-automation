# Playbook — <Project Name>

Task recipes for Aider. Current phase only — Claude strips completed
phases and loads next phase recipes at each PHASE_READY audit.
Follow these exactly — don't improvise the structure.

---

## Adding a [Core Feature Type]
1. Step one
2. Step two
3. Step three
4. Update ARCHITECTURE.md change log
5. Commit as `feat(scope): description` + REVIEW_REQUESTED if needed

---

## Adding a [Second Feature Type]
1. Step one
2. Step two
3. Update ARCHITECTURE.md change log

---

## Bug Fix Process
1. Reproduce: write a failing test first
2. Fix the code
3. Confirm test passes
4. Commit as `fix(scope): description`
5. If fix touches >3 files: add REVIEW_REQUESTED

---

## When Stuck (BLOCKED Protocol)
1. Try 2 different approaches
2. If both fail: commit current state with BLOCKED signal
3. Tell the user exactly:

```
I'm stuck on [specific problem].

Tried:
  1. [approach one and why it failed]
  2. [approach two and why it failed]

Push this branch to GitHub, then bring Claude in and say:
  "Aider is BLOCKED on [problem]. Branch: [branch-name].
   Tried [approach 1] and [approach 2]. Please unblock."

Run:
  git push origin [current-branch-name]
```

4. Stop — do not attempt a third approach

---

## After Every Task — Push Prompt (Always Run This)

This is the final step of every recipe without exception.

1. Confirm the commit is clean (`git status` shows nothing uncommitted)
2. Confirm NOTES.md is committed if any deviations were logged this task
3. Show the user this prompt:

```
Task complete. Files staged for push:
  - [code file(s) changed]
  - NOTES.md (if updated)

Push to GitHub?
  y = push now
  n = keep working locally

If y, run:
  git push origin [current-branch-name]

If this task is REVIEW_REQUESTED, also open a PR:
  gh pr create --title "[task description]" --base main
```

---

## When a Phase Is Complete

When the last task in the current phase is checked off in PHASES.md,
tell the user:

```
Phase [X] is complete — all tasks done.

Push this branch, then bring Claude in and say:
  "PHASE_READY — please audit Phase [X] on branch [branch-name]"

Run:
  git push origin [current-branch-name]
```

Do not start the next phase until Claude signals the audit passed.

---

## What Never Needs a Recipe
- Formatting / style changes → just do it, commit as `style:`
- Docstring updates → just do it, commit as `docs:`
- Test additions → just do it, commit as `test:`
