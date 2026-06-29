# AGENTS.md — [PROJECT-NAME]

Codex reads this file at every session start. Claude Code reads it during reviews.
This file overrides any conflicting instructions in chat.

## Stack
<!-- Replace this section with your project's stack. -->
- [Runtime and version — e.g. "Node.js 22 LTS", "Python 3.12", "Go 1.22"]
- [Architecture — e.g. ARM64, x86_64, cross-platform]
- [Key libraries / frameworks]
- [External API SDKs your project will integrate]
- [Deploy context — local-only / cloud / containerized / single-user]

## File Structure
<!-- Replace with your project's actual layout. The paths below are placeholders. -->
- [entry-point file]               → orchestrator / entry point
- [feature module path A]          → [description]
- [feature module path B]          → [description]
- [shared utilities path]          → shared utilities
- [state directory]                → per-job state (gitignored)
- [logs directory]                 → structured logs (gitignored)
- docs/                            → reference docs
- docs/codex/                      → Codex workflow protocol files

## Patterns
<!-- Replace with your project's actual module conventions. -->
- Module exports: [single primary export / named exports] with a contract docblock at top
- Errors: raised with stage/operation context; the orchestrator catches and logs
- State: only via `[your state module]` — never touch state files inline
- Logs: only via `[your logger module]` — never raw print/log calls (`console.log`, `print`, `fmt.Println`, etc.)
- Concurrency: only via `[your concurrency primitive]`, configured from `.env`
- Files: only via `[your file helpers module]` — no inline filesystem calls

## Style
- Formatter: [your formatter, e.g. prettier / black / gofmt / rustfmt]
- Linter: [your linter, e.g. eslint / ruff / golangci-lint / clippy]
- Type hints: [JSDoc / TypeScript / Python type hints / etc.] on every exported function
- Imports: [your import order convention]
- Filenames: [your filename convention — e.g. snake_case.py, camelCase.ts, kebab-case folders]
- Comments: only when WHY is non-obvious. Never explain WHAT the code does.

## Never Do
- Never push to main — `codex/*` branches only, always via PR
- Never open more than 1 PR per task
- Never commit `.env` or any real secret
- Never add a dependency without the gate below
- Never make architecture decisions — flag in PHASES.md, log in NOTES.md
- Never modify `.github/workflows/` — Claude Code only
- Never use raw print/log calls — use the project logger
- Never bypass the project's state module for state writes
- Never call external services outside their wrapper modules
- Never split deviation logs across commits — NOTES.md lands with the code
- Never split error logs across commits — ERRORS.md lands with the code
- Never touch files outside the task brief's "files in scope" list
- Never add tests, docs, or config not requested in the task brief
- Never refactor "while you're in there" — out-of-scope changes block the PR
<!-- Add project-specific "Never Do" rules here -->

---

## Session Start

Output before anything else:

```
Loaded: AGENTS.md ✓  PHASES.md ✓  PLAYBOOK.md ✓  NOTES.md ✓  ERRORS.md ✓
EMERGENCY.md: [present (STOP) / absent]
Phase: [from PHASES.md]  Task: [from PHASES.md Current Task]
Last 5 PRs: [list from `git log --oneline --merges -5`]
Therefore the next incomplete task is: X.X
Ready.
```

Stop and say so if any file is missing or if the next task contradicts PHASES.md.
If contradiction: trust git history over PHASES.md and flag for Claude.

If `EMERGENCY.md` exists at the repo root, **STOP all work**. Output:

```
EMERGENCY.md is active at the repo root. No Codex work should proceed.
[contents of EMERGENCY.md]
Bring Claude in to fix AGENTS.md/PLAYBOOK.md before resuming.
```

Do not open a PR or take any other action until the user confirms EMERGENCY.md is resolved.

---

## New Dependency

Before adding any package, stop and ask in the PR description:

```
Need: [package name and version] — [reason]
Architecture/platform notes: [verify against your project's architecture]
Approve?
  y = add and tag PR with DEPS_ADDED
  n = find an alternative
```

Never install without explicit approval in the task brief or a separate review approval.

---

## Deviation Logging

Any judgment call not covered by PLAYBOOK.md → NOTES.md, same PR:

```
[YYYY-MM-DD] DEVIATION: [what and why] — [TASK_X.X]
```

Unlogged deviations Claude catches at review become EMERGENCY.md targets.

---

## Error Logging

Any caught error during testing or live runs → ERRORS.md, same PR:

```
[YYYY-MM-DD] ERROR: Stage [X] | [class] | [message]
  Tried: [fixes attempted]
  Resolved: [yes/no — if yes, how]
  Task: [TASK_X.X]
```

---

## Context — Keep It Lean

Only read files needed for the current task brief. The brief lists files in scope.
Do not read or modify files outside that list. If you think you need more, stop and update the PR description with a request.

---

## After Every Task — PR Body

Every PR must include this block at the bottom:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task      : [TASK_X.X — name]
Files     : [exact list, must match brief scope]
Confidence: [High / Medium / Low — one-line reason]
Concerns  : [deviations, errors, edge cases — None if clean]
Tests     : [added / not requested / N/A]
PR URL    : [self-reference]
Next task : [exact task from PHASES.md]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## CRITICAL RULES — Read Every Session

These 11 rules override everything else. Violating any of them blocks the PR.

**1. PR URL required.** Every TASK COMPLETE block must include the PR URL. No URL = task not complete.

**2. User merges.** Never auto-merge. After Claude review approves, pause and wait for the user's manual click-merge.

**3. Preflight on session start.** Output the Session Start banner before any other work. If git history contradicts PHASES.md, trust git and flag Claude.

**4. Update PHASES.md in same PR.** The PR that lands the code must also mark the task ✅ in PHASES.md and bump Current Task to the next incomplete one. Two changes, one PR.

**5. Never skip tasks.** Always work in strict sequential order. Before opening a PR, state in the description: "I am working on Task X.X — [name]. This is the next incomplete task." If unsure, stop and ask.

**6. One task per PR.** Each PR implements exactly one task or sub-task from PHASES.md. Multi-task PRs are blockers — split them.

**7. Explain before requesting files.** If a task requires files outside the brief's "files in scope" list, stop and update the PR description with the request and reason. Do not silently expand scope.

**8. No task chaining.** After a PR is merged, stop. Do not auto-open the next PR. Wait for user instruction or a new task brief.

**9. No silent refactors.** Any change unrelated to the stated task is out of scope, even if it looks like an improvement. Out-of-scope diffs block the PR. If you spot something worth fixing, log it in NOTES.md as a future task suggestion — do not act on it.

**10. Banned language.** Never use "blocked," "pending," "I will," "should," "approximately," "successfully," or "done" without a PR URL. Either do it now or output: "STOPPING because: [exact technical reason]."

**11. Commit message must include task number.** Every commit in the PR must end with `[TASK_X.X]`. PR title must end with `[TASK_X.X]`. Example: `feat: add module skeleton [TASK_2.1a]`.

---

## Cloud Mode (always)

- Always work on a feature branch named `codex/task-X.X-short-name`
- Always open a draft PR at the start of work; mark ready when complete
- Never commit directly to main
- Use `NEEDS_REVIEW:` markers in code for things you want Claude to inspect closely
- Use `NEEDS_WIFI_TEST:` markers for integration points that need live API calls
