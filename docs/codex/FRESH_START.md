# Codex Fresh Start Playbook

Use when Codex is misbehaving, a session went sideways, or you want a guaranteed clean slate.
This is the cloud equivalent of restarting a local dev tool.

## 1. Close All Open Codex Sessions
- Close any open Codex chat tabs
- Cancel any in-flight Codex tasks in the GitHub app dashboard

## 2. Verify You're on `main` Locally
```
cd ~/Developer/[your-project-local-path]
git checkout main
```

## 3. Pull Latest
```
git fetch origin
git pull origin main
```

If divergent branches:
```
git log --oneline main..origin/main
git log --oneline origin/main..main
```
Then reset to origin if local main has rogue commits:
```
git reset --hard origin/main
```

## 4. Verify Critical Files
```
ls -la AGENTS.md PHASES.md PLAYBOOK.md NOTES.md ERRORS.md CLAUDE.md
ls docs/codex/
```
All must exist.

## 5. Confirm No Stale Local Changes
```
git status
```
Working tree must be clean. If not, decide commit/stash/discard before continuing.

## 6. Confirm No Active EMERGENCY
```
ls EMERGENCY.md 2>/dev/null && echo "EMERGENCY ACTIVE — bring Claude in before any Codex work."
```

## 7. Confirm Codex Has Latest Repo Access
- Open the Codex GitHub app dashboard
- Verify `[YOUR-ORG]/[your-repo-name]` is connected
- Verify branch permissions: read all, write `codex/*` only, never `main`

## 8. Open a New Codex Session
- Start a fresh Codex chat (do not resume an old one)
- Paste the next task brief from `docs/codex/templates/task-brief.md`, filled in
- Codex must output the Session Start banner before doing anything else:
  ```
  Loaded: AGENTS.md ✓  PHASES.md ✓  PLAYBOOK.md ✓  NOTES.md ✓  ERRORS.md ✓
  Phase: [X]  Task: [X.X]
  Last 5 PRs: [list]
  Therefore the next incomplete task is: X.X
  Ready.
  ```
  If you do not see this banner, Codex is not loading the rules. Stop and re-paste AGENTS.md into the session.

## 9. Verify After First Commit
In a separate terminal:
```
cd [your-project-local-path]
gh pr list --head codex/task-X.X-*
```
Confirm the draft PR exists with the right title format.

---

## Red Flags — Stop and Bring Claude In

- Codex requests a file outside the brief's "files in scope" → rule 7 violation
- Codex opens more than 1 PR for one task → rule 6 violation
- PR title missing `[TASK_X.X]` tag → CI will block; do not bypass
- PR diff includes files not in the brief → scope creep, **blocker**
- Same class of mistake in 2 PRs in a row → EMERGENCY.md territory
- Codex auto-merged or pushed to main → security incident, revoke its perms
