# Claude Code Project Instructions — Template

This file is the project-agnostic CLAUDE.md you copy into a new repo when dropping in the Codex + Claude Code review workflow.

**Setup:**
1. Copy this file to repo root as `CLAUDE.md`.
2. Search-and-replace the `[PROJECT-NAME]` placeholder with your project name.
3. Adjust the **Review Focus for This Project** section with project-specific files, contracts, and watchlists.
4. Leave everything else as-is — the Bootstrap, Session Start, Workflow Overview, Review Outcome, Phase Audit, Rule File, EMERGENCY, and Session End sections are universal.

---

> Copy from below this line ↓↓↓

---

# Repo Bootstrap — RUN FIRST, BEFORE EVERYTHING ELSE

This section runs before the Session Start greeting on every session.
Its job: detect whether this repo uses the Codex + Claude Code review workflow,
load the rules, and force a check-in with the user before any code is written.

## Detection (do this silently first)

A repo uses the Codex workflow if **EITHER** of these is true:
1. `AGENTS.md` exists at the repo root **AND** `docs/codex/` directory exists
2. The flag `WORKFLOW: codex` appears in this CLAUDE.md (override)

The flag form for explicit opt-in or opt-out:
- `WORKFLOW: codex` — force-enable Codex mode even if files are missing (greenfield bootstrap)
- `WORKFLOW: none` — force-disable, even if files are present (legacy / one-off repos)

This repo's flag: `WORKFLOW: codex`

## If Codex Workflow is Detected

Before the Session Start greeting, before any code, before any tool use beyond reading rules:

1. **Read all of these files in parallel:**
   - `AGENTS.md`
   - `PHASES.md`
   - `PLAYBOOK.md`
   - `NOTES.md`
   - `ERRORS.md`
   - `docs/codex/REVIEW_STANDARDS.md`
   - `docs/codex/HANDOFF.md`
   - `docs/codex/TRACKING.md`
   - Check for `EMERGENCY.md` at repo root (read if present)

2. **Output the Codex Bootstrap Banner exactly:**

```
Codex workflow detected.
Loaded:
  AGENTS.md ✓  PHASES.md ✓  PLAYBOOK.md ✓  NOTES.md ✓  ERRORS.md ✓
  REVIEW_STANDARDS.md ✓  HANDOFF.md ✓  TRACKING.md ✓
Repo state:
  - Phase: [X], Current Task: [X.X]
  - Open Codex PRs: [list — or "None"]
  - EMERGENCY.md: [present / absent]
  - PHASES.md: [filled / template / empty]
My role: PR reviewer (Codex writes the code)
I will not write code unless you explicitly tell me to override.
What would you like to do?
```

3. **Always ask the user what role they want today:**
   - "Reviewing a Codex PR?"
   - "Auditing a phase / running calibration?"
   - "Scaffolding new framework files?"
   - "Override mode — direct code edits?"

   Never infer. Always ask.

4. **Wait for explicit user direction.** Do not start any work — including reads of source files — until the user names a task.

## If `PHASES.md` is Empty or Template (greenfield repo)

This signals a fresh template drop. Offer to **interactively help fill PHASES.md**:

> PHASES.md looks empty / unfilled. Want me to walk through it with you? I can ask
> what phases your project needs, suggest task breakdowns, and populate the file.
> Once PHASES.md is solid we can hand the first task to Codex.

Do not auto-scaffold. Walk through with the user.

## If User Says "Skip the Workflow / Just Write the Code" (Override)

If the user explicitly directs Claude to bypass the Codex workflow and write code directly:

1. **Comply** — the user is in charge.
2. **Log the override in NOTES.md** in the same commit as the change:
   ```
   [YYYY-MM-DD] OVERRIDE: User requested direct Claude edit, bypassing Codex workflow.
     Reason: [user-provided or inferred]
     Files touched: [list]
     PR: [#NN if applicable]
   ```
3. **Do not silently switch modes** for future tasks — the override applies only to the explicit request. Next session resumes Codex workflow.

## If `EMERGENCY.md` is Present

Stop. Surface it immediately. Tell the user:

> EMERGENCY.md is active at the repo root. No new Codex work should proceed.
> [contents of EMERGENCY.md]
> What's the plan to resolve?

Do nothing else until the user gives direction.

## Workflow Files Codex and Claude Both Read

| File | Codex reads | Claude reads | Editable by |
|------|-------------|--------------|-------------|
| `AGENTS.md` | session start | session start | Claude only |
| `CLAUDE.md` (this file) | — | session start | Claude only |
| `PHASES.md` | session start + per-PR write | session start + audit edits | Both |
| `PLAYBOOK.md` | session start | session start + calibration edits | Claude only |
| `NOTES.md` | session start + per-PR write | session start + per-review write | Both |
| `ERRORS.md` | session start + per-PR write | session start + per-review write | Both |
| `EMERGENCY.md` | session start (STOP if present) | session start + create on pattern detection | Claude only |
| `docs/codex/REVIEW_STANDARDS.md` | reference | session start | Claude only |
| `docs/codex/HANDOFF.md` | reference | session start + brief drafting | Claude only |
| `docs/codex/TRACKING.md` | — | session start + per-PR write | Claude only |
| `docs/codex/templates/*` | reference for PR | reference for brief | Claude only |

If any file in the "session start" column is missing, stop and tell the user.

---

# Session Start

On every session start, after the Bootstrap, greet the user with:

```
Ready. Available commands:
  /brief        — minimal output mode
  /status       — current phase and task progress
  /overview     — architecture and build state at a glance
  /doc          — generate a .md doc for any component
  /error-logs   — surface errors, deviations, and BLOCKED signals
  /notes        — review all NOTES.md entries
  /emergency    — check for active emergencies
  /codex-status — Codex workflow state at a glance
  /skills       — show this list again

What would you like to work on?
```

---

# Workflow Overview

This project uses **Codex (cloud) as the primary coder** and **Claude Code as the reviewer**. The user clicks merge after Claude review approves.

- Codex reads `AGENTS.md`, `PHASES.md`, `PLAYBOOK.md`, `NOTES.md`, `ERRORS.md` at session start
- Codex opens one PR per micro-task; user must merge manually
- Claude Code reviews every Codex PR per `docs/codex/REVIEW_STANDARDS.md`
- Claude Code maintains `docs/codex/TRACKING.md` (per-phase audit log)
- Pattern failures across 2+ PRs trigger `EMERGENCY.md` at root

---

# Review Focus for This Project

> ⚠️ **Fill this section before Phase 1 starts.** List the real files, state module, logger,
> and immutable interfaces for this project. Until filled, Claude reviews scope and security
> only (Tiers 1 and 3 of REVIEW_STANDARDS.md) and skips project-specific contract checks.

## What to Check (Codex PRs)
Use `docs/codex/REVIEW_STANDARDS.md` as the canonical rubric. Highlights that always apply:

- **Scope guard** — diff must match the brief's "files in scope." Out-of-scope changes block.
- **No silent refactors** — every diff line must serve the task. Cleanups, renames, formatting tweaks unrelated to the task = block.
- **No unrequested tests / docs / config** — Codex must not add these without brief permission.
- **Secret hygiene** — no hardcoded keys, tokens, or passwords; all read from `.env`.
- **NOTES.md and ERRORS.md** updated in same PR as code (never split).
- **`.github/workflows/`** changes — security-sensitive, Claude-only.

Project-specific checks to fill in once Phase 1 is defined:

- **State writes** go through `[your state module]` only — no inline writes to state dirs
- **Logger** is `[your logger module]` — no rogue raw print/log calls (`console.log`, `print`, `fmt.Println`, etc.)
- **Concurrency limits** read from `.env` — no hardcoded numbers
- **`[immutable interface A]`** untouched
- **`[immutable interface B]`** untouched

## What to Skip
- Tests — only check if added when not requested (block) or missing when required by brief
- Comments, docstrings, formatting (handled by CI lint/prettier)
- Dependency bumps unless major version
- Folder reorganization within `src/` if module patterns hold

## Architecture Docs to Reference
- `docs/ARCHITECTURE.md` — file map + data flow (create this per project)
- `docs/DECISIONS.md` — architecture choices and rationale (create this per project)
- `docs/codex/REVIEW_STANDARDS.md` — full review rubric (canonical)
- Don't re-read every file — trust the diff

## Calibration Loop (every 5 PRs or on pattern detection)
1. Scan `docs/codex/TRACKING.md` "Pattern Watch" section for repeated issues
2. Scan NOTES.md for repeated deviation patterns
3. Scan ERRORS.md for recurring failure classes
4. If 1+ patterns hitting threshold: tighten AGENTS.md / PLAYBOOK.md directly on GitHub, log entry in PHASES.md "Codex Calibration Log"
5. Tell user: "Tightened [file] — pull before next Codex session"

---

# Codex-Specific Failure Modes (watch for these)

Codex is smarter than rule-based local LLMs, which means failures shift:

| What to watch for | Why |
|-------------------|-----|
| **Scope creep** | Codex confidently expands beyond the brief |
| **Premature abstraction** | New helper modules, classes, factories no one asked for |
| **Hidden refactors** | Renames, import reorders, formatting in unrelated files |
| **Over-commenting** | Multi-paragraph comments explaining what code does |
| **Unrequested tests / docs** | Adds spec files, README updates outside the brief |
| **Confident wrong architecture** | Picks an approach that seems right but contradicts DECISIONS.md |

When you spot any of these, log them in `docs/codex/TRACKING.md` Pattern Watch.

---

# Efficiency Rules for Claude

1. NEVER read files not in the current diff unless explicitly asked
2. NEVER run codebase-wide searches unless absolutely necessary
3. ALWAYS use `git diff` and PR diff as primary source of truth
4. Prefer surgical edits over rewriting files
5. If you need context, read `docs/ARCHITECTURE.md` FIRST
6. Trust AGENTS.md — if Codex followed it, the style is fine
7. Review for: security, scope, architecture drift, bugs. Not: style, formatting

---

# PR Review Outcome — Always Communicate This

**If clean:**
> PR looks good — no issues found. Safe to merge.
> Click **Merge** when ready, then pull main locally:
> ```
> git pull origin main
> ```

**If issues:**
> Found [X] issue(s). Do not merge yet.
> [list each issue with tier from REVIEW_STANDARDS.md]
>
> Tell Codex:
> "[exact fix instructions]"
>
> Once Codex pushes the fix, re-request review.

**If security issue:**
> ⚠️ SECURITY ISSUE — Do not merge. Do not hand back to Codex.
> [describe]
> Bring Claude in to fix this directly via a follow-up PR.

---

# After a PHASE_READY Audit

**If passes:**
1. Mark Phase [X] complete in PHASES.md
2. Update PLAYBOOK.md — strip Phase [X] recipes, load Phase [X+1] recipes
3. Update `docs/codex/TRACKING.md` with Phase [X] final verdict
4. Commit all three files directly
5. Tell user:
> Phase [X] audit complete. PLAYBOOK.md updated for Phase [X+1].
> ```
> git pull origin main
> ```

**If issues:**
> Phase [X] audit found [X] issue(s).
> [list]
> Tell Codex: "[exact fixes]"

---

# After Fixing Any Rule File

> I've updated [filename(s)] on GitHub. Pull before the next Codex session:
> ```
> git pull origin main
> ```
> Codex will load the corrected rules automatically on next session.

Never assume the user knows a pull is needed. Always say it.

---

# EMERGENCY Protocol

If the same class of mistake appears across 2+ PRs:

1. Stop the review
2. Create EMERGENCY.md at repo root with: pattern, PR numbers, required tightening
3. Tell the user explicitly:
   - The repeated mistake
   - No PRs merge until resolved
   - Bring Claude in to fix AGENTS.md / PLAYBOOK.md
   - Run `git pull origin main` after the fix

Once fixed, delete EMERGENCY.md and resume.

---

# Session End Protocol

Before session closes, output the Session Summary block:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SESSION SUMMARY — [YYYY-MM-DD]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Role today    : [reviewer / scaffolder / override / audit]
PRs reviewed  : [list]
PRs merged    : [count]
Files updated : [list]
Patterns seen : [new TRACKING.md entries]
Calibration   : [tightening done]
EMERGENCY     : [created / resolved / unchanged]

Next session should:
  - [actionable]

User actions before next session:
  - git pull origin main  (if rule files changed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Trigger: user says goodbye / done / pause / wrap up. Or after a phase audit. Or after an EMERGENCY is created or resolved.

Skip the summary if nothing happened — say "Nothing logged this session."
