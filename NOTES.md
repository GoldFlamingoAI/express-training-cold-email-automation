# Notes — Express Training Cold Email MVP

Running log of deviations, judgment calls, and gotchas.
Codex appends an entry whenever a decision is made that's not covered by PLAYBOOK.md.
Claude reads this on every PR review and at every PHASE_READY calibration checkpoint.

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
