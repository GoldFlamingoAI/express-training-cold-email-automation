# Operating Procedure — Codex Environment

The worst incidents in this project came from a stale environment, not bad code: a
cached Codex container froze the git base at an old commit, so every task forked from
history that predated real work — producing multi-file conflicts that reverted merged
fixes. This is fixed at the **environment level**, not by Codex remembering a rule (the
agent phase has no internet, so it cannot `git fetch` — that instruction used to be here
and Codex correctly reported it as impossible).

## The fix — one-time, per repo

In the Codex environment settings for this repo:
1. Base branch → `main`.
2. Maintenance script → re-syncs git on every task resume, during the networked setup
   phase (before the agent goes offline):
   ```bash
   git fetch origin main --prune && git checkout main && git reset --hard origin/main
   ```
3. If the environment supports "always rebuild" / disable caching, that's an equally
   valid alternative — every task then clones fresh, no maintenance script needed.

With this in place, every Codex task automatically starts from current `main`. No manual
cache-clearing, ever.

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
