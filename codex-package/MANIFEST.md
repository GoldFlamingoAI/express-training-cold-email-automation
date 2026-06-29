# Codex Package Manifest

This folder contains every file needed to add the Codex + Claude Code review
workflow to an existing repo. Follow this file sequentially. Do not skip steps.
Do not make judgment calls — where a decision is needed, the step says STOP and
describes the options.

Source repo: `GoldFlamingoAI/PLANNING-local-build`
Target repo: **[the repo this codex-package/ folder is sitting in]**

---

## Before You Start

1. Confirm you are on branch `add-codex-workflow` (not main)
2. Confirm `git status` shows a clean working tree before you begin
3. This `codex-package/` folder should already be in the target repo root

---

## STEP 0 — Pre-Install Gitleaks Scan

Before placing `.gitleaks.toml`, scan the existing repo for patterns that gitleaks
commonly flags as secrets. This prevents the install PR from failing CI against
content that already existed in the repo.

Run these searches against the existing repo files (NOT against codex-package/):

```bash
# Search for patterns gitleaks flags in documentation/test files
grep -rn \
  -e "BEGIN PRIVATE KEY" \
  -e "BEGIN RSA PRIVATE KEY" \
  -e "BEGIN EC PRIVATE KEY" \
  -e "AAAA[0-9A-Za-z+/]" \
  -e "sk-[a-zA-Z0-9]" \
  -e "AIza[0-9A-Za-z_-]" \
  . \
  --exclude-dir=.git \
  --exclude-dir=codex-package \
  --include="*.md" --include="*.txt" --include="*.json" --include="*.gs" \
  2>/dev/null || true
```

**If hits are found:**
- Confirm they are documentation examples or test fixtures (not real secrets)
- For each file with hits, add an allowlist entry to `codex-package/.gitleaks.toml`
  before placing it:

```toml
[[allowlist.paths]]
description = "Existing file with example key patterns — not real secrets"
paths = ["path/to/file.md"]
```

- Then proceed to Step 1

**If no hits:** proceed directly to Step 1.

---

## STEP 1 — Clean Drops (no conflicts, place as-is)

For each file below, copy it from `codex-package/` to its destination path.
These files do NOT exist in the target repo yet — no overwrites, no merges needed.

| Source (inside codex-package/) | Destination (repo root) |
|---|---|
| `AGENTS.md` | `AGENTS.md` |
| `PHASES.md` | `PHASES.md` |
| `CODEX_TASK_RECIPES.md` | `CODEX_TASK_RECIPES.md` |
| `NOTES.md` | `NOTES.md` |
| `ERRORS.md` | `ERRORS.md` |
| `TEMPLATE_SETUP.md` | `TEMPLATE_SETUP.md` |
| `START-CODEX.md` | `START-CODEX.md` |
| `.gitleaks.toml` | `.gitleaks.toml` |
| `gitleaks.toml.RENAME-TO-DOT-GITLEAKS` | (rename to `.gitleaks.toml` at repo root — visible-copy fallback if hidden file did not upload) |
| `.github/CODEOWNERS.template` | `.github/CODEOWNERS.template` |
| `.github/pull_request_template.md` | `.github/pull_request_template.md` |
| `.github/workflows/codex-guard.yml` | `.github/workflows/codex-guard.yml` |
| `.claude/commands/codex-brief.md` | `.claude/commands/codex-brief.md` |
| `.claude/commands/codex-doc.md` | `.claude/commands/codex-doc.md` |
| `.claude/commands/codex-emergency.md` | `.claude/commands/codex-emergency.md` |
| `.claude/commands/codex-errors.md` | `.claude/commands/codex-errors.md` |
| `.claude/commands/codex-notes.md` | `.claude/commands/codex-notes.md` |
| `.claude/commands/codex-overview.md` | `.claude/commands/codex-overview.md` |
| `.claude/commands/codex-phase.md` | `.claude/commands/codex-phase.md` |
| `.claude/commands/codex-skills.md` | `.claude/commands/codex-skills.md` |
| `.claude/commands/codex-status.md` | `.claude/commands/codex-status.md` |
| `docs/PROPER-GITHUB-REPO-FILE-TRANSFER.md` | `docs/PROPER-GITHUB-REPO-FILE-TRANSFER.md` |
| `docs/codex/REVIEW_STANDARDS.md` | `docs/codex/REVIEW_STANDARDS.md` |
| `docs/codex/HANDOFF.md` | `docs/codex/HANDOFF.md` |
| `docs/codex/TRACKING.md` | `docs/codex/TRACKING.md` |
| `docs/codex/DROPIN_PLAYBOOK.md` | `docs/codex/DROPIN_PLAYBOOK.md` |
| `docs/codex/FRESH_START.md` | `docs/codex/FRESH_START.md` |
| `docs/codex/templates/task-brief.md` | `docs/codex/templates/task-brief.md` |
| `docs/codex/templates/pr-checklist.md` | `docs/codex/templates/pr-checklist.md` |
| `docs/codex/templates/deviation-template.md` | `docs/codex/templates/deviation-template.md` |
| `docs/codex/templates/error-template.md` | `docs/codex/templates/error-template.md` |

**Commands to run (copy-paste exactly):**

```bash
# Root files
cp codex-package/AGENTS.md AGENTS.md
cp codex-package/PHASES.md PHASES.md
cp codex-package/CODEX_TASK_RECIPES.md CODEX_TASK_RECIPES.md
cp codex-package/NOTES.md NOTES.md
cp codex-package/ERRORS.md ERRORS.md
cp codex-package/TEMPLATE_SETUP.md TEMPLATE_SETUP.md
cp codex-package/START-CODEX.md START-CODEX.md
cp codex-package/.gitleaks.toml .gitleaks.toml

# GitHub files (create dir if needed)
mkdir -p .github/workflows
cp codex-package/.github/CODEOWNERS.template .github/CODEOWNERS.template
cp codex-package/.github/pull_request_template.md .github/pull_request_template.md
cp codex-package/.github/workflows/codex-guard.yml .github/workflows/codex-guard.yml

# Claude commands (create dir if needed)
mkdir -p .claude/commands
cp codex-package/.claude/commands/codex-brief.md .claude/commands/codex-brief.md
cp codex-package/.claude/commands/codex-doc.md .claude/commands/codex-doc.md
cp codex-package/.claude/commands/codex-emergency.md .claude/commands/codex-emergency.md
cp codex-package/.claude/commands/codex-errors.md .claude/commands/codex-errors.md
cp codex-package/.claude/commands/codex-notes.md .claude/commands/codex-notes.md
cp codex-package/.claude/commands/codex-overview.md .claude/commands/codex-overview.md
cp codex-package/.claude/commands/codex-phase.md .claude/commands/codex-phase.md
cp codex-package/.claude/commands/codex-skills.md .claude/commands/codex-skills.md
cp codex-package/.claude/commands/codex-status.md .claude/commands/codex-status.md

# Docs
mkdir -p docs/codex/templates
cp codex-package/docs/PROPER-GITHUB-REPO-FILE-TRANSFER.md docs/PROPER-GITHUB-REPO-FILE-TRANSFER.md
cp codex-package/docs/codex/REVIEW_STANDARDS.md docs/codex/REVIEW_STANDARDS.md
cp codex-package/docs/codex/HANDOFF.md docs/codex/HANDOFF.md
cp codex-package/docs/codex/TRACKING.md docs/codex/TRACKING.md
cp codex-package/docs/codex/DROPIN_PLAYBOOK.md docs/codex/DROPIN_PLAYBOOK.md
cp codex-package/docs/codex/FRESH_START.md docs/codex/FRESH_START.md
cp codex-package/docs/codex/templates/task-brief.md docs/codex/templates/task-brief.md
cp codex-package/docs/codex/templates/pr-checklist.md docs/codex/templates/pr-checklist.md
cp codex-package/docs/codex/templates/deviation-template.md docs/codex/templates/deviation-template.md
cp codex-package/docs/codex/templates/error-template.md docs/codex/templates/error-template.md
```

After running these, verify with:
```bash
git status
```

You should see all the above files listed as new untracked files. If any existing
file shows as modified, STOP and report it before continuing.

---

## STEP 2 — CLAUDE.md (conflict — requires human decision)

The target repo already has a `CLAUDE.md` with project-specific instructions.
The Codex workflow requires a `CLAUDE.md` with its bootstrap section at the top.

**The Codex version of CLAUDE.md is at:** `codex-package/_CONFLICTS/CLAUDE.codex-version.md`

**STOP. Show the user both files and ask:**

> Your existing `CLAUDE.md` has project-specific instructions.
> The Codex workflow needs to add its bootstrap section to this file.
>
> Two options:
>
> **Option A — Prepend (safest):** Add the Codex bootstrap block to the very top
> of your existing CLAUDE.md. Your existing content stays completely intact below it.
> The bootstrap block is lines 1–133 of `codex-package/_CONFLICTS/CLAUDE.codex-version.md`
> (everything up to and including the closing ``` after "What would you like to work on?").
>
> **Option B — Replace and port:** Replace your CLAUDE.md with the full Codex version
> (`codex-package/_CONFLICTS/CLAUDE.codex-version.md`), then manually move your
> project-specific details into the "Review Focus for This Project" section.
> This is cleaner long-term but requires more work now.
>
> Which would you like?

Do not proceed until the user chooses.

**If Option A:**
- Open `CLAUDE.md` in the editor
- Open `codex-package/_CONFLICTS/CLAUDE.codex-version.md`
- Skip the `⚠️ STOP — REVIEW REQUIRED` preamble at the top (everything above the first `---` separator)
- Copy from `# Repo Bootstrap — RUN FIRST` through the end of the "Workflow Files Codex and Claude Both Read" table (ends right before `# Session Start`)
- Paste that block at the very top of the existing `CLAUDE.md`
- Add `---` as a separator between the bootstrap block and the existing content
- Verify the file still contains all original project sections below the separator

**If Option B:**
- Copy `codex-package/_CONFLICTS/CLAUDE.codex-version.md` to `CLAUDE.md` (replacing existing)
- Open `CLAUDE.md` and navigate to the "Review Focus for This Project" section
- Transfer the key details from the old CLAUDE.md into that section:
  - Stack and runtime details
  - File structure and module layout
  - Key conventions and constraints
  - CI/CD notes and secrets requirements

---

## STEP 3 — Identify and Skip Existing Files

Before committing, run:
```bash
git diff --name-only
```

Any file listed here (other than `CLAUDE.md` from Step 2) was modified unexpectedly.
STOP and investigate before continuing — do not commit modifications to existing files.

Additionally, confirm these categories of existing files were NOT touched:
- Any existing `.github/workflows/` files other than `codex-guard.yml`
- Any existing `.claude/skills/` or `.claude/commands/` files that were already there
- Any project-specific root files (README.md, .gitignore, etc.)
- Any existing framework or tooling folders

If any of those were modified, STOP and report.

---

## STEP 4 — Replace Placeholders

In the newly dropped files, replace `[PROJECT-NAME]` with the actual project name.

Run this to find all instances (excludes documentation files that intentionally
keep the placeholder as an example):
```bash
grep -rln "\[PROJECT-NAME\]" . \
  --exclude-dir=.git \
  --exclude-dir=codex-package \
  --exclude="docs/codex/CLAUDE_TEMPLATE.md" \
  --exclude="TEMPLATE_SETUP.md"
```

For each file returned, do a targeted find-and-replace of `[PROJECT-NAME]` with
the actual project name. Do not use a glob replace across the whole tree.

Do NOT fill in the AGENTS.md Stack, File Structure, or Patterns sections —
those require the human to supply real project details. Add this warning
immediately below the `# AGENTS.md — [project name]` header:

```
> ⚠️ Stack, File Structure, Patterns sections below need filling before Phase 1 starts.
> See TEMPLATE_SETUP.md for instructions.
```

---

## STEP 5 — Final Verification

```bash
git status        # should show only new files + CLAUDE.md as modified
git diff --stat   # CLAUDE.md only — nothing else
```

If any unexpected file is modified, STOP and identify it before continuing.

---

## STEP 6 — Delete the Package Folder

Once all files are placed and verified, remove `codex-package/` from the repo:

```bash
rm -rf codex-package/
```

It is a staging folder only. It must not be committed to the target repo.

---

## STEP 7 — Commit and Push

```bash
git add -A
git status   # final check — confirm only expected files

git commit -m "$(cat <<'EOF'
chore: add Codex + Claude Code review workflow

Adds Codex workflow scaffolding from GoldFlamingoAI/PLANNING-local-build.
All existing project files preserved. CLAUDE.md updated with Codex
bootstrap section. AGENTS.md Stack/Patterns sections left for human fill-in.
EOF
)"

git push -u origin add-codex-workflow
```

If push fails due to network error, retry up to 4 times with exponential
backoff (2s, 4s, 8s, 16s). On auth failure or rejection, stop and report.

---

## STEP 8 — Stop. Surface the PR URL.

Tell the user:

> Branch `add-codex-workflow` is pushed.
> Open a PR from `add-codex-workflow` → `main` on GitHub and review the diff
> before merging.
>
> After merge, follow `TEMPLATE_SETUP.md` to:
> - Fill AGENTS.md Stack and Patterns sections with real project details
> - Draft PHASES.md with the project's phase breakdown
> - Rename `.github/CODEOWNERS.template` → `.github/CODEOWNERS` and add your GitHub handle

Do not open the PR automatically. Do not merge. The user controls both.

---

## Hard Rules for the CC Instance

- NEVER push to `main`
- NEVER run `git push --force`
- NEVER overwrite any file that already exists in the target repo (except CLAUDE.md per Step 2)
- NEVER touch existing CI/CD workflow files
- NEVER touch existing `.claude/skills/` or project-specific command files
- NEVER auto-fill `PHASES.md`, `CODEX_TASK_RECIPES.md`, or `NOTES.md` — leave as templates
- NEVER commit `codex-package/` — delete it before committing (Step 6)
- STOP and ask the user whenever anything looks different from what this MANIFEST describes
