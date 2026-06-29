# System Architecture

## File Map
- src/api/      → FastAPI routes
- src/models/   → Pydantic schemas
- src/services/ → Business logic
- src/repos/    → Database access

## Data Flow
Request → routes → services → repos → DB

## CI/CD — GitHub Actions
- Workflows live in `.github/workflows/`
- [List each workflow file and what it does]
- [What triggers a deploy]
- [What secrets are referenced — names only, never values]
- Workflow files are Claude-only — Aider never modifies them

## Key Decisions
- PostgreSQL via SQLAlchemy 2.0
- Redis for session cache
- Auth: JWT with RS256
