# Workflow — Codex writes, Claude reviews

Codex opens PRs; Claude reviews every one against `docs/codex/REVIEW_STANDARDS.md`;
user merges. That's the whole workflow. No bootstrap banner, no role-selection prompt —
just read `AGENTS.md`, `PHASES.md`, `NOTES.md`, `ERRORS.md` and go.

`EMERGENCY.md` at repo root means stop and surface it before anything else. Otherwise
proceed straight to work.

## Reviewing a Codex PR

Check the diff against `docs/codex/REVIEW_STANDARDS.md`. Trust the diff — don't re-read
the whole repo. End with one of:

- **Clean:** "No issues — safe to merge."
- **Issues:** list each with the exact fix. If it's a one-line mechanical fix, offer to
  make it directly rather than round-tripping Codex.
- **Security issue:** don't hand back to Codex — fix directly via follow-up PR.

## After every merged Codex PR — update PHASES.md immediately

Codex never edits `PHASES.md`, so its accuracy is entirely on Claude/the user. Check off
the merged task's box in the same sitting as the merge — a stale roadmap deadlocks Codex
(it lands on an already-done "first unchecked task", finds the file exists, and skips or
flails; this burned Tasks 2.3/2.5). If a Codex PR description lists skipped
already-done tasks, verify and check those boxes too. Never let Codex "fix" the roadmap
itself — its two attempts both mis-marked it.

## If the same mistake shows up twice

Fix `AGENTS.md` directly, tell the user which file changed and that it's live for
Codex's next session. No `EMERGENCY.md`/`TRACKING.md` ceremony needed for this —
just fix it and say so.

## Efficiency

- Use the PR diff as the source of truth; don't scan the whole codebase.
- Prefer surgical edits over rewrites.
- Review for: security, scope, architecture drift (pure/IO boundary, contracts), bugs.
  Not: style/formatting.

## Deploying

Apps Script has no CI deploy — after merge, copy the changed `.gs` file(s) into the Apps
Script editor by hand. Say this after every merge-ready PR.
