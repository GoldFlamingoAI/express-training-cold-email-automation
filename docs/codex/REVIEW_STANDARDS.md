# Codex Review Standards — Claude's Rubric

What Claude checks on every Codex PR. Codex's failure mode skews toward "confidently
does too much" — this targets that specifically.

## Scope Guard (highest priority)
- Diff touches only files the task needed. Out-of-scope file = **blocker**.
- No silent refactors — every line serves the task. "While I was here" cleanup = **blocker**.
- No premature abstractions — new helpers/classes not requested = **blocker**.
- No unrequested tests/docs/config.
- No edits to `PHASES.md` (that's Claude/user territory now, not Codex's).

## Architecture Drift
**Immutable contracts** — block changes without an explicit task for it:
- `auditLog(stage, action, contactId, details, status)`
- `checkApproval(contact, settings, dailySentCount, isSuppressed)` → `{approved, failedChecks[]}`
- `scoreLead(lead, approvalThreshold)` → `{score, breakdown, approved}`
- `prepareEmailForHostinger(contact, subject, body, settings)` →
  `{success, prepared, queueRow, error}`
- `markQueueEmailSent(queueRowNumber, sentAt)` is idempotent and updates QUEUE plus CONTACTS
- Sheet tab column sets (ACTIVITY_LOG: `[timestamp, stage, action, contactId, details, status]`)

**Pure vs I/O boundary** — the core rule:
- Sheets/UrlFetchApp/PropertiesService in a pure module = **blocker**
- Any `GmailApp` call or Gmail OAuth scope = **blocker**
- `UrlFetchApp` outside the named API client modules = **blocker**

**Logging/config:**
- Non-`auditLog` production logging, or `details` passed as a non-string = **blocker**
- Secrets or PII in log `details` = **blocker**
- Hardcoded limits/thresholds/flags that should come from `SETTINGS` = **blocker**
- `SpreadsheetApp.getActiveSpreadsheet()` instead of `openById(SPREADSHEET_ID)` = **blocker** (breaks under triggers)

**Dependencies:** new OAuth scope/Advanced Service without approval = **blocker**.

## Security (always blockers)
- Hardcoded API keys/tokens/passwords, secrets logged anywhere, `.env` committed
- `.github/workflows/` modified by Codex (Claude-only)

## Quality
- Over-commenting (multi-line blocks explaining WHAT) = request changes
- Try/catch around code that can't fail = request changes
- Silent error swallowing = **blocker**
- Naming inconsistent with existing modules = request changes

## Output
**Clean:** "No issues — safe to merge."
**Issues:** list each with the exact fix Codex (or Claude, for a quick one) should make.
**Security issue:** don't hand back to Codex — Claude fixes directly via follow-up PR.
