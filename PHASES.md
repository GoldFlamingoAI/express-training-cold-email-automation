# Project Phases — [PROJECT-NAME]

## Legend
- 🤖 = Codex (cloud, online — primary coder)
- 🏠 = Desk (WiFi required, Claude Code reviews / live API tests)
- ✅ = Complete  🏗️ = In progress  ⏸️ = Blocked

## Current Status
- **Current Phase:** Phase 1
- **Current Task:** Task 1.1 — [first task name]
- **Branch pattern:** `codex/task-X.X-short-name`
- **Assigned:** Codex
- **Mode:** 🤖 Cloud (online)
- **Blocker:** None

---

## Micro-Task Contract
Every task in this file is one logical unit. Codex must:
1. Open a draft PR on a branch named `codex/task-X.X-short-name`
2. Implement the task in **a single commit** scoped to the brief
3. Make a **second commit** in the same PR that marks the task ✅ in PHASES.md and bumps Current Task
4. Mark the PR ready for review
5. Stop and wait for Claude review + user merge before starting the next task

Each task is implemented as exactly one PR. No task chaining.

If a task feels like it needs more files than the brief allows, split it: tag sub-tasks as `1.7a`, `1.7b`, `1.7c`. Each sub-task is its own PR.

---

## Phase 0: Discovery ✅ 🏠
- [x] Specs reviewed
- [x] Stack chosen
- [x] Architecture decisions documented

## Phase 1: [Phase Name] 🤖
*Goal: [one-sentence description of what this phase delivers.]*

- [ ] **Task 1.1** 🤖 [Task description] (1 PR)
- [ ] **Task 1.2** 🤖 [Task description] (1 PR)
- [ ] **Task 1.3** 🤖 [Task description] (1 PR)
- [ ] **CHECKPOINT** 🏠 PHASE_READY → Claude Code audit + calibration

## Phase 2: [Phase Name] 🤖
*Goal: [one-sentence description.]*

- [ ] **Task 2.1** 🤖 [Task description] (1 PR)
- [ ] **Task 2.2** 🤖 [Task description] (1 PR)
- [ ] **CHECKPOINT** 🏠 PHASE_READY → Claude Code audit + calibration

<!-- Add more phases as needed -->

---

## Codex Calibration Log
*Claude Code appends here every time AGENTS.md or PLAYBOOK.md is tightened in response to a Codex pattern.*

| Date | Trigger | File tightened | Rule added/changed |
|------|---------|----------------|--------------------|
| — | — | — | — |
