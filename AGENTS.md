# AGENTS.md — Express Training Cold Email MVP

Codex reads this file at every session start. Claude Code reads it during reviews.
This file overrides any conflicting instructions in chat.

## Stack
- Runtime: Google Apps Script (V8 engine)
- Architecture: cloud-only, single-user, runs on Google's infrastructure
- Database: Google Sheets (10 named tabs — see Sheet Tabs below)
- Email: GmailApp (draft creation and thread search only — human approves and sends every email)
- Secrets: `PropertiesService.getScriptProperties()` — never sheet cells, never hardcoded
- Deploy context: Apps Script project bound to an isolated Google Workspace Business Starter account

## File Structure
- `src/Code.gs`                  → orchestrator — chains modules, exposes trigger entry points
- `src/ImportService.gs`         → imports CSV/paste data into COMPANIES tab (I/O)
- `src/Cleaner.gs`               → normalizes names, URLs, cities, job titles (pure)
- `src/Deduplicator.gs`          → prevents duplicate companies and contacts (pure)
- `src/MassachusettsFilter.gs`   → enforces MA-only scope (pure)
- `src/LeadScorer.gs`            → 100-pt scoring model, ≥75 approval gate (pure)
- `src/AuditLogger.gs`           → writes structured entries to ACTIVITY_LOG tab (I/O)
- `src/TemplateEngine.gs`        → merges approved templates with merge fields (pure)
- `src/DraftService.gs`          → creates Gmail drafts via GmailApp (I/O)
- `src/ApprovalGate.gs`          → checks all 10 pre-send conditions (pure)
- `src/ReplyMonitor.gs`          → detects replies via Gmail search + labels (I/O) [Phase 2]
- `src/BounceMonitor.gs`         → detects NDR bounces via Gmail search (I/O) [Phase 2]
- `src/SuppressionService.gs`    → reads/writes SUPPRESSION tab (I/O) [Phase 2]
- `src/FollowUpScheduler.gs`     → identifies contacts eligible for follow-up (I/O) [Phase 2]
- `src/DashboardService.gs`      → calculates metrics, writes DASHBOARD tab (I/O) [Phase 2]
- `src/ZeroBounceClient.gs`      → ZeroBounce API wrapper via UrlFetchApp (I/O) [Phase 3]
- `src/ApolloClient.gs`          → Apollo API wrapper via UrlFetchApp (I/O) [Phase 3]
- `src/HunterClient.gs`          → Hunter API wrapper via UrlFetchApp (I/O) [Phase 3]
- `appsscript.json`              → Apps Script manifest (OAuth scopes, runtime version)
- `PROPERTIES.example`           → documents all required PropertiesService keys (no real values)
- `docs/`                        → reference docs
- `docs/codex/`                  → Codex workflow protocol files

## Sheet Tabs (the Sheets file IS the state layer)
- `SETTINGS`           — campaign settings, sending limits, template versions, flags (incl. DRAFT_ONLY)
- `COMPANIES`          — source Massachusetts business records
- `CONTACTS`           — contact names, titles, LinkedIn, emails, status, scores
- `CAMPAIGNS`          — campaign and email-sequence configuration
- `QUEUE`              — contacts currently eligible for drafting or follow-up
- `SUPPRESSION`        — opt-outs, bounces, negative replies, exclusions
- `ACTIVITY_LOG`       — every enrichment, draft, send, reply, and error (AuditLogger writes here only)
- `DASHBOARD`          — campaign metrics (DashboardService writes here only)
- `TEMPLATES`          — approved static email templates (human-maintained)
- `PLAYBOOK_REQUESTS`  — contacts who requested the free AI Tactical Playbook

## Patterns

### Pure vs I/O — the central module rule
Every module is either **pure** or **I/O**. Never mix.

**Pure modules** (Cleaner, Deduplicator, MassachusettsFilter, LeadScorer, TemplateEngine, ApprovalGate):
- Accept data as function arguments, return transformed data or a result object
- Never read from or write to Sheets, GmailApp, PropertiesService, or UrlFetchApp
- No side effects of any kind

**I/O modules** (ImportService, DraftService, AuditLogger, ReplyMonitor, BounceMonitor, SuppressionService, FollowUpScheduler, DashboardService, ZeroBounceClient, ApolloClient, HunterClient):
- Are the only modules that touch Sheets, GmailApp, UrlFetchApp, or PropertiesService
- Each I/O module owns one interaction surface (e.g., DraftService owns GmailApp draft creation)

**Orchestrator** (`Code.gs`):
- Reads data from Sheets, passes it through pure modules, hands result to I/O modules
- Contains no business logic itself — it only chains modules in sequence

### Logging
- All production logging via `auditLog(stage, action, contactId, details, status)` in `AuditLogger.gs`
- `Logger.log()` is allowed only for temporary local debug — must be removed before PR is marked ready
- `console.log()` is forbidden — not available in Apps Script V8 runtime

### Secrets
- API keys and tokens only via `PropertiesService.getScriptProperties().getProperty('KEY_NAME')`
- Never hardcoded in any `.gs` file
- Never stored in sheet cells
- All required keys documented in `PROPERTIES.example` with placeholder values

### Configurable limits and thresholds
- Daily email limits read from `SETTINGS` tab at runtime — never hardcoded
- Lead score approval gate (≥75) read from `SETTINGS` tab — never hardcoded
- Max follow-ups (3) read from `SETTINGS` tab — never hardcoded
- `DRAFT_ONLY` flag read from `SETTINGS` tab — never hardcoded

### Gmail interaction
- Draft creation: only via `DraftService.createDraft()` — no `GmailApp` calls in other modules
- Thread/reply search: only via `GmailApp.search()` in `ReplyMonitor.gs` and `BounceMonitor.gs`
- Label operations: only within the relevant monitor module
- `DRAFT_ONLY` mode: when `true` in SETTINGS, DraftService creates the draft and stops — never auto-sends

### External API calls
- ZeroBounce: only via `ZeroBounceClient.verify(email)` — never inline `UrlFetchApp`
- Apollo: only via `ApolloClient.*` functions
- Hunter: only via `HunterClient.*` functions
- `UrlFetchApp` is allowed only inside the three named client modules above

## Style
- Language: JavaScript (Apps Script V8 — ES2019, no module system, all files share global scope)
- Filenames: PascalCase `.gs` (e.g., `ImportService.gs`, `AuditLogger.gs`)
- Functions: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- JSDoc required on every top-level (exported) function — one-line description + `@param` + `@returns`
- Comments: only when WHY is non-obvious. Never explain what the code does.
- No `var` — use `const` and `let`
- No unused variables
- Error handling: every `catch` block must call `auditLog()` with stage context — silent catch is a blocker

## Never Do
- Never push to main — `codex/*` branches only, always via PR
- Never open more than 1 PR per task
- Never commit any API key or real credential
- Never add a new Google service scope to `appsscript.json` without the dependency gate below
- Never make architecture decisions — flag in PHASES.md, log in NOTES.md
- Never modify `.github/workflows/` — Claude Code only
- Never use `console.log()` — not available in Apps Script V8
- Never leave `Logger.log()` debug calls in code when marking a PR ready
- Never write to Sheets directly from a pure module
- Never call `GmailApp` outside of `DraftService.gs`, `ReplyMonitor.gs`, or `BounceMonitor.gs`
- Never call `UrlFetchApp` outside of `ZeroBounceClient.gs`, `ApolloClient.gs`, or `HunterClient.gs`
- Never hardcode sending limits, score thresholds, or daily caps — all must come from SETTINGS tab
- Never store secrets in sheet cells or hardcode in `.gs` files — use `PropertiesService`
- Never split deviation logs across commits — NOTES.md lands with the code
- Never split error logs across commits — ERRORS.md lands with the code
- Never touch files outside the task brief's "files in scope" list
- Never add tests, docs, or config not requested in the task brief
- Never refactor "while you're in there" — out-of-scope changes block the PR
- Never call Phase 3 client modules (ZeroBounceClient, ApolloClient, HunterClient) from Phase 1 or Phase 2 code — they are opt-in at Phase 3 only

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

For Apps Script, a "dependency" means enabling a new OAuth scope in `appsscript.json`
or adding a new Advanced Google Service. Before adding either, stop and ask in the PR description:

```
Need: [scope or service name] — [reason]
Impact: [what new capability this grants]
Approve?
  y = add and tag PR with DEPS_ADDED
  n = find an alternative
```

Never add a new scope without explicit approval in the task brief.

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

**4. Update PHASES.md in same PR.** The PR that lands the code must also mark the task ✅ in PHASES.md by flipping exactly one checkbox (`- [ ]` → `- [x]`) on that task's line. That is the ONLY PHASES.md edit. There is no "Current Task" pointer to bump — the current task is the first unchecked box. Do not add, reorder, or duplicate task lines.

**5. Never skip tasks.** Always work in strict sequential order. Before opening a PR, state in the description: "I am working on Task X.X — [name]. This is the next incomplete task." If unsure, stop and ask.

**6. One task per PR. One open PR at a time.** Each PR implements exactly one task or sub-task from PHASES.md. Multi-task PRs are blockers — split them. Never open a second PR while one is still open; finish and merge the current task first. Each session starts from fresh `main` (`git fetch origin main && git checkout -B codex/task-X.X-short-name origin/main`) so you are never behind. A PR whose title lists several modules (e.g. "scaffold and core Phase 1 modules: import, cleaner, dedupe…") is a multi-task PR — STOP and split it.

**7. Explain before requesting files.** If a task requires files outside the brief's "files in scope" list, stop and update the PR description with the request and reason. Do not silently expand scope.

**8. No task chaining.** After a PR is merged, stop. Do not auto-open the next PR. Wait for user instruction or a new task brief.

**9. No silent refactors.** Any change unrelated to the stated task is out of scope, even if it looks like an improvement. Out-of-scope diffs block the PR. If you spot something worth fixing, log it in NOTES.md as a future task suggestion — do not act on it.

**10. Banned language.** Never use "blocked," "pending," "I will," "should," "approximately," "successfully," or "done" without a PR URL. Either do it now or output: "STOPPING because: [exact technical reason]."

**11. Commit and PR title must end with the task tag.** Every commit in the PR AND the PR title must end with `[TASK_X.X]`. This is mechanically enforced by CI — a title without the tag fails the build.

PR title format — exactly this shape, one task only:

```
<type>: <short summary> [TASK_X.X]
```

- ✅ `feat: add AuditLogger module [TASK_1.2]`
- ✅ `fix: correct LeadScorer threshold read [TASK_1.7]`
- ❌ `Project scaffold and core Phase 1 modules: import, cleaner, dedupe, scoring, template, audit, MA filter` — no tag AND bundles many tasks. This exact style has failed CI. Never produce it.

If you cannot write a single `[TASK_X.X]` tag for the title, the PR contains more than one task — split it (rule 6).

---

## Merge Conflicts — PHASES.md (read every session)

PHASES.md conflicts have wrecked past PRs. The cause: PRs that start behind
`main` and then get resolved with "Accept both changes," which stacks
duplicate task lines and pointers. Prevent it:

1. **Start current.** Branch from fresh `origin/main` every session (rule 6). A
   PR that never fell behind rarely conflicts.
2. **If PHASES.md still conflicts, NEVER choose "Accept both changes."** That is
   what produced the stacked/duplicated task lists. Instead:
   - Take `main`'s version of PHASES.md wholesale.
   - Re-apply only your single change: flip your one task's checkbox `- [ ]` → `- [x]`.
   - Confirm the task list has each task exactly once and no `<<<<<<<`, `=======`,
     or `>>>>>>>` markers remain.
3. **Any other file conflict** you cannot resolve cleanly → STOP and hand to Claude.
   Do not guess. Do not "accept both."

CI blocks the merge if PHASES.md contains conflict markers or duplicate task
lines, so a bad resolution will fail the build — fix it before marking ready.

---

## Cloud Mode (always)

- Always work on a feature branch named `codex/task-X.X-short-name`
- Always open a draft PR at the start of work; mark ready when complete
- Never commit directly to main
- Use `NEEDS_REVIEW:` markers in code for things you want Claude to inspect closely
- Use `NEEDS_WIFI_TEST:` markers for integration points that need live API calls (Gmail, ZeroBounce, etc.)
