# AGENTS.md — Express Training Cold Email MVP

Codex reads this file at every session start. Claude Code reads it during reviews.

## Stack
- Runtime: Google Apps Script (V8 engine)
- Architecture: cloud-only, single-user, runs on Google's infrastructure
- Database: Google Sheets (10 named tabs — see Sheet Tabs below)
- Email: Hostinger Webmail (human sends every email); Apps Script prepares QUEUE subject/body only
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
TemplateEngine, ApprovalGate) or I/O (the only modules touching Sheets/
UrlFetchApp/PropertiesService). Never mix.

- Email preparation: `DraftService.gs` writes approved subject/body content to `QUEUE`; it never
  sends mail or creates provider drafts. `CampaignStateService.gs` records manual Hostinger sends,
  replies, bounces, and opt-outs. `ReplyMonitor.gs`/`BounceMonitor.gs` are compatibility no-ops.
- No `GmailApp` calls or Gmail OAuth scopes. Direct Hostinger SMTP/IMAP access requires an external
  HTTPS bridge and is outside the current manual-send MVP.
- External APIs (ZeroBounce/Apollo/Hunter/Gemini): only via their named client module, never
  inline `UrlFetchApp`. Don't call Phase 3 clients from Phase 1/2 code. One named exception:
  `PersonalizationDraftService.gs` fetches company websites directly (it is the site-fetch
  module, not an API wrapper).
- Logging: all production logging via `auditLog(stage, action, contactId, details, status)`
  — `details` must be a string (use `JSON.stringify` for objects). No `console.log`
  (unavailable in V8). No leftover `Logger.log` debug calls when a PR is ready.
- Config: daily limits and score thresholds — always read from `SETTINGS`,
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
- **Picking your task — verify, skip, advance.** Take the first unchecked `- [ ]` task in
  PHASES.md (skip 🏠 and CHECKPOINT lines). Before writing anything, check whether that
  task's file(s) already exist in your checkout with a real implementation (not
  empty/stub). If they do, the roadmap is stale — that task is already done. **Do not
  regenerate the file, and do not stop entirely: move on to the next unchecked task and
  repeat the check.** Implement the first task whose file is genuinely missing or
  incomplete. In your PR description, list any already-done tasks you skipped so the
  maintainer can check them off. If EVERY unchecked task turns out to be already
  implemented, make no changes and report exactly that.
- One task per PR. Stay strictly inside the task's file scope — only the file(s) the task
  names. No unrequested tests, docs, or refactors. (Sprawling across many files is what
  caused past merge disasters — keep it tight.)
- **PHASES.md — exactly one edit allowed, nothing else.** On the line for the task you
  implemented, flip `- [ ]` → `- [x]` and change `🤖` → `🫡` (built by Codex, pending
  Claude review — do NOT write `✅`, that's Claude's mark after review). Do not touch any
  other line: no "Current Task" pointer, no other task's checkbox, no reordering. This is
  the one exception to leaving PHASES.md alone — it exists so the roadmap can't go stale
  again (a stale roadmap deadlocked Tasks 2.3/2.5 previously).
- Don't push to `main` or modify `.github/workflows/` (Claude-only).
- Don't add a new OAuth scope / Advanced Service without approval — ask in the PR body.
- Note any real judgment call in `NOTES.md` in the same PR (optional, helpful).

## Environment note
Container Caching is Off, so every task starts from a fresh clone of current `main` —
you never need to fetch or check freshness yourself. A missing/broken `origin` remote or
a "work" branch is a known, harmless Codex Cloud sandbox quirk (platform opens the PR
from your changes regardless) — ignore it and proceed with the task.
