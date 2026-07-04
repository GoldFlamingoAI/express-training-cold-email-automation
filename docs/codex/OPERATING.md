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

## Missing git remote / "work" branch — ignore it, do not stop

Codex Cloud has a known, unresolved platform bug (openai/codex#12498) where a sandbox
loses its `origin` remote and shows a "work" branch mid-task. This is **not** the
stale-base problem above and has nothing to do with the caching setting — it's cosmetic.
Codex does not push via `git push` from inside the sandbox; the platform opens the PR
from the working-tree changes regardless of remote state. **Do not stop for this. Write
the code, finish the task, let the platform create the PR.**

If a real stale-base conflict does slip through (multi-file conflicts reverting merged
work): don't hand-resolve it. Identify the one genuinely new file the branch adds,
re-land it on a fresh branch off `main`, and close the stale PR. See NOTES.md for the
PR #20 recovery as an example.
