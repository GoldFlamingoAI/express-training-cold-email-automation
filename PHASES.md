# Project Phases — Express Training Cold Email MVP

## Legend
- 🤖 = Codex (cloud, online — primary coder)
- 🏠 = Human task (manual setup, no code)
- ✅ = Complete  🏗️ = In progress  ⏸️ = Blocked
- 🫡 = Codex built it, merged, Claude review still pending (post-merge review — see CLAUDE.md)

This is a roadmap, not a shared working file — Claude/the user keep it current from the
merged PR list. Codex doesn't edit it. Current task = the first unchecked `- [ ]` box.

---

## Phase 0: Discovery + Manual Setup ✅ 🏠

Architecture and tooling decisions are complete. The following manual setup must be done by the user **before Phase 1 Codex work begins**:

- [x] MVP architecture spec reviewed and approved (`starting-architecture/`)
- [x] Stack chosen: Apps Script + Sheets + Gmail + Lemwarm + Apollo/Hunter/ZeroBounce free tiers
- [x] Lean phasing decided: core draft loop first, monitors second, API clients optional
- [x] ✅ 🏠 **Buy secondary cold-outreach domain** (not the primary business domain)
- [x] ✅ 🏠 **Create isolated Google Workspace Business Starter tenant** (separate from primary account)
- [x] ✅ 🏠 **Configure DNS:** MX records, SPF, DKIM, DMARC (`p=none` monitoring mode first)
- [x] ✅ 🏠 **Create sender identity:** real name, profile photo, signature, physical address
- [x] ✅ 🏠 **Connect Lemwarm Essential** to the isolated inbox; run 3–4 weeks before first send
- [x] ✅ 🏠 **Configure Google Postmaster Tools** for the new domain
- [x] ✅ 🏠 **Create the Google Sheets file** with the 10 required tabs: SETTINGS, COMPANIES, CONTACTS, CAMPAIGNS, QUEUE, SUPPRESSION, ACTIVITY_LOG, DASHBOARD, TEMPLATES, PLAYBOOK_REQUESTS
- [ ] 🏠 **Create a new Google Apps Script project** bound to the Sheets file; note the script ID
- [ ] 🏠 **Obtain Massachusetts source company list** (CSV) — WTFP grantees and other MA employers
- [ ] 🏠 **Connect Codex to this GitHub repo** (GitHub OAuth, write access to `codex/*` branches only)

*None of these tasks go to Codex. Complete them before sending Task 1.1 brief.*

---

## Phase 1: Core Draft Loop 🤖
*Goal: Build the full pipeline from CSV import through Gmail draft creation, with all 10 pre-send conditions enforced, so the first smoke-test emails can be reviewed and sent by a human.*

- [x] ✅ **Task 1.1** Project scaffold: `appsscript.json`, `src/Code.gs` (orchestrator skeleton), `PROPERTIES.example` (1 PR)
- [x] ✅ **Task 1.2** AuditLogger module: `src/AuditLogger.gs` — structured logging to ACTIVITY_LOG tab (1 PR)
- [x] ✅ **Task 1.3** ImportService module: `src/ImportService.gs` — CSV/paste import to COMPANIES tab (1 PR)
- [x] ✅ **Task 1.4** Cleaner module: `src/Cleaner.gs` — pure normalization of names, domains, cities, titles (1 PR)
- [x] ✅ **Task 1.5** Deduplicator module: `src/Deduplicator.gs` — pure duplicate detection for companies and contacts (1 PR)
- [x] ✅ **Task 1.6** MassachusettsFilter module: `src/MassachusettsFilter.gs` — pure MA-only confirmation (1 PR)
- [x] ✅ **Task 1.7** LeadScorer module: `src/LeadScorer.gs` — pure 100-pt scoring, ≥75 approval gate (1 PR)
- [x] ✅ **Task 1.8** TemplateEngine module: `src/TemplateEngine.gs` — pure template merge with contact fields (1 PR)
- [x] ✅ **Task 1.9** ApprovalGate module: `src/ApprovalGate.gs` — pure check of all 10 pre-send conditions (1 PR)
- [x] ✅ **Task 1.10** DraftService + Code.gs wire-up: `src/DraftService.gs` + `src/Code.gs` updated to run full pipeline (1 PR)
- [x] **CHECKPOINT** ✅ PHASE_READY audit passed (2026-07-03)

*After Phase 1 merge: human manually sends smoke-test emails (3–5/day) from Gmail. DRAFT_ONLY=TRUE is the default.*

---

## Phase 2: Tracking and Follow-ups 🤖
*Goal: Detect replies and bounces, enforce suppression, schedule follow-up drafts, and surface metrics on the DASHBOARD tab.*

- [x] ✅ **Task 2.1** SuppressionService module: `src/SuppressionService.gs` — reads/writes SUPPRESSION tab, `isSuppressed()` check (1 PR)
- [x] ✅ **Task 2.2** ReplyMonitor module: `src/ReplyMonitor.gs` — Gmail search for replies, updates CONTACTS status (1 PR)
- [x] ✅ **Task 2.3** BounceMonitor module: `src/BounceMonitor.gs` — Gmail NDR detection, updates CONTACTS + SUPPRESSION (1 PR)
- [x] ✅ **Task 2.4** FollowUpScheduler module: `src/FollowUpScheduler.gs` — identifies follow-up eligible contacts, adds to QUEUE (1 PR)
- [x] ✅ **Task 2.5** DashboardService + Code.gs trigger wire-up: `src/DashboardService.gs` + `src/Code.gs` updated with monitor + dashboard triggers (1 PR)
- [ ] **CHECKPOINT** 🏠 PHASE_READY audit

*Note: ReplyMonitor and BounceMonitor are the most brittle modules — expect ERRORS.md activity here. Human remains the safety net at this volume.*

---

## Phase 3: API Clients — Optional 🤖
*Goal: Replace manual CSV workflows with API-backed discovery and verification — only if manual enrichment becomes the bottleneck.*

*Trigger: start Phase 3 only when manual CSV processing is consuming too much time or free credits are consistently exhausted.*

- [x] ✅ **Task 3.1** ZeroBounceClient module: `src/ZeroBounceClient.gs` — ZeroBounce email verification API (1 PR)
- [x] ✅ **Task 3.2** ApolloClient module: `src/ApolloClient.gs` — Apollo contact search API (1 PR)
- [x] ✅ **Task 3.3** HunterClient module: `src/HunterClient.gs` — Hunter email finder/verifier API (1 PR)
- [ ] **CHECKPOINT** 🏠 PHASE_READY → Claude Code audit

---

## Upgrade Triggers (human decides, not Codex)

| Signal | Action |
|--------|--------|
| ZeroBounce free (100/mo) consistently exhausted | Switch to MillionVerifier or ZeroBounce PAYG credits (~$1–2/300 emails) |
| Apollo free credits exhausted each month | Add Apollo paid plan |
| Manual sending (10/day) is the bottleneck | Evaluate Instantly or Lemlist; drop standalone Lemwarm if bundled warm-up included |
| First domain healthy + positive replies confirmed | Add second domain + inbox |
| 150–300 verified contacts ready | Start Phase 3 API clients |
