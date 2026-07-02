# Express Training Cold Email MVP

> Built with the **Codex + Claude Code** review workflow.
> Codex writes the code. Claude Code reviews every PR. You click merge.

---

## Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│  1. User reads PHASES.md → identifies Current Task          │
│  2. User (or Claude) writes a task brief from the template  │
│  3. User pastes brief into Codex                            │
│  4. Codex outputs Session Start banner                      │
│  5. Codex creates branch codex/task-X.X-name                │
│  6. Codex opens draft PR, fills PR template                 │
│  7. Codex implements task in 1 commit (file scope match)    │
│  8. Codex makes 2nd commit updating PHASES.md               │
│  9. Codex marks PR ready for review                         │
│ 10. CI runs codex-guard.yml — must pass                     │
│ 11. Claude reviews per docs/codex/REVIEW_STANDARDS.md       │
│ 12. If issues: Claude requests changes; back to step 7      │
│ 13. If clean: Claude approves; user clicks Merge            │
│ 14. User copies .gs file into Apps Script editor            │
│ 15. Repeat for next task                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Repo File Map

```
express-training-cold-email-automation/
│
├── START-CODEX.md                   ← The task loop — read before first Codex session
│
├── AGENTS.md                        ← Codex's rule book — read every session
├── CLAUDE.md                        ← Claude Code's project instructions
├── PHASES.md                        ← Phase/task tracker — source of truth
├── PLAYBOOK.md                      ← Phase-specific task recipes for Codex
├── NOTES.md                         ← Running deviation log (Codex appends)
├── ERRORS.md                        ← Running error log (Codex appends)
│
├── .github/
│   ├── CODEOWNERS                   ← Code ownership (Claude Code only on .github/workflows/)
│   ├── pull_request_template.md     ← Codex fills this for every PR
│   └── workflows/
│       └── codex-guard.yml          ← CI: TASK tag, PHASES.md, secrets
│
├── .gitignore
├── .gitleaks.toml                   ← Secret scanning config
│
├── .claude/
│   └── commands/                    ← Claude Code slash commands
│
├── docs/
│   └── codex/
│       ├── REVIEW_STANDARDS.md      ← Claude's 5-tier review rubric
│       ├── HANDOFF.md               ← Task brief format and examples
│       ├── FRESH_START.md           ← Reset procedure for bad Codex sessions
│       ├── TRACKING.md              ← Per-phase audit log (Claude maintains)
│       └── templates/               ← Brief, PR, deviation, error templates
│
```

---

## Quick Start

**Start a new Codex session:**
1. Read `PHASES.md` → find the current task
2. Fill `docs/codex/templates/task-brief.md` with the task details
3. Paste the filled brief into Codex
4. Codex outputs the Session Start banner — if you don't see it, re-paste `AGENTS.md`
5. Wait for the draft PR, then call Claude to review

**Call Claude Code for a PR review:**
> "Please review PR #[N] on [branch]."

**Run a phase audit:**
> "PHASE_READY — please audit Phase [N]."

**Reset a bad Codex session:**
See `docs/codex/FRESH_START.md`.

---

## Key Rules (enforced by CI)

- Every PR title must end with `[TASK_X.X]`
- Every commit must end with `[TASK_X.X]`
- `PHASES.md` must be updated in the same PR as the code
- No `.github/workflows/` changes from Codex — Claude Code only
- No secrets committed (gitleaks scan on every PR)

