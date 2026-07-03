# Codex Tracking — Express Training Cold Email MVP

Maintained by Claude Code. Populated before every PR merge.
Tracks what Codex built each phase, what issues were found, and what was fixed before merge.

---

## Phase 1: Core Draft Loop

**Status:** ✅ Complete — PHASE_READY audit passed 2026-07-03
**Branch pattern:** `codex/task-1.X-*`
**Codex model:** not recorded per-PR — add to future TASK COMPLETE blocks

### PRs

| Task | PR | Status | Issues found | Resolution |
|------|----|----|--------------|------------|
| 1.1 — Project scaffold | #6 | merged | None | — |
| 1.2 — AuditLogger | #8 | merged | None | — |
| 1.3 — ImportService | #9 | merged | None | — |
| 1.4 — Cleaner | #10 | merged | None | — |
| 1.5 — Deduplicator | #11 | merged | None | — |
| 1.6 — MassachusettsFilter | #11 | merged | None | — |
| 1.7 — LeadScorer | #12 | merged | None | — |
| 1.8 — TemplateEngine | #13 | merged | None | — |
| 1.9 — ApprovalGate | #14 | merged | None | — |
| 1.10 — DraftService + wire-up | #15, #16 | merged | **Blocker:** `Code.gs` shipped with 3 duplicate stub functions and stray JSDoc fragments left over from the Task 1.1 skeleton — file failed to parse, whole Apps Script project would not load. Also: `checkApproval` boolean coercion mismatch vs. orchestrator; `createDraft` gained an undocumented 5th param (`settings`). | Follow-up PR #16 fixed the boolean coercion only. Blocker persisted through #16. Claude fixed directly (override, user-approved) in PR #17: removed dead code, `Code.gs` now passes `node --check`. PR #18: hardened AGENTS.md/PHASES.md/CI so the two *process* failures that shipped alongside (untagged multi-task PR title, PHASES.md "accept both" conflict stacking) can't recur. `createDraft` 5-param signature ratified as the contract in REVIEW_STANDARDS.md. |

### Files Created / Modified
`appsscript.json`, `PROPERTIES.example`, `src/Code.gs`, `src/AuditLogger.gs`, `src/ImportService.gs`, `src/Cleaner.gs`, `src/Deduplicator.gs`, `src/MassachusettsFilter.gs`, `src/LeadScorer.gs`, `src/TemplateEngine.gs`, `src/ApprovalGate.gs`, `src/DraftService.gs`

### Claude Code Audit — Issues Found & Fixed
- **`src/Code.gs` — blocker, fixed in PR #17.** Non-compiling file (dangling `*/ @returns {void}` fragment + duplicate `// TODO` stub functions for `runImportPipeline`, `runDraftPipeline`, `runFullPipeline`). Verified with `node --check` before and after. Root cause: Task 1.10 wire-up pasted real implementations without deleting the Task 1.1 skeleton stubs; CI had no compile step to catch it (fixed in the same PR — see below).
- **`src/ApprovalGate.gs` — fixed by Codex in PR #16.** `maConfirmed`/`roleIsRelevant`/`catchAll` were checked with strict `=== true`, while the orchestrator coerced the same QUEUE-sheet fields as `=== true || === 'TRUE'` for `scoreLead`. A lead could pass scoring but fail approval on the identical field. Codex's fix aligned the coercion.
- **`src/DraftService.gs` `createDraft` signature — accepted, contract updated in PR #18.** Gained a 5th `settings` param (carries `draftOnly`) beyond the originally documented 4-param contract. Confirmed necessary; REVIEW_STANDARDS.md Tier 2.1 updated to document 5 params as the immutable contract going forward.
- **Process pattern (see Pattern Watch below) — fixed in PR #18.** PR-title tag check and PHASES.md merge-conflict resolution failed on nearly every PR across 10 parallel Codex branches. Root cause: no conflict-resolution guidance in AGENTS.md, and a mutable `Current Task:` pointer in PHASES.md that guaranteed same-line collisions. Fixed: AGENTS.md rules 4/6/11 rewritten, new "Merge Conflicts — PHASES.md" section added, pointer removed from PHASES.md (checklist is now sole source of truth), CI gained a guard that fails the build on conflict markers or duplicate task lines.

### Final Verdict
**PASS.** All 10 `src/*.gs` files parse (`node --check`), pure/I/O module boundary fully respected (zero `SpreadsheetApp`/`GmailApp`/`PropertiesService`/`UrlFetchApp` leakage into pure modules), all four immutable contracts (`auditLog`, `checkApproval`, `scoreLead`, `createDraft`) match REVIEW_STANDARDS.md, no hardcoded thresholds/limits, no `console.log`, secrets only via `PropertiesService`. `GmailApp` confined to `DraftService.gs`. Phase 1 CHECKPOINT cleared — Phase 2 unblocked.

---

## Phase 2: Tracking and Follow-ups (pending)

*Claude Code will populate before the first Phase 2 PR.*

---

## Phase 3: API Clients — Optional (pending)

*Claude Code will populate if/when Phase 3 is triggered.*

---

## Pattern Watch (cumulative)

If the same class of issue appears in 2+ PRs, log it here and create EMERGENCY.md.

| Pattern | First seen | Recurrence | Status |
|---------|------------|------------|--------|
| PHASES.md merge conflicts resolved with "Accept both changes" (stacked `Current Task:` pointers, duplicated task rows) | PR #9–16 range | 2+ (repeated stacking observed across the Phase 1 PR sequence) | Fixed in PR #18 — mutable pointer removed from PHASES.md, AGENTS.md conflict protocol added, CI guard added for conflict markers/duplicate task lines |
| PR title missing `[TASK_X.X]` tag and/or bundling multiple tasks into one title | Observed during PR #13's conflict-resolution pass | 1 (caught by CI before merge; final merged title was clean) | Fixed in PR #18 — AGENTS.md rule 11 now leads with the exact title template plus this rejected example |
| Multiple tasks landed in a single PR (Task 1.5 + Task 1.6 both in PR #11) | PR #11 | 1 | Not yet a 2+ pattern — no EMERGENCY triggered. Rule 6 in AGENTS.md now explicitly calls out "one open PR at a time" starting from fresh `main`; watch the Phase 2 PR sequence for recurrence |
| `Code.gs` shipped with duplicate stub functions / non-compiling file, twice (Task 1.10 PR #15, and follow-up PR #16 which fixed a different issue but left the syntax break in place) | PR #15, recurred in #16 | 2 | Fixed directly by Claude (user-approved override) in PR #17. CI gained a `.gs` syntax gate in the same PR so a non-compiling file can no longer merge green |
