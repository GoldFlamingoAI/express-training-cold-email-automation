# Playbook — Express Training Cold Email MVP

Task recipes for Codex. **Phase 1 only** — Claude strips completed phases
and loads the next phase's recipes at each PHASE_READY audit.

Follow these exactly — don't improvise structure.

---

## Phase 1 Recipes

### R1.1 — Project Scaffold

Goal: Create the Apps Script manifest, the orchestrator skeleton, and the PropertiesService key documentation. No business logic yet — skeleton only.

1. Create `appsscript.json` with:
   - `"runtimeVersion": "V8"`
   - `"timeZone": "America/New_York"`
   - Required OAuth scopes: `spreadsheets`, `gmail.compose`, `script.external_request`
   - No Advanced Services yet
2. Create `src/Code.gs` as a skeleton with:
   - A top-level JSDoc block naming all modules and their roles
   - Three empty stub functions: `runImportPipeline()`, `runDraftPipeline()`, `runFullPipeline()`
   - A placeholder comment in each stub: `// TODO: wire modules in TaskX.X`
   - No actual implementation yet
3. Create `PROPERTIES.example` listing every `PropertiesService` key the project will use, with placeholder values:
   - `ZEROBOUNCE_API_KEY=your_key_here`
   - `APOLLO_API_KEY=your_key_here`
   - `HUNTER_API_KEY=your_key_here`
   - `SPREADSHEET_ID=your_sheet_id_here`
4. Commit as `feat(scaffold): add appsscript.json, Code.gs skeleton, PROPERTIES.example [TASK_1.1]`
5. Second commit: mark Task 1.1 ✅ in PHASES.md, bump Current Task to 1.2
6. Mark PR ready for review

Out of scope: any business logic, any module beyond Code.gs, any sheet-structure code.

---

### R1.2 — AuditLogger Module

Goal: Build the single logging module that every other module will call. Must be ready before any I/O module is built.

1. Create `src/AuditLogger.gs` with one exported function:
   ```
   /**
    * Writes one structured log entry to the ACTIVITY_LOG tab.
    * @param {string} stage - Calling module name (e.g. 'ImportService')
    * @param {string} action - What happened (e.g. 'IMPORT', 'DRAFT_CREATED', 'ERROR')
    * @param {string} contactId - Row ID from CONTACTS tab, or '' if not contact-specific
    * @param {string} details - Human-readable detail string
    * @param {string} status - 'OK' | 'ERROR' | 'SKIP' | 'WARN'
    * @returns {void}
    */
   function auditLog(stage, action, contactId, details, status) { ... }
   ```
2. Implementation: open ACTIVITY_LOG tab by name, append one row with: `[timestamp, stage, action, contactId, details, status]`
3. Read `SPREADSHEET_ID` from `PropertiesService` to open the sheet — never hardcode the ID
4. Wrap the sheet write in try/catch — on failure, fall back to `Logger.log()` with the same data (do NOT re-throw, as logging must never crash the caller)
5. No other functions in this file
6. Commit as `feat(logger): add AuditLogger module [TASK_1.2]`
7. Second commit: mark Task 1.2 ✅ in PHASES.md, bump Current Task to 1.3
8. Mark PR ready for review

Out of scope: reading from any tab, any business logic, any other module.

---

### R1.3 — ImportService Module

Goal: Read a 2D array of raw company rows (from CSV paste or manual input) and write valid rows to the COMPANIES tab.

1. Create `src/ImportService.gs` with one exported function:
   ```
   /**
    * Imports an array of raw company rows into the COMPANIES tab.
    * Skips rows that fail basic validation (empty company name or website).
    * @param {Array<Array<string>>} rows - Raw rows: [company, website, industry, city, state, employeeSize, sourceUrl, wtfpRelevance]
    * @returns {{imported: number, skipped: number}}
    */
   function importCompanies(rows) { ... }
   ```
2. Implementation:
   - Validate each row (non-empty company name AND website) — skip invalid rows with a SKIP audit log entry
   - Write valid rows to the COMPANIES tab (append after last row)
   - Call `auditLog('ImportService', 'IMPORT', '', 'Imported X rows, skipped Y', 'OK')` after completion
   - Wrap all sheet operations in try/catch — on error call `auditLog(..., 'ERROR')` and re-throw
3. Read `SPREADSHEET_ID` from `PropertiesService`
4. No deduplication in this module — that is Deduplicator's job
5. No normalization in this module — that is Cleaner's job
6. Commit as `feat(import): add ImportService module [TASK_1.3]`
7. Second commit: mark Task 1.3 ✅ in PHASES.md, bump Current Task to 1.4
8. Mark PR ready for review

Out of scope: reading CONTACTS tab, any filtering, any normalization.

---

### R1.4 — Cleaner Module

Goal: Provide pure normalization functions for company and contact data. No sheet access.

1. Create `src/Cleaner.gs` with two exported functions:
   ```
   /**
    * Normalizes fields on a raw company object.
    * @param {{company: string, website: string, industry: string, city: string, state: string, employeeSize: string, sourceUrl: string, wtfpRelevance: string}} raw
    * @returns {Object} Cleaned company object with same shape
    */
   function cleanCompany(raw) { ... }

   /**
    * Normalizes fields on a raw contact object.
    * @param {{name: string, title: string, email: string, linkedinUrl: string}} raw
    * @returns {Object} Cleaned contact object with same shape
    */
   function cleanContact(raw) { ... }
   ```
2. `cleanCompany`: trim whitespace on all fields; lowercase and strip protocol from website (`https://www.example.com` → `example.com`); title-case company name and city; uppercase state abbreviation
3. `cleanContact`: trim whitespace; title-case name; normalize job title (trim + title-case); lowercase email
4. Both functions are pure — no `auditLog` calls, no sheet access, no `PropertiesService`
5. Commit as `feat(clean): add Cleaner module [TASK_1.4]`
6. Second commit: mark Task 1.4 ✅ in PHASES.md, bump Current Task to 1.5
7. Mark PR ready for review

Out of scope: validation, deduplication, any I/O.

---

### R1.5 — Deduplicator Module

Goal: Provide pure duplicate-check functions. Caller supplies the existing-values arrays — no sheet access in this module.

1. Create `src/Deduplicator.gs` with two exported functions:
   ```
   /**
    * Returns true if the normalized domain already exists in the provided list.
    * PURE — caller reads existing domains from sheet and passes them in.
    * @param {string} domain - Normalized company domain (e.g. 'example.com')
    * @param {string[]} existingDomains - Domains already in COMPANIES tab
    * @returns {boolean}
    */
   function isDuplicateCompany(domain, existingDomains) { ... }

   /**
    * Returns true if the normalized email already exists in the provided list.
    * PURE — caller reads existing emails from sheet and passes them in.
    * @param {string} email - Normalized contact email
    * @param {string[]} existingEmails - Emails already in CONTACTS tab
    * @returns {boolean}
    */
   function isDuplicateContact(email, existingEmails) { ... }
   ```
2. Both functions: normalize input before comparison (lowercase, trim) — comparison is always case-insensitive
3. Both functions are pure — no sheet access, no `auditLog`
4. Commit as `feat(dedup): add Deduplicator module [TASK_1.5]`
5. Second commit: mark Task 1.5 ✅ in PHASES.md, bump Current Task to 1.6
6. Mark PR ready for review

Out of scope: reading from any sheet, any logging, any normalization beyond what's needed for comparison.

---

### R1.6 — MassachusettsFilter Module

Goal: Provide a pure function that confirms a company is in Massachusetts.

1. Create `src/MassachusettsFilter.gs` with one exported function:
   ```
   /**
    * Returns true if the company's location fields confirm Massachusetts.
    * Checks state field first; falls back to city cross-check using a known MA city list.
    * PURE — no sheet access.
    * @param {string} state - Normalized state field (e.g. 'MA', 'Massachusetts')
    * @param {string} city - Normalized city field (used as fallback check)
    * @returns {boolean}
    */
   function isMassachusetts(state, city) { ... }
   ```
2. Accept: 'MA', 'ma', 'Massachusetts', 'massachusetts', 'MASSACHUSETTS'
3. If state field is empty or ambiguous, cross-check city against a hardcoded list of 20 well-known MA cities (Boston, Worcester, Springfield, Lowell, Cambridge, New Bedford, Brockton, Quincy, Lynn, Fall River, Newton, Somerville, Lawrence, Framingham, Waltham, Haverhill, Malden, Medford, Taunton, Chicopee)
4. If both state and city are inconclusive, return `false` — do not guess
5. PURE — no sheet access, no `auditLog`, no `PropertiesService`
6. Commit as `feat(filter): add MassachusettsFilter module [TASK_1.6]`
7. Second commit: mark Task 1.6 ✅ in PHASES.md, bump Current Task to 1.7
8. Mark PR ready for review

Out of scope: any I/O, any API calls, any normalization beyond what the function needs internally.

---

### R1.7 — LeadScorer Module

Goal: Implement the 100-point scoring model from the spec. Pure function — no sheet access.

1. Create `src/LeadScorer.gs` with one exported function:
   ```
   /**
    * Scores a lead on a 100-point scale per the campaign scoring model.
    * PURE — no sheet access. All data passed in by caller.
    * @param {{maConfirmed: boolean, relevantRole: boolean, validEmail: boolean, wtfpRelevance: boolean, employeeSizeFit: boolean, industryFit: boolean, hasPersonalizationFact: boolean}} lead
    * @returns {{score: number, breakdown: Object, approved: boolean}}
    */
   function scoreLead(lead) { ... }
   ```
2. Implement the 100-pt model exactly as specified:
   - Massachusetts confirmed: 20 pts
   - Relevant decision-maker role: 20 pts
   - Valid business email: 20 pts
   - Prior training/WTFP relevance: 15 pts
   - Employee-size fit: 10 pts
   - Industry fit: 10 pts
   - Source-backed personalization fact available: 5 pts
3. `approved`: `true` if score ≥ the approval threshold; read the threshold from the `settings` parameter passed in by the caller — NOT hardcoded, NOT from PropertiesService directly in this module
   ```
   /**
    * @param {Object} lead
    * @param {number} approvalThreshold - Read from SETTINGS tab by caller (default 75)
    */
   function scoreLead(lead, approvalThreshold) { ... }
   ```
4. `breakdown`: an object with each factor name and points awarded (for ACTIVITY_LOG detail)
5. PURE — no sheet access, no `auditLog`, no `PropertiesService`
6. Commit as `feat(scorer): add LeadScorer module [TASK_1.7]`
7. Second commit: mark Task 1.7 ✅ in PHASES.md, bump Current Task to 1.8
8. Mark PR ready for review

Out of scope: any I/O, reading SETTINGS tab (caller does that), any campaign logic.

---

### R1.8 — TemplateEngine Module

Goal: Merge an approved static email template with contact-specific merge fields. Pure function.

1. Create `src/TemplateEngine.gs` with one exported function:
   ```
   /**
    * Merges a static email template string with contact merge field values.
    * PURE — template string and fields provided by caller (read from TEMPLATES tab by orchestrator).
    * Placeholders in template use {{fieldName}} syntax.
    * @param {string} template - Raw template body with {{fieldName}} placeholders
    * @param {{firstName: string, company: string, personalizationLine: string, senderName: string}} fields
    * @returns {string} Merged email body, plain text
    */
   function mergeTemplate(template, fields) { ... }
   ```
2. Replace all `{{fieldName}}` occurrences in the template string with the corresponding value from `fields`
3. If a placeholder has no matching field, leave it as-is and do NOT throw — the ApprovalGate will catch missing required fields
4. Return plain text — no HTML, no styling
5. PURE — no sheet access, no `auditLog`, no external calls
6. Commit as `feat(template): add TemplateEngine module [TASK_1.8]`
7. Second commit: mark Task 1.8 ✅ in PHASES.md, bump Current Task to 1.9
8. Mark PR ready for review

Out of scope: reading TEMPLATES tab (caller does that), subject line generation, any I/O.

---

### R1.9 — ApprovalGate Module

Goal: Enforce all 10 pre-send conditions before a draft may be created. Pure function — returns a result object, never writes to sheet.

1. Create `src/ApprovalGate.gs` with one exported function:
   ```
   /**
    * Checks all pre-send conditions before a Gmail draft may be created.
    * PURE — all required data passed in by caller.
    * @param {Object} contact - Full contact record from CONTACTS tab
    * @param {Object} settings - Campaign settings from SETTINGS tab (includes dailyLimit, draftOnly flag, etc.)
    * @param {number} dailySentCount - Number of campaign emails sent today (read by caller from ACTIVITY_LOG)
    * @param {boolean} isSuppressed - Result of suppression check (caller checks before calling this)
    * @returns {{approved: boolean, failedChecks: string[]}}
    */
   function checkApproval(contact, settings, dailySentCount, isSuppressed) { ... }
   ```
2. Check all 10 conditions (from spec §7) and collect failures:
   - Company is in Massachusetts (`contact.maConfirmed === true`)
   - Contact has a relevant business role (`contact.roleIsRelevant === true`)
   - Email uses a business domain (not gmail/yahoo/icloud/hotmail)
   - Email passed final verification (`contact.verificationResult === 'valid'`)
   - Email is not catch-all (`contact.catchAll !== true`)
   - Contact is not suppressed (`isSuppressed === false`)
   - Contact has not already replied (`contact.status !== 'REPLIED'`)
   - Contact has not already received this campaign (`contact.emailsSent < 1` for Email 1)
   - Required personalization fields are present (`contact.personalizationLine` is non-empty)
   - Daily campaign limit not reached (`dailySentCount < settings.dailyLimit`)
3. Return `{approved: true, failedChecks: []}` only if all 10 pass
4. Return `{approved: false, failedChecks: ['reason1', 'reason2', ...]}` listing every failed condition
5. PURE — no sheet access, no `auditLog`, no `GmailApp`
6. Commit as `feat(gate): add ApprovalGate module [TASK_1.9]`
7. Second commit: mark Task 1.9 ✅ in PHASES.md, bump Current Task to 1.10
8. Mark PR ready for review

Out of scope: any I/O, writing suppression, creating drafts, any campaign logic beyond the 10 checks.

---

### R1.10 — DraftService + Code.gs Wire-up

Goal: Build DraftService (creates Gmail drafts) and wire the complete Phase 1 pipeline in Code.gs. This is the integration task — after this PR merges, the smoke-test pipeline is runnable.

**Files in scope: `src/DraftService.gs` AND `src/Code.gs` (both in one PR)**

1. Create `src/DraftService.gs` with one exported function:
   ```
   /**
    * Creates a Gmail draft for an approved contact.
    * Respects DRAFT_ONLY=TRUE setting (always true in MVP).
    * @param {string} toEmail - Recipient email
    * @param {string} subject - Email subject line
    * @param {string} body - Plain-text email body
    * @param {string} contactId - Contact row ID for audit logging
    * @returns {{success: boolean, draftId: string, error: string|null}}
    */
   function createDraft(toEmail, subject, body, contactId) { ... }
   ```
   - Use `GmailApp.createDraft(toEmail, subject, body)`
   - On success: call `auditLog('DraftService', 'DRAFT_CREATED', contactId, toEmail, 'OK')`, return `{success: true, draftId: draft.getId(), error: null}`
   - On failure: call `auditLog('DraftService', 'DRAFT_FAILED', contactId, error.message, 'ERROR')`, return `{success: false, draftId: '', error: error.message}`
   - DRAFT_ONLY mode is enforced at this level: if `settings.draftOnly` is false, `auditLog` a WARN and still create a draft only (never send from script — human sends)
   - `NEEDS_WIFI_TEST:` GmailApp.createDraft — requires live Workspace account to test

2. Update `src/Code.gs` — replace the stubs from Task 1.1 with real implementations:
   - `runImportPipeline()`: reads raw rows from user input or a staging area, calls Cleaner → Deduplicator → MassachusettsFilter → ImportService
   - `runDraftPipeline()`: reads QUEUE tab, for each contact reads SETTINGS, calls LeadScorer → ApprovalGate → reads template from TEMPLATES tab → TemplateEngine → DraftService
   - `runFullPipeline()`: calls `runImportPipeline()` then `runDraftPipeline()`
   - Each function wrapped in try/catch with `auditLog` on error
   - Settings (daily limit, score threshold, DRAFT_ONLY flag, SPREADSHEET_ID) read once at the top of each pipeline function

3. Commit as `feat(draft): add DraftService and wire Phase 1 pipeline in Code.gs [TASK_1.10]`
4. Second commit: mark Task 1.10 ✅ in PHASES.md, bump Current Task to CHECKPOINT
5. Add `PHASE_READY` signal to PR description:
   ```
   Phase 1 complete. All tasks ✓.
   PHASE_READY — waiting for Claude Code audit before Phase 2.
   ```
6. Mark PR ready for review

Out of scope: ReplyMonitor, BounceMonitor, SuppressionService, FollowUpScheduler, DashboardService, any Phase 2+ module. Do not add time-driven triggers yet — that is Phase 2.

---

## Standing Recipes (every phase)

### R-BUG — Bug Fix
1. Reproduce: describe the failure in the PR description before touching code
2. Fix the code
3. Log error in ERRORS.md using the template in `docs/codex/templates/error-template.md` (same commit)
4. Commit as `fix(scope): description [TASK_X.X]`
5. If fix touches >3 files: add `NEEDS_REVIEW:` marker in the PR description
6. Mark PR ready for review

### R-BLOCKED — When Stuck
1. Try 2 different approaches
2. If both fail: update the PR description with:
   ```
   STOPPING because: [exact technical reason]

   Tried:
     1. [approach one and why it failed]
     2. [approach two and why it failed]

   Needs: [what would unblock this]
   ```
3. Mark the PR ready for review — Claude will unblock
4. Do not attempt a third approach

### R-PHASE-COMPLETE — Phase End
1. Confirm all phase tasks are checked off in PHASES.md
2. The final task PR should signal `PHASE_READY` in the PR title or description
3. Stop — wait for Claude Code audit before starting the next phase
4. Output in the PR description:
   ```
   Phase [N] complete. All tasks ✓.
   PHASE_READY — waiting for Claude Code audit.
   ```

---

## What Never Needs a Recipe
- Updating `PROPERTIES.example` when a new PropertiesService key is added → include in the same PR as the code that uses it
- Adding a new OAuth scope to `appsscript.json` → include in the same PR, use the dependency gate
