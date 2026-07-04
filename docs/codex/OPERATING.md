# Operating Procedure — Codex Environment

The worst incidents in this project came from a **stale Codex thread**, not bad code: an
old thread was continued to start a new task, so the task's branch forked from a commit
many PRs behind current `main` — producing multi-file conflicts that reverted merged
fixes. See `docs/codex/CODEX-ENVIRONMENT-SETTINGS.md` for the full environment-settings
playbook (exact fields, and a GOTCHA on the Maintenance script field specifically).

## The fix

1. **Start a new Codex thread for every new task.** Never resume an old thread to begin
   different work — that's what forked the stale branches. A new thread forces a fresh
   branch off current `main`.
2. Environment settings (`chatgpt.com/codex/settings/environments`): Maintenance script
   = `git fetch origin main --prune` (non-destructive dependency/ref refresher — see
   `CODEX-ENVIRONMENT-SETTINGS.md` for why a hard reset there is actively wrong).
3. The CI branch-freshness guard in `codex-guard.yml` is the automated backstop if a
   stale thread ever slips through anyway.

## Giving Codex a task

- One task, one PR, one branch (`codex/task-X.X-short-name`).
- Scoped brief: name the file, the tab(s), the contract. Use `docs/codex/templates/task-brief.md`.
- Don't start a second task until the current PR merges.
- Claude reviews before you merge.

## If a task ever reports a stale base or missing git remote

That means the environment fix above isn't in place (or the cache needs a manual reset
once). Fix the environment setting — don't try to work around it by hand-resolving
conflicts. "Accept both" on a stale-base conflict is what caused PR #20; recovery there
meant identifying the one genuinely new file and re-landing it on a fresh branch instead
of merging the stale one.
