# Template Setup — First Steps After Cloning

This repo is a **starting-point template** for any new coding project that uses
the **Codex (cloud) + Claude Code (review)** workflow. Run through these steps
once, in order, after cloning. Total time: 15–30 minutes.

---

## Step 1 — Activate CODEOWNERS and replace single-token placeholders

Two placeholders need a find-and-replace, plus one file needs renaming
to be active.

```bash
# Activate the CODEOWNERS file (inactive by design until renamed)
git mv .github/CODEOWNERS.template .github/CODEOWNERS
```

Then replace these in every file **except** the two docs that explain the
template (replacing them there would corrupt the documentation):

| Placeholder | Replace with |
|---|---|
| `[PROJECT-NAME]` | Your project name |
| `@YOUR-HANDLE` | Your GitHub username |

> **Excluded from replacement:** `TEMPLATE_SETUP.md` (this file) and
> `docs/codex/CLAUDE_TEMPLATE.md` — both contain the placeholder strings as
> *documentation*, not as fill-in slots.

**Recommended:** use your IDE's find-and-replace with file-exclusion patterns
matching the excluded files above.

**CLI alternative** (Linux/macOS — uses `sed -i.bak` for portability):

```bash
# Replace [PROJECT-NAME] (substitute your project name):
grep -rl '\[PROJECT-NAME\]' . \
  --exclude-dir=.git --exclude-dir=LOCAL-BUILD \
  --exclude=TEMPLATE_SETUP.md --exclude=CLAUDE_TEMPLATE.md \
  | xargs sed -i.bak 's/\[PROJECT-NAME\]/Your Project Name/g'

# Replace @YOUR-HANDLE (substitute your GitHub handle):
grep -rl '@YOUR-HANDLE' . \
  --exclude-dir=.git --exclude-dir=LOCAL-BUILD \
  --exclude=TEMPLATE_SETUP.md --exclude=CLAUDE_TEMPLATE.md \
  | xargs sed -i.bak 's/@YOUR-HANDLE/@yourhandle/g'

# Clean up sed backup files:
find . -name '*.bak' -not -path './.git/*' -not -path './LOCAL-BUILD/*' -delete
```

Verify with grep — both should return no results outside `LOCAL-BUILD/`,
`TEMPLATE_SETUP.md`, and `CLAUDE_TEMPLATE.md`:

```bash
grep -rn '\[PROJECT-NAME\]' . \
  --exclude-dir=.git --exclude-dir=LOCAL-BUILD \
  --exclude=TEMPLATE_SETUP.md --exclude=CLAUDE_TEMPLATE.md
grep -rn '@YOUR-HANDLE' . \
  --exclude-dir=.git --exclude-dir=LOCAL-BUILD \
  --exclude=TEMPLATE_SETUP.md --exclude=CLAUDE_TEMPLATE.md
```

> **Note on placeholder styles**: this template uses two kinds of placeholders.
> `[PROJECT-NAME]` and `@YOUR-HANDLE` are **single-token** — find-and-replace
> them globally now (with the exclusions above). Bracketed lowercase
> placeholders like `[your state module]`, `[Runtime and version]`,
> `[immutable interface A]` are **descriptive fill-in slots** — leave them
> until you reach the file in Step 2 or 3 and fill in the real value as part
> of the larger section edit.

---

## Step 2 — Fill in `AGENTS.md`

Open `AGENTS.md` and replace these sections with your project specifics:

- **Stack** — runtime, version, key libraries, deploy context
- **File Structure** — the actual `src/` layout you'll build
- **Patterns** — module conventions, error handling, state, logging, concurrency
- **Style** — formatter, type hints, import order, filename convention

Leave the **CRITICAL RULES** (1–11), **Cloud Mode**, **Session Start**,
**Deviation Logging**, and **Error Logging** sections **unchanged** — those are
workflow rules, not project rules.

---

## Step 3 — Fill in `PHASES.md`

Define your project as a sequence of phases. Each phase has 5–15 micro-tasks.
Each task touches at most 2–3 files.

The easiest way: open Claude Code in this repo. When `PHASES.md` is in
template state, Claude's bootstrap detects it and proactively offers an
interactive walkthrough — just say yes. (Or ask explicitly: "walk me through
filling out PHASES.md.")

---

## Step 4 — Fill in `PLAYBOOK.md`

Write Phase 1 task recipes (and only Phase 1 — Claude strips and reloads at
each phase boundary). Each recipe is a precise step sequence Codex can follow
without improvising.

The standing recipes (`R-BUG`, `R-BLOCKED`, `R-PHASE-COMPLETE`) at the bottom
apply to every phase — leave them alone.

Claude can help here too — once PHASES.md is filled, ask "draft Phase 1
recipes in PLAYBOOK.md based on the PHASES.md tasks" and Claude will
generate them for you to review.

---

## Step 5 — Customize the CI workflow for your stack

`.github/workflows/codex-guard.yml` ships **stack-agnostic**. It enforces:

- PR title has `[TASK_X.X]` tag
- Every commit has `[TASK_X.X]` tag
- `PHASES.md` was updated in the PR
- Non-owners can't modify `.github/workflows/`
- gitleaks secret scan

You need to add your stack's lint/test steps. Look for the
`ADD YOUR STACK'S LINT/TEST STEPS BELOW` block at the bottom of the workflow
file — it has commented copy-paste examples for Node, Python, and Go.

---

## Step 6 — Update `.gitignore` (optional)

The shipped `.gitignore` is polyglot — it covers Node, Python, Go, Rust, Java,
and Ruby plus common OS/IDE noise. Trim sections you don't need, or leave it.
Either way, double-check before your first commit that nothing project-specific
is missing.

---

## Step 7 — Set up branch protection on `main`

Use **classic branch protection** — it works on any GitHub plan including free
private repos. (Rulesets require GitHub Team plan for private repos.)

**Settings → Branches → Add branch protection rule**

- Branch name pattern: `main`
- ✅ Require a pull request before merging → Required approvals: 1
- ✅ Require status checks to pass → search for `Enforce Codex contract` and add it
  (the GitHub UI shows it under the workflow name `Codex Guard`)
- ✅ Require review from Code Owners
- ✅ Block force pushes
- ✅ Block deletions

---

## Step 8 — Connect Codex to the repo

In the Codex GitHub app dashboard:

- Add this repo
- Set branch permissions: read all, **write to `codex/*` only**, never `main`

---

## Step 9 — Dry-run with a trivial first task

Before defining real Phase 1 tasks, prove the workflow with a throwaway:

1. Add a one-liner task to `PHASES.md` like `Task 0.0 — add LICENSE file`
2. Fill `docs/codex/templates/task-brief.md` and paste it into Codex
3. Verify Codex opens a draft PR with the right branch + title format
4. Verify CI passes
5. Run a Claude review
6. Click merge, then `git pull origin main`

If anything breaks, use `docs/codex/FRESH_START.md` to reset.

---

## You're ready

Once Steps 1–9 are clean, hand the first real task brief to Codex and let the
workflow run. From this point on, just follow `README.md`.

For ongoing reference:
- `docs/codex/REVIEW_STANDARDS.md` — Claude's 5-tier review rubric
- `docs/codex/HANDOFF.md` — the task brief format
- `docs/codex/DROPIN_PLAYBOOK.md` — full workflow reference
- `docs/codex/FRESH_START.md` — reset procedure when Codex goes sideways

`LOCAL-BUILD/` is quarantined and unrelated — ignore it unless you're returning
to local-model work.
