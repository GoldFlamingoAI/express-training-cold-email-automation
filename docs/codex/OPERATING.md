# Operating Procedure — How to Launch a Codex Session

Most of this project's worst incidents were not bad code — they were **badly launched
Codex sessions**. A branch forked from an old base, or spawned on a generic prompt,
becomes a multi-file conflict that can silently revert already-merged work. The rules in
`AGENTS.md` govern how Codex *behaves once running*; they cannot fix a branch that was
born stale before Codex read them. This file governs the launch itself.

## Every Codex session — the checklist

1. **One task per session.** Pick exactly one unchecked `- [ ]` task from `PHASES.md`.
2. **Start from fresh `main`.** The session must branch from current `origin/main`, on a
   branch named `codex/task-X.X-short-name`.
   - **The branch name is the tell.** If it is not `codex/task-X.X-*` (e.g. it's
     `codex/summarize-repo-and-codex-role-*`), the session was launched on a generic
     prompt from who-knows-what base. **Stop and relaunch.**
3. **Give a scoped brief**, not an open-ended instruction. Name the one file it creates,
   the tab(s) it touches, and the function contract. Use
   `docs/codex/templates/task-brief.md`.
4. **One open PR at a time.** Do not start a second session until the current task's PR is
   merged. Parallel generic-prompt sessions are what produced 11 colliding branches.
5. **Claude reviews before you merge.** Every PR, before the merge click.
6. **Merge, then relaunch** the next task from fresh `main`.

> Never re-run the same generic prompt to "continue." Each run is a fresh session,
> scoped to one task, off the latest `main`.

## Why the branch-freshness CI guard exists

`codex-guard.yml` fails any `codex/*` PR whose branch forked more than ~15 commits behind
its base. That is the automated backstop for step 2: a stale-forked branch is rejected
before it becomes a hand-resolved conflict that reverts your fixes. The guard is a safety
net, not the fix — the fix is launching correctly.

## If you get a stale-base conflict anyway

Do **not** resolve it with the conflict editor — "accept both" stacks duplicates and
"accept incoming/current" reverts real work. Instead:

1. Identify the one genuinely new file the branch adds (`git diff --name-status main <branch> | grep '^A'`).
2. Create a fresh branch off `origin/main`, drop that file in, mark the task checkbox.
3. Open a clean PR; close the stale one unmerged.

This is exactly how Task 2.1 was recovered (PR #21 replacing PR #20).
