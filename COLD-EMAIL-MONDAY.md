# Cold Email Monday — The Master Go-Live Document

**This is the one document.** Work it top to bottom and the campaign goes from merged code to
sending 3/day with a warmed domain, an enrichment pipeline, and free-tier lead mining. Detail
references (`docs/HOSTINGER-RUNBOOK.md`, `manual-email-warmup-gmail/README.md`, `PHASES.md`)
exist for depth, but every step you must *do* is written inline here, in order.
`docs/LAUNCH-RUNBOOK.md` is the retired Gmail-era archive — never follow it.

Status date: **2026-07-20**. All setup progress through PR #76 is merged. The Warmup Inbox automated
warm-up is **already running** — its start date is the clock the timeline below runs on.

Two Apps Script projects exist in this plan. When a step says to run a function, it names the
project and the file:

- **Campaign project** — bound to the campaign spreadsheet (open via the Sheet → Extensions →
  Apps Script). All 25 files from `src/`.
- **Warm-up project** — standalone, under the warm-up Google account (Part 3 creates it). The
  5 files from `manual-email-warmup-gmail/src/`.

---

## The Roadmap (the whole project on one table)

| # | Week | Item | Type | Owner | Status |
|---|---|---|---|---|---|
| **— GROUNDWORK —** |
| 1 | 1 | Deploy all merged code to Apps Script (Part 1) | setup | You | ⬜ |
| 2 | 1+ | Research the staged company list, then load Ready rows → `COMPANIES` (Parts 2 + 4) | ops | You | ⬜ |
| 3 | 1 | Templates (steps 1–3) + SETTINGS + script properties (Part 2) | setup | You | 🟨 templates + SETTINGS ✅; API properties pending |
| 4 | 1 | Buy ZeroBounce PAYG credits ~$20 (never expire) | 💰 | You | ⬜ |
| **— WARM-UP TRACK (clock already running) —** |
| 5 | — | Warmup Inbox automated warm-up running | ops | You | ✅ running |
| 6 | 1–2 | Manual warm-up layer setup (Part 3) — **join week 2–3 of the ramp** | setup | You | ⬜ deadline-sensitive |
| 7 | 2–8 | Warm-up runs; weekly DAILY_SUMMARY glance | ops | You | ⬜ |
| **— CODE (all Claude-built) —** |
| 8 | done | Campaign runtime, Hostinger migration, gap closures (PRs #62–#66, #68) | code | Claude | ✅ merged |
| 9 | done | Phase 4 enrichment chain: discovery → verification → queue (PR #67) | code | Claude | ✅ merged |
| 10 | 2–3 | Phase 5 free sourcing funnel: data.mass.gov client, criteria filter, CANDIDATES staging + promotion, website scraper, pattern-guesser + MX check, Snov client | code | Claude | ⬜ **next build** |
| **— ENRICHMENT & MINING OPS —** |
| 11 | 1+ | Segmented Apollo/Prospeo/Skrapp/Snov research → `COMPANIES` + `CONTACTS` (Part 4) | ops | You | ⬜ |
| 12 | 2+ | Enrichment runs: discovery → verification → queue (Part 4) | ops | You | ⬜ |
| 13 | 3+ | Personalization drafts + human review per batch (Part 4) | ops | You | ⬜ |
| 14 | 3–8 | Monthly free-credit mining cycles (Hunter 25 + Snov 50 + scraper; Part 5) | ops | You | ⬜ after item 10 |
| 15 | 5–6 | One Hunter paid month (~$40): batch the stocked backlog, then cancel | 💰 | You | ⬜ |
| **— LAUNCH (week 6–8 from warm-up start) —** |
| 16 | 4–5 | Verification burst near end of warm-up (freshness — Gotcha #3) | ops | You | ⬜ |
| 17 | 6–8 | Smoke test, first sends at 3/day, taper warm-up layer (Part 6) | ops | You | ⬜ |
| 18 | 6–8+ | Daily reply triage + weekly deliverability/backup routine (Part 7) | ops | You | ⬜ |

Total planned spend: **~$60** (ZeroBounce $20 one-time + one Hunter month ~$40). Everything
else is free tier.

---

## Verified Progress — 2026-07-20

- ✅ Warmup Inbox automated warm-up is running.
- ✅ `setupHostingerWorkflow()` completed without an error and added the Hostinger columns.
- ✅ The bound spreadsheet displays the **Cold Email** menu.
- ✅ `QUEUE` has the complete 21-column campaign + Hostinger header schema.
- ✅ `ACTIVITY_LOG` has the correct six headers: `timestamp`, `stage`, `action`, `contactId`,
  `details`, `status`.
- ✅ Retired Gmail-era SETTINGS keys were removed.
- ✅ All nine current campaign SETTINGS rows were entered and verified.
- ✅ All three email sequence templates were entered with sequence steps 1, 2, and 3.
- ✅ `CONTACTS` and `QUEUE` use `lastName`; the legacy `linkedin` header was replaced with
  `linkedinUrl`.
- ✅ The 258 source records are staged in `business-lists/Prospect_Research_Staging.xlsx`:
  229 employer prospects have fixed tool assignments and 29 institution-led records are held
  for manual review.
- ⬜ Confirm all 25 campaign `.gs` files and `appsscript.json` exactly match current `main`.
- ✅ The campaign Triggers page contains exactly the two required triggers, staggered as
  `runFollowUpSchedulerTrigger` at 8–9am and `runDashboardRefreshTrigger` at 6–7pm.
- ⬜ Add `HUNTER_API_KEY`, `ZEROBOUNCE_API_KEY`, and `GEMINI_API_KEY` to Script Properties.
- ⬜ Research the 229 staged employer prospects and load only `Ready` rows into `COMPANIES`.
- ⬜ Add the first five researched decision-makers to `CONTACTS`.

---

## Part 1 — Deploy the code (one sitting)

All steps in this Part happen in the **campaign project** (Sheet → Extensions → Apps Script).

1. **Paste all 25 files from `src/`** over their same-named files in the Apps Script editor;
   create any that don't exist yet (＋ → Script, then name it exactly as below, no `.gs`
   needed — the editor adds it). The complete list, alphabetical:

   ```text
   ApolloClient.gs
   ApprovalGate.gs
   AuditLogger.gs
   BounceMonitor.gs
   CampaignStateService.gs        ← new file if not already present
   Cleaner.gs
   Code.gs
   ContactDiscoveryService.gs     ← new file if not already present
   ContactVerificationService.gs  ← new file if not already present
   DashboardService.gs
   Deduplicator.gs
   DraftService.gs
   FollowUpScheduler.gs
   GeminiClient.gs                ← new file if not already present
   HunterClient.gs
   ImportService.gs
   LeadScorer.gs
   MassachusettsFilter.gs
   PersonalizationDraftService.gs ← new file if not already present
   QueueBuilder.gs                ← new file if not already present
   ReplyMonitor.gs
   RoleRelevanceFilter.gs         ← new file if not already present
   SuppressionService.gs
   TemplateEngine.gs
   ZeroBounceClient.gs
   ```

   Safest play: paste all 25 (not just the ⟵ new ones) so the editor exactly matches the
   repo, even if you think an older file is already up to date — cheap to re-paste, expensive
   to debug a stale one later. After pasting, the editor's left file list should show exactly
   these 25 filenames and nothing else; delete any leftover file not on this list.

2. **Replace `appsscript.json`** (Project Settings → "Show appsscript.json"). The Gmail scope is
   intentionally gone; pasting drops it.

3. **Script properties** (Project Settings → Script Properties), per `PROPERTIES.example`:
   `SPREADSHEET_ID`, `HUNTER_API_KEY`, `ZEROBOUNCE_API_KEY`, `GEMINI_API_KEY`
   (free key from [aistudio.google.com](https://aistudio.google.com)). `APOLLO_API_KEY` only if
   you ever use the dormant Apollo client.

4. **✅ DONE — Authorize the reduced scope set** by running one function:
   1. In the campaign project's editor, open the file **`CampaignStateService.gs`** in the left
      file list.
   2. In the toolbar above the code, open the function dropdown (it sits between "Debug" and
      the ⏱ icon) and select **`setupHostingerWorkflow`**.
   3. Click **Run**. A dialog appears: *"Authorization required"* → **Review permissions** →
      pick your campaign Google account → if Google shows *"Google hasn't verified this app"*,
      click **Advanced → Go to (project name) (unsafe)** — it's your own script → **Allow**.
      The requested scopes should be only *Sheets* and *external requests* — if it asks for
      Gmail, you pasted an old manifest; redo step 2.
   4. When the run finishes, check the **Execution log** panel at the bottom: no red errors.
      This run also creates the Hostinger columns, which makes step 5 a verification.

5. **✅ DONE — Verify the Cold Email menu and columns:**
   1. Go back to the spreadsheet browser tab and **reload the page** (F5 / Cmd-R).
   2. Within ~5 seconds of loading, a **Cold Email** menu appears in the menu bar (right of
      "Help"). If it doesn't, the `onOpen` function isn't deployed — re-check that
      `CampaignStateService.gs` was pasted, then reload again.
   3. Click **Cold Email → Set up Hostinger columns**. (Safe to run even though step 4 already
      did this — it only adds columns that are missing.)
   4. Verify: the **QUEUE** tab's header row (row 1) now includes `sequenceStep`, `subject`,
      `body`, `preparedAt`, `sentAt`; the **CONTACTS** tab's header row includes `status`,
      `emailsSent`, `lastSentAt`.

6. **✅ DONE — Triggers** — in the campaign project's editor, click the **clock icon (Triggers)** in the
   left icon rail:
   1. **Delete retired triggers:** for any row whose Function column says
      `runReplyMonitorTrigger` or `runBounceMonitorTrigger` → click the **⋮ (three-dot) menu**
      at the right end of that row → **Delete trigger** → confirm.
   2. **Create the follow-up trigger** (skip if a row for it already exists): click
      **+ Add Trigger** (bottom-right) and set —
      - Choose which function to run: `runFollowUpSchedulerTrigger`
      - Which deployment: `Head`
      - Event source: `Time-driven`
      - Type of time based trigger: `Day timer`
      - Time of day: `8am to 9am`
      - Click **Save**.
   3. **Create the dashboard trigger** the same way: function `runDashboardRefreshTrigger`,
      `Time-driven` → `Day timer` → `6pm to 7pm` → **Save**.
   4. **Create nothing else.** Every other function in this project stays manual-run — the
      enrichment functions spend paid API credits on every call.
   5. Final state check: the Triggers page lists exactly two triggers.

7. **✅ DONE — QUEUE header check (do not skip):**
   1. Open the **QUEUE** tab and read its header row (row 1).
   2. It must contain these **16 campaign headers** (any order, extra columns are fine):
      `contactId`, `email`, `firstName`, `lastName`, `company`, `title`, `maConfirmed`,
      `roleIsRelevant`, `verificationResult`, `catchAll`, `wtfpRelevance`, `employeeSizeFit`,
      `industryFit`, `personalizationLine`, `emailsSent`, `status`.
   3. It must also contain the **five Hostinger columns** added in step 5:
      `sequenceStep`, `subject`, `body`, `preparedAt`, `sentAt`. The authoritative final
      `QUEUE` schema is therefore **21 required columns total**.
   4. For each one missing: click the first empty cell in row 1 and type the header exactly as
      written above (camelCase; matching is case/space-insensitive but exact names keep the
      sheet readable).
   5. Why this matters: QueueBuilder and FollowUpScheduler copy contact values into QUEUE **by
      matching header names**. A missing QUEUE column arrives blank, and ApprovalGate then
      skips every prepared row with confusing failed checks.

8. **✅ DONE — SETTINGS cleanup (removes dead keys):**
   1. Open the **SETTINGS** tab.
   2. Find any row whose key (column A) is `DRAFT_ONLY`, `REPLY_MONITOR_LOOKBACK_DAYS`,
      `REPLY_MONITOR_MAX_THREADS`, `BOUNCE_MONITOR_LOOKBACK_DAYS`, or
      `BOUNCE_MONITOR_MAX_THREADS`.
   3. For each: right-click the row number on the far left → **Delete row**.
   4. These keys are ignored by the current runtime; deleting them prevents future confusion
      about what's live.

---

## Part 2 — Data foundation (same sitting)

9. **Use the staging workbook; do not paste the raw source lists into `COMPANIES`.** Open or
   upload [`business-lists/Prospect_Research_Staging.xlsx`](business-lists/Prospect_Research_Staging.xlsx)
   to Google Sheets. This is the single research source of truth built from `ChatGPT.docx` and
   `Gemini.docx`:
   1. The workbook contains **258 unique source records**. `MASTER_QUEUE` contains the 229
      employer prospects to research. `HOLD_REVIEW_29` contains 10 schools and 19
      institution-led records that stay out of this employer campaign unless you explicitly
      review and promote them.
   2. The exact, non-overlapping assignments are fixed in the workbook:

      | Tool tab | Exact rows | Purpose |
      |---|---:|---|
      | `APOLLO_59` | 59 | All 59 records whose exported source retained a live official citation URL |
      | `PROSPEO_70` | 70 | First 70 employer/grantee rows from `Gemini.docx` |
      | `SKRAPP_50` | 50 | Next 50 employer/grantee rows from `Gemini.docx` |
      | `SNOV_50` | 50 | Final 50 employer/grantee rows from `Gemini.docx` |
      | `HOLD_REVIEW_29` | 29 | Education- or institution-led records; excluded by default |

   3. **Edit only `MASTER_QUEUE`.** The four tool tabs are exact view-only queues whose status
      cells follow the master. The first eight master columns already match the campaign
      schema exactly: `company | website | industry | city | state | employeeSize | sourceUrl |
      wtfpRelevance`. The research and decision-maker columns live to their right.
   4. The 59 Apollo rows retained embedded official URLs. The 170 active Gemini rows retained
      citation labels such as `[cite: 27]` but **not their live URLs**. Their `sourceUrl` cells
      intentionally start blank; fill each with the best live evidence you confirm during
      research (prefer an official grant record; otherwise use the official company page and
      explain that substitution in `researchNotes`).
   5. Work the exact process in Part 4 step 21. A row is not importable merely because its
      company name exists. It becomes `Ready` only after the company, domain, source,
      Massachusetts location, industry/size, and one relevant decision-maker are checked.
   6. `IMPORT_READY` automatically exposes only the first eight campaign fields for rows whose
      `reviewStatus` is `Ready`. Before importing, filter column A to **nonblank** so empty
      formula rows are hidden.
   7. Open the campaign spreadsheet's **COMPANIES** tab and confirm row 1 is exactly:
      `company | website | industry | city | state | employeeSize | sourceUrl | wtfpRelevance`.
      Copy visible nonblank rows **A:H** from `IMPORT_READY`, click **COMPANIES!A2**, and paste
      **values only**. Never paste the formulas themselves into the campaign sheet.
   8. Normalize before marking `Ready`:
      - `website`: lowercase bare domain only; remove `http://`, `https://`, leading `www.`,
        paths, and trailing `/` (`https://www.AcmeCo.com/about` → `acmeco.com`).
      - `sourceUrl`: a full `https://...` audit URL, not a bare domain.
      - `state`: `MA`; `wtfpRelevance`: Boolean `TRUE` for these prequalified grant-source rows.
      - `employeeSize`: preserve the displayed research-tool band (`11-50`, `51-200`, etc.).
      - No duplicate websites. The domain is the campaign's dedupe key; resolve duplicates in
        `MASTER_QUEUE` before copying anything.
   9. After pasting, copy each Ready row's decision-maker values from `MASTER_QUEUE` columns
      `decisionMakerFirstName`, `decisionMakerLastName`, `title`, and `linkedinUrl` into a new
      **CONTACTS** row. `CONTACTS.company` must be copied verbatim from `COMPANIES.company`.
      If `discoveredEmail` is present, copy it too and preserve `emailSource`; otherwise leave
      email blank for the campaign discovery step.

10. **✅ DONE — Templates — one row per sequence step.** Open the **TEMPLATES** tab:
    1. Header row 1 must read: `subject | body | sequenceStep`. Add the `sequenceStep` header
       if it's missing.
    2. **Row 2 = your initial email (step 1).** Fill `subject` and `body`; leave
       `sequenceStep` blank (a blank-step row is the step-1 default) or put `1`.
    3. **Row 3 = first follow-up (step 2):** `sequenceStep` = `2`. **Row 4 = second follow-up
       (step 3):** `sequenceStep` = `3`. A follow-up step with no matching row is skipped with
       `FOLLOW_UP_TEMPLATE_MISSING` in ACTIVITY_LOG — it will never silently resend step-1
       content, but it also means **no step-2 row = no follow-ups ever go out**.
    4. To write a multi-line body inside one cell: **Alt+Enter** (Windows) / **Cmd+Enter**
       (Mac) inserts a line break while typing in the cell.
    5. Placeholders — type them exactly, case-sensitive, double curly braces:
       `{{firstName}}`, `{{company}}`, `{{personalizationLine}}`, `{{senderName}}`. A
       placeholder whose value is blank at prepare time is left as-is in the sent text, so
       never use a placeholder you aren't filling.
    6. **Every body must end with your physical mailing address and an opt-out line** — the
       CAN-SPAM baseline (Gotcha #12). Example step-1 body:

       ```text
       Hi {{firstName}},

       {{personalizationLine}}

       I work with Massachusetts companies like {{company}} to get employee training
       covered by the state's Workforce Training Fund — most owners I talk to don't
       realize they're already eligible.

       Worth a 15-minute call to see if {{company}} qualifies?

       {{senderName}}
       Express Training
       123 Main St, Boston, MA 02110

       If you'd rather not hear from me, just reply "stop" and I won't email again.
       ```

11. **✅ DONE — SETTINGS rows.** Open the **SETTINGS** tab:
    1. Header row 1 must read: `key | value` (lowercase is fine).
    2. Add one row per setting below — key in column A, value in column B, nothing else in
       the row:

       | key | value |
       |---|---|
       | `DAILY_LIMIT` | `5` |
       | `APPROVAL_THRESHOLD` | `75` |
       | `SENDER_NAME` | `Adam Graney` |
       | `FOLLOW_UP_DELAY_DAYS` | `4` |
       | `FOLLOW_UP_MAX_EMAILS` | `3` |
       | `PERSONALIZATION_BATCH_SIZE` | `10` |
       | `CONTACT_DISCOVERY_BATCH_SIZE` | `10` |
       | `CONTACT_VERIFICATION_BATCH_SIZE` | `25` |
       | `RELEVANT_TITLE_KEYWORDS` | `owner, founder, ceo, president, coo, general manager, operations, hr, human resources, training, learning and development` |

    3. Keys are case-sensitive as written. `RELEVANT_TITLE_KEYWORDS` is one comma-separated
       string in a single cell — edit the list to taste; a contact's title must contain at
       least one keyword (case-insensitive substring) to pass the role filter.

12. **✅ DONE — Add the `lastName` column + fix `linkedin` → `linkedinUrl`:**
    1. On **CONTACTS**: find the `firstName` header → right-click the column letter above it →
       **Insert 1 column right** → type `lastName` in the new header cell.
    2. Repeat the same on **QUEUE** (it's in the 16-header list from step 7 — skip if you
       already added it there).
    3. On both tabs, if any header reads `linkedin`, click it and retype it as `linkedinUrl` —
       that's the header the code reads; `linkedin` alone is read by nothing.
    4. Why: Hunter's email finder is meaningfully more accurate with first *and* last name.

13. **Buy the ZeroBounce PAYG pack:**
    1. Go to [zerobounce.net](https://www.zerobounce.net) → **Sign Up** (free account, no card
       required — includes 100 free validations/month on its own).
    2. Log in → dashboard → **Buy Credits** (sometimes under "Pricing"). Choose a one-time
       credit pack of roughly **2,000 credits** (~$16–20 at last check — pricing drifts;
       anything in that range is right). This is **pay-as-you-go**: one-time payment, no
       subscription exists, credits never expire.
    3. Get your API key: dashboard → **API** (left menu) → copy the key.
    4. Put it in the campaign project: Project Settings → Script Properties →
       `ZEROBOUNCE_API_KEY` = the copied key (added in Part 1 step 3 — fill the real value
       now if you used a placeholder).
    5. Why now: verification is what protects the warmed domain — never send to an unverified
       address, from any source, ever.

---

## Part 3 — Manual warm-up layer (deadline: week 2–3 of the running ramp)

The automated Warmup Inbox tool is already running through Hostinger SMTP/IMAP — leave it
alone, never run a second warm-up tool on the same mailbox, and note its start date. This
manual layer joins **week 2–3 of that ramp** and is a *separate, standalone* Apps Script
project — the **warm-up project** (full internals: `manual-email-warmup-gmail/README.md`).

**Seed count: 4 accounts, not 8.** The seeds are receiving inboxes, not the thing building
reputation — the outreach domain's send volume and engagement rate are what matter, and that
volume is unchanged whether it's spread across 4 or 8 seeds (the scheduler ramps the domain's
daily total and picks a random seed per send). 4 real, previously-active Gmail accounts with
genuine history is plenty of recipient diversity; don't go below ~3.

### Read this location map before step 14

This setup uses several Google products that look related but store different pieces. Every
instruction below starts with a **location label**. Do not move a value to a different product
unless the instructions explicitly say to switch locations.

| Location label | Where to open it | What belongs there |
|---|---|---|
| **[GOOGLE CLOUD]** | [console.cloud.google.com](https://console.cloud.google.com) | Gmail API, consent settings, OAuth Client ID and Client secret |
| **[APPS SCRIPT]** | [script.google.com](https://script.google.com) | The five `.gs` files, `appsscript.json`, Script Properties, test runs, triggers |
| **[GOOGLE SHEET]** | [sheets.google.com](https://sheets.google.com) | `Warmup Command Center`, logs, summaries, and email-to-property-name mappings |
| **[OAUTH PLAYGROUND]** | [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground/) | One-time authorization that creates one refresh token per seed Gmail |
| **[HOSTINGER HPANEL]** | [hpanel.hostinger.com](https://hpanel.hostinger.com) | The Hostinger Email API token used to send from the outreach mailbox |

**The credential model:** all four seed Gmails share one Cloud **Client ID** and **Client
secret**. Each seed Gmail gets its own unique **refresh token**. Refresh-token values live only
in **Apps Script → Project Settings → Script Properties**. The Sheet stores the *property name*,
not the token. Never paste a Client secret or refresh token into source code, the Sheet, a
screenshot, chat, email, or GitHub.

14. **[GOOGLE CLOUD — regular browser] Create and configure `warmup-infra`:**
    1. Open a normal browser window, not Incognito. Sign into the low-activity Google account
       that will own this infrastructure. This is the **Cloud/GAS owner account**. It does not
       have to be one of the four seed Gmails; add it as a seed only if it will actually receive
       and engage with warm-up messages.
    2. Go to [Google Cloud Console](https://console.cloud.google.com). Click the project picker
       in the top bar → **New Project** → enter `warmup-infra` → **Create**. After creation,
       reopen the project picker and select `warmup-infra`. Keep checking the top bar while
       completing this step; every setting below must be made inside this project.
    3. In the left **☰ Navigation menu**, open **APIs & Services → Library**. Search for
       `Gmail API` → open the result → click **Enable**. Wait until its API overview page loads.
    4. In the left menu, open **Google Auth Platform → Branding**. If Google instead shows
       **APIs & Services → OAuth consent screen**, use that; it leads to the same setup.
       Configure:
       - **App name:** `warmup-infra`
       - **User support email:** the Cloud/GAS owner account
       - **Developer contact email:** the Cloud/GAS owner account
       - **Audience/User type:** `External`
       Save the page.
    5. Open **Google Auth Platform → Audience**. Under **Test users**, click **Add users** and
       add each of the four seed Gmail addresses. Add the Cloud/GAS owner too only when it is
       also one of the four seeds. Save and confirm that each address appears in the list.
    6. Open **Google Auth Platform → Data Access** → **Add or remove scopes**. Search for or
       manually enter `https://mail.google.com/`, check that exact Gmail scope, click **Update**,
       then click **Save** on the Data Access page. It should appear under **Restricted scopes**.
       This is intentional: the engagement automation needs to find, read, star, and reply to
       warm-up messages in each seed inbox.
    7. Return to **Google Auth Platform → Audience**. Set **Publishing status** to
       **In production** and confirm the prompt. Do not leave it in Testing: refresh tokens for
       an External app in Testing can expire after seven days, which would stop the multi-week
       warm-up.

       > ⚠️ **The verification banner is expected. Do not submit this private app for
       > verification.** `https://mail.google.com/` is a restricted scope with full Gmail
       > access. For four accounts you own, keep the app **External + In production**, ignore
       > the verification banner, and use **Advanced → Go to warmup-infra (unsafe)** during
       > each authorization. Personal-use apps with fewer than 100 users can continue through
       > the warning without verification. See Google's
       > [verification exception guidance](https://support.google.com/cloud/answer/13464323)
       > and [audience documentation](https://support.google.com/cloud/answer/15549945).
    8. Open **Google Auth Platform → Clients** → **Create client**. Choose:
       - **Application type:** `Web application`
       - **Name:** `oauth-playground`
       - Under **Authorized redirect URIs**, click **Add URI** and enter exactly
         `https://developers.google.com/oauthplayground` with no trailing slash.
       Click **Create**. Leave the resulting Client ID/secret dialog open or store the values
       temporarily in a password manager; the next step puts them in Apps Script.
    9. **Security check before continuing:** if the Client secret has appeared in a screenshot,
       chat, email, or other shared location, rotate it now. In **Google Auth Platform →
       Clients**, open `oauth-playground`, reset/create a new secret, and use only the new one.
       Do this before generating the four refresh tokens.

15. **[GOOGLE SHEET → APPS SCRIPT — regular browser] Create the command center and code
    project before generating any tokens:**
    1. In the same normal browser session, go to [Google Sheets](https://sheets.google.com) →
       **Blank spreadsheet**. Rename it `Warmup Command Center`. This must be a native Google
       Sheet, not an uploaded `.xlsx` file.
    2. Copy its spreadsheet ID from the address bar. In a URL shaped like
       `https://docs.google.com/spreadsheets/d/ABC123/edit`, copy only `ABC123`, the characters
       between `/d/` and `/edit`. Keep this Sheet open in its own browser tab.
    3. Open a second normal-browser tab at [Apps Script](https://script.google.com) → **New
       project**. Rename the project `Manual Email Warmup`. Confirm the profile circle shows the
       Cloud/GAS owner account and that this account can open the Sheet from step 15.1.
    4. In the Apps Script editor, create five Script files using **+ beside Files → Script**.
       Name each file exactly as shown, then paste the matching repo file from
       `manual-email-warmup-gmail/src/`:

       ```text
       ContentVariationService.gs
       HostingerMailClient.gs
       SeedAccountService.gs
       Warmup.gs
       WarmupScheduler.gs
       ```

    5. Click **Project Settings** (gear icon in the Apps Script left rail). Check **Show
       `appsscript.json` manifest file in editor**. Return to **Editor** (`<>` icon), open
       `appsscript.json`, and replace its contents with
       `manual-email-warmup-gmail/appsscript.json` from the repo. Click **Save project**.
    6. Return to **Project Settings** → scroll to **Script Properties** → click **Edit script
       properties**. Add these rows; the left field is **Property** and the right field is
       **Value**:

       | Property — type exactly | Value — paste only this |
       |---|---|
       | `WARMUP_SHEET_ID` | The Sheet ID copied in step 15.2 |
       | `WARMUP_FROM_EMAIL` | The Hostinger outreach mailbox, for example `adam@goldflamingoailabs.com` |
       | `WARMUP_START_DATE` | Manual-layer start date as `YYYY-MM-DD` |
       | `OAUTH_PROJECT_OWNER_EMAIL` | Cloud/GAS owner Gmail; human-readable label only |
       | `OAUTH_CLOUD_PROJECT_ID` | The project ID shown beside `warmup-infra` in Cloud; label only |
       | `OAUTH_CLIENT_ID` | Client ID created in step 14.8 |
       | `OAUTH_CLIENT_SECRET` | Current Client secret created in step 14.8/14.9 |
       | `GEMINI_API_KEY` | Optional; leave absent when not using Gemini |

       Click **Save script properties**. `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` must keep
       those exact names because `SeedAccountService.gs` reads them literally. The two
       `OAUTH_PROJECT_*` rows are labels for you and are not read by the code.
    7. **Do not edit `Warmup.gs` to insert the Sheet ID.** In particular, leave
       `getProperty('WARMUP_SHEET_ID')` unchanged. `WARMUP_SHEET_ID` is the property *name*;
       your actual ID belongs in the Script Property **Value** field created in step 15.6.

16. **[APPS SCRIPT → GOOGLE SHEET] Initialize and verify the Sheet tabs:**
    1. In Apps Script, click **Editor** (`<>`) → open `Warmup.gs`. In the function dropdown at
       the top, select **`setupWarmupSheet`** → click **Run**.
    2. The first run asks for authorization. Click **Review permissions** → select the
       Cloud/GAS owner account → **Advanced** if shown → continue to `Manual Email Warmup` →
       **Allow**. Return to the execution log and confirm **Execution completed**.
    3. Switch browser tabs to the **Warmup Command Center** Google Sheet and reload the page.
       Confirm these four tabs now exist at the bottom: `WARMUP_LOG`, `ENGAGEMENT`,
       `SEED_ACCOUNTS`, and `DAILY_SUMMARY`.
    4. Open `SEED_ACCOUNTS`. Confirm row 1 contains exactly:
       `email | tokenPropertyKey | active`. Leave rows 2–5 blank for now; each will be filled
       immediately after its token is stored in step 17.
    5. If setup says `WARMUP_SHEET_ID script property is required`, return to **Apps Script →
       Project Settings → Script Properties** and check the spelling. If it says the spreadsheet
       ID is illegal, confirm the Value contains only the characters between `/d/` and `/edit`,
       the file is a native Google Sheet, and the Cloud/GAS owner can open it.

17. **[OAUTH PLAYGROUND INCOGNITO → APPS SCRIPT REGULAR → GOOGLE SHEET REGULAR] Generate,
    store, and map one seed token at a time:**

    Use this exact mapping for the four confirmed seed accounts. The property name is a label;
    the secret refresh token will be its Value in Apps Script.

    | Seed Gmail | Apps Script property name | Sheet row |
    |---|---|---|
    | `gfais.demo@gmail.com` | `SEED_TOKEN_GFAIS` | 2 |
    | `adamagdev.data@gmail.com` | `SEED_TOKEN_ADAMAGDEV_DATA` | 3 |
    | `goldflamingo.arti@gmail.com` | `SEED_TOKEN_GOLDFLAMINGO_ARTI` | 4 |
    | `kitkatm.0208@gmail.com` | `SEED_TOKEN_KITKATM_0208` | 5 |

    Repeat substeps 1–14 completely for one row before starting the next account:

    1. Open a brand-new **Chrome Incognito** window: Mac menu **File → New Incognito Window**;
       Windows/Chrome menu **⋮ → New Incognito window**. Keep the regular Apps Script and Sheet
       tabs open in the original window.
    2. In Incognito, open [Gmail](https://mail.google.com) and sign into **only the seed Gmail
       for the current row**. Click its profile circle at upper right and visually confirm the
       exact email address. Do not add a second Google account to this Incognito window.
    3. In another tab in that same Incognito window, open
       [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/). This is a separate
       Google website; it is not inside Cloud Console or Apps Script.
    4. Click the **gear icon in the Playground's upper-right corner**. In the white **OAuth 2.0
       configuration** panel on the right, set:
       - **OAuth flow:** `Server-side`
       - **OAuth endpoints:** `Google`
       - **Access token location:** `Authorization header w/ Bearer prefix`
       - **Access type:** `Offline`
       - **Force prompt:** `Consent Screen`
       - Check **Use your own OAuth credentials**
       - **OAuth Client ID:** paste the shared Client ID from Cloud/Apps Script
       - **OAuth Client secret:** paste the shared current Client secret from Cloud/Apps Script
    5. Click the blue **Close** link at the bottom-left of that white configuration panel. On
       the main Playground page, find **Step 1 — Select & authorize APIs** on the left.
    6. At the very bottom of Step 1, click **Input your own scopes**, type exactly
       `https://mail.google.com/`, then click the blue **Authorize APIs** button immediately to
       the right. Do not select anything from the long API list.
    7. Google opens the authorization flow. Confirm the displayed account is the current seed
       Gmail. If it is wrong, cancel and close Incognito. On **Google hasn't verified this
       app**, click **Advanced → Go to warmup-infra (unsafe)**. Continue and click **Allow** for
       the Gmail permission.
    8. Google returns to OAuth Playground. In the left column, expand **Step 2 — Exchange
       authorization code for tokens**. Click the blue **Exchange authorization code for
       tokens** button.
    9. In Step 2, find **Refresh token** and copy its complete value, usually beginning `1//`.
       Do not copy **Access token**; that token is temporary. If Refresh token is blank, reopen
       the gear and verify **Access type = Offline** and **Force prompt = Consent Screen**, then
       repeat from substep 6.
    10. **Switch windows now:** return to the original, regular browser window and open the
        `Manual Email Warmup` Apps Script tab. Do not sign the seed Gmail into this window.
        Click **Project Settings → Script Properties → Edit script properties → Add script
        property**.
    11. In **Property**, type the exact property name from the mapping table for this seed. In
        **Value**, paste the complete refresh token from OAuth Playground. Example for row 2:
        Property = `SEED_TOKEN_GFAIS`; Value = the token created while signed into
        `gfais.demo@gmail.com`. Click **Save script properties**.
    12. **Switch browser tabs again:** open the regular-window `Warmup Command Center` Sheet →
        `SEED_ACCOUNTS`. Fill the assigned row:
        - Column A, `email`: exact seed Gmail address
        - Column B, `tokenPropertyKey`: exact Apps Script **Property name**, not the token
        - Column C, `active`: `TRUE`

        Row 2 must therefore read:
        `gfais.demo@gmail.com | SEED_TOKEN_GFAIS | TRUE`.
    13. Confirm that Column B contains a readable name beginning `SEED_TOKEN_`. If it contains
        a value beginning `1//`, delete that cell immediately; the secret belongs only in Apps
        Script Properties.
    14. Close the **entire Incognito window**, not only the Playground tab. Open a fresh
        Incognito window and repeat from substep 1 for the next row. After all four accounts,
        the Sheet must have four mappings and Apps Script must have four token properties.

    > ⚠️ **If a refresh token is ever shown in a screenshot, chat, email, or shared document,
    > revoke it before continuing.** In a private window signed into that exact seed Gmail, open
    > [Google Account third-party connections](https://myaccount.google.com/connections), select
    > `warmup-infra`, and choose **Delete all connections**/remove access. Then repeat step 17 for
    > that Gmail and replace the old Script Property Value. A refresh token plus the OAuth client
    > credentials grants the automation the full Gmail access represented by the restricted scope.

18. **[HOSTINGER HPANEL → APPS SCRIPT] Create and store the sending API token:**
    1. Open [Hostinger hPanel](https://hpanel.hostinger.com) in the regular browser → **Emails**
       → select the outreach domain `goldflamingoailabs.com`, not the business domain.
    2. Open the email management page's **API / Email API** section. If Hostinger has moved it,
       open [Hostinger Mail API documentation](https://api.mail.hostinger.com) and follow its
       current token-generation location.
    3. Generate a token named `warmup-layer`. If Hostinger offers a scope, restrict it to the
       outreach domain/mailbox. Copy the token immediately; it may be shown only once.
    4. Switch to the regular Apps Script tab → **Project Settings → Script Properties → Edit
       script properties → Add script property**. Property = `HOSTINGER_API_TOKEN`; Value = the
       complete Hostinger token. Save. Never put it in the Sheet or source code.

19. **[APPS SCRIPT → GOOGLE SHEET → RECEIVING GMAIL] Test the complete send path:**
    1. In Apps Script → **Editor → `Warmup.gs`**. Select `testHostingerConnection` in the
       function dropdown → **Run**.
    2. Switch to the Sheet → `WARMUP_LOG`. Find the new `CONNECTION_TEST` row. `OK`/HTTP 200
       means the API token and URL work. HTTP 401/403 means the token is wrong or mis-scoped.
       HTTP 404 means Hostinger moved the send endpoint; find the current send-message URL in
       its API documentation, then add `HOSTINGER_SEND_ENDPOINT` as a Script Property with the
       full URL as its Value and rerun the test.
    3. Back in Apps Script, temporarily add this at the bottom of `Warmup.gs`, replacing the
       placeholder with a Gmail inbox you can check:

       ```javascript
       function testSendToMe() {
         return sendWarmupEmail('YOUR_PERSONAL@gmail.com', 'Connection test', 'Testing the warm-up pipe.');
       }
       ```

       Save → select `testSendToMe` in the function dropdown → **Run**. After the test arrives,
       delete the temporary function and save again.
    4. In the receiving Gmail, open the message → message **⋮ menu → Show original**. Confirm:
       - **SPF: PASS**, **DKIM: PASS**, and **DMARC: PASS**;
       - DKIM's `d=` value is the outreach domain;
       - the `Received:` chain shows Hostinger with no Google sending hop.
       Stop and fix authentication before installing triggers if any check fails.

20. **[APPS SCRIPT] Install exactly three triggers:**
    1. In the `Manual Email Warmup` Apps Script project, click **Triggers** (clock icon in the
       left rail) → **+ Add Trigger** at bottom-right.
    2. Add and save each row separately:

       | Function | Event source | Type | Time |
       |---|---|---|---|
       | `runWarmupSendTrigger` | Time-driven | Day timer | 9am to 10am |
       | `runWarmupEngagementTrigger` | Time-driven | Hour timer | Every hour |
       | `refreshWarmupSummary` | Time-driven | Day timer | 7pm to 8pm |

    3. Final check: the Triggers page shows exactly three rows. The layer now runs itself. Check
       `Warmup Command Center → DAILY_SUMMARY` weekly and follow the launch taper in Part 6.

---

## Part 4 — Enrichment: raw company → sendable contact

The full machine, end to end:

```
Prospect_Research_Staging.xlsx (229 employer prospects, four exact tool queues)
   ↓ you: company + decision-maker research (step 21)
Ready row → COMPANIES + CONTACTS
   ↓ runContactDiscoveryTrigger()    — Hunter finds the email (spends credits)
   ↓ runContactVerificationTrigger() — ZeroBounce verifies (spends credits)
   ↓ runPersonalizationDraftTrigger() — Gemini drafts a line from the company site (free)
   ↓ you: review/edit each draft → copy into personalizationLine
   ↓ runQueueBuilderTrigger()        — promotes verified+approved rows to QUEUE
   ↓ runPreparationPipeline()        — ApprovalGate final check; writes subject/body, PREPARED
   ↓ you: copy into Hostinger Webmail, send, Cold Email → Mark selected email sent
```

21. **Run the four research lanes (continuous while warm-up runs):**

    **One-time account setup — keep the outreach mailbox out of these tools:**
    1. Create one legitimate free account at [Apollo](https://app.apollo.io),
       [Prospeo](https://prospeo.io/sign-up), [Skrapp](https://skrapp.io), and
       [Snov.io](https://snov.io). Use **`savetime@goldflamingoai.com`** for account ownership
       and product notifications, not `adam@goldflamingoailabs.com`.
    2. Do **not** connect either mailbox, import a sending list, create a sequence, enable a
       warm-up feature, or send outreach from any research tool. Hostinger remains the only
       campaign sender and Warmup Inbox remains the only automated warm-up service.
    3. Use one account per service. Do not use aliases, VPNs, or duplicate free accounts to
       evade limits. Free plans can be restricted for that behavior.
    4. Current free allowances (checked 2026-07-20; confirm the account page before spending):
       Apollo lists 900 annual credits granted monthly; Prospeo gives 100/month; Skrapp gives
       50/month plus 10 people searches/day and 5 company searches/day; Snov's Trial gives
       50/month. Research-tool verification never replaces the final ZeroBounce check.

    **The same row-by-row process for every assigned tool:**
    1. Open [`Prospect_Research_Staging.xlsx`](business-lists/Prospect_Research_Staging.xlsx) →
       `MASTER_QUEUE`. Filter `assignedTool` to the tool you are working and `reviewStatus` to
       `Not Started`. The matching named tool tab is the audit list; do not type research into
       it.
    2. Set the row to `In Progress`. Search the **exact legal company name + Massachusetts
       city**. When you have a domain, rerun the search by domain; domain is stronger than a
       name match.
    3. Confirm at least three signals before accepting the company: legal/brand name, official
       domain, Massachusetts location, matching industry, or matching LinkedIn company page.
       A directory, social profile, franchise parent, similarly named company in another state,
       or parked domain is not the official website.
    4. In `MASTER_QUEUE`, enter `website` as a bare domain, `industry`, the displayed
       `employeeSize` band, and a full `sourceUrl`. Preserve useful grant/source context already
       present; do not overwrite it with tool marketing copy.
    5. Search the matched company's people. Choose **one** person in this order:
       Owner/Founder/CEO/President → COO/General Manager/Operations leader → HR/People leader →
       Training/Learning & Development leader. Reject advisors, former employees, consultants,
       generic inboxes, and people whose employer does not match.
    6. Enter `decisionMakerFirstName`, `decisionMakerLastName`, exact `title`, and the person's
       full `linkedinUrl`. Add a factual personalization lead in `researchNotes` if one appears;
       do not invent one.
    7. Email discovery is optional in this pass. If the assigned service can return one
       business email within the lane's budget, reveal **one person only**, then enter
       `discoveredEmail` and `emailSource`. Never use a personal Gmail/Yahoo/Outlook address.
       Do not spend a second credit chasing another person at the same company.
    8. Set `matchConfidence`: `High` only when company/domain/location and person/employer/title
       all agree; `Medium` when a legal-name/brand or location mismatch is defensible and
       explained; `Low` when anything material remains uncertain. Set `Needs Review` for Low.
    9. Set `reviewStatus=Ready` only when `website`, `industry`, `employeeSize`, `sourceUrl`,
       decision-maker first/last name, title, and `linkedinUrl` are complete and the match is
       High or reviewed Medium. Use `Rejected` for a closed, duplicate, out-of-state, consumer-
       only, or otherwise unusable company.

    **Exact lane instructions and pacing:**
    1. **Apollo — `APOLLO_59`, 59 rows:** work roughly 10 companies per session for six
       sessions. Search **Companies** by exact name + city, confirm the company, open its
       **People** view, and capture one decision-maker. Do not click **Access email** in this
       first pass; preserve Apollo's monthly credits for hard cases. If Apollo has no reliable
       company/person match, set `Needs Review` and explain why.
    2. **Prospeo — `PROSPEO_70`, 70 rows:** use **Company Search**, inspect free visible
       results, and enrich only an exact company match. Company enrichment costs one credit;
       reserve **70 of the 100 monthly credits** for these rows and keep 30 for person/email
       exceptions. Work 10–15 rows per session. Never select more than the exact assigned row
       and never bulk-enrich the whole source list.
    3. **Skrapp — `SKRAPP_50`, 50 rows:** use **Companies Search** for no more than **5 assigned
       companies/day**, then **People Search** for no more than one chosen decision-maker per
       company (the free cap is 10 people searches/day). Ten research days clears the queue.
       Viewing searches is free; reveal/enrich at most one email per company and stop at the
       50-credit monthly allowance.
    4. **Snov — `SNOV_50`, 50 rows:** use **Database Search** to confirm the company, then
       **Domain Search** or the company profile only for the one target person. Budget **one
       credit per assigned company**; 10 companies/session over five sessions clears the
       queue. Do not connect the Hostinger mailbox, use Snov campaigns, or activate Snov's
       warm-up slot.
    5. **GetProspect fallback — no preassigned rows:** create one free account only after a
       primary lane produces `Needs Review` or finds the person but no usable email. Its free
       plan currently includes 50 valid email finds and 100 verifications/month. Search the
       exact domain + known name/title, reveal one result, record `emailSource=GetProspect`,
       and return to the primary row. It is an exception queue, not a fifth copy of all 229
       companies.

    **Move completed rows into the campaign:** follow Part 2 step 9.6–9.9. Paste Ready A:H
    values from `IMPORT_READY` into `COMPANIES`, then add the same row's person fields to
    `CONTACTS`. `CONTACTS.company` must match `COMPANIES.company` verbatim; leave `contactId`
    blank. If no email was found, leave `email` blank for Hunter. If one was found, copy it but
    still run ZeroBounce before anything reaches QUEUE.

22. **Run the enrichment functions** — all in the **campaign project**, all selected from the
    function dropdown with **`Code.gs` open**, all manual-run:
    1. **`runContactDiscoveryTrigger`** — processes up to `CONTACT_DISCOVERY_BATCH_SIZE`
       CONTACTS rows that have a blank email. Each successful row gets `email`, `catchAll`,
       `roleIsRelevant`, `maConfirmed`, `wtfpRelevance`, `source=hunter` filled. **Each
       processed row spends ~1 Hunter credit** (25/month free).
       - After each run, open **ACTIVITY_LOG** (newest rows at the bottom): `DISCOVERY_EMAIL_FOUND`
         per success; `DISCOVERY_SKIPPED_NO_DOMAIN` means the company name didn't join to
         COMPANIES (fix the name, step 21.5); `DISCOVERY_NO_EMAIL` means Hunter struck out
         (park it for the Phase 5 scraper). The closing `DISCOVERY_RUN_COMPLETE` row shows
         `{processed, discovered, skipped}`.
       - Re-run until `processed: 0` — that means no blank-email rows remain (or your credits
         are gone for the month).
    2. **`runContactVerificationTrigger`** — processes up to `CONTACT_VERIFICATION_BATCH_SIZE`
       rows that have an email but blank `verificationResult`. Writes ZeroBounce's status
       (`valid`, `invalid`, `catch-all`, …). **~1 ZeroBounce credit per row.** A row whose API
       call fails stays blank and retries next run. Only `valid` rows ever reach QUEUE.
       - **Timing matters:** run small batches anytime, but save the big burst for the last
         1–2 weeks before launch (Gotcha #3 — verification freshness decays).
    3. **`runPersonalizationDraftTrigger`** — for rows missing `personalizationLine`, fetches
       the company website, has Gemini draft one factual sentence into
       **`personalizationDraft`** (free; batch-capped by `PERSONALIZATION_BATCH_SIZE`).
       - Then **you review**: read each draft, edit until it sounds like you and is actually
         true, and **copy/paste it into `personalizationLine`**. The pipeline only ever reads
         the human-approved column. `DRAFT_SKIPPED_NO_WEBSITE` / `DRAFT_SKIPPED_FETCH_FAILED`
         rows in ACTIVITY_LOG need a hand-written line.
    4. **`runQueueBuilderTrigger`** — promotes every CONTACTS row that is verified `valid`,
       role-relevant, MA-confirmed, not catch-all, never emailed, and not suppressed into
       **QUEUE** with `status=QUEUED`, `sequenceStep=1`. Free, idempotent (dedupes against
       existing QUEUE rows) — run it whenever.
       - Check the `QUEUE_BUILD_COMPLETE` row in ACTIVITY_LOG: `skipReasons` tells you exactly
         why rows didn't promote (`not_verified_valid`, `role_not_relevant`, …).
    5. **`runEnrichmentPipeline`** chains 1 → 2 → 4 in one click (personalization stays
       separate on purpose — it has a human step in the middle).

23. **Personalization review** — fold into your research/enrichment sessions: every contact you
    intend to queue needs a human-approved `personalizationLine` before `runPreparationPipeline`
    will pass it (ApprovalGate hard-blocks blanks).

---

## Part 5 — Free-tier mining strategy (+ the two purchases)

Free-plan figures below were checked on **2026-07-20**; confirm each account page before a
session because providers change quotas without preserving old documentation.

| Service | Current free allowance | Role in this plan |
|---|---|---|
| data.mass.gov (Socrata) | Unlimited | Company sourcing (Phase 5 build — roadmap #10) |
| Website scraper + Gemini | Unlimited | Email extraction from company sites (Phase 5) |
| Pattern-guess + MX check | Unlimited | Free Hunter-bypass, verified by ZeroBounce (Phase 5) |
| [Apollo](https://www.apollo.io/pricing) | 900 annual credits granted monthly | 59-company web research lane; avoid reveals in first pass |
| [Prospeo](https://help.prospeo.io/en/article/how-to-create-an-account-on-prospeo-for-free-5inxir/) | 100 credits/month | 70-company lane; reserve 70 company credits + 30 exceptions |
| [Skrapp](https://skrapp.io/pricing) | 50 credits/month; 10 people + 5 company searches/day | 50-company lane paced over 10 research days |
| [Snov](https://snov.io/knowledgebase/pricing-plans-overview/) | 50 credits/month | 50-company lane; one credit maximum per company |
| [GetProspect](https://getprospect.com/pricing) | 50 valid emails + 100 verifications/month | Fallback only after a primary lane fails |
| Hunter | 25 finds/mo | Fallback finder for the holdouts |
| ZeroBounce | PAYG pack | Verify **everything**, every source, always |

Cadence math: 3 sends/day ≈ 65–90 contacts/month. The four exact workbook lanes can be
researched during the remaining warm-up window without duplicating a company across services.
Do not assume credits roll over: Prospeo/Snov reset; Skrapp's free plan does not advertise
rollover; Apollo credits expire at the billing-cycle boundary. GetProspect is the exception and
currently rolls unused credits up to one monthly allowance. **Week 5–6:** if the backlog is big,
buy one Hunter Starter month (~$40 ≈ 500 finds ≈ 5–6 months runway), batch-process, cancel
before renewal (calendar reminder — monthly billing only, never annual: Gotcha #4).

**Verification freshness (Gotcha #3):** discovery barely decays; verification does. Discover
early and continuously; run the big *verification* burst in the last 1–2 weeks before launch.

---

## Part 6 — Smoke test & launch (week 6–8 from warm-up start)

Preconditions: warm-up window elapsed with no critical warnings (Warmup Inbox dashboard +
Postmaster Tools), QUEUE populated, personalization lines human-approved, templates in place.

26. **Smoke test — every step, in order:**
    1. **Create the test contact.** Add a row to **CONTACTS** using an email address **on a
       domain you own** — an alias on the outreach domain is perfect. Not gmail/yahoo/icloud/
       hotmail — ApprovalGate hard-blocks personal domains and the test would fail for the
       wrong reason. Fill every gate field explicitly:
       - `company`: any real value also present in COMPANIES (or add a matching COMPANIES row)
       - `firstName`/`lastName`/`title`: anything
       - `email`: your owned test address
       - `maConfirmed`: `TRUE` — `roleIsRelevant`: `TRUE` — `verificationResult`: `valid`
         (lowercase — the check is exact) — `catchAll`: `FALSE` — `wtfpRelevance`: `TRUE` —
         `employeeSizeFit`: `TRUE` — `industryFit`: `TRUE`
       - `personalizationLine`: one real sentence — `emailsSent`: `0` — `status`: leave blank
    2. Run **`runQueueBuilderTrigger`** (campaign project, `Code.gs`). Verify the QUEUE tab
       gained a row for the test contact with `status=QUEUED`, `sequenceStep=1`. (If not,
       read `skipReasons` in ACTIVITY_LOG's `QUEUE_BUILD_COMPLETE` row — it names the exact
       failing field.)
    3. Run **`runPreparationPipeline`**. Verify the QUEUE row now shows `status=PREPARED`
       with a rendered `subject` and `body` (placeholders replaced — no `{{...}}` left) and
       a `preparedAt` timestamp. If it was skipped instead, ACTIVITY_LOG's
       `EMAIL_PREPARATION_SKIPPED` row lists the failed checks verbatim.
    4. **Send it by hand:** log into Hostinger Webmail (hPanel → Emails → the outreach
       mailbox → **Webmail**, or [webmail.hostinger.com](https://webmail.hostinger.com)) →
       Compose → To: the test address → copy `subject` and `body` from the QUEUE row →
       Send.
    5. **Record the send:** in the spreadsheet, click anywhere on the test contact's **QUEUE
       row** to select it → menu **Cold Email → Mark selected email sent**. Verify: QUEUE
       `status=SENT` + `sentAt` filled; CONTACTS `status=SENT`, `emailsSent=1`,
       `lastSentAt` filled. Run it twice on purpose — the second run must report
       already-sent and change nothing (idempotency check).
    6. Run **`runDashboardRefreshTrigger`** → DASHBOARD shows `emails_sent_total = 1`,
       `emails_prepared_total ≥ 1`, `daily_remaining = DAILY_LIMIT − 1`.
    7. **Authentication check on the received message:** open it → ⋮ → **Show original** →
       SPF `PASS`, DKIM `PASS` with `d=` the outreach domain, DMARC `PASS`, Hostinger-only
       `Received:` chain. This is the same check as warm-up step 19.4 — it must still pass
       on the campaign path.
    8. **Reply-loop check:** reply to the email from the test inbox, then select the contact's
       row → **Cold Email → Mark selected contact replied** → CONTACTS `status=REPLIED`, and
       any open QUEUE rows for that contact flip too.
    9. Clean up: delete the test rows from CONTACTS and QUEUE (or leave them — `REPLIED` is
       terminal; nothing will touch them again).

27. **Start real sends: 3/day by hand, never bulk.** `DAILY_LIMIT` enforces the ceiling —
    don't raise it to clear a backlog (Gotcha #6).

28. **Taper the warm-up layer:** in the warm-up project's Script Properties set
    `WARMUP_MAX_PER_DAY=1` and `WARMUP_START_PER_DAY=1`; leave the triggers running. Warmup
    Inbox continues at low intensity in the background. Never stop either abruptly.

---

## Part 7 — Ongoing operations

**Daily — reply triage** (the system's job ends at REPLIED; yours begins):
- Interested → personal reply from Hostinger Webmail same day; move off-template; propose one
  concrete next step.
- Not interested → nothing further prepares; don't re-pitch.
- Opt-out language → **Mark selected contact unsubscribed** (suppression = the CAN-SPAM record).
- Auto-reply/OOO → not a reply; reset status if mismarked so follow-ups resume.

**Weekly — ~10 minutes:**
1. Postmaster Tools: reputation + spam-complaint rate (< 0.1%).
2. DMARC aggregate reports: SPF/DKIM aligned to the Hostinger path; investigate unknowns.
3. One free blacklist check (MXToolbox).
4. DASHBOARD: `bounce_rate` + `source_*_bounce_rate` — a source going bad gets benched.
5. Sheet backup: File → Make a copy (dated) → Drive Backups folder. Extra copy before any bulk
   edit.

---

## Gotchas (carried forward, current)

1. **Apps Script limits:** 6 min/run, 90 min/day of triggers, 20k URL fetches/day — this is why
   every enrichment function is batch-capped; click it multiple times for big lists.
2. **Hunter returns a guess** with a confidence score, not a verified address. Never skip
   ZeroBounce, even on high-score finds.
3. **Verification decays, discovery doesn't** — burst-verify near launch, not at week 0.
4. **Monthly billing only** on any subscription you plan to burst-and-cancel. ZeroBounce is
   PAYG — buy once, no subscription exists.
5. **Personal-domain contacts (gmail/yahoo) are hard-blocked** by ApprovalGate on purpose.
   "Email does not use a business domain" in ACTIVITY_LOG is the gate working, not a bug.
6. **DAILY_LIMIT applies even with a full QUEUE** — intentional young-domain protection.
7. **`employeeSizeFit`/`industryFit` are stamped TRUE** on the pre-qualified WTFP list. The
   Phase 5 criteria filter computes them for real on sourced leads — don't reuse the stamp for
   broader sources.
8. **CONTACTS.company must match COMPANIES.company verbatim** or discovery can't resolve the
   domain and skips the contact.
9. **One warm-up tool per mailbox.** The manual layer is engineered to coexist with Warmup
   Inbox (different traffic shape); a second pool tool is not.
10. **No `GmailApp` anywhere, ever** — the tests and CI enforce it. The campaign project's Gmail
    era is over; the warm-up project talks to Gmail only via per-account OAuth REST calls.
11. **Codex is retired from this repo's active work** — Claude builds directly; `PHASES.md` is
    still the roadmap of record and gets updated with every merged PR.
12. **CAN-SPAM baseline:** truthful From/subject, physical mailing address in the body, honored
    opt-out logged to SUPPRESSION. Massachusetts consumer-protection rules exist on top — at
    3/day with human review you're in the most defensible posture there is; keep it that way.
13. **OAuth refresh tokens die in 7 days if the Cloud app stays in "Testing" status** — the
    warm-up consent screen must be published to Production (Part 3, step 14.6) or the seed
    loop silently stops in week 2.

---

*Superseded references: `docs/LAUNCH-RUNBOOK.md` (Gmail-era archive). Depth references:
`docs/HOSTINGER-RUNBOOK.md` (operational detail), `manual-email-warmup-gmail/README.md`
(warm-up internals), `PHASES.md` (build history + Phase 5 specs when they land).*
