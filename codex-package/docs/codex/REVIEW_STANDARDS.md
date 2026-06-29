# Codex Review Standards — Claude Code's Rubric

This file defines exactly what Claude Code checks on every Codex PR.
Codex's failure modes skew toward "confidently does too much" rather than
"can't follow rules." This rubric targets those failure modes specifically.

---

## Pre-Review Gate

Block the PR immediately (do not start review) if any of these fail:

1. PR title does not end with `[TASK_X.X]`
2. Any commit in the PR is missing the `[TASK_X.X]` tag
3. PR body does not include the TASK COMPLETE block
4. PR body does not declare files in scope
5. PHASES.md not updated in the same PR
6. CI workflow `codex-guard.yml` failed

For any of the above, post a review comment with the specific rule violated and request changes. Do not proceed.

---

## Tier 1: Scope Guard (highest priority)

### 1.1 File scope match
- The PR diff must touch only files listed in the task brief's "files in scope"
- Out-of-scope file in diff = **blocker**
- Exception: PHASES.md (always allowed for the rule 4 update)

### 1.2 No silent refactors
- Every line of the diff must serve the stated task
- "While I was here" cleanups, formatting tweaks, or import reorders unrelated to the task = **blocker**
- Unsolicited renames = **blocker**

### 1.3 No premature abstractions
- New helper functions, classes, or modules not requested in the brief = **blocker**
- Three similar lines is better than a premature abstraction
- Codex tends to "think ahead" — block this

### 1.4 No unrequested tests / docs / config
- Tests, docstrings, README updates, config files added without brief permission = **blocker**
- Exception: contract/type docblocks on exported functions (per AGENTS.md "Patterns")

---

## Tier 2: Architecture Drift

> ⚠️ Fill in the project-specific contracts and module paths below before Phase 1 starts.
> Until filled, Tier 2 is enforced generically — Claude blocks pattern violations against
> whatever modules AGENTS.md names, but cannot enforce specific interface shapes.

### 2.1 Contract preservation
Block if any of these change without an explicit task ID:
- [list immutable interfaces / module exports here once defined]
- State file format in `state/` (once defined)

### 2.2 Pattern enforcement
- State writes must go through `[your state module]` — no inline filesystem calls = **blocker**
- File operations must go through `[your file helpers module]` = **blocker**
- Logging must go through `[your logger module]` — rogue raw print/log calls (`console.log`, `print`, `fmt.Println`, etc.) = **blocker**
- External services called outside their wrapper modules = **blocker**
- Concurrency hardcoded instead of read from `.env` = **blocker**

### 2.3 Dependency hygiene
- New deps in `package.json` (or equivalent manifest) require approval gate per AGENTS.md = **blocker** if unapproved
- Architecture-incompatible packages (e.g. x86 on ARM64) = **blocker**
- Version pin missing = **request changes** (not blocker)

---

## Tier 3: Security

### 3.1 Secret hygiene (always blockers)
- Hardcoded API keys, tokens, passwords
- Any secret value logged anywhere (even debug)
- `.env` content committed
- Secrets in test fixtures

### 3.2 Workflow security
- `.github/workflows/` modified by Codex = **blocker** (Claude Code only)
- New CI secrets referenced without prior setup = **request changes**

---

## Tier 4: Quality

### 4.1 Comment density
- Codex over-comments. Cap: only comments where WHY is non-obvious.
- Multi-line block comments explaining what code does = **request changes**
- Outdated/aspirational comments = **request changes**

### 4.2 Error handling
- Try/catch around code that can't fail = **request changes**
- Silent error swallowing = **blocker**
- Error messages without stage context = **request changes**

### 4.3 Naming
- Names must match existing module conventions
- Hungarian notation, abbreviations, single-letter vars in non-trivial scopes = **request changes**

---

## Tier 5: Logging & Tracking

- NOTES.md must be updated in same PR if any deviation occurred
- ERRORS.md must be updated in same PR if any error occurred during testing
- Splitting either across PRs = **blocker**

---

## Pattern Detection (cross-PR)

Maintain a running list in `docs/codex/TRACKING.md` under "Pattern Watch."

If the same class of issue appears in **2 or more PRs**:

1. Stop reviewing the current PR
2. Create `EMERGENCY.md` at repo root with:
   - The pattern (what Codex keeps doing wrong)
   - PR numbers where it occurred
   - Required AGENTS.md or CODEX_TASK_RECIPES.md tightening
3. Tell the user: "Pattern detected — bringing Claude in to tighten rules. Hold all Codex PRs."
4. Update AGENTS.md with the new rule
5. Delete EMERGENCY.md only after fix is merged

---

## Review Output Format

Every Codex PR review ends with one of three outcomes:

**Clean:**
> PR looks good — no issues found. Safe to merge.
> Click **Merge** when ready.

**Issues found (request changes):**
> Found [X] issue(s). Do not merge yet.
> [list each issue, tier, and exact fix]
>
> Tell Codex:
> "[exact instruction Codex can act on directly]"
>
> Once Codex pushes the fix, re-request review.

**Security issue:**
> ⚠️ SECURITY ISSUE — Do not merge. Do not hand back to Codex.
> [describe the issue]
> Bring Claude in to fix this directly via a follow-up PR.

---

## Calibration Loop

Every 5 merged PRs, scan TRACKING.md and NOTES.md for patterns. If any pattern
shows 3+ occurrences without triggering EMERGENCY.md, tighten AGENTS.md proactively.
Log the tightening in PHASES.md's "Codex Calibration Log."
