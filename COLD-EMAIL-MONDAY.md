# Cold Email Monday — The Master Go-Live Document

**This is the one document.** Work it top to bottom and the campaign goes from merged code to
sending 3/day with a warmed domain, an enrichment pipeline, and free-tier lead mining. Detail
references (`docs/HOSTINGER-RUNBOOK.md`, `manual-email-warmup-gmail/README.md`, `PHASES.md`)
exist for depth, but every step you must *do* is written inline here, in order.
`docs/LAUNCH-RUNBOOK.md` is the retired Gmail-era archive — never follow it.

Status date: **2026-07-19**. All code through PR #69 is merged. The Warmup Inbox automated
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
| 2 | 1 | Upload the Express Training company list → `COMPANIES` (Part 2) | setup | You | ⬜ |
| 3 | 1 | Templates (steps 1–3) + SETTINGS + script properties (Part 2) | setup | You | ⬜ |
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
| 11 | 1+ | Apollo manual research → CONTACTS rows (Part 4, continuous) | ops | You | ⬜ |
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

## Part 1 — Deploy the code (one sitting)

All steps in this Part happen in the **campaign project** (Sheet → Extensions → Apps Script).

1. **Paste all 25 files from `src/`** over their same-named files; create any that don't exist
   yet (＋ → Script). New since your last paste: `CampaignStateService`, `GeminiClient`,
   `PersonalizationDraftService`, `RoleRelevanceFilter`, `ContactDiscoveryService`,
   `ContactVerificationService`, `QueueBuilder`. Safest play: paste all 25 so the editor exactly
   matches the repo.

2. **Replace `appsscript.json`** (Project Settings → "Show appsscript.json"). The Gmail scope is
   intentionally gone; pasting drops it.

3. **Script properties** (Project Settings → Script Properties), per `PROPERTIES.example`:
   `SPREADSHEET_ID`, `HUNTER_API_KEY`, `ZEROBOUNCE_API_KEY`, `GEMINI_API_KEY`
   (free key from [aistudio.google.com](https://aistudio.google.com)). `APOLLO_API_KEY` only if
   you ever use the dormant Apollo client.

4. **Authorize the reduced scope set** by running one function:
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

5. **Verify the Cold Email menu and columns:**
   1. Go back to the spreadsheet browser tab and **reload the page** (F5 / Cmd-R).
   2. Within ~5 seconds of loading, a **Cold Email** menu appears in the menu bar (right of
      "Help"). If it doesn't, the `onOpen` function isn't deployed — re-check that
      `CampaignStateService.gs` was pasted, then reload again.
   3. Click **Cold Email → Set up Hostinger columns**. (Safe to run even though step 4 already
      did this — it only adds columns that are missing.)
   4. Verify: the **QUEUE** tab's header row (row 1) now includes `sequenceStep`, `subject`,
      `body`, `preparedAt`, `sentAt`; the **CONTACTS** tab's header row includes `status`,
      `emailsSent`, `lastSentAt`.

6. **Triggers** — in the campaign project's editor, click the **clock icon (Triggers)** in the
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

7. **QUEUE header check (do not skip):**
   1. Open the **QUEUE** tab and read its header row (row 1).
   2. It must contain **all 16** of these headers (any order, extra columns are fine):
      `contactId`, `email`, `firstName`, `lastName`, `company`, `title`, `maConfirmed`,
      `roleIsRelevant`, `verificationResult`, `catchAll`, `wtfpRelevance`, `employeeSizeFit`,
      `industryFit`, `personalizationLine`, `emailsSent`, `status`.
   3. For each one missing: click the first empty cell in row 1 and type the header exactly as
      written above (camelCase; matching is case/space-insensitive but exact names keep the
      sheet readable).
   4. Why this matters: QueueBuilder and FollowUpScheduler copy contact values into QUEUE **by
      matching header names**. A missing QUEUE column arrives blank, and ApprovalGate then
      skips every prepared row with confusing failed checks.

8. **SETTINGS cleanup (removes dead keys):**
   1. Open the **SETTINGS** tab.
   2. Find any row whose key (column A) is `DRAFT_ONLY`, `REPLY_MONITOR_LOOKBACK_DAYS`,
      `REPLY_MONITOR_MAX_THREADS`, `BOUNCE_MONITOR_LOOKBACK_DAYS`, or
      `BOUNCE_MONITOR_MAX_THREADS`.
   3. For each: right-click the row number on the far left → **Delete row**.
   4. These keys are ignored by the current runtime; deleting them prevents future confusion
      about what's live.

---

## Part 2 — Data foundation (same sitting)

9. **Upload the company list → `COMPANIES`.** The import function (`runImportPipeline`) takes
   the rows as an argument, so it can't be run from the editor's Run button — paste directly
   into the tab and apply its cleaning rules yourself:
   1. Open the **COMPANIES** tab. Confirm header row 1 reads:
      `company | website | industry | city | state | employeeSize | sourceUrl | wtfpRelevance`.
   2. In your source spreadsheet/CSV, arrange columns in exactly that order.
   3. Normalize before pasting (this is what the import code would have done):
      - **website**: lowercase, strip `http://`/`https://`, strip leading `www.`, strip any
        trailing `/` — e.g. `https://www.AcmeCo.com/` becomes `acmeco.com`.
      - **state**: `MA` for every row (this list is Massachusetts-only by definition).
      - **wtfpRelevance**: `TRUE` for WTFP grantees, `FALSE` otherwise.
      - **No duplicate websites** — in your source sheet, sort by the website column and delete
        exact repeats. The `website` value is the dedupe key for all future mining.
   4. Click cell **A2** of COMPANIES and paste. Spot-check a few rows landed in the right
      columns.
   5. This must happen **before any mining** — `COMPANIES` is the dedupe baseline. If the list
     was already imported earlier, verify the row count matches your source and move on.

10. **Templates — one row per sequence step.** Open the **TEMPLATES** tab:
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

11. **SETTINGS rows.** Open the **SETTINGS** tab:
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

12. **Add the `lastName` column + fix `linkedin` → `linkedinUrl`:**
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

14. **Google Cloud project + Gmail API + OAuth client** (one-time, ~15 minutes):
    1. In a browser signed into your **designated low-activity seed Gmail** (never the
       business account), go to [console.cloud.google.com](https://console.cloud.google.com).
       First visit: accept the terms prompt.
    2. Click the **project picker** in the top bar (says "Select a project") → **New Project**
       → Name: `warmup-infra` → **Create** → when the notification pops, **Select project**.
    3. **Enable the Gmail API:** ☰ menu → **APIs & Services → Library** → search `Gmail API`
       → click it → **Enable**.
    4. **Consent screen:** ☰ → **APIs & Services → OAuth consent screen** (newer consoles
       call this **Google Auth Platform → Branding**; same settings, different label).
       - User type: **External** → Create.
       - App name: `warmup-infra`; User support email: this Gmail; Developer contact: this
         Gmail. **Save and Continue** through the Scopes page (add nothing) and Summary.
    5. **Add the 8 test users:** on the consent screen page → **Audience** (or "Test users"
       section) → **+ Add users** → enter all 8 seed Gmail addresses → **Save**.
    6. **⚠ Publish the app — do not skip.** On the same page, set Publishing status to
       **In production** (button reads **Publish app**; confirm the warning — no verification
       needed). Reason: refresh tokens minted while an app is in *Testing* status **silently
       expire after 7 days**, which would kill the warm-up loop mid-ramp. Published-unverified
       tokens don't expire; the only cost is an extra "unverified app" warning during the
       consent flow in step 15 — expected, click through it.
    7. **Create the OAuth client:** ☰ → **APIs & Services → Credentials** → **+ Create
       Credentials → OAuth client ID** →
       - Application type: **Web application**
       - Name: `oauth-playground`
       - **Authorized redirect URIs** → + Add URI: `https://developers.google.com/oauthplayground`
         (exact string, no trailing slash)
       - **Create** → a dialog shows the **Client ID** and **Client secret** — copy both
         somewhere safe. (Web application type + that redirect URI is what lets the OAuth
         Playground mint your tokens in the next step.)

15. **Generate the 8 refresh tokens** (repeat this loop once per seed account, ~3 min each):
    1. Open a browser window signed into **only the seed account you're minting** — use a
       separate Chrome profile or an Incognito window and sign in fresh. If multiple Google
       accounts share the session, the consent screen may bind the token to the wrong one.
    2. Go to [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
    3. Click the **⚙ gear icon** (top right) → check **"Use your own OAuth credentials"** →
       paste the **Client ID** and **Client secret** from step 14.7 → Close.
    4. In the left panel, **Step 1**: ignore the API list — type directly into the
       **"Input your own scopes"** field: `https://mail.google.com/` → click
       **Authorize APIs**.
    5. Google's consent flow opens: pick the seed account → "Google hasn't verified this app"
       → **Advanced → Go to warmup-infra (unsafe)** (it's your own app) → **Allow**.
    6. Back in the Playground, **Step 2**: click **Exchange authorization code for tokens** →
       copy the **Refresh token** value (starts with `1//`).
    7. Store it immediately in the **warm-up project's** Script Properties (created in step
       17) as `SEED_TOKEN_1` … `SEED_TOKEN_8` — one property per account, and write down
       which Gmail address got which number; you'll need the mapping in step 18.
    8. Between accounts: click the gear → keep credentials; sign out of the seed account or
       switch profiles, then repeat from 15.1 with the next one.

16. **Hostinger Email API token:**
    1. Log into [hpanel.hostinger.com](https://hpanel.hostinger.com) → **Emails** → select
       the **outreach domain** (never the business domain).
    2. Find the **API** section — as of the current panel it lives in the email management
       page's **API / Email API** tab (Hostinger occasionally moves it; if you can't find it,
       open [api.mail.hostinger.com](https://api.mail.hostinger.com) — the API docs state
       where tokens are generated, currently the *Email provisioning* tab).
    3. **Generate a token**, name it `warmup-layer`, and if the panel offers scoping, scope it
       to the outreach domain's order/mailbox. **Copy it immediately** — it's shown once.
    4. It becomes the `HOSTINGER_API_TOKEN` script property in the warm-up project (step 17).
    5. Note: the exact send-endpoint path is verified programmatically in step 19 — if
       Hostinger's docs show a different path than the code's default, you'll set the
       `HOSTINGER_SEND_ENDPOINT` property then. Don't chase it now.

17. **Create the warm-up Sheet + Apps Script project** — new Google Sheet named
    `Warmup Command Center` under the warm-up account; [script.google.com](https://script.google.com)
    → New project (standalone, same account) → paste the 5 files from
    `manual-email-warmup-gmail/src/` + its `appsscript.json` → fill Script Properties per
    `manual-email-warmup-gmail/PROPERTIES.example` (`WARMUP_SHEET_ID`, `WARMUP_FROM_EMAIL`,
    `WARMUP_START_DATE`, `HOSTINGER_API_TOKEN`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`,
    `SEED_TOKEN_1..8`, `GEMINI_API_KEY`).

18. **Initialize the sheet and register the seeds:**
    1. In the **warm-up project's** editor, open the file **`Warmup.gs`** → function dropdown
       → select **`setupWarmupSheet`** → **Run** → authorize (Sheets + external-request
       scopes only).
    2. Open the warm-up spreadsheet: four tabs now exist — `WARMUP_LOG`, `ENGAGEMENT`,
       `SEED_ACCOUNTS`, `DAILY_SUMMARY`.
    3. Open **SEED_ACCOUNTS** (headers: `email | tokenPropertyKey | active`) and fill rows
       2–9, one per seed:
       - `email` — the seed Gmail address.
       - `tokenPropertyKey` — the **exact Script Property name** holding that account's
         refresh token (`SEED_TOKEN_1`, `SEED_TOKEN_2`, …). This is the mapping you wrote
         down in step 15.7 — a mismatch here means the engagement loop silently acts as the
         wrong account or fails auth.
       - `active` — `TRUE`.

19. **Verify the Hostinger connection, then prove a real send:**
    1. In **`Warmup.gs`** (warm-up project) → function dropdown → **`testHostingerConnection`**
       → **Run**.
    2. Check the result: the `WARMUP_LOG` tab gains a `CONNECTION_TEST` row. `OK` + HTTP 200 →
       token and base URL are good. `ERROR` with HTTP **401/403** → the token is wrong or
       mis-scoped, redo step 16. HTTP **404** → the endpoint path moved: open
       [api.mail.hostinger.com](https://api.mail.hostinger.com), find the current *send
       message* endpoint, and add Script Property `HOSTINGER_SEND_ENDPOINT` = that full URL,
       then rerun.
    3. **One real test send.** The send function takes arguments, so give yourself a
       temporary button — add this at the bottom of `Warmup.gs`:

       ```javascript
       function testSendToMe() {
         return sendWarmupEmail('YOUR_PERSONAL@gmail.com', 'Connection test', 'Testing the warm-up pipe.');
       }
       ```

       Select `testSendToMe` in the dropdown → **Run** → then **delete the function** (it's
       scaffolding, not code to keep).
    4. In the receiving Gmail: open the message → **⋮ (three-dot menu, top right) → Show
       original**. Verify all three of:
       - **SPF: PASS**, **DKIM: PASS**, **DMARC: PASS** in the summary table at the top;
       - the DKIM line's **`d=` domain is the outreach domain** (not gmail.com, not
         hostinger.com);
       - the `Received:` chain shows **Hostinger mail servers with no google.com hop**.
       Any failure here means DNS/DKIM isn't aligned to the Hostinger path — stop and fix
       before installing triggers; warming up an unauthenticated path builds nothing.

20. **Install the 3 warm-up triggers** — warm-up project → clock icon (Triggers) →
    **+ Add Trigger**, three times:

    | Function | Event source | Type | Time |
    |---|---|---|---|
    | `runWarmupSendTrigger` | Time-driven | Day timer | 9am to 10am |
    | `runWarmupEngagementTrigger` | Time-driven | Hour timer | Every hour |
    | `refreshWarmupSummary` | Time-driven | Day timer | 7pm to 8pm |

    Save each. Final state: exactly three triggers listed. The layer now runs itself; your
    only job is the weekly `DAILY_SUMMARY` glance, and the taper at launch (Part 6).

---

## Part 4 — Enrichment: raw company → sendable contact

The full machine, end to end:

```
COMPANIES (loaded in Part 2)
   ↓ you: Apollo web UI research (step 21)
CONTACTS row: company, firstName, lastName, title, linkedinUrl — email blank
   ↓ runContactDiscoveryTrigger()    — Hunter finds the email (spends credits)
   ↓ runContactVerificationTrigger() — ZeroBounce verifies (spends credits)
   ↓ runPersonalizationDraftTrigger() — Gemini drafts a line from the company site (free)
   ↓ you: review/edit each draft → copy into personalizationLine
   ↓ runQueueBuilderTrigger()        — promotes verified+approved rows to QUEUE
   ↓ runPreparationPipeline()        — ApprovalGate final check; writes subject/body, PREPARED
   ↓ you: copy into Hostinger Webmail, send, Cold Email → Mark selected email sent
```

21. **Apollo research (continuous, no rush, completely free):**
    1. Create a free account at [app.apollo.io](https://app.apollo.io) (no card needed).
       Searching and viewing profiles costs nothing — only *revealing* an email/phone burns
       credits, and you never do that (Hunter + ZeroBounce do it cheaper).
    2. For each `COMPANIES` row that has no CONTACTS row yet: in Apollo, click **Search →
       Companies**, paste the company's website domain into the search box (domain beats name
       for exact matches), and open the company.
    3. Click the **People** tab on the company page → filter or scan **Job Titles** for your
       targets, in priority order: Owner / Founder / CEO / President → Operations
       Manager/Director → HR Manager → Training/L&D Manager. Pick **one** contact per company
       (the sequence logic emails one person per company at a time).
    4. From the person's profile, copy: first name, last name, exact title, and LinkedIn URL
       (right-click the LinkedIn icon → Copy link address). **Do not click "Access email."**
    5. Add the row to **CONTACTS**: `company` — **copy the cell value verbatim from the
       COMPANIES tab** (click the COMPANIES cell, Ctrl+C, paste — don't retype; discovery
       joins CONTACTS→COMPANIES on this exact name to find the domain, and "Acme" vs "Acme
       Inc." = no join = no email, Gotcha #8) — then `firstName`, `lastName`, `title`,
       `linkedinUrl`. Leave `email` and `contactId` blank (email is the fallback row key).
    6. While the profile is open, note anything personalization-worthy (a program they run, a
       recent post) in a scratch column — it makes draft review (step 23) faster.

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

23. **Personalization review** — fold into your Apollo/enrichment sessions: every contact you
    intend to queue needs a human-approved `personalizationLine` before `runPreparationPipeline`
    will pass it (ApprovalGate hard-blocks blanks).

---

## Part 5 — Free-tier mining strategy (+ the two purchases)

| Service | Free tier | Role |
|---|---|---|
| data.mass.gov (Socrata) | Unlimited | Company sourcing (Phase 5 build — roadmap #10) |
| Website scraper + Gemini | Unlimited | Email extraction from company sites (Phase 5) |
| Pattern-guess + MX check | Unlimited | Free Hunter-bypass, verified by ZeroBounce (Phase 5) |
| Hunter | 25 finds/mo | Fallback finder for the holdouts |
| Snov | ~50 finds/mo | Second finder (Phase 5 client) |
| ZeroBounce | PAYG pack | Verify **everything**, every source, always |

Cadence math: 3 sends/day ≈ 65–90 contacts/month. Free tiers + scraper cover it once Phase 5
lands. Bank credits monthly (they reset, don't roll over). **Week 5–6:** if the backlog is big,
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
