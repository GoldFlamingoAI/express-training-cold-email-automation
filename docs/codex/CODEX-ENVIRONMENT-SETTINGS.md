# Codex Environment Settings — Playbook

Where this lives: **`chatgpt.com/codex/settings/environments`** → select (or create) the
environment for this repo. This is a standalone settings page — there is no gear/settings
icon near the task chat box. Easy to miss; that's why this doc exists.

## Exact fields to set

| Field | Setting | Why |
|---|---|---|
| GitHub organization / Repository | `GoldFlamingoAI` / `express-training-cold-email-automation` | — |
| Container image | `universal` (default) | Fine for Apps Script — no special runtime needed. |
| Container Caching | **On** | Speeds up task start. Safe to leave on — see maintenance script below. |
| Setup script | **Automatic** | This repo has no `package.json`/`requirements.txt` to install; automatic mode no-ops harmlessly. Switch to Manual only if a future phase adds real dependencies (e.g. Phase 3 API clients). |
| Setup script → Manual toggle | Only needed to reveal the **Maintenance script** box below it | The Maintenance script field is nested under Setup script's Manual view in the UI — click "Manual" to see it, even if Setup script itself stays empty. |
| **Maintenance script** | `git fetch origin main --prune` | See GOTCHA below — do not put a destructive command here. |
| Agent internet access | Leave default (restricted) | No Phase 1/2 module needs live internet from the agent. Enable only when Phase 3 (ZeroBounce/Apollo/Hunter) is actually started, and only for that environment. |
| Secrets / Environment variables | None needed yet | `PROPERTIES.example` documents future keys; add real values here only when a task needs to hit a live API, not before. |

## GOTCHA — the Maintenance script runs AFTER the branch checkout, not before

The UI states this explicitly: *"The maintenance script is run in containers that were
resumed from the cache, **after checking out the branch**."*

This matters a lot:

- **Do NOT put `git reset --hard origin/main` (or any hard reset) in the Maintenance
  script.** By the time it runs, the container is already on the task's actual branch. A
  hard reset at that point discards the checkout and forces the branch onto `main` —
  actively breaking the task, not fixing staleness.
- The safe, correct maintenance command is just:
  ```bash
  git fetch origin main --prune
  ```
  This refreshes the container's knowledge of `origin/main` without touching the
  currently-checked-out branch. Non-destructive, always safe.
- **This field is a dependency-freshness helper, not the actual fix for stale-base
  branches.** The incidents that hit this repo (PR #20, PR #24 — branches forking from a
  commit many PRs behind current `main`) were most consistent with an **old Codex
  thread being continued** across multiple work items, not a stale container cache per
  se. The real fix is procedural — see below.

## The actual fix for stale-base branches: one thread per task, always

**Never continue an old Codex thread to start a new task.** Each new task = a brand new
thread in the Codex UI, which forces a fresh branch off current `main` at creation time.
Reusing/continuing a thread that was created days or weeks ago is what produced branches
forked from ancient commits (one incident forked from a commit ~17 PRs behind current
`main`).

This matches what you'll observe directly: starting a new thread visibly spins up a new
environment/container. That's the reset you want — use it every time you start a task,
not just when something looks stale.

## The automated backstop (already in the repo, requires no action)

`.github/workflows/codex-guard.yml` includes a **branch-freshness guard**: it fails any
`codex/*` PR whose branch forked more than ~15 commits behind its base. If a stale
thread ever slips through despite the above, this guard rejects the PR before it reaches
you as a multi-file conflict — you'll see a clear CI error instead of a merge mess.

## Quick reference — before every Codex task
1. **Start a new thread.** Do not resume an old one to begin a different task.
2. Confirm `docs/codex/OPERATING.md` still describes the current workflow (it's the file
   Codex reads at session start).
3. Give one scoped task per thread; one PR per task.
4. If Codex ever reports a stale base or missing git remote, stop — don't hand-resolve
   conflicts. Start a fresh thread instead.
