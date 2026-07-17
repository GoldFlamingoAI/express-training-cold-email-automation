# Express Training Cold Email MVP

> Codex writes the code from a scoped task. Claude Code reviews every PR. You click merge.

---

## Workflow

```
1. Give Codex a task: one file, one contract, one PR. (docs/codex/templates/task-brief.md)
2. Codex opens a PR from fresh main (the Codex environment's maintenance script
   keeps it current — see docs/codex/OPERATING.md).
3. CI checks: branch freshness, no .github/workflows changes from Codex, secret
   scan, .gs syntax gate.
4. Claude reviews per docs/codex/REVIEW_STANDARDS.md.
5. Clean → you merge. Issues → Claude lists the exact fix.
6. Copy the merged .gs file into the Apps Script editor (no CI deploy for Apps Script).
```

No shared progress-tracking file for Codex to edit — `PHASES.md` is a roadmap kept
current by Claude/the user from the merged PR list, not touched by every branch.

---

## Going live

To deploy the merged code into Apps Script and operate the Hostinger manual-send campaign, follow
**`docs/HOSTINGER-RUNBOOK.md`**. `docs/LAUNCH-RUNBOOK.md` is retained as historical context for
the retired Gmail architecture.

## Domain warm-up layer

**`manual-email-warmup-gmail/`** is a separate, standalone Apps Script project that warms the
outreach domain (Hostinger API sends to an owned Gmail seed pool with automated opens/replies).
It shares nothing with the campaign runtime above — different script project, spreadsheet,
Google Cloud project, and credentials. See its own `README.md` for setup and sequencing.

---

## Repo File Map

```
├── AGENTS.md                        ← Codex's rule book (1 page)
├── CLAUDE.md                        ← Claude's review instructions
├── PHASES.md                        ← Roadmap (human/Claude-owned, not edited per-PR)
├── NOTES.md / ERRORS.md             ← Running logs for real deviations/errors
│
├── .github/
│   └── workflows/codex-guard.yml    ← branch-freshness, workflow ownership, secrets, .gs syntax
│
├── .claude/commands/                ← Claude slash commands
│
├── docs/codex/
│   ├── OPERATING.md                 ← Codex environment setup (read this first, once)
│   ├── REVIEW_STANDARDS.md          ← Claude's review rubric
│   └── templates/task-brief.md
```

---

## One-time setup (per repo, ~2 minutes)

See `docs/codex/OPERATING.md`. Set the Codex environment's base branch to `main` and
add the maintenance script that re-syncs git on every task. This is the fix for the one
recurring failure mode (a Codex session starting from a stale cached snapshot) — do it
once and never think about it again.

---

## Guardrails (automated, not ceremony)

- CI blocks: a `codex/*` branch forked far behind `main`, `.github/workflows/` changes
  from Codex, committed secrets, a `.gs` file that fails to parse.
- Everything else — architecture, contracts, scope — is Claude's review, not CI.
