# Manual Email Warm-Up (Gmail seed pool)

Standalone Apps Script project that warms the dedicated cold-outreach domain. It is
**functionally independent** from the campaign automation in this repo's root `src/` —
different Apps Script project, different spreadsheet, different Google Cloud project,
different credentials. They share only the outreach domain and the strategy.

**Scope: warm-up only.** This layer supplements the Warmup Inbox subscription during the
6–8 week ramp and is scaled back once real cold emails start (taper, never stop abruptly).

**Seed count: 4 accounts.** The seeds are receiving inboxes, not the source of reputation —
the outreach domain's send volume and engagement rate are what matter, and both are unchanged
whether spread across 4 seeds or 8 (the scheduler ramps the domain's daily total and picks a
random seed per send). 4 real, previously-active Gmail accounts is plenty of recipient
diversity; don't go below ~3. `getSeedAccounts()` reads however many active rows exist in
`SEED_ACCOUNTS` — the account count is config, not a code constant.

## How it works

```text
Daily send trigger
  -> ramped volume target (2/day -> ~3/day over 21 days, weekend damping, jitter)
  -> Gemini-varied subject/body (local template fallback)
  -> Hostinger Email API sends from the outreach domain to a random seed Gmail

Hourly engagement trigger (acts AS each seed account via per-account OAuth tokens)
  -> discovers new warm-up mail per seed inbox
  -> ~10% deliberately skipped forever (perfect engagement is a tell)
  -> the rest get a randomized 12min–5hr delay, then: mark read (+star ~30%),
     and reply at a ramped rate (25% -> 60%) with Gemini-varied reply text

Everything logs to the WARMUP_LOG tab; DAILY_SUMMARY is the command center.
```

Realism rules baked in (from the strategy doc): randomized send→open→reply timing, varied
content on both sides, ramped engagement rate, occasional deliberate non-engagement, and
content hashes logged so repeating Gemini output can be audited.

## One-time setup

### 1. Google Cloud project (NOT your business account)
1. Log into `console.cloud.google.com` as the designated low-activity seed Gmail.
2. Create project `warmup-infra`; enable the **Gmail API**.
3. Create an OAuth client (type **Web application**, redirect URI
   `https://developers.google.com/oauthplayground`) → note Client ID + Secret.
4. Configure the consent screen (External); add all 4 seed Gmails as test users.
5. **Publish the app to Production** (unverified is fine). Refresh tokens minted while the
   app is in *Testing* status silently expire after 7 days, which would stop the warm-up
   loop mid-ramp. Published-unverified tokens do not expire; the only cost is an extra
   "unverified app" warning during each account's one-time consent flow.

### 2. Refresh token per seed account (4×)
For each seed Gmail, run the OAuth consent flow once with scope
`https://mail.google.com/` and capture the refresh token — easiest via
[OAuth Playground](https://developers.google.com/oauthplayground) with "Use your own
OAuth credentials" checked. Store each token as a script property (`SEED_TOKEN_1`…`4`).

### 3. Hostinger Email API token
Hostinger Panel → Emails → API → generate a token scoped to the outreach domain's order.
Verify the send endpoint against the docs at `https://api.mail.hostinger.com/` — the
default path in `HostingerMailClient.gs` is overridable via `HOSTINGER_SEND_ENDPOINT`.

### 4. Apps Script project + sheet
1. Create a new Google Sheet (the warm-up command center); note its ID.
2. Create a new standalone Apps Script project **under the warm-up Google account**.
3. Paste in the five `src/*.gs` files and `appsscript.json` (no Gmail scope — correct).
4. Fill in script properties per `PROPERTIES.example`.
5. Run `setupWarmupSheet()` once, then list the 4 seeds in the `SEED_ACCOUNTS` tab
   (`email | tokenPropertyKey | active`).
6. Run `testHostingerConnection()` and fix anything it reports.
7. Send one real test: `sendWarmupEmail('you@gmail.com', 'test', 'test')`, then open the
   received message → Show original → confirm the `Received:` chain shows Hostinger (no
   google.com hop) and DKIM `d=` is the outreach domain.

### 5. Triggers
- `runWarmupSendTrigger` — time-driven, daily, morning hours.
- `runWarmupEngagementTrigger` — time-driven, hourly.
- `refreshWarmupSummary` — time-driven, daily (evening), or run manually.

## Sequencing (from the strategy doc)

1. Warmup Inbox subscription runs from day one and never fully stops.
2. This manual layer joins **week 2–3**, once the automated tool has baseline activity.
3. Cold sending begins only after the full 6–8 week window with clean logs.
4. At launch, taper this layer's volume down as real campaign volume ramps up. Mechanism:
   lower the `WARMUP_MAX_PER_DAY` and `WARMUP_START_PER_DAY` script properties (e.g. to 1)
   rather than deleting triggers — some baseline engagement should continue under the real
   campaign traffic. Never stop abruptly.

## Files

| File | Role |
|---|---|
| `src/Warmup.gs` | Orchestrator, triggers, engagement state, logging, dashboard |
| `src/WarmupScheduler.gs` | Pure ramp/skip/delay/hash math (no I/O) |
| `src/HostingerMailClient.gs` | Hostinger Email API sends (`UrlFetchApp`) |
| `src/SeedAccountService.gs` | Per-seed Gmail REST calls via OAuth refresh tokens |
| `src/ContentVariationService.gs` | Gemini content variation + pure local fallbacks |

Run tests locally: `node tests/warmup-logic.test.js`
