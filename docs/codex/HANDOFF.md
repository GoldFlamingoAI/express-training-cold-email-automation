# Codex Handoff — Task Brief Protocol

This file defines the exact format for handing a task to Codex.
Claude Code (or the user) writes the brief; Codex receives it and works only within its bounds.

A brief that does not match this format should be rejected by Codex with a request for clarification.

---

## Brief Template

```
TASK BRIEF — [TASK_X.X]

Goal:
[One sentence describing what the task delivers.]

Files in scope:
- [path/to/file1]
- [path/to/file2]
(Use file paths and extensions for your project's stack.
 PHASES.md is always implicitly in scope for the rule 4 update.)

Files explicitly out of scope:
- [any file that might seem related but should not be touched]

Acceptance criteria:
- [Concrete, testable outcome 1]
- [Concrete, testable outcome 2]
- [Concrete, testable outcome 3]

Architecture constraints:
- [Any module pattern that must be followed]
- [Any contract that must be preserved]

Deviation policy:
- [What to do if the brief is ambiguous: stop and ask vs. log in NOTES.md and proceed]

Dependencies:
- [Any new package/dependency needed — pre-approved version]
- "None expected" if nothing new

PR title format:
[type]: [short description] [TASK_X.X]
e.g. "feat: add logger module skeleton [TASK_1.2]"

Branch name:
codex/task-X.X-[short-name]
```

---

## Example: Filled Brief

> The example below uses generic file paths. Substitute extensions, module
> conventions, and dependency syntax for your project's stack.

```
TASK BRIEF — [TASK_1.2]

Goal:
Create the project's structured logger module — a singleton that writes
JSON lines to the project's log file.

Files in scope:
- [logger module path] (new file)

Files explicitly out of scope:
- [entry-point file] (not wired until Task 1.5)
- [dependency manifest] (no new deps — the chosen logger library is already installed)

Acceptance criteria:
- Module exports a single factory function: getLogger()
- getLogger() returns the same logger instance on every call (singleton)
- Reads LOG_LEVEL from environment (default: 'info')
- Writes to the project's log file as JSON lines
- Creates the log directory if missing
- Type/contract docblock on the exported function
- No raw print/log calls anywhere in the file

Architecture constraints:
- The chosen logger library is the only logger allowed — no alternative loggers, no raw print
- LOG_LEVEL must come from environment, never hardcoded
- Singleton pattern: instantiate once, return the cached instance on repeat calls

Deviation policy:
- If the chosen logger's transport API differs from expected, log the deviation
  in NOTES.md and use the closest equivalent — do not add a second logging library.

Dependencies:
- None expected. Logger library is already in the manifest.

PR title format:
feat: implement logger singleton [TASK_1.2]

Branch name:
codex/task-1.2-logger
```

---

## Anti-Patterns in Briefs (avoid)

- Vague goals: "Improve the logger module" → blocked, no acceptance criteria possible
- Open-ended scope: "Files in scope: src/" → blocked, must be specific paths
- Compound tasks: "Add logger and state module" → split into two briefs (1.2, 1.3)
- Missing PR title format → Codex will guess and risk missing the [TASK_X.X] tag

---

## How Claude Generates a Brief

1. Read PHASES.md → find Current Task
2. Read PLAYBOOK.md → find phase-specific recipe for that task
3. Read AGENTS.md → confirm constraints
4. Fill the template above
5. Hand to Codex via the Codex GitHub interface or chat
6. Wait for the draft PR; review per `REVIEW_STANDARDS.md`
