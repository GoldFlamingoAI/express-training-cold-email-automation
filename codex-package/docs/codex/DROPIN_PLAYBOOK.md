# Codex Drop-In Playbook

A portable, project-agnostic guide for setting up the Codex + Claude Code review workflow in any new repository.

Use this as a starting point for new projects. Adjust file scopes, stack rules, and architectural constraints to fit the project, but keep the workflow shape intact.

---

## Why This Workflow Exists

- **Codex** writes code in the cloud, in micro-task PRs.
- **Claude Code** reviews every PR against a strict rubric before the user merges.
- **You** approve the brief, click merge, and watch for patterns.

The workflow is designed to:
1. Prevent silent scope creep
2. Force every change through PR review
3. Keep architecture decisions in the human's hands
4. Make pattern failures visible (EMERGENCY.md protocol)

---

## Prerequisites

- A GitHub repo
- Codex (ChatGPT) GitHub app installed and granted access to the repo
- Claude Code with PR review tools enabled
- Branch protection on `main` requiring PR + review

---

## File Structure

See the **Repo File Map** in `README.md` at the repo root for the canonical
list of files this workflow requires, with descriptive captions per file.

---

## Setup Steps (one-time per new project)

The full step-by-step setup walkthrough lives in `TEMPLATE_SETUP.md` at the
repo root. It covers placeholder replacement, CODEOWNERS activation, filling
AGENTS.md / PHASES.md / CODEX_TASK_RECIPES.md, customizing CI per stack, branch
protection, Codex connection, and the dry-run task.

This document focuses on the conceptual workflow below. Use `TEMPLATE_SETUP.md`
for the procedural setup.

---

## Workflow Per Task

```
┌─────────────────────────────────────────────────────────────┐
│  1. User reads PHASES.md → identifies Current Task           │
│  2. User (or Claude) writes a task brief from the template   │
│  3. User pastes brief into Codex                             │
│  4. Codex outputs Session Start banner                       │
│  5. Codex creates branch codex/task-X.X-name                 │
│  6. Codex opens draft PR, fills PR template                  │
│  7. Codex implements task in 1 commit (file scope match)     │
│  8. Codex makes 2nd commit updating PHASES.md                │
│  9. Codex marks PR ready for review                          │
│ 10. CI runs codex-guard.yml — must pass                      │
│ 11. Claude reviews per docs/codex/REVIEW_STANDARDS.md        │
│ 12. If issues: Claude requests changes; back to step 7       │
│ 13. If clean: Claude approves; user clicks Merge             │
│ 14. User pulls main locally                                  │
│ 15. Repeat for next task                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Decisions to Make Per Project

| Decision | Default | Adjust if... |
|----------|---------|--------------|
| Tasks per PR | 1 (micro-task) | Tasks are tiny and grouping is clear |
| Files per PR | 2-3 | Project has natural multi-file unit (e.g. test+impl) |
| Auto-merge after Claude review | No | You trust Claude's review without human merge |
| Codex memory across sessions | Off | You want continuity (risk: stale assumptions) |
| Voice input | Off | You have a preferred STT pipeline |
| Budget cap | None | Costs need controlling |
| Pattern threshold for EMERGENCY | 2 PRs | More tolerant: 3 PRs |

---

## Anti-Patterns

- **Skipping the brief** — pasting "do task 2.3" without filling the template. Result: scope creep.
- **Letting Codex update PHASES.md without review** — fine when scope is clean, dangerous when Codex misreads the next task.
- **Merging without Claude review** — silent architecture drift accumulates.
- **Ignoring NOTES.md / ERRORS.md** — they're your early warning system. Read them weekly.
- **Modifying AGENTS.md mid-phase** — disorienting for Codex. Tighten between phases, not within.

---

## When to Tighten the Rules

Watch for these signals and tighten AGENTS.md / CODEX_TASK_RECIPES.md when they appear:

| Signal | Tighten |
|--------|---------|
| Same scope creep type 2x | AGENTS.md "Never Do" |
| Same dep added without approval | AGENTS.md "New Dependency" |
| Same architectural mistake | CODEX_TASK_RECIPES.md phase recipe |
| Same comment over-density | AGENTS.md "Style" |
| Same missing tag | CI workflow regex |

Always log the tightening in PHASES.md "Codex Calibration Log" with date and rule changed.

---

## What to Tell Codex on Day 1

Paste this into the first session, before any task brief:

```
Read AGENTS.md, PHASES.md, CODEX_TASK_RECIPES.md, NOTES.md, ERRORS.md from the repo root.
Output the Session Start banner exactly as specified in AGENTS.md.
Do not write any code or open any PR until I paste a task brief that matches docs/codex/templates/task-brief.md.
Confirm you understand by repeating back: file scope, banned actions, PR rules.
```

If Codex's confirmation is missing any of the three (file scope, banned actions, PR rules), do not proceed — re-paste AGENTS.md and retry.
