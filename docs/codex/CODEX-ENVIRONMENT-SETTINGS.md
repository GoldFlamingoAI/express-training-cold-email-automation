# Codex Environment Settings — Playbook

Where this lives: **`chatgpt.com/codex/settings/environments`** → select (or create) the
environment for this repo. It's a standalone settings page — there is no gear/settings
icon near the task chat box. Easy to miss; that's why this doc exists.

## The one setting that fixes stale-base conflicts: Container Caching = OFF

Every serious conflict this repo hit (PR #20, PR #24) came from a task branch forking off
an **old** base — history many PRs behind current `main` — then being "resolved" by hand,
which reverted merged work. The bulletproof fix is one toggle:

> **Container Caching → Off.**

With caching Off, every task provisions a **fresh container = fresh clone of current
`main`.** A stale base is not possible. No maintenance script, no manual cache resets, no
guesswork. The only trade-off is a slightly slower task start (re-clones + runs setup each
time) — negligible at this project's volume, and worth it to remove the entire class of
failure.

## Exact fields to set

| Field | Setting | Why |
|---|---|---|
| GitHub organization / Repository | `GoldFlamingoAI` / `express-training-cold-email-automation` | — |
| Container image | `universal` (default) | Fine for Apps Script — no special runtime needed. |
| **Container Caching** | **Off** | The fix above. Every task = fresh clone of current `main`. |
| Setup script | **Automatic** | No `package.json`/`requirements.txt` to install; auto mode no-ops. Switch to Manual only if a phase adds real dependencies (e.g. Phase 3 API clients). |
| Maintenance script | **Leave empty** | Only runs on *cached* containers. With caching Off it never runs, so it's irrelevant. (If you ever turn caching back On, see the GOTCHA below before touching it.) |
| Agent internet access | Leave default (restricted) | No Phase 1/2 module needs live internet from the agent. Enable only when Phase 3 is started, and only for that environment. |
| Secrets / Environment variables | None yet | `PROPERTIES.example` documents future keys; add real values only when a task needs a live API. |

## You set the environment ONCE

- The environment is created once and **reused for every task**. You do **not** create a
  new environment per task, and you do **not** re-enter any settings per task.
- Settings (including the caching toggle) persist. Check them anytime at the URL above.
- Each task spins up a container **from** this environment. With caching Off, that
  container is a fresh clone every time — automatically.

## Threads vs. tasks (freshness is handled by caching Off, not by thread hygiene)

Starting a **new thread per task** is still a good habit — it keeps one task = one PR =
one review and avoids scope bleed. But with **caching Off, freshness no longer depends on
it**: even a reused thread provisions a fresh container. So new-thread-per-task is now a
*hygiene* preference, not a correctness requirement. (Whether a reused thread stays fresh
was never something we could verify from OpenAI's docs — caching Off makes the question
moot.)

## GOTCHA — only relevant if you ever turn caching back On

The Maintenance script field runs *in cached containers, **after** the branch is checked
out* (the UI says so). So:

- **Never put `git reset --hard origin/main` there.** By then the container is already on
  the task branch; a hard reset would discard it and break the task.
- The only safe maintenance command is a non-destructive `git fetch origin main --prune`.
- Even that does not guarantee a fresh base — which is exactly why **caching Off** is the
  recommended approach instead.

## The automated backstop (already in the repo, no action needed)

`.github/workflows/codex-guard.yml` has a **branch-freshness guard**: it fails any
`codex/*` PR whose branch forked more than ~15 commits behind its base. If a stale base
ever slips through, CI rejects the PR with a clear error instead of handing you a
multi-file conflict.
