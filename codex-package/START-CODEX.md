# Start Codex — Run This After TEMPLATE_SETUP.md

Setup is done. AGENTS.md, PHASES.md, and CODEX_TASK_RECIPES.md are filled.
CODEOWNERS is renamed. Branch protection is on. Now hand work to Codex.

---

## One-time: Connect Codex to the Repo

1. Go to https://chatgpt.com/codex
2. Connect this repo (GitHub OAuth)
3. Confirm branch access: read all, write to `codex/*` branches only
4. Confirm Codex can open PRs against `main`

---

## Every Task — The Six-Step Loop

### 1. Find the Current Task

Open `PHASES.md`. The "Current Task" pointer marks what's next.

### 2. Fill the Task Brief

Copy `docs/codex/templates/task-brief.md` and fill it out for the current task.
Reference `docs/codex/HANDOFF.md` if you need format examples.

Required fields:
- Task ID (e.g. `TASK_1.1`)
- Files in scope (strict — Codex blocks if it touches anything outside)
- What "done" looks like
- Any pre-approved dependencies

### 3. Paste the Brief into Codex

Codex will:
- Read `AGENTS.md`, `PHASES.md`, `CODEX_TASK_RECIPES.md`, `NOTES.md`, `ERRORS.md`
- Output the Session Start banner (confirm it loaded)
- Create branch `codex/task-X.X-short-name`
- Open a draft PR
- Implement the task
- Mark PR ready for review

### 4. Tell Claude Code to Review

Open Claude Code in this repo and say:

> Please review PR #[N] on branch codex/task-X.X-name.

Claude reads the diff against `docs/codex/REVIEW_STANDARDS.md` and posts
findings as PR comments or in chat.

### 5. Act on the Review

- **Clean** → click merge on GitHub
- **Issues** → tell Codex the exact fix instructions Claude gave you
- **Security issue** → do NOT hand back to Codex. Ask Claude to fix directly via follow-up PR.

### 6. Pull and Move On

After merging:

```bash
git pull origin main
```

Then back to Step 1 for the next task. Codex does NOT auto-chain — one PR, one merge, one pull.

---

## Phase Audits

After every 4–6 tasks (or when PHASES.md says a phase is complete), tell Claude:

> PHASE_READY — please audit Phase [N].

Claude scans `docs/codex/TRACKING.md`, NOTES.md, ERRORS.md, and the merged PRs.
Outputs a verdict: pass (move to next phase) or issues (fix before moving on).

---

## When Things Go Wrong

| Situation | What to do |
|---|---|
| Codex ignores AGENTS.md rules across 2+ PRs | Tell Claude. Claude tightens AGENTS.md and creates EMERGENCY.md if needed. |
| CI fails on the install PR | Check `codex-guard.yml` logs. Most often: missing `[TASK_X.X]` tag or PHASES.md not updated. |
| Codex opens a PR touching out-of-scope files | Block the PR. Tell Codex: "out of scope — only touch files listed in the brief." |
| You want to bypass Codex and edit directly | Tell Claude: "override mode — direct edit." Claude logs the override in NOTES.md. |
| Session is broken / Codex confused | Run `docs/codex/FRESH_START.md` reset procedure. |

---

## Reference Docs

- `README.md` — workflow overview (the 15-step loop)
- `AGENTS.md` — Codex's rule book
- `CLAUDE.md` — Claude Code's project instructions
- `docs/codex/REVIEW_STANDARDS.md` — Claude's 5-tier review rubric
- `docs/codex/HANDOFF.md` — task brief format and examples
- `docs/codex/DROPIN_PLAYBOOK.md` — full workflow reference
- `docs/codex/FRESH_START.md` — reset procedure
