# Launch Runbook — Zero to Running Campaign

Everything to take the merged code live, in order. The code is done; this is the manual
deployment. Steps 1–2 take **weeks** (domain warm-up) — start them first and do
Steps 3–7 in parallel.

Legend: 🏠 = you do it by hand · ⏱️ = has a waiting period · ⚙️ = config

---

## Step 1 — 🏠⏱️ Domain & inbox infrastructure (start NOW, ~3–4 weeks)

This is Phase 0 from `PHASES.md` — none of it is code, and the warm-up can't be rushed.

1. Buy a **secondary** cold-outreach domain (not your primary business domain).
2. Create an **isolated Google Workspace Business Starter** tenant on that domain (separate
   from your main account).
3. Configure **DNS**: MX records, SPF, DKIM, and DMARC (start at `p=none` monitoring mode).
4. Create the **sender identity**: real name, photo, signature, physical mailing address.
5. Connect **Lemwarm Essential** to the inbox and let it warm for **3–4 weeks before the
   first real send**. ⏱️ This is the long pole — do it first.
6. Set up **Google Postmaster Tools** for the domain to watch reputation.

---

## Step 2 — 🏠 Create the Google Sheet (this IS the database)

Create one Google Sheets file. Add **10 tabs with these exact names**:

`SETTINGS` · `COMPANIES` · `CONTACTS` · `CAMPAIGNS` · `QUEUE` · `SUPPRESSION` ·
`ACTIVITY_LOG` · `DASHBOARD` · `TEMPLATES` · `PLAYBOOK_REQUESTS`

Add header rows (row 1). The code matches columns by header name (case/spacing-insensitive),
so spelling matters more than order:

| Tab | Header columns (row 1) |
|-----|------------------------|
| `SETTINGS` | `key` , `value` |
| `COMPANIES` | `company` , `website` , `industry` , `city` , `state` , `employeeSize` , `sourceUrl` , `wtfpRelevance` |
| `CONTACTS` | `contactId` , `email` , `firstName` , `company` , `title` , `linkedin` , `status` , `verificationResult` , `catchAll` , `maConfirmed` , `roleIsRelevant` , `employeeSizeFit` , `industryFit` , `wtfpRelevance` , `personalizationLine` , `emailsSent` , `lastSentAt` , `isSuppressed` |
| `QUEUE` | same contact columns as CONTACTS (it's the drafting work-list) |
| `SUPPRESSION` | `timestamp` , `email` , `reason` , `source` |
| `ACTIVITY_LOG` | `timestamp` , `stage` , `action` , `contactId` , `details` , `status` |
| `TEMPLATES` | `subject` , `body` |
| `DASHBOARD` | (DashboardService writes here — leave blank, it populates) |
| `CAMPAIGNS` , `PLAYBOOK_REQUESTS` | reserved; create the tab, headers optional for MVP |

Then grab the **spreadsheet ID** from the URL:
`https://docs.google.com/spreadsheets/d/`**`THIS_LONG_ID`**`/edit` — you need it in Step 4.

---

## Step 3 — 🏠 Create the Apps Script project & paste the code

1. From the Sheet: **Extensions → Apps Script** (creates a bound project).
2. **Manifest:** click the gear ⚙️ → "Show appsscript.json" → paste the contents of
   `appsscript.json` from the repo (sets V8 + the OAuth scopes).
3. **Create one script file per module** and paste its contents from GitHub. Apps Script
   shares one global scope, so execution order doesn't matter — but paste in this grouping
   so nothing references a not-yet-pasted helper while you're testing:

   **Foundation & pure logic (paste first):**
   `AuditLogger.gs` · `Cleaner.gs` · `Deduplicator.gs` · `MassachusettsFilter.gs` ·
   `LeadScorer.gs` · `TemplateEngine.gs` · `ApprovalGate.gs`

   **I/O modules:**
   `ImportService.gs` · `DraftService.gs` · `SuppressionService.gs` · `ReplyMonitor.gs` ·
   `BounceMonitor.gs` · `FollowUpScheduler.gs` · `DashboardService.gs`

   **Phase 3 API clients (only if/when you start Phase 3):**
   `ZeroBounceClient.gs` · `ApolloClient.gs` · `HunterClient.gs`

   **Orchestrator (paste last):** `Code.gs`

4. Save. There should be **18 `.gs` files** plus the manifest.

> Whenever a PR merges later, re-paste that one changed `.gs` file here — Apps Script has
> no auto-deploy.

---

## Step 4 — ⚙️ Script Properties (secrets & the sheet link)

Apps Script editor → **Project Settings** (gear) → **Script Properties** → add:

| Property | Value | Needed for |
|----------|-------|------------|
| `SPREADSHEET_ID` | the ID from Step 2 | **Required — everything** |
| `ZEROBOUNCE_API_KEY` | your key | Phase 3 only |
| `APOLLO_API_KEY` | your key | Phase 3 only |
| `HUNTER_API_KEY` | your key | Phase 3 only |

(See `PROPERTIES.example` in the repo.) Skip the API keys entirely for the Phase 1–2
manual-CSV workflow.

---

## Step 5 — ⚙️ SETTINGS tab values

In the `SETTINGS` tab, add these as `key` / `value` rows:

**Required (Phase 1 core loop):**
| key | example value | meaning |
|-----|---------------|---------|
| `DRAFT_ONLY` | `TRUE` | Keep TRUE — creates drafts, never auto-sends. **Leave TRUE for the entire MVP.** |
| `DAILY_LIMIT` | `10` | Max campaign drafts/day |
| `APPROVAL_THRESHOLD` | `75` | Min lead score (0–100) to draft |
| `SENDER_NAME` | `Your Name` | Merge field for templates |

**Phase 2 monitors (sensible values):**
`REPLY_MONITOR_LOOKBACK_DAYS` = `14` · `REPLY_MONITOR_MAX_THREADS` = `50` ·
`BOUNCE_MONITOR_LOOKBACK_DAYS` = `14` · `BOUNCE_MONITOR_MAX_THREADS` = `50` ·
`FOLLOW_UP_DELAY_DAYS` = `4` · `FOLLOW_UP_MAX_EMAILS` = `3`

**Phase 3 (only when you start it):** `APOLLO_CONTACT_SEARCH_URL`,
`APOLLO_CONTACT_SEARCH_PAGE_SIZE`, `HUNTER_EMAIL_FINDER_URL`, `HUNTER_EMAIL_VERIFIER_URL`,
`ZEROBOUNCE_VALIDATE_URL`, `ZEROBOUNCE_CREDITS_URL`, `ZEROBOUNCE_TIMEOUT_SECONDS`.

Also add at least one row to the `TEMPLATES` tab: a `subject` and a `body`. The body may
use `{{firstName}}`, `{{company}}`, `{{personalizationLine}}`, `{{senderName}}`.

---

## Step 6 — ⚙️ Authorize & install triggers

1. In the editor, pick `runDraftPipeline` from the function dropdown and **Run** once.
   Approve the OAuth consent screen (Sheets + Gmail compose + external request). This
   authorizes the project.
2. **Triggers** (clock icon) → add **time-driven** triggers for these four functions
   (hourly or daily to start — low frequency at MVP volume):
   - `runReplyMonitorTrigger`
   - `runBounceMonitorTrigger`
   - `runFollowUpSchedulerTrigger`
   - `runDashboardRefreshTrigger`

(`runImportPipeline`, `runDraftPipeline`, `runFullPipeline` stay **manual** — you run them
when you load a batch.)

---

## Step 7 — 🏠 Smoke test, then go live slowly

1. Confirm `DRAFT_ONLY = TRUE`.
2. Get your **Massachusetts source company list** (CSV — WTFP grantees / MA employers),
   paste rows into `COMPANIES` (matching the Step 2 columns), and add a handful of
   `CONTACTS` rows with real emails you can verify.
3. Run `runImportPipeline` (or `runFullPipeline`) manually. Check:
   - `ACTIVITY_LOG` fills with entries
   - Gmail **Drafts** contains the generated emails
   - `DASHBOARD` shows metrics after `runDashboardRefreshTrigger`
4. **Send 3–5 drafts/day by hand** from Gmail (never bulk) while the domain is young.
   Watch replies/bounces flow into `CONTACTS`/`SUPPRESSION` via the monitors.
5. Ramp volume only as Postmaster reputation stays green and Lemwarm warm-up completes.

---

## Ongoing dev loop (once live)

New feature or fix → give Codex a scoped task → it opens a PR (marks its task 🫡 in
`PHASES.md`) → you merge → Claude reviews post-merge and flips 🫡 → ✅ → you re-paste the
one changed `.gs` file into Apps Script. See `README.md` / `CLAUDE.md`.
