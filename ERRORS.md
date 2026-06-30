# Errors — Express Training Cold Email MVP

Running log of every caught error during testing or live runs.
Codex appends an entry in the same commit as the bug fix or recovery code.
Claude reads this on every PR review.

## Format

```
[YYYY-MM-DD] ERROR: Stage [stage name] | [error class] | [message]
  Tried: [what fixes were attempted]
  Resolved: [yes/no — if yes, how]
  Task: [TASK_X.X]
  PR: [#NN]
```

## Stages (pipeline order)
- `ImportService`       — CSV/paste ingestion into COMPANIES tab
- `Cleaner`             — field normalization (pure)
- `Deduplicator`        — duplicate detection (pure)
- `MassachusettsFilter` — MA location confirmation (pure)
- `LeadScorer`          — 100-pt scoring (pure)
- `AuditLogger`         — ACTIVITY_LOG writes
- `TemplateEngine`      — template merge (pure)
- `ApprovalGate`        — pre-send condition checks (pure)
- `DraftService`        — Gmail draft creation
- `ReplyMonitor`        — Gmail reply detection [Phase 2]
- `BounceMonitor`       — Gmail NDR bounce detection [Phase 2]
- `SuppressionService`  — SUPPRESSION tab reads/writes [Phase 2]
- `FollowUpScheduler`   — follow-up eligibility [Phase 2]
- `DashboardService`    — DASHBOARD tab metrics [Phase 2]
- `ZeroBounceClient`    — ZeroBounce API [Phase 3]
- `ApolloClient`        — Apollo API [Phase 3]
- `HunterClient`        — Hunter API [Phase 3]
- `Orchestrator`        — Code.gs pipeline runner (catches cross-module errors)

---

(empty — first entry will be logged on first failed run)
