# Launch Runbook — Zero to Running Campaign

Everything to take the merged code live, in order. The code is done; this is the manual
deployment. Steps 1–2 take **weeks** (domain warm-up) — start them first and do
Steps 3–7 in parallel.

Legend: 🏠 = you do it by hand · ⏱️ = has a waiting period · ⚙️ = config

---

## Step 1 — 🏗️ IN PROGRESS (warm-up pending) — 🏠⏱️ Domain & inbox infrastructure

This is Phase 0 from `PHASES.md` — none of it is code, and the warm-up can't be rushed.

- [x] Buy a **secondary** cold-outreach domain (not your primary business domain).
- [x] Create an **isolated Google Workspace Business Starter** tenant on that domain (separate
  from your main account).
- [x] Configure **DNS**: MX records, SPF, DKIM, and DMARC (start at `p=none` monitoring mode).
- [x] Create the **sender identity**: real name, photo, signature, physical mailing address.
- [ ] Connect **Warmup Inbox** to the inbox and let it warm for **4–6 weeks before the
  first real send**. ⏱️ This is the long pole — do it first.
- [x] Set up **Google Postmaster Tools** for the domain to watch reputation.

---

## DEEP VENDOR SPECIFIC PLAYBOOK — Phase 0 domain, inbox, DNS, warm-up, and Postmaster

Use this section if you have never bought a domain, created Google Workspace, or edited DNS
records before. Do these steps in order. Keep a scratch document with: the domain you bought,
where DNS is hosted, the Workspace admin email, the sender email, and the date each DNS record
was added.

> **Placeholder used below:** replace `newdomain.com` with the real cold-outreach domain you buy.
> Do **not** use the primary business domain for this pilot.

### 0.1 ✅ DONE — Buy the secondary cold-outreach domain

Official / vendor links:
- Domain search examples: [Namecheap](https://www.namecheap.com/domains/), [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/), [GoDaddy](https://www.godaddy.com/domains), [Squarespace Domains](https://domains.squarespace.com/).
- Google help: [Identify your domain registrar](https://support.google.com/a/answer/48926).

Beginner steps:
1. Open a registrar site and search for a domain that is clearly related to the business but not
   the primary business domain.
2. Avoid deceptive lookalikes. Do not buy confusing variants that impersonate the primary domain.
3. Prefer a simple `.com` if available. If not, choose a normal business TLD you are comfortable
   using publicly.
4. Before checkout, confirm the domain spelling aloud and write it down in your scratch document.
5. Buy the domain.
6. In the registrar account, find the domain's **DNS**, **DNS records**, **Advanced DNS**, or
   **Zone editor** page. Leave that browser tab open; you will return to it repeatedly.
7. Turn on registrar account security immediately: strong password and 2-factor authentication.
8. Record these values in your scratch document:
   - Registrar name.
   - Login email.
   - Domain name.
   - DNS management page URL if available.

Done when: you can log into the registrar and see the DNS records page for `newdomain.com`.

### 0.2 ✅ DONE — Create the isolated Google Workspace Business Starter tenant

Official links:
- [Google Workspace pricing](https://workspace.google.com/pricing.html)
- [Sign up for a Google Workspace trial](https://knowledge.workspace.google.com/admin/getting-started/sign-up-for-a-free-google-workspace-trial)
- [Google Admin console](https://admin.google.com/)
- [Verify your domain for Google Workspace](https://support.google.com/a/answer/60216)

Beginner steps:
1. Open the Google Workspace pricing or trial page.
2. Choose **Business Starter** unless you have a specific reason to pay for a higher tier.
3. During sign-up, choose the option that says you already own a domain, then enter `newdomain.com`.
4. Create a brand-new admin account for this isolated tenant. Example: `admin@newdomain.com`.
5. Do **not** add this new domain into the primary company's existing Workspace tenant. The point is
   isolation from the primary account and primary domain.
6. Google will ask you to verify domain ownership. It usually gives you a TXT record.
7. In a second browser tab, open your registrar/DNS provider.
8. Add the verification TXT record exactly as Google shows it:
   - Type: `TXT`
   - Host/Name: usually `@` or blank, unless Google gives you a specific host.
   - Value/Content: paste Google's verification value exactly.
   - TTL: leave default unless Google tells you otherwise.
9. Save the DNS record.
10. Return to Google Workspace setup and click the verification button.
11. If verification fails, wait 10–30 minutes and try again. DNS changes can take time.
12. When verification succeeds, log into <https://admin.google.com/> as the new Workspace admin.
13. In Google Admin, create exactly one sender user for the pilot, preferably a real person's name.
    Example: `firstname@newdomain.com`.
14. Record the Workspace admin email and sender email in your scratch document.

Done when: `newdomain.com` is verified in Google Workspace and you can log into Gmail for the
sender inbox at <https://mail.google.com/>.

### 0.3 ✅ DONE — Configure DNS for Google Workspace Gmail delivery

Official links:
- [Set up MX records for Google Workspace](https://support.google.com/a/answer/140034)
- [Set up SPF](https://support.google.com/a/answer/33786)
- [Set up DKIM](https://support.google.com/a/answer/174124)
- [Recommended DMARC rollout](https://support.google.com/a/answer/10032473)
- [Google Admin Toolbox Dig](https://toolbox.googleapps.com/apps/dig/)

You will add four kinds of DNS records: MX, SPF, DKIM, and DMARC.

#### 0.3.1 ✅ DONE — Add Google MX records

MX records tell the internet that mail for `newdomain.com` should go to Gmail.

1. Open your registrar/DNS provider's DNS records page for `newdomain.com`.
2. Find existing `MX` records.
3. Delete old/default MX records that point to parking, forwarding, Microsoft, Zoho, or another
   provider. Keep only the Google Workspace MX record for this domain.
4. Add this record:

   | Field | Value |
   |---|---|
   | Type | `MX` |
   | Host / Name | `@` or blank |
   | Priority | `1` |
   | Value / Mail server / Destination | `smtp.google.com` |
   | TTL | Default, automatic, or `3600` |

5. Save the record.
6. Go to <https://admin.google.com/> → **Account** → **Domains** → **Manage domains**.
7. Click **Activate Gmail** for `newdomain.com` if Google has not already activated it.
8. Wait. Google says MX changes can take up to 72 hours, although they often work sooner.
9. Test receiving mail by sending a message from a personal Gmail account to
   `firstname@newdomain.com`.
10. Confirm the message arrives in the new Workspace Gmail inbox.

Done when: the sender inbox can receive external email.

#### 0.3.2 ✅ DONE — Add SPF

SPF tells receiving mail servers that Google is allowed to send mail for `newdomain.com`.

1. Confirm you are only sending through Google Workspace for Phase 0. If yes, use this SPF value:
   `v=spf1 include:_spf.google.com ~all`.
2. In your registrar/DNS provider, add or edit the root TXT record:

   | Field | Value |
   |---|---|
   | Type | `TXT` |
   | Host / Name | `@` |
   | Value / Content | `v=spf1 include:_spf.google.com ~all` |
   | TTL | Default, automatic, or `3600` |

3. Save the record.
4. Important: there should be only one SPF TXT record for the root domain. If another SPF record
   exists, merge needed senders into one record instead of creating duplicates.
5. Verify with Google Admin Toolbox Dig:
   - Open <https://toolbox.googleapps.com/apps/dig/>.
   - Enter `newdomain.com`.
   - Select `TXT`.
   - Confirm you see `v=spf1 include:_spf.google.com ~all`.

Done when: the domain has exactly one root SPF record and it includes Google.

#### 0.3.3 ✅ DONE — Add DKIM

DKIM signs outgoing mail so recipients can verify Google really sent it for your domain.

1. Wait 24–72 hours after Gmail is activated before generating DKIM if Google shows an error.
2. Go to <https://admin.google.com/>.
3. Navigate to **Apps** → **Google Workspace** → **Gmail** → **Authenticate email**.
4. Select `newdomain.com` in the domain dropdown.
5. Click **Generate new record**.
6. Choose `2048` bits if your DNS host supports it. If your DNS host rejects a long value, regenerate
   with `1024` bits.
7. Use the default selector `google` unless Google tells you there is a conflict.
8. Click **Generate**.
9. Google will show two values:
   - DNS Host name / TXT record name, usually similar to `google._domainkey`.
   - TXT record value, usually starting with `v=DKIM1; k=rsa; p=...`.
10. Do **not** click **Start authentication** yet.
11. In your registrar/DNS provider, add the TXT record exactly as Google shows it:

    | Field | Value |
    |---|---|
    | Type | `TXT` |
    | Host / Name | the host Google gives you, usually `google._domainkey` |
    | Value / Content | the full DKIM value Google gives you |
    | TTL | Default, automatic, or `3600` |

12. Save the record.
13. Wait 10–60 minutes.
14. Return to Google Admin → Gmail → Authenticate email.
15. Click **Start authentication**.
16. If Google says the record is missing, wait and retry. If it still fails, check for copied spaces,
    missing semicolons, line breaks, or DNS host formatting issues.
17. Send a test email from `firstname@newdomain.com` to a separate Gmail account.
18. In the recipient Gmail account, open the message → three-dot menu → **Show original**.
19. Confirm DKIM shows `PASS`.

Done when: Google Admin says DKIM is authenticating and a real received test message shows DKIM
`PASS`.

#### 0.3.4 ✅ DONE — Add DMARC in monitoring mode

DMARC tells recipients what to do when mail fails authentication. Start with `p=none` so nothing is
blocked while you are still verifying the setup.

1. Make sure SPF and DKIM have been configured first.
2. Decide where DMARC aggregate reports should go. For this MVP, create or use an address such as
   `dmarc@newdomain.com`. If you do not want to create that mailbox yet, use the admin inbox
   temporarily and change it later.
3. In your registrar/DNS provider, add this TXT record:

   | Field | Value |
   |---|---|
   | Type | `TXT` |
   | Host / Name | `_dmarc` |
   | Value / Content | `v=DMARC1; p=none; rua=mailto:dmarc@newdomain.com` |
   | TTL | Default, automatic, or `3600` |

4. Save the record.
5. Verify with Google Admin Toolbox Dig:
   - Open <https://toolbox.googleapps.com/apps/dig/>.
   - Enter `_dmarc.newdomain.com`.
   - Select `TXT`.
   - Confirm you see the DMARC value.
6. Leave DMARC at `p=none` during warm-up and the first smoke test. Do not tighten to quarantine or
   reject until you have reviewed reports and know all legitimate sending sources pass.

Done when: `_dmarc.newdomain.com` publishes a TXT record beginning with `v=DMARC1; p=none`.

### 0.4 ✅ DONE — Create the sender identity in Gmail

Official links:
- [Create a Gmail signature](https://support.google.com/mail/answer/8395)
- [Change your Gmail profile picture](https://support.google.com/mail/answer/35529)

Beginner steps:
1. Log into <https://mail.google.com/> as the sender, for example `firstname@newdomain.com`.
2. Upload a real professional profile photo for the account.
3. Open Gmail settings using the gear icon → **See all settings** → **General**.
4. Find **Signature**.
5. Create a plain, professional signature with:
   - Real sender name.
   - Company name.
   - Website.
   - Business phone if appropriate.
   - Physical mailing address.
6. Keep the signature simple. Avoid giant images, tracking-heavy banners, or many links.
7. Send a test email to your personal Gmail account.
8. Confirm the sender name, profile image, and signature look normal to a recipient.
9. Reply from the personal Gmail account and confirm replies arrive back in the sender inbox.

Done when: a real external recipient sees the intended sender name, profile, and signature, and
replies work.

### 0.5 ⏳ NOT STARTED — Connect Warmup Inbox and run warm-up

Official / vendor links:
- [Warmup Inbox](https://www.warmupinbox.com/)
- [Warmup Inbox help center](https://help.warmupinbox.com/)

Beginner steps:
1. Go to <https://www.warmupinbox.com/> and sign up for a plan for the new sender inbox.
2. **Before connecting**, turn on **2-Step Verification** on the isolated Workspace sender
   account (`firstname@newdomain.com`) if it isn't already on — Google Admin → Security →
   2-Step Verification, or from the account's own Google security settings.
3. Generate an **App Password**: Google Account → Security → 2-Step Verification → App
   passwords → create one named "Warmup Inbox." Copy it — Google shows it once.
4. In Warmup Inbox, choose **Google Workspace** as the provider and connect using the sender
   email + the **app password** — not the normal login password, which will not work once 2FA
   is on.
5. If Google asks for permission during the connection flow, read the consent screen carefully
   and approve only if it matches Warmup Inbox's documented connection flow.
6. In Warmup Inbox, complete any technical setup checklist it shows. Pay special attention to
   SPF, DKIM, DMARC, and inbox connection warnings — since DNS is already configured (Step 1),
   this should come back clean; fix DNS first if it doesn't.
7. Set warm-up to start conservatively. Do not start real cold outreach while the inbox is new.
8. Let Warmup Inbox run for 4–6 weeks before the first real send.
9. During warm-up, use the mailbox like a normal human business inbox:
   - Send a few genuine one-to-one messages.
   - Receive and reply to normal messages.
   - Avoid bulk sends, scraped lists, and attachments.
10. Check Warmup Inbox and Gmail at least weekly for warnings, disconnects, or deliverability
    issues.
11. Keep notes on the warm-up start date and any warnings you fix.

Done when: Warmup Inbox has run for 4–6 weeks, no critical technical warnings remain, and the
inbox has normal send/receive behavior.

### 0.6 ✅ DONE — Configure Google Postmaster Tools for the new domain

Official links:
- [Google Postmaster Tools](https://postmaster.google.com/)
- [Set up Postmaster Tools](https://support.google.com/mail/answer/9981691)
- [Postmaster Tools dashboards](https://support.google.com/mail/answer/9981691#dashboards)

Beginner steps:
1. Sign into the Google account that should own the Postmaster Tools setup. Usually this is the
   Workspace admin or sender account for `newdomain.com`.
2. Open <https://postmaster.google.com/>.
3. Click the add button, usually a `+` or **Add** button.
4. Enter the root sending domain: `newdomain.com`.
5. Google will show a DNS verification record, usually a TXT record.
6. Copy the verification value exactly.
7. In another tab, open your registrar/DNS provider's DNS page for `newdomain.com`.
8. Add the TXT record Google gave you:

   | Field | Value |
   |---|---|
   | Type | `TXT` |
   | Host / Name | `@` or the exact host Google shows |
   | Value / Content | the exact verification value from Postmaster Tools |
   | TTL | Default, automatic, or `3600` |

9. Save the DNS record.
10. Return to Postmaster Tools and click **Verify**.
11. If verification fails, wait 10–30 minutes, then click **Verify** again.
12. After verification succeeds, confirm `newdomain.com` appears in Postmaster Tools.
13. Do not panic if dashboards are empty at first. New/low-volume domains often have little or no
    data until Google has enough mail volume to report.
14. Optional: grant access to another Google account from the domain's **Manage** / access screen if
    someone else will monitor reputation.
15. During warm-up and smoke testing, check Postmaster Tools at least weekly for domain reputation,
    spam rate, authentication, and delivery errors.

Done when: `newdomain.com` is verified in Postmaster Tools and visible on the domains page.

### 0.7 🏗️ IN PROGRESS — Final Phase 0 acceptance checklist before moving on

Do not start Phase 1 live deployment or send smoke-test cold emails until every item below is true:

- [x] Secondary domain purchased and DNS access confirmed.
- [x] Separate Google Workspace tenant exists for the new domain.
- [x] Sender inbox exists and can send and receive external email.
- [x] MX points to Google Workspace.
- [x] SPF TXT record exists and includes Google.
- [x] DKIM is enabled and a received test message shows DKIM `PASS`.
- [x] DMARC exists at `_dmarc.newdomain.com` with `p=none`.
- [x] Sender profile photo, display name, signature, and physical mailing address are present.
- [ ] Warmup Inbox is connected and warming the inbox.
- [x] Google Postmaster Tools is verified for the domain.
- [x] The warm-up start date is written down.

---

## Step 2 — ✅ DONE — 🏠 Create the Google Sheet (this IS the database)

Status checklist:

- [x] Google Sheets file created.
- [x] All 10 required tabs created with exact names.
- [x] Header rows added for the MVP tabs.
- [x] Spreadsheet ID copied for Step 4.

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

Break this into lettered sub-phases so each piece can be tracked independently.

### Step 3.A — ✅ DONE — Create the bound Apps Script project and paste the manifest

- [x] From the Sheet: **Extensions → Apps Script** (creates a bound project).
- [x] **Manifest:** click the gear ⚙️ → "Show appsscript.json" → paste the contents of
  `appsscript.json` from the repo (sets V8 + the OAuth scopes). **Confirmed current** — the manifest
  was fixed to `https://mail.google.com/` (was `gmail.compose`, which didn't cover
  `ReplyMonitor`/`BounceMonitor`'s `GmailApp.search()` calls), re-pasted, and OAuth re-consented.
  Running the project manually produced no `REPLY_MONITOR_TRIGGER_ERROR`/
  `BOUNCE_MONITOR_TRIGGER_ERROR` rows in `ACTIVITY_LOG` — see `COLD-EMAIL-MONDAY.md`.

### Step 3.B — ✅ DONE — Foundation & pure logic files

- [x] Create one script file per foundation/pure-logic module and paste the contents from GitHub:
  `AuditLogger.gs` · `Cleaner.gs` · `Deduplicator.gs` · `MassachusettsFilter.gs` ·
  `LeadScorer.gs` · `TemplateEngine.gs` · `ApprovalGate.gs`

### Step 3.C — ✅ DONE — I/O module files

- [x] Create one script file per I/O module and paste the contents from GitHub:
  `ImportService.gs` · `DraftService.gs` · `SuppressionService.gs` · `ReplyMonitor.gs` ·
  `BounceMonitor.gs` · `FollowUpScheduler.gs` · `DashboardService.gs`

### Step 3.D — ✅ DONE — Optional Phase 3 API client files

- [x] Phase 3 API client files created and pasted from GitHub:
  `ZeroBounceClient.gs` · `ApolloClient.gs` · `HunterClient.gs`

### Step 3.E — ✅ DONE — Orchestrator file and save

- [x] Create `Code.gs` last and paste the orchestrator contents from GitHub.
- [x] Save. There should be **18 `.gs` files** plus the manifest when all optional Phase 3 files
  are included.

> Whenever a PR merges later, re-paste that one changed `.gs` file here — Apps Script has
> no auto-deploy.

---

## Step 4 — ⚙️ Script Properties (secrets & the sheet link)

Break Script Properties into lettered sub-phases so required setup is separated from optional
Phase 3 API keys.

Apps Script editor → **Project Settings** (gear) → **Script Properties**.

### Step 4.A — ✅ DONE — Required spreadsheet link

- [x] Add `SPREADSHEET_ID` with the ID from Step 2. This is **required — everything** depends on it.

### Step 4.B — Optional Phase 3 API keys

Skip these entirely for the Phase 1–2 manual-CSV workflow.

- [ ] `ZEROBOUNCE_API_KEY` — Phase 3 only
- [ ] `APOLLO_API_KEY` — Phase 3 only
- [ ] `HUNTER_API_KEY` — Phase 3 only

(See `PROPERTIES.example` in the repo.)

---

## Step 5 — ⚙️ SETTINGS tab values

In the `SETTINGS` tab, add these as `key` / `value` rows. Break the settings into lettered
sub-phases so the required core-loop values are tracked separately from monitor and optional API
settings.

### Step 5.A — ✅ DONE — Required Phase 1 core loop settings

| key | example value | meaning |
|-----|---------------|---------|
| `DRAFT_ONLY` | `TRUE` | Keep TRUE — creates drafts, never auto-sends. **Leave TRUE for the entire MVP.** |
| `DAILY_LIMIT` | `10` | Max campaign drafts/day |
| `APPROVAL_THRESHOLD` | `75` | Min lead score (0–100) to draft |
| `SENDER_NAME` | `Your Name` | Merge field for templates |

### Step 5.B — Phase 2 monitor settings

| key | example value | meaning |
|-----|---------------|---------|
| `REPLY_MONITOR_LOOKBACK_DAYS` | `14` | How many days of Gmail threads ReplyMonitor checks |
| `REPLY_MONITOR_MAX_THREADS` | `50` | Max Gmail reply threads checked per monitor run |
| `BOUNCE_MONITOR_LOOKBACK_DAYS` | `14` | How many days of Gmail threads BounceMonitor checks |
| `BOUNCE_MONITOR_MAX_THREADS` | `50` | Max Gmail bounce/NDR threads checked per monitor run |
| `FOLLOW_UP_DELAY_DAYS` | `4` | Days to wait before drafting a follow-up |
| `FOLLOW_UP_MAX_EMAILS` | `3` | Maximum emails in a campaign sequence |

### Step 5.C — Optional Phase 3 API client settings

Only add these when you start Phase 3:

- [ ] `APOLLO_CONTACT_SEARCH_URL`
- [ ] `APOLLO_CONTACT_SEARCH_PAGE_SIZE`
- [ ] `HUNTER_EMAIL_FINDER_URL`
- [ ] `HUNTER_EMAIL_VERIFIER_URL`
- [ ] `ZEROBOUNCE_VALIDATE_URL`
- [ ] `ZEROBOUNCE_CREDITS_URL`
- [ ] `ZEROBOUNCE_TIMEOUT_SECONDS`

### Step 5.D — Template row

- [ ] Add at least one row to the `TEMPLATES` tab: a `subject` and a `body`. The body may use
  `{{firstName}}`, `{{company}}`, `{{personalizationLine}}`, `{{senderName}}`.

---

## Step 6 — ⚙️ Authorize & install triggers

1. ✅ DONE — In the editor, pick `runDraftPipeline` from the function dropdown and **Run** once.
   Approve the OAuth consent screen (Sheets + Gmail full access + external request — see Step
   3.A). Re-authorized under the current manifest; confirmed clean in `ACTIVITY_LOG`.
2. ✅ DONE — **Triggers** (clock icon) → add **time-driven** triggers for these four functions
   (hourly or daily to start — low frequency at MVP volume):
   - `runReplyMonitorTrigger`
   - `runBounceMonitorTrigger`
   - `runFollowUpSchedulerTrigger`
   - `runDashboardRefreshTrigger`

3. (`runImportPipeline`, `runDraftPipeline`, `runFullPipeline` stay **manual** — you run them
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
5. Ramp volume only as Postmaster reputation stays green and Warmup Inbox warm-up completes.

---

## Ongoing dev loop (once live)

New feature or fix → give Codex a scoped task → it opens a PR (marks its task 🫡 in
`PHASES.md`) → you merge → Claude reviews post-merge and flips 🫡 → ✅ → you re-paste the
one changed `.gs` file into Apps Script. See `README.md` / `CLAUDE.md`.
