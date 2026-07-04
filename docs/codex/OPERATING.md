# Operating Procedure — Codex Environment

The worst incidents in this project (PR #20, #24) came from a task branch forking off an
**old base** — history many PRs behind current `main` — then being hand-resolved, which
reverted merged fixes. This is fixed by one environment setting, not by anything Codex
has to remember.

## The fix — Container Caching OFF (set once)

In the Codex environment settings (`chatgpt.com/codex/settings/environments`), set
**Container Caching → Off**. Every task then provisions a fresh container = fresh clone of
current `main`, so a stale base is impossible. No maintenance script, no manual resets, no
per-task ritual. Set once, reused for every task. Full playbook + exact fields:
`docs/codex/CODEX-ENVIRONMENT-SETTINGS.md`.

- **New thread per task** is still good hygiene (one task = one PR = one review), but with
  caching Off it's no longer required for freshness.
- The CI branch-freshness guard in `codex-guard.yml` is the automated backstop regardless.

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
