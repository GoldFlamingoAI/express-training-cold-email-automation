<!-- Codex must fill this in the PR body before requesting review. -->

## Task
- Task ID: [TASK_X.X]
- Task name: [from PHASES.md]
- Branch: codex/task-X.X-[short-name]

## Files Touched
List every file in the diff. Must match the brief's "files in scope."

- [ ] [path/to/file] — [why]

## Acceptance Criteria
Copy from brief and check off each.

- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Constraint Checks
<!-- Adjust these to match your project's architecture contracts -->
- [ ] No raw print/log statements outside the project logger (`console.log`, `print`, `fmt.Println`, etc.)
- [ ] No inline file system calls outside the designated file helper module
- [ ] No state writes outside the designated state module
- [ ] No external service calls outside their wrapper module
- [ ] No new dependencies (or: approved in brief — tag PR with DEPS_ADDED)
- [ ] No changes to immutable interfaces or core data schemas
- [ ] PHASES.md updated: Task X.X marked ✅, Current Task bumped to X.Y

## Deviations
- [None / list each deviation, also logged in NOTES.md in this PR]

## Errors Encountered
- [None / list each, also logged in ERRORS.md in this PR]

## NEEDS_REVIEW Markers
List any `NEEDS_REVIEW:` comments in the diff for Claude to inspect.

- [None / file:line — what to inspect]

## NEEDS_WIFI_TEST Markers
List integration points that need live API testing before phase signoff.

- [None / file:line — what to test]

---

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task      : [TASK_X.X — name]
Files     : [exact list]
Confidence: [High / Medium / Low — one-line reason]
Concerns  : [None / list]
Tests     : [added / not requested / N/A]
PR URL    : [self]
Next task : [from PHASES.md]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
