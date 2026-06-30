# Codex Fresh Start

Use when Codex is misbehaving, a session went sideways, or you want a guaranteed clean slate.

---

## 1. Close All Open Codex Sessions
- Close any open Codex chat tabs
- Cancel any in-flight tasks in the Codex GitHub app dashboard

## 2. Check the Repo State on GitHub
- Go to the repo on GitHub
- Confirm `main` branch shows the expected last commit
- If there are rogue commits on main: bring Claude in — do not force-push

## 3. Check for Stale Codex Branches
- GitHub → branches list
- Any `codex/*` branch with no open PR and no recent activity: delete it on GitHub
- Any abandoned draft PR: close it on GitHub (do not merge)

## 4. Confirm No Active EMERGENCY
- Check the repo root on GitHub for `EMERGENCY.md`
- If present: bring Claude in before any Codex work resumes

## 5. Confirm Critical Files Are Present on Main
On GitHub, verify these files exist and are not empty:
- `AGENTS.md`
- `PHASES.md`
- `PLAYBOOK.md`
- `NOTES.md`
- `ERRORS.md`
- `CLAUDE.md`
- `docs/codex/REVIEW_STANDARDS.md`

## 6. Confirm Codex GitHub App Permissions
- Open the Codex GitHub app dashboard
- Verify this repo is connected
- Verify branch permissions: read all, write `codex/*` only, **never `main`**

## 7. Open a New Codex Session
- Start a fresh Codex chat (do not resume an old one)
- Paste the next task brief
- Codex must output the Session Start banner before doing anything else:
  ```
  Loaded: AGENTS.md ✓  PHASES.md ✓  PLAYBOOK.md ✓  NOTES.md ✓  ERRORS.md ✓
  Phase: [X]  Task: [X.X]
  ```
  If the banner is missing: paste `AGENTS.md` contents directly into the chat and try again.

---

## Red Flags — Stop and Bring Claude In

- Codex requests a file outside the brief's "files in scope" → scope creep, block
- Codex opens more than 1 PR for one task → split violation, close the extra
- PR title missing `[TASK_X.X]` tag → CI will block; do not bypass
- PR diff includes files not in the brief → blocker
- Same class of mistake in 2 PRs in a row → EMERGENCY.md territory
- Codex pushed to `main` directly → revoke permissions immediately, bring Claude in
