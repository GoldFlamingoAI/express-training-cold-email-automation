# PROPER GITHUB REPO FILE TRANSFER

## Purpose

A step-by-step process for copying files from one GitHub repo into another without
creating "unrelated histories" merge errors. Use this whenever you need to add a
set of files (e.g. a workflow template, shared config, boilerplate) into an
existing repo that has its own commit history.

---

## The Two Rules That Prevent All Problems

1. **Always build or clone files INSIDE a clone of the target repo** — never `git init` from scratch and try to merge later
2. **Always use `rsync --exclude='.git'`** to copy files between repos — never `cp -r` (it copies the `.git` folder and corrupts the destination repo)

---

## Prerequisites

- Git installed locally
- GitHub access (HTTPS or SSH) to both repos
- `rsync` available (pre-installed on macOS and Linux)

---

## The Process

### Step 1 — Create a working directory

```bash
mkdir ~/Developer/transfer-workspace
cd ~/Developer/transfer-workspace
```

### Step 2 — Clone the SOURCE repo (the files you want to copy FROM)

```bash
git clone --branch <source-branch> --single-branch https://github.com/YOUR-ORG/SOURCE-REPO source
```

Replace `<source-branch>` with the branch that has the files. Use `main` if copying from main.

### Step 3 — Clone the TARGET repo (the repo you want to copy INTO)

```bash
git clone https://github.com/YOUR-ORG/TARGET-REPO target
```

### Step 4 — Create a branch on the target

```bash
cd target
git checkout -b add-files-from-source
```

### Step 5 — Copy files using rsync (excludes .git)

```bash
rsync -av --exclude='.git' ../source/ .
```

The `-a` flag preserves file attributes. The `-v` flag shows what was copied.
The `--exclude='.git'` is critical — it prevents the source repo's git history from corrupting the target.

> **Adding to an existing project with code already in it?** Add two more flags
> to protect your existing files:
>
> ```bash
> rsync -av --exclude='.git' --exclude='LOCAL-BUILD' --ignore-existing ../source/ .
> ```
>
> - `--ignore-existing` skips any file that already exists in the target — no
>   overwrites of your existing `README.md`, `.gitignore`, `CLAUDE.md`, etc.
> - `--exclude='LOCAL-BUILD'` keeps the source's quarantined folder out of your repo.

### Step 6 — Stage, commit, and push

```bash
git add -A
git commit -m "chore: add files from [source repo name]"
git push origin add-files-from-source
```

### Step 7 — Open a PR and merge on GitHub

Go to:
```
https://github.com/YOUR-ORG/TARGET-REPO/pull/new/add-files-from-source
```

Create the pull request, review the diff, and merge. GitHub will handle it as a
normal merge — no unrelated histories error because the branch shares history with main.

---

## Full Example — Drop Codex workflow into an existing project

This is the canonical "add the Codex workflow to my existing project" recipe.
Source = this template repo. Target = your existing project repo with code in it.

```bash
mkdir ~/Developer/transfer-workspace
cd ~/Developer/transfer-workspace

# Clone source (this template) and target (your existing project)
git clone https://github.com/GoldFlamingoAI/PLANNING-local-build source
git clone https://github.com/YOUR-ORG/YOUR-EXISTING-PROJECT target

# Branch off main on the target
cd target
git checkout -b add-codex-workflow

# Copy Codex workflow files, skipping LOCAL-BUILD and anything that already exists
rsync -av --exclude='.git' --exclude='LOCAL-BUILD' --ignore-existing ../source/ .

# Verify nothing of yours changed
git status
git diff --stat

# Commit and push
git add -A
git commit -m "chore: add Codex + Claude Code review workflow"
git push origin add-codex-workflow
```

Then open the PR at:
```
https://github.com/YOUR-ORG/YOUR-EXISTING-PROJECT/pull/new/add-codex-workflow
```

After merge, follow `TEMPLATE_SETUP.md` to fill placeholders and customize.

---

## Common Errors and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `rejected — fetch first` | Remote main has commits you don't have locally | You're pushing to main directly. Use a branch instead (Step 4) |
| `unrelated histories` | Source was built with `git init` instead of cloned | Re-clone the target, copy files with rsync, push as a branch |
| `adding embedded git repository` | Used `cp -r` and copied the `.git` folder | Delete the corrupted dir, re-clone, use `rsync --exclude='.git'` |
| `pathspec 'main' did not match` | Cloned with `--single-branch`, main doesn't exist locally | Run `git fetch origin main` then `git checkout main` |

---

## What NOT to Do

- ❌ `git init` a new local repo and try to push it as a new branch on an existing GitHub repo
- ❌ `cp -r source/. target/` — always copies `.git` and corrupts the target
- ❌ `git push -f origin branch:main` — force push nukes existing content on main
- ❌ `git merge --allow-unrelated-histories` across repos with no shared ancestor — works locally but GitHub UI won't let you create the PR
