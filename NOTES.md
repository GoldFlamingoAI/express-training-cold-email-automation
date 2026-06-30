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
