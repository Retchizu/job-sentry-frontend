# Frontend multiclass `/predict` tickets

These tickets align the Next.js app with the backend multiclass fused model (`legit` / `warning` / `fraud`) and **TICKET-005** / **TICKET-008** on `job-sentry-backend`.

## Priority order

1. `FE-TICKET-001-multiclass-api-types-and-client.md` (blocks everything else)
2. `FE-TICKET-002-result-views-three-class-routing.md` (main UX)
3. `FE-TICKET-003-api-contract-documentation.md` (docs after types stabilize)
4. `FE-TICKET-004-improvement-feedback-three-class.md` (optional; data/training alignment)
5. `FE-TICKET-005-copy-and-loading-polish.md` (optional; rollout tone)

## Dependency-aware critical path

`FE-TICKET-001` → `FE-TICKET-002` → `FE-TICKET-003`

`FE-TICKET-004` and `FE-TICKET-005` can follow when product is ready; they do not block basic integration.

## Backend reference

See `job-sentry-backend/cursor/project/tickets/` (especially **TICKET-001**, **TICKET-005**, **TICKET-008**) and live schemas in `job-sentry-backend/app/schemas.py`.
