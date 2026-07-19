# Cold Email Monday — The Master Go-Live Document

**This is the one document.** Work it top to bottom and the campaign goes from merged code to
sending 3/day with a warmed domain, an enrichment pipeline, and free-tier lead mining. Detail
references (`docs/HOSTINGER-RUNBOOK.md`, `manual-email-warmup-gmail/README.md`, `PHASES.md`)
exist for depth, but every step you must *do* is written inline here, in order.
`docs/LAUNCH-RUNBOOK.md` is the retired Gmail-era archive — never follow it.

Status date: **2026-07-19**. All code through PR #68 is merged. The Warmup Inbox automated
warm-up is **already running** — its start date is the clock the timeline below runs on.

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

One bound Apps Script project: open the campaign Sheet → Extensions → Apps Script.

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
4. **Save and run any function once** → re-authorize with the reduced (Gmail-free) scope set.
5. **Reload the spreadsheet** → menu **Cold Email → Set up Hostinger columns** (adds
   `sequenceStep, subject, body, preparedAt, sentAt` to QUEUE and
   `status, emailsSent, lastSentAt` to CONTACTS).
6. **Triggers** (clock icon): delete `runReplyMonitorTrigger` and `runBounceMonitorTrigger`
   if installed; keep/create `runFollowUpSchedulerTrigger` and `runDashboardRefreshTrigger`
   (daily each). Everything else stays manual-run — the enrichment functions spend credits.
7. **QUEUE header check (do not skip):** QUEUE must mirror the CONTACTS columns used by
   scoring/approval — `contactId, email, firstName, lastName, company, title, maConfirmed,
   roleIsRelevant, verificationResult, catchAll, wtfpRelevance, employeeSizeFit, industryFit,
   personalizationLine, emailsSent, status`. Values are copied by header name; a missing QUEUE
   column arrives blank and ApprovalGate then skips every row. Add missing headers now.
8. Optional cleanup: delete `DRAFT_ONLY` and any `REPLY_MONITOR_*`/`BOUNCE_MONITOR_*` SETTINGS
   rows — ignored by the current runtime.

---

## Part 2 — Data foundation (same sitting)

**Upload the company list.** Paste the Express Training / WTFP company rows into the staging
area and run `runImportPipeline(rawRows)` (or paste directly into `COMPANIES` matching its
headers: `company, website, industry, city, state, employeeSize, sourceUrl, wtfpRelevance`).
This must happen **before any mining** — `COMPANIES` is the dedupe baseline. If it's already
imported, verify the row count and move on.

**Templates — one row per sequence step.** In `TEMPLATES`, add a `sequenceStep` column and
write your emails: step 1 (initial), step 2, step 3 (follow-ups). A blank `sequenceStep` row is
the step-1 default; **a follow-up step with no matching row is skipped** with
`FOLLOW_UP_TEMPLATE_MISSING` — it will never silently resend step-1 content. Placeholders:
`{{firstName}}`, `{{company}}`, `{{personalizationLine}}`, `{{senderName}}`. Every body must
contain your physical mailing address and a plain opt-out line ("reply STOP / let me know if
you'd rather not hear from me") — that's the CAN-SPAM baseline (Gotcha #12).

**SETTINGS rows:**

```text
DAILY_LIMIT=5
APPROVAL_THRESHOLD=75
SENDER_NAME=Adam Graney
FOLLOW_UP_DELAY_DAYS=4
FOLLOW_UP_MAX_EMAILS=3
PERSONALIZATION_BATCH_SIZE=10
CONTACT_DISCOVERY_BATCH_SIZE=10
CONTACT_VERIFICATION_BATCH_SIZE=25
RELEVANT_TITLE_KEYWORDS=owner, founder, ceo, president, coo, general manager, operations, hr, human resources, training, learning and development
```

**Sheet columns to add by hand (additive, safe):** `lastName` on CONTACTS and QUEUE (Hunter is
meaningfully more accurate with a full name), and use `linkedinUrl` (not `linkedin`) — that's
the header the code reads.

**Buy the ZeroBounce PAYG pack now** (~$20, ~2,000 credits, never expire, no subscription).
Verification is what protects the warmed domain — never send to an unverified address.

---

## Part 3 — Manual warm-up layer (deadline: week 2–3 of the running ramp)

The automated Warmup Inbox tool is already running through Hostinger SMTP/IMAP — leave it
alone, never run a second warm-up tool on the same mailbox, and note its start date. This
manual layer joins **week 2–3 of that ramp** and is a *separate, standalone* Apps Script
project (full detail: `manual-email-warmup-gmail/README.md`). Condensed setup:

1. **Cloud project** — log into `console.cloud.google.com` as your designated low-activity seed
   Gmail (never the business account). Create project `warmup-infra`, enable the **Gmail API**,
   create an OAuth client, add all 8 seed Gmails as test users on the consent screen.
2. **8 refresh tokens** — for each seed Gmail, run the consent flow once with scope
   `https://mail.google.com/` (easiest: [OAuth Playground](https://developers.google.com/oauthplayground)
   with "Use your own OAuth credentials" checked). Capture each refresh token.
3. **Hostinger Email API token** — Hostinger Panel → Emails → API, scoped to the outreach
   domain's order.
4. **New Google Sheet** (warm-up command center) + **new standalone Apps Script project** under
   the warm-up Google account. Paste the 5 files from `manual-email-warmup-gmail/src/` and its
   `appsscript.json`. Fill script properties per `manual-email-warmup-gmail/PROPERTIES.example`
   (sheet ID, `WARMUP_FROM_EMAIL`, `WARMUP_START_DATE`, Hostinger token, OAuth client ID/secret,
   `SEED_TOKEN_1..8`, Gemini key).
5. Run `setupWarmupSheet()` once → list the 8 seeds in `SEED_ACCOUNTS`
   (`email | tokenPropertyKey | active`).
6. Run `testHostingerConnection()`, then one real test send — open the received message →
   Show original → confirm the `Received:` chain shows Hostinger (no google.com hop) and DKIM
   `d=` is the outreach domain.
7. **Triggers:** `runWarmupSendTrigger` daily (morning), `runWarmupEngagementTrigger` hourly,
   `refreshWarmupSummary` daily (evening).
8. Weekly: glance at `DAILY_SUMMARY`. At launch (Part 6): taper by lowering
   `WARMUP_MAX_PER_DAY`/`WARMUP_START_PER_DAY` to 1 — never stop abruptly.

---

## Part 4 — Enrichment: raw company → sendable contact

The full machine, end to end:

```
COMPANIES (loaded in Part 2)
   ↓ you: Apollo web UI research (free — search/browse costs no credits)
CONTACTS row: company, firstName, lastName, title, linkedinUrl — email blank
   ↓ runContactDiscoveryTrigger()   — Hunter finds the email (spends credits)
   ↓ runContactVerificationTrigger() — ZeroBounce verifies (spends credits)
   ↓ runPersonalizationDraftTrigger() — Gemini drafts a line from the company site (free)
   ↓ you: review/edit each draft → copy into personalizationLine
   ↓ runQueueBuilderTrigger()       — promotes verified+approved rows to QUEUE
   ↓ runPreparationPipeline()       — ApprovalGate final check; writes subject/body, PREPARED
   ↓ you: copy into Hostinger Webmail, send, Cold Email → Mark selected email sent
```

`runEnrichmentPipeline()` chains discovery → verification → queue-build in one call. All
enrichment functions are batch-capped (SETTINGS) and **manual-run only** — never time triggers.

**Apollo research (continuous, no rush).** For each `COMPANIES` row without contacts: search
Apollo's web app by company name/domain; find a contact matching your target titles
(Owner/Founder/CEO, Operations, HR, Training/L&D); add the CONTACTS row with **the `company`
value copied verbatim from COMPANIES** — discovery joins on that name to find the domain, and
"Acme" vs "Acme Inc." means no join, no email (Gotcha #8). Email stays blank; leave `contactId`
blank (falls back to email as key). Don't *reveal* emails in Apollo — Hunter does that cheaper.

**Personalization.** Gemini drafts into `personalizationDraft`; **you approve every line** by
editing/copying it into `personalizationLine`. ApprovalGate only reads the human-approved
column. Rows with no website or a failed fetch are logged and skipped — write those by hand.

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

1. Smoke test with one owned test contact: `runPreparationPipeline()` → row `PREPARED` with
   rendered subject/body → send via Hostinger Webmail → **Mark selected email sent** → QUEUE +
   CONTACTS both update → `runDashboardRefreshTrigger()` shows the metrics → received message
   shows SPF/DKIM/DMARC `PASS`.
2. Start real sends: **3/day by hand, never bulk.** `DAILY_LIMIT` enforces this — don't raise
   it to clear a backlog (Gotcha #6).
3. Taper the warm-up layer (`WARMUP_MAX_PER_DAY=1`) and let Warmup Inbox continue at low
   intensity in the background. Never stop either abruptly.

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

---

*Superseded references: `docs/LAUNCH-RUNBOOK.md` (Gmail-era archive). Depth references:
`docs/HOSTINGER-RUNBOOK.md` (operational detail), `manual-email-warmup-gmail/README.md`
(warm-up internals), `PHASES.md` (build history + Phase 5 specs when they land).*
