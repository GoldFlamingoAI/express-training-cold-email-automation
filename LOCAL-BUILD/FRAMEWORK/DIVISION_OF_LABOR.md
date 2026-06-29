
---

## Claude — Use Sparingly

**When Claude acts:**
- Project kickoff: architecture, writing all per-project .md files
- Pre-building skeleton code for tricky patterns (auth, DB layer, webhooks)
- PR review — diff only, never full files
- Phase completion audit
- Aider is BLOCKED (flagged via commit signal)
- Security-sensitive features: auth, payments, PII
- Refactors spanning more than 5 files
- Hard bugs Aider has failed on 2–3 times
- Monthly architecture drift check

**Claude never:**
- Re-reads the entire codebase during a review
- Reviews style, formatting, or tests
- Rewrites files wholesale when a surgical edit will do

---

## Aider — Use Constantly

**What Aider builds:**
- Boilerplate: CRUD endpoints, form components, config files
- Unit tests against Claude's specs
- Single-file or 2–3 file features following existing patterns
- Within-file refactors
- Documentation: docstrings, README updates
- Bug fixes with clear reproductions
- PLAYBOOK.md task recipes executed exactly
- ARCHITECTURE.md change log updated after each feature

**Aider never:**
- Pushes to `main` (branch protection enforced)
- Adds new dependencies without flagging
- Freelances on auth, payments, or security patterns
- Makes architecture decisions (those live in ARCHITECTURE.md)

---

## Token Budget Reference

| Task | Tool | Approx. Cost |
|------|------|--------------|
| Project kickoff | Claude | 20–40k tokens (once) |
| Feature development | Aider | $0 |
| PR review (diff only) | Claude | 5–10k tokens |
| Bug debug session | Claude | 10–20k tokens |
| Architecture drift audit | Claude | 10–20k tokens (monthly) |
| Phase completion audit | Claude | 15–25k tokens |
| Pre-production audit | Claude | 50–100k tokens (rare) |

---

## Commit Prefix Convention

Aider prefixes all commits so Claude can filter what needs review:

| Prefix | Meaning | Claude reviews? |
|--------|---------|-----------------|
| `feat:` | New feature | Only if REVIEW_REQUESTED appended |
| `fix:` | Bug fix | Only if REVIEW_REQUESTED appended |
| `refactor:` | Code refactor | Only if REVIEW_REQUESTED appended |
| `perf:` | Performance improvement | Only if REVIEW_REQUESTED appended |
| `security:` | Security-related change | Always |
| `style:` | Formatting only | Never |
| `docs:` | Documentation | Never |
| `test:` | Tests only | Never |

---

## Handoff Signals

Appended to commit messages to trigger Claude or flag state:

| Signal | When Aider uses it | What Claude does |
|--------|--------------------|-----------------|
| `REVIEW_REQUESTED` | Feature complete, wants a diff review | Review the diff, post comments |
| `BLOCKED` | Tried 2 approaches, both failed | Take over, unblock, hand back |
| `PHASE_READY` | All phase tasks checked off | Run phase completion audit |
| `DOCS_UPDATE` | ARCHITECTURE.md was changed | Verify drift hasn't occurred |
