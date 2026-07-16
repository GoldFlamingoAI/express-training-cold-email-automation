# Notes — Express Training Cold Email MVP

Running log of deviations, judgment calls, and gotchas.
Codex appends an entry whenever a decision is made that's not covered by AGENTS.md.
Claude reads this on every PR review.

## Format

```
[YYYY-MM-DD] DEVIATION: [what and why] — [TASK_X.X]
[YYYY-MM-DD] JUDGMENT: [what call was made and why] — [TASK_X.X]
[YYYY-MM-DD] GOTCHA: [unexpected behavior worth remembering] — [TASK_X.X]
```

---

[2026-06-30] JUDGMENT: Chose lean phasing — Phase 1 = core draft loop only; API clients (ZeroBounce/Apollo/Hunter) deferred to optional Phase 3. Reason: 25–50 contact smoke test fits within free-tier verification caps (100/mo ZeroBounce); manual CSV workflow is faster to prove than building API wrappers first. — Architecture review session
[2026-06-30] JUDGMENT: AuditLogger built as Task 1.2 (before other I/O modules) so every subsequent module can call auditLog() immediately. — Architecture review session
[2026-06-30] JUDGMENT: ApprovalGate designed as pure function — threshold and daily count passed in by orchestrator rather than read from SETTINGS tab inside the module. Keeps the gate testable and avoids Sheets dependency in pure module layer. — Architecture review session
[2026-06-30] GOTCHA: Phase 2 ordering (BounceMonitor after smoke-test sends) is intentional — real NDR bounce messages from the smoke test give concrete examples of what Gmail delivers from actual MA business mail servers. Write BounceMonitor search patterns against real data, not guesses. Do not move BounceMonitor to Phase 1. — Architecture review session
[2026-06-30] GOTCHA: BounceMonitor detection mismatches are expected at MVP volume (threading edge cases, auto-responder false positives, delayed NDRs, server-specific bounce formats). When writing the Task 2.3 brief, add a NEEDS_REVIEW: requirement: all detection results — including non-matches — must be logged to ACTIVITY_LOG via auditLog(), never swallowed silently. Human reviews the ACTIVITY_LOG during the smoke test to catch what the monitor misses. — Architecture review session
[2026-06-30] GOTCHA: ApprovalGate is the hard safety stop even when BounceMonitor has gaps. ApprovalGate checks verificationResult === 'valid' on every draft creation attempt — if BounceMonitor missed a bounce and left a contact in an incorrect status, ApprovalGate's verificationResult check should still block a follow-up draft for an address that never passed ZeroBounce. This only works if the verificationResult field is set at import time and never overwritten by BounceMonitor. Keep them separate. — Architecture review session
[2026-06-30] GOTCHA: During Phase 2 smoke-test sending, a daily manual scan of the Gmail inbox is faster and more reliable than waiting for BounceMonitor to catch issues. At 3–10 emails/day you will see bounce NDRs and auto-reply floods in real time. Trust your eyes first; treat BounceMonitor as a convenience layer, not the primary safety net. — Architecture review session
[2026-07-16] JUDGMENT: Migrated the sender mailbox and manual sending surface from Gmail to Hostinger. Apps Script remains the Sheets-based preparation/state layer, while Hostinger Webmail is authoritative for sending, replies, and bounces. Gmail monitors remain safe compatibility no-ops so installed legacy triggers cannot fail before the operator removes them. — Hostinger migration

[2026-07-03] OVERRIDE: User directed Claude to fix Phase 1 review findings directly, bypassing the Codex workflow. Reason: the Code.gs syntax blocker survived two Codex PRs (Task 1.10 merge + fix PR #16) and is a mechanical dead-code deletion; round-tripping Codex a third time was not warranted.
  Files touched: src/Code.gs (removed 3 duplicate stub functions + stray JSDoc fragments left from the Task 1.1 skeleton; closed countTodayActivity — file now passes node --check), .github/workflows/codex-guard.yml (added .gs syntax gate so a non-compiling file can never merge green again), docs/codex/REVIEW_STANDARDS.md (documented createDraft 5-param signature as the contract), PHASES.md (collapsed stacked Current Task pointer to one line).
  PR: claude/codex-file-visibility-ny2j0e

[2026-07-03] DEVIATION: Phase 2 PLAYBOOK recipes were not present after the Phase 1 audit; implemented Task 2.1 from PHASES.md and AGENTS.md module-role requirements only. — [TASK_2.1]
[2026-07-03] SALVAGE: Codex branch codex/summarize-repo-and-codex-role-hbcmmw (PR #20) was forked from PR #5 — before Phase 1 modules and before the #17–#19 fixes — so its merge into main conflicted across 11 files and would have reverted AGENTS.md, codex-guard.yml, REVIEW_STANDARDS.md, and the Code.gs fix. No button-based conflict resolution produced a correct PHASES.md (Phase 2 section was dropped in testing). Salvaged only src/SuppressionService.gs (Codex's work, verbatim) onto fresh main; PR #20 to be closed unmerged. Root cause: Codex session was not started from fresh origin/main. — Claude
