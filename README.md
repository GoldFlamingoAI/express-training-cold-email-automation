# [PROJECT-NAME]

> Built with the **Codex + Claude Code** review workflow.
> Codex writes the code. Claude Code reviews every PR. You click merge.

---

## 🚀 Just cloned this template?

Read **[TEMPLATE_SETUP.md](./TEMPLATE_SETUP.md)** first — it walks you through
the 9 setup steps (15–30 min) needed before the first Codex session.

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
│ 14. User pulls main locally                                 │
│ 15. Repeat for next task                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Repo File Map

```
[PROJECT-NAME]/
│
├── TEMPLATE_SETUP.md                ← READ THIS FIRST after cloning
├── START-CODEX.md                   ← READ THIS once setup is done — the task loop
│
├── AGENTS.md                        ← Codex's rule book — read every session
├── CLAUDE.md                        ← Claude Code's project instructions
├── PHASES.md                        ← Phase/task tracker — source of truth
├── PLAYBOOK.md                      ← Phase-specific task recipes for Codex
├── NOTES.md                         ← Running deviation log (Codex appends)
├── ERRORS.md                        ← Running error log (Codex appends)
│
├── .github/
│   ├── CODEOWNERS.template          ← Rename to CODEOWNERS + fill in your handle (Step 1)
│   ├── pull_request_template.md     ← Codex fills this for every PR
│   └── workflows/
│       └── codex-guard.yml          ← CI: TASK tag, PHASES.md, secrets (stack-agnostic)
│
├── .gitignore                       ← Polyglot: Node / Python / Go / Rust / Java / Ruby
├── .gitleaks.toml                   ← Pre-commit secret scanning config
│
├── .claude/
│   └── commands/                    ← Claude Code slash commands
│       ├── brief.md                 ← /brief — minimal output mode
│       ├── codex-status.md          ← /codex-status — workflow state
│       ├── doc.md                   ← /doc — generate component docs
│       ├── emergency.md             ← /emergency — check EMERGENCY.md
│       ├── error-logs.md            ← /error-logs — surface errors and flags
│       ├── notes.md                 ← /notes — review NOTES.md entries
│       ├── overview.md              ← /overview — project bird's-eye view
│       ├── skills.md                ← /skills — list slash commands
│       └── status.md                ← /status — phase and task progress
│
├── docs/
│   ├── PROPER-GITHUB-REPO-FILE-TRANSFER.md  ← Recipe for adding the workflow to an existing repo
│   └── codex/
│       ├── DROPIN_PLAYBOOK.md       ← Full workflow reference for new projects
│       ├── CLAUDE_TEMPLATE.md       ← Source for CLAUDE.md (project-agnostic)
│       ├── REVIEW_STANDARDS.md      ← Claude's 5-tier review rubric
│       ├── HANDOFF.md               ← Task brief format and examples
│       ├── FRESH_START.md           ← Reset procedure for bad Codex sessions
│       ├── TRACKING.md              ← Per-phase audit log (Claude maintains)
│       └── templates/
│           ├── task-brief.md        ← Empty brief template
│           ├── pr-checklist.md      ← PR body template
│           ├── deviation-template.md
│           └── error-template.md
│
└── LOCAL-BUILD/                     ← Quarantined (dormant local AI engine)
    ├── README.md                    ← What's inside, run instructions
    ├── FINAL-OCR-BUILD/             ← Docling + LlamaIndex + Ollama + Streamlit
    ├── ocr-build/                   ← Build notes
    ├── FRAMEWORK/                   ← Legacy Aider+Claude workflow
    ├── legacy-js-config/            ← .eslintrc.json, .prettierrc
    ├── LOCAL-AI-ENGINE-SETUP-POSTMORTEM.md
    └── SETUP.md                     ← Legacy clasp+Aider+Ollama setup
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

---

## Local Build (Dormant)

`LOCAL-BUILD/` contains a separate local AI engine project (Docling + LlamaIndex +
Ollama + Streamlit) plus the older Aider+Claude framework that predates this Codex
workflow. It is **quarantined** — Codex never reads or touches that folder, and
nothing inside it should affect the Codex workflow at the repo root.

Return to it when running local models again. See `LOCAL-BUILD/README.md` for setup,
the post-mortem, and the legacy framework reference.
