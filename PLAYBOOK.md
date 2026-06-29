# Playbook — [PROJECT-NAME]

Task recipes for Codex. **Phase 1 only** — Claude strips completed phases
and loads the next phase's recipes at each PHASE_READY audit.

Follow these exactly — don't improvise structure.

---

## Phase 1 Recipes

<!-- Write phase-specific recipes here once PHASES.md tasks are defined.
     Each recipe should follow this structure:

### R1.X — [Recipe name]
1. [Step 1]
2. [Step 2]
3. [Step N]
4. Commit as `feat([scope]): [description] [TASK_1.X]`
5. Second commit: mark Task 1.X ✅ in PHASES.md, bump Current Task to 1.Y
6. Mark PR ready for review

     See docs/codex/DROPIN_PLAYBOOK.md for guidance on writing good recipes.
-->

---

## Standing Recipes (every phase)

### R-BUG — Bug Fix
1. Reproduce: describe the failure in the PR description before touching code
2. Fix the code
3. Log error in ERRORS.md using the template in `docs/codex/templates/error-template.md` (same commit)
4. Commit as `fix(scope): description [TASK_X.X]`
5. If fix touches >3 files: add `NEEDS_REVIEW:` marker in the PR description
6. Mark PR ready for review

### R-BLOCKED — When Stuck
1. Try 2 different approaches
2. If both fail: update the PR description with:
   ```
   STOPPING because: [exact technical reason]

   Tried:
     1. [approach one and why it failed]
     2. [approach two and why it failed]

   Needs: [what would unblock this]
   ```
3. Mark the PR ready for review — Claude will unblock
4. Do not attempt a third approach

### R-PHASE-COMPLETE — Phase End
1. Confirm all phase tasks are checked off in PHASES.md
2. The final task PR should signal `PHASE_READY` in the PR title or description
3. Stop — wait for Claude Code audit before starting the next phase
4. Output in the PR description:
   ```
   Phase [N] complete. All tasks ✓.
   PHASE_READY — waiting for Claude Code audit.
   ```

---

## What Never Needs a Recipe
- Formatting / style changes → just do it, commit as `style: [TASK_X.X]`
- Updating `.env.example` when a new variable is added → include in the same PR as the code
