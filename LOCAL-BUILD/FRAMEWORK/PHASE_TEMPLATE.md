
---

### `PHASES_TEMPLATE.md`
```markdown
# PHASES.md Template

Copy this into any new project as `PHASES.md`.
Fill in phase names, tasks, and deliverables.

---

```markdown
# Project Phases — <Project Name>

## Current Status
- **Current Phase:** Phase 2
- **Current Task:** [specific task]
- **Branch:** feature/[name]
- **Assigned:** Aider
- **Blocker:** None

---

## Phase 0: Discovery ✅
- [x] Requirements captured with Claude
- [x] ARCHITECTURE.md written
- [x] PLAYBOOK.md written
- [x] AIDER.md + CLAUDE.md written
- [x] NOTES.md created

## Phase 0.5: Evaluation ✅
- [x] Scoping report approved
- [x] Extension docs added
- [x] Building block skeletons created

## Phase 1: Scaffold ✅
- [x] Repo structure created
- [x] CI/CD pipelines configured
- [x] Config files in place
- [x] Dev environment documented
- [x] Initial commit to main

## Phase 2: [Feature Name] 🏗️
- [ ] Task 2.1: [specific deliverable]
- [ ] Task 2.2: [specific deliverable]
- [ ] Task 2.3: [specific deliverable]
- [ ] CLAUDE CHECKPOINT: Review phase end-to-end

## Phase 3: [Next Feature]
- [ ] Task 3.1:
- [ ] Task 3.2:
- [ ] CLAUDE CHECKPOINT:

## Phase N: Production Hardening
- [ ] Error handling audit (Claude)
- [ ] Security audit (Claude)
- [ ] Performance review (Claude)
- [ ] Final deployment


---

### `EXTENSIONS.md`
```markdown
# Extension Modules

Optional documentation files added to a project only when warranted.
See EVALUATION_PHASE.md for the decision matrix.

Each section below is a minimal starter template for that extension.

---

## SECURITY.md
```markdown
# Security

## Auth Pattern
[How auth works in this project — provider, token type, middleware location]

## Sensitive Data
[What counts as PII/sensitive, how it's stored, how it's encrypted]

## Aider Must Never
- Hardcode secrets or API keys
- Expose secrets to the client bundle
- Skip auth middleware on protected routes
- Use raw SQL with user input

## Claude Always Audits
- Auth middleware presence on new routes
- Input validation at system boundaries
- Secret handling patterns
- Any changes to auth or session logic
