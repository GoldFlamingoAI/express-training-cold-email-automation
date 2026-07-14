# Cold Email Monday — Warm-Up, Enrichment & Launch Plan

Companion to `docs/LAUNCH-RUNBOOK.md`. That doc covers Phase 0 (domain/DNS/Workspace) and the
mechanical deploy steps (paste code, set properties, install triggers). This doc picks up from
**"domain and DNS are done, sheet and Apps Script code are pasted in, a Massachusetts company
list is loaded"** — your current state — and covers everything between here and your first sent
email: inbox warm-up, turning that company list into verified contacts, and the actual go-live
sequencing.

The Codex-buildable tasks referenced below live in **`PHASES.md` → Phase 4** (mirrored there on
purpose — Codex only scans `PHASES.md` for work, per `AGENTS.md`). This file is the narrative:
why the tasks are scoped that way, the manual steps around them, the how-tos, and the timing.

---

## Where you are right now

- [x] Secondary domain purchased, DNS (MX/SPF/DKIM/DMARC) configured
- [x] Google Sheet created with the 10 tabs, Apps Script project created, all `.gs` files pasted
- [x] Massachusetts company list (WTFP grantees) sourced and imported to `COMPANIES`
- [ ] Inbox warm-up — **not started, start today**
- [ ] Contacts discovered/verified for the company list
- [ ] `QUEUE` populated, first drafts created, smoke test run

---

## ⚠️ Pre-flight blocker — re-paste the manifest

Before the reply/bounce monitors will run at all, you need the current `appsscript.json`. The
original manifest requested only the Gmail *compose* scope, which is enough to create drafts but
**not** enough for `ReplyMonitor`/`BounceMonitor`, which call `GmailApp.search()` — the built-in
`GmailApp` service requires the full `https://mail.google.com/` scope, and the granular
`gmail.compose`/`gmail.readonly` scopes don't authorize it. This was fixed in the repo manifest.

To apply it: Apps Script editor → gear ⚙️ → **Show "appsscript.json"** → paste the repo's current
`appsscript.json`. The next time you Run any function, Google will show the OAuth consent screen
again (because the scope set changed) — approve it. Until you do, the monitor triggers throw an
authorization error. Draft creation may appear to work on the old scope, but re-consent on the
new manifest is required for the full pipeline.

---

## Time horizon — what to start when

Warm-up is the fixed clock everything else fits around: **4–6 weeks, cannot be rushed by
paying more.** Contact enrichment has no such floor — it's bounded by your own time and API
credits — so it runs in parallel, but verification specifically should land *near the end* of the
warm-up window, not the start (see Gotcha #4 below on why).

| When | Track A — Inbox warm-up | Track B — Contact enrichment | Track C — Money |
|---|---|---|---|
| **Week 0 (today)** | Sign up for Warmup Inbox, connect the sender inbox, start warm-up conservative | Give Codex the Phase 4 task briefs; start manual Apollo research on the company list | none required yet — free tiers cover early discovery |
| **Week 1** | Check dashboard + Postmaster Tools weekly | Phase 4 code merged/reviewed/pasted into Apps Script; run `runContactDiscoveryTrigger()` in small batches as you add Apollo-sourced names | optional: buy Hunter Starter for one month if your list is bigger than ~50 companies (free tier's 50 credits/mo) |
| **Weeks 2–3** | Keep checking weekly; use the inbox like a human occasionally | Keep discovering; **do not run verification yet** — save freshness for later | none |
| **Week 4 (or week 4–5 of a 6-week warm-up)** | Continue | Run the ZeroBounce verification burst now — buy a pay-as-you-go credit pack; run `runContactVerificationTrigger()` across everything discovered; run `runQueueBuilderTrigger()` to fill `QUEUE`; fill in `personalizationLine` per contact (manual) | ZeroBounce PAYG pack purchase happens here |
| **End of warm-up (week 5–6)** | Confirm no critical warnings remain | Smoke test: `runDraftPipeline`, check `ACTIVITY_LOG`/Gmail Drafts/`DASHBOARD` | — |
| **After smoke test** | Warm-up can continue in the background at low intensity | Send 3–5 drafts/day by hand; ramp only as Postmaster stays green | — |

---

## Track A — Warm-Up Inbox how-to

> **Pick ONE warm-up tool per inbox.** The repo's older docs (`PHASES.md` Phase 0,
> `docs/LAUNCH-RUNBOOK.md` Step 1) name **Lemwarm**; you've chosen **Warmup Inbox**. Either works —
> but **never run two warm-up services on the same mailbox at once.** They both inject automated
> send/receive traffic; running both doubles that traffic, muddies your reputation signals, and can
> trip spam heuristics — the exact opposite of the goal. If `PHASES.md` shows "Connect Lemwarm" as
> already done, confirm whether Lemwarm is actually connected before adding Warmup Inbox; if it is,
> either stick with Lemwarm or disconnect it first. (The Lemwarm/Warmup Inbox naming across the
> repo docs is just cosmetic drift — the mechanics below are identical for both.)

Setup takes a few minutes; the *waiting* is 4–6 weeks. Start this before anything else today.

1. Go to [warmupinbox.com](https://www.warmupinbox.com/) and sign up for a plan.
2. **Before connecting**, enable **2-Step Verification** on the Workspace sender account
   (`firstname@newdomain.com`) if it isn't already on — Google Admin → Security → 2-Step
   Verification, or from the account's own Google security settings.
3. Generate an **App Password**: Google Account → Security → 2-Step Verification → App passwords
   → create one named "Warmup Inbox." Copy it — Google shows it once.
4. In Warmup Inbox, choose **Google Workspace** as the provider and connect using the sender
   email + the **app password** (not your normal login password — the normal password will not
   work once 2FA is on).
5. Follow any in-app checklist Warmup Inbox shows about SPF/DKIM/DMARC — since DNS is already
   configured per `LAUNCH-RUNBOOK.md` Step 1, this should come back clean. If it flags something,
   fix DNS before proceeding rather than warming up an unauthenticated domain.
6. Set warm-up intensity to **low/conservative** to start. Let it ramp automatically — don't
   manually push volume up.
7. **Let it run 4–6 weeks before your first real cold send.** During this window:
   - Send a handful of genuine one-to-one emails from the inbox yourself.
   - Reply to real messages that come in.
   - Avoid attachments, bulk sends, or anything that looks automated from *you* (Warmup Inbox's
     own synthetic traffic is fine — that's the point of the tool).
8. Check the Warmup Inbox dashboard and [Google Postmaster Tools](https://postmaster.google.com/)
   **at least weekly** for spam-rate or authentication warnings.
9. Write down the warm-up start date — everything else in this doc's timeline is relative to it.

**Done when:** 4–6 weeks have elapsed, Warmup Inbox shows no critical warnings, and Postmaster
Tools shows a healthy domain/IP reputation.

---

## Track B — Contact enrichment pipeline

### The workflow, end to end

```
COMPANIES (already loaded)
   ↓ human: search Apollo web UI by company domain + target title (free, no credits)
CONTACTS row added by hand: company, firstName, lastName, title, linkedinUrl — email left blank
   ↓ Task 4.2: runContactDiscoveryTrigger()  — Hunter finds/guesses the email
CONTACTS row updated: email, catchAll, roleIsRelevant, maConfirmed, wtfpRelevance
   ↓ Task 4.3: runContactVerificationTrigger()  — ZeroBounce verifies deliverability
CONTACTS row updated: verificationResult
   ↓ human: write a real personalizationLine per contact (not automatable — see Gotcha #10)
   ↓ Task 4.4: runQueueBuilderTrigger()  — promotes verified + approved rows
QUEUE row created, status = QUEUED
   ↓ existing: runDraftPipeline()  — ApprovalGate does the final 10-point check
Gmail draft created, human reviews and sends
```

Why Apollo is manual and not API-driven: see the free-tier discussion below — Apollo's free API
access is thin/disputed, but **searching and viewing profiles in Apollo's web UI costs no
credits at all** (only *revealing* an email/phone does, and you don't need Apollo to reveal
anything since Hunter + ZeroBounce already do discovery and verification). This also means
`ApolloClient.gs` stays dormant/unused for this workflow — nothing needs to change there.

### Manual step: Apollo research (do this continuously, no rush)

For each company in `COMPANIES` without a `CONTACTS` row yet:
1. Search Apollo's web app for the company (by name or domain).
2. Look for a contact matching one of your target titles: **Owner / Founder / CEO**,
   **Operations Manager / Director**, or **L&D / Training Manager**.
3. Add a row to `CONTACTS`: `company`, `firstName`, `lastName`, `title`, `linkedinUrl`. Leave
   `email` blank — Task 4.2 fills that in. **Copy the `company` value verbatim from the
   `COMPANIES` tab** — discovery finds the domain by matching this name back to `COMPANIES`, so a
   typo or a "Inc." mismatch means Hunter never gets a domain to search (see Gotcha #17).
   `contactId` is optional — leave it blank and the pipeline falls back to `email` as the row key.
4. While you're there, jot down one specific, real personalization fact (a recent post, a program
   they run, something in their company profile) somewhere you can find it later — you'll need it
   for `personalizationLine` before this contact can ever be drafted.

### Setup checklist for Phase 4 (sheet changes you make by hand — not code)

- [ ] Add a **`lastName`** header column to both `CONTACTS` and `QUEUE` (see Gotcha #7 — the
  documented schema only has `firstName`, which hurts Hunter's match accuracy).
- [ ] In `SETTINGS`, add `RELEVANT_TITLE_KEYWORDS` = `owner,founder,ceo,president,operations manager,operations director,l&d,learning and development,training manager`
- [ ] In `SETTINGS`, add `CONTACT_DISCOVERY_BATCH_SIZE` = `25`
- [ ] In `SETTINGS`, add `CONTACT_VERIFICATION_BATCH_SIZE` = `25`
- [ ] Confirm `HUNTER_API_KEY` and `ZEROBOUNCE_API_KEY` are set in Script Properties (see
  `PROPERTIES.example`)
- [ ] Confirm the **core Phase 1 `SETTINGS`** exist (these gate drafting, not enrichment — see
  `LAUNCH-RUNBOOK.md` Step 5): `DRAFT_ONLY=TRUE`, `DAILY_LIMIT` (e.g. `10`), `APPROVAL_THRESHOLD`
  (e.g. `75`), `SENDER_NAME`. Missing `DAILY_LIMIT` blocks every draft ("daily limit reached");
  missing `APPROVAL_THRESHOLD` now defaults to 75 in code, but set it explicitly so it's visible.
- [ ] **Write your actual cold email** in the `TEMPLATES` tab — one row with a `subject` and a
  `body`. Nothing sends without it, and `readTemplate()` reads the first row only. The body may use
  `{{firstName}}`, `{{company}}`, `{{personalizationLine}}`, `{{senderName}}` — any placeholder
  whose merge value is blank is left as-is, so don't ship a template that depends on a field you're
  not filling. Include a plain-language opt-out line (see Gotcha #18).

---

## Track C — Free tiers vs. paid credit bursts

| Service | Free tier (API) | Paid option | Cancel-anytime? |
|---|---|---|---|
| **Hunter** (discovery — finder only, not verifier) | 50 credits/mo, confirmed API access | Starter $49/mo → 2,000 credits | Yes, **monthly only** — annual is discount but locks you in |
| **ZeroBounce** (verification) | 100 validations/mo | **Pay-as-you-go**, not a subscription — buy a credit pack (2,000 credits ≈ $20–39), credits never expire | N/A — no subscription to cancel |
| **Apollo** (manual web research only) | N/A — using the web UI, not the API | Not needed for this plan | N/A |

If your company list is bigger than ~50, buy **Hunter Starter for one calendar month**, run
discovery in bulk, then cancel before renewal (calendar-remind yourself). For ZeroBounce, just
buy a pack — no subscription risk at all, so there's no reason to "burst and cancel" there; buy
what you need, when you need it (ideally near the end of warm-up — see Gotcha #4).

**Never choose annual billing for this strategy** — Apollo's annual plan requires 60 days' written
notice before renewal or you're locked in for another year. Monthly is cancel-anytime.

---

## Gotchas

1. **Apollo's free-tier API access is disputed and thin** — public sources disagree on whether it
   exists at all, and even optimistic estimates put it around ~10 export credits/month. Don't
   build anything that depends on it. This plan uses Apollo's web UI manually instead (free,
   unlimited for search/browse — only *revealing* contact info costs credits, which you don't
   need since Hunter + ZeroBounce cover that).
2. **ZeroBounce is pay-as-you-go, not a subscription.** Don't "subscribe and cancel" — just buy a
   credit pack once. Credits don't expire.
3. **Monthly billing only for Apollo/Hunter if you're doing the burst-and-cancel strategy.**
   Annual billing on Apollo requires 60 days' notice before renewal — the opposite of what you
   want.
4. **Verification decays; discovery barely does.** Emails found by Hunter (name + domain) stay
   roughly valid for months. ZeroBounce's *verified* status ages faster — people change jobs,
   mailboxes close. Run discovery early (harmless if stale), but time your verification burst for
   the last ~1 week before you actually start sending, so freshness lines up with send date. This
   is also why the timeline table above puts verification at week 4–5, not week 0.
5. **Apps Script has hard execution limits**: 6 minutes per single run, 90 minutes/day cumulative
   across all triggers, and 20,000 `UrlFetchApp` calls/day on a consumer account. This is exactly
   why Task 4.2 and 4.3 **must** respect `CONTACT_DISCOVERY_BATCH_SIZE` /
   `CONTACT_VERIFICATION_BATCH_SIZE` and process a bounded number of rows per run — for a large
   company list, you'll click the trigger function multiple times (or install a low-frequency
   time trigger) rather than expecting one run to finish everything.
6. **Warmup Inbox requires an App Password**, not your normal Google login password — you must
   turn on 2-Step Verification on the Workspace sender account first, or the connection will
   fail outright.
7. **`CONTACTS`/`QUEUE` schema (per `LAUNCH-RUNBOOK.md`) has no `lastName` column** — only
   `firstName`. Hunter's email-finder is meaningfully more accurate with a full name. Add the
   column by hand (additive, safe — the code matches headers by name, so this won't break
   anything already pasted in).
8. **Naming mismatch to be aware of:** `LAUNCH-RUNBOOK.md`'s `CONTACTS` header table lists
   `linkedin`, but `Cleaner.cleanContact()` in the code produces `linkedinUrl`. Use `linkedinUrl`
   in your actual sheet to match the code — `linkedin` alone won't be read by anything.
9. **Some small MA businesses may only have a Gmail/Yahoo address**, not a business-domain email.
   `ApprovalGate.checkApproval()` hard-blocks personal email domains by design (correct behavior —
   don't "fix" this). Expect some discovered contacts to silently fail at draft time with "Email
   does not use a business domain" in `ACTIVITY_LOG` — that's the gate working, not a bug.
10. **`personalizationLine` cannot be automated in this build** — nothing in the codebase
    generates it, and `ApprovalGate` hard-blocks any contact with a blank one. Budget real human
    time for this; it's the one genuinely manual, unavoidable step per contact.
11. **Hunter's `findEmailWithHunter()` returns a *guess* with a confidence `score`, not a verified
    address.** Never skip the ZeroBounce step even for a high-score Hunter result — Hunter fills
    `email`, only ZeroBounce is allowed to set `verificationResult`.
12. **`DAILY_LIMIT` in `SETTINGS` still applies once `QUEUE` is full.** Even with hundreds of
    verified, approved contacts queued, `runDraftPipeline()` only drafts up to that day's limit —
    the rest wait for tomorrow's run. This is intentional (protects a young domain from an
    accidental burst) — don't raise it just to clear a backlog faster.
13. **`employeeSizeFit`/`industryFit` are hardcoded `TRUE`** per your call that the WTFP source
    list is already pre-qualified. If you later pull companies from a broader, less-curated
    source, revisit this — right now nothing is actually checking industry or company size.
14. **Codex only reads `PHASES.md` for tasks**, not this file. That's why Phase 4's tasks are
    mirrored into `PHASES.md` — if you add more tasks to this plan later, put the checkbox in
    `PHASES.md` too or Codex will never see it.
15. **The Gmail OAuth scope was wrong in the original manifest** (see the Pre-flight blocker at the
    top). `GmailApp.search()` in the monitors needs `https://mail.google.com/`; the old manifest
    only had `gmail.compose`. Fixed in the repo — but you must re-paste `appsscript.json` and
    re-approve the OAuth consent screen, or `runReplyMonitorTrigger`/`runBounceMonitorTrigger`
    fail with an authorization error. This is the single most likely thing to silently break the
    tracking half of the pipeline.
16. **Never run two warm-up tools on one inbox** (see Track A). Lemwarm (repo docs) and Warmup
    Inbox (your choice) do the same job — pick one. Two at once doubles synthetic traffic and hurts
    the reputation you're trying to build.
17. **Manual `CONTACTS` rows must match `COMPANIES` on the company name.** Discovery resolves the
    email domain by joining `CONTACTS.company` back to a `COMPANIES` row. `COMPANIES` names were
    normalized by `Cleaner` at import; a hand-typed `CONTACTS` name that differs ("Acme" vs "Acme
    Inc.") won't join, and that contact gets skipped at discovery with no email. Copy the name
    verbatim from `COMPANIES`, or expect to fix misses by hand.
18. **US cold email is regulated (CAN-SPAM), and MA has its own consumer-protection rules.** This
    isn't legal advice, but the baseline everyone follows: a truthful `From`/subject, a physical
    mailing address in the message (your Gmail signature already carries this per
    `LAUNCH-RUNBOOK.md` 0.4), and a clear, honored opt-out. At this manual 3–5/day volume the
    common pattern is a plain "reply STOP / let me know if you'd rather not hear from me" line in
    the template body, with opt-outs logged to `SUPPRESSION` via `addSuppression()` and honored on
    the next run. Build the opt-out line into your `TEMPLATES` body now, not later.

---

## What's still missing / needs building

Everything below is captured as a `PHASES.md` Phase 4 task (see task numbers) except where noted
as manual:

- **Contact discovery from a bare company list** — nothing currently reads `COMPANIES` and
  produces `CONTACTS` rows. Closed by Task 4.2, fed by the manual Apollo step above.
- **Email verification wiring** — `ZeroBounceClient.gs` exists but nothing calls it in a loop over
  `CONTACTS`. Closed by Task 4.3.
- **Promotion from `CONTACTS` to `QUEUE`** — `FollowUpScheduler.gs` only appends *follow-up*
  contacts to `QUEUE`; nothing promotes a contact's *first* touch. Closed by Task 4.4.
  (This was a real gap in the original Phase 1–3 build, not something new to this plan.)
- **Role-relevance filtering** — no code checks a contact's title against your target roles.
  Closed by Task 4.1.
- **`personalizationLine` generation** — intentionally **not** in scope for Codex; this stays a
  manual step (Gotcha #10). If you want to revisit automating this later (e.g., summarizing a
  scraped fact), that's a separate, larger conversation — flag it explicitly if you want to pursue
  it, it is not implied by anything in this plan.

---

## Go-live checklist (combines `LAUNCH-RUNBOOK.md` Step 7 with this plan)

- [ ] Current `appsscript.json` pasted in and OAuth re-consented (the `mail.google.com` scope fix)
- [ ] Exactly one warm-up tool connected to the inbox — warm-up has run 4–6 weeks with no
  unresolved critical warnings
- [ ] All 10 sheet tabs exist with exact names (`LAUNCH-RUNBOOK.md` Step 2) — a missing/misnamed
  tab throws a null error mid-run
- [ ] `DRAFT_ONLY` = `TRUE`, plus `DAILY_LIMIT` / `APPROVAL_THRESHOLD` / `SENDER_NAME` set in
  `SETTINGS`
- [ ] `TEMPLATES` has a `subject` + `body` row, including a plain-language opt-out line
- [ ] Phase 4 code merged, reviewed, and pasted into Apps Script
- [ ] `CONTACTS` populated via the Apollo → Hunter discovery loop
- [ ] Verification burst run near the end of warm-up (freshness intact)
- [ ] `personalizationLine` filled in for every contact you intend to queue
- [ ] `QUEUE` populated via `runQueueBuilderTrigger()`
- [ ] Smoke test: `runDraftPipeline()` run manually, `ACTIVITY_LOG` fills, Gmail Drafts populated,
  `DASHBOARD` shows metrics after `runDashboardRefreshTrigger()`
- [ ] Send 3–5 drafts/day by hand, never bulk, while the domain is young
- [ ] Ramp volume only as Postmaster reputation stays green
