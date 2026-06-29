# For Claude — New Project Setup

When a user asks you to start a new project, follow these steps in order.

This repo IS the project repo and the starting point for every project
built from this template. The FRAMEWORK/ folder is the permanent reference
— never modify it.

The following are already at the repo root from the template and require
no copying:
- CLAUDE.md — skills announcement + review focus (customize per project)
- .claude/commands/ — all baseline skills, available immediately

All other files you generate go at the ROOT of this repo alongside the
project code Aider will build.

---

## Step 1: Run Phase 0.5 (Evaluation)

Read EVALUATION_PHASE.md and ask the user the scoping questions.
Write a scoping report and get their approval before touching any files.

---

## Step 2: Write the 7 Project Files at the Repo Root

Using the templates in FRAMEWORK/STARTER/ as your guide, generate
customized versions of each file and place them at the ROOT of the repo
(not inside FRAMEWORK/). Do not copy them verbatim — fill in every
placeholder based on what the user told you.

### ARCHITECTURE.md
- Replace the example stack (FastAPI/SQLAlchemy) with the actual stack
- Draw the real file map for this project's folder structure
- Document the actual data flow and key technical decisions

### AIDER.md
- Fill in the real stack, framework, database, and deploy target
- List the actual file structure with real directory names
- Write stack-specific "Never Do" rules (e.g. for GAS: never use local
  file I/O, always use DriveApp/SpreadsheetApp APIs)
- Fill in the actual patterns Aider should follow with real file references
- Keep it under 80 lines — this file loads on every Aider session

### CLAUDE.md
- Already at root — do not recreate it
- Update the "What to Check" section with the real directory paths for
  this project (auth, API calls, data handling)
- Leave the Session Start greeting and all other sections untouched

### PLAYBOOK.md
- Write recipes for Phase 1 tasks ONLY — do not pre-load all phases
- Each recipe must be a precise step sequence Aider can follow without improvising
- At each PHASE_READY audit, Claude strips the completed phase recipes
  and loads the next phase's recipes — this keeps Aider's context lean
- The BLOCKED protocol, push prompt, and phase-complete signal are
  already in the template — do not remove them

### PHASES.md
- Fill in the real phase names and tasks based on the scoping report
- Assign phases to Aider or Claude checkpoints appropriately
- Phase 0 and 0.5 should already be checked off by the time this is committed

### NOTES.md
- Leave the header, clear the example comment
- Aider will populate this as the project progresses

### .aider.conf.yml
- Already at root — do not recreate it
- Update the project name comment only
- Model and all other settings are pre-configured

### .claude/commands/
- Already at root — all 8 baseline skills are live from first open
- Do not recreate or modify

---

## Step 3: Build the Initial Folder Structure at Root

Create the empty directories and stub files the project needs at the repo
root so Aider has a map to navigate from day one. No logic yet — just
structure. FRAMEWORK/ stays untouched alongside it.

---

## Step 4: Commit Everything Directly to the GitHub Repo

You are working in the cloud — commit and push all generated files
directly to the GitHub repo. Do not wait for the user to do this.

Commit message: `chore: project scaffold — Phase 0.5 complete, ready for Aider`

---

## Step 5: Signal the User to Clone

Once the commit is live, tell the user:

> All starter files are committed to GitHub. You're ready to clone locally
> and hand off to Aider. Run this in your terminal:
>
> ```bash
> git clone [repo-url]
> cd [repo-name]
> aider
> ```
>
> Aider will read your starter files automatically on launch. Start with
> Phase 1 in PHASES.md.
