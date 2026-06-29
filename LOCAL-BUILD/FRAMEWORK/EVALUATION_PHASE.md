# Phase 0.5: Evaluation

Runs between Discovery (Phase 0) and Scaffold (Phase 1).
Claude evaluates project scope and decides which extension docs
and building blocks are needed before Aider touches any code.

---

## Scoping Questions

Answer these with Claude before scaffolding begins:

**Scope**
1. Is this a prototype, MVP, or production system?
2. Single developer or team?
3. Will this handle real user data?

**Data**
4. Does this have a database? How many tables roughly?
5. Is there ETL, pipeline, or streaming logic at the core?
6. Does the domain have specialized vocabulary?

**Integrations**
7. How many third-party APIs are involved?
8. Any auth provider (OAuth, SAML, Clerk, etc.)?
9. Any payments or sensitive data flows?

**Operations**
10. Where does this deploy? (Vercel / AWS / GAS / self-hosted)
11. Will this run in production with uptime expectations?
12. Any compliance requirements? (HIPAA / SOC2 / GDPR)
13. Are GitHub Actions workflows needed? If yes — what should they do?
    (e.g. auto-deploy on merge, run tests on PR, scheduled jobs)

**Performance**
13. Any hard performance budgets? (latency, cost, throughput)
14. Expected scale? (10s / 10k / 1M+ users)

---

## Extension Decision Matrix

| Extension | Add When |
|-----------|----------|
| `SECURITY.md` | Auth, payments, PII, or user data involved |
| `DATABASE.md` | Schema has >5 tables or complex relationships |
| `API.md` | Public API exposed or 3+ external integrations |
| `DEPLOYMENT.md` | Multi-step, multi-env deploy or IaC involved |
| `DATA_FLOW.md` | Pipeline / ETL / streaming is the core feature |
| `INTEGRATIONS.md` | 3+ third-party services (Stripe, Twilio, etc.) |
| `DECISIONS.md` | Architecture is opinionated or non-obvious |
| `TESTING.md` | Non-trivial test strategy (E2E, fixtures, mocks) |
| `GLOSSARY.md` | Domain has jargon or custom business terminology |
| `RUNBOOK.md` | Project runs in production with SLAs |
| `PERFORMANCE.md` | Performance is a first-class requirement |
| `COMPLIANCE.md` | HIPAA, SOC2, GDPR, or audit requirements |
| `NOTES.md` | Always — catch-all for quirks and gotchas |

---

## Scoping Report Template

Claude writes this. You approve it before scaffold begins.

```markdown
# Scoping Report — <Project Name>

## Profile
<2-sentence description of what this is and its complexity level>

## Extensions Added
- SECURITY.md (reason)
- DATABASE.md (reason)

## Extensions Skipped
- COMPLIANCE.md (not required at this stage)
- RUNBOOK.md (too early — revisit at beta)

## Pre-Built Building Blocks
- Auth skeleton in lib/auth/ (Aider fills in)
- DB repo pattern in lib/db/ (Aider follows)

## Unique Scaffolding Notes
<Anything specific to this project that doesn't fit the templates>

## Ready to Scaffold? [yes/no]
