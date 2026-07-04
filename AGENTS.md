# AGENTS.md — Express Training Cold Email MVP

Codex reads this file at every session start. Claude Code reads it during reviews.

## Stack
- Runtime: Google Apps Script (V8 engine)
- Architecture: cloud-only, single-user, runs on Google's infrastructure
- Database: Google Sheets (10 named tabs — see Sheet Tabs below)
- Email: GmailApp (draft creation and thread search only — human approves and sends every email)
- Secrets: `PropertiesService.getScriptProperties()` — never sheet cells, never hardcoded

## File Structure
- `src/Code.gs` — orchestrator: chains modules, exposes trigger entry points, no business logic
- `src/*.gs` — one module per concern; see Sheet Tabs below for state
- `PROPERTIES.example` — documents required PropertiesService keys (no real values)

## Sheet Tabs (the Sheets file IS the state layer)
`SETTINGS`, `COMPANIES`, `CONTACTS`, `CAMPAIGNS`, `QUEUE`, `SUPPRESSION`, `ACTIVITY_LOG`
(AuditLogger writes here only), `DASHBOARD`, `TEMPLATES`, `PLAYBOOK_REQUESTS`.

## Patterns

**Pure vs I/O — the central rule.** Every module is either pure (accepts args, returns a
result, zero side effects — Cleaner, Deduplicator, MassachusettsFilter, LeadScorer,
TemplateEngine, ApprovalGate) or I/O (the only modules touching Sheets/GmailApp/
UrlFetchApp/PropertiesService). Never mix.

- Gmail: draft creation only via `DraftService.createDraft()`; thread/reply search only
  in `ReplyMonitor.gs` / `BounceMonitor.gs`. No `GmailApp` calls anywhere else.
- External APIs (ZeroBounce/Apollo/Hunter): only via their named client module, never
  inline `UrlFetchApp`. Don't call Phase 3 clients from Phase 1/2 code.
- Logging: all production logging via `auditLog(stage, action, contactId, details, status)`
  — `details` must be a string (use `JSON.stringify` for objects). No `console.log`
  (unavailable in V8). No leftover `Logger.log` debug calls when a PR is ready.
- Config: daily limits, score thresholds, `DRAFT_ONLY` — always read from `SETTINGS`,
  never hardcoded.
- Secrets: `PropertiesService` only, documented in `PROPERTIES.example`. Never hardcoded,
  never in sheet cells.
- Sheet access: use `SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'))`
  — never `getActiveSpreadsheet()` (breaks under time-based triggers).

## Style
JavaScript ES2019 (no modules, shared global scope). PascalCase filenames, camelCase
functions, SCREAMING_SNAKE_CASE constants. JSDoc on every top-level function. `const`/`let`
only. Comments only when WHY is non-obvious. Every `catch` calls `auditLog()` with stage
context — silent catch is a blocker.

## Working Rules
- One task per PR, one PR open at a time.
- Branch: `codex/task-X.X-short-name`.
- Do not edit `PHASES.md` — it's the roadmap, kept current by Claude/the user from the
  merged PR list. Every branch editing it was the #1 source of merge conflicts.
- Never push to `main` directly. Never modify `.github/workflows/` (Claude-only).
- Never add a new OAuth scope/Advanced Service without approval — ask in the PR description.
- Stay inside the task's file scope. No unrequested tests/docs/refactors.
- Log real judgment calls in `NOTES.md`, same PR. Log real errors in `ERRORS.md`, same PR.
- User merges — never auto-merge.

## Environment note
The Codex cloud environment's maintenance script re-syncs to `origin/main` on every task,
so you always start current. If a task ever reports it's on a stale base or has no git
remote, stop and flag it — don't push forward on an old snapshot.
