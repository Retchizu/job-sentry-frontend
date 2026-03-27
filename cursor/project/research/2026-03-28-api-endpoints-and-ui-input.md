---

## date: 2026-03-28T00:33:02+0800
researcher: Codex
git_commit: 1df4462
branch: Riche
repository: job-sentry-frontend
topic: "API endpoints and current UI input"
tags: [research, codebase, api, ui-input, frontend]
status: complete
last_updated: 2026-03-28
last_updated_by: Codex

# Research: API endpoints and current UI input

**Date**: 2026-03-28T00:33:02+0800  
**Researcher**: Codex  
**Git Commit**: 1df4462  
**Branch**: Riche  
**Repository**: job-sentry-frontend

## Research Question

Can you research about API endpoints and our current UI input?

## Summary

The repository currently defines a typed frontend API layer for three backend endpoints (`/`, `/health`, `/predict`) under `lib/api`, with base URL resolution and normalized error handling in a shared HTTP wrapper. The current UI in `app/page.tsx` renders job-post and compensation input fields, but those inputs are uncontrolled and not wired to form state, validation, or any API submission call yet.

## Detailed Findings

### API endpoint definitions and contracts

- Base URL and request transport are centralized in `lib/api/http.ts`.
- `getApiBaseUrl()` reads `NEXT_PUBLIC_API_BASE_URL` and falls back to `http://127.0.0.1:8000`.
- `requestJson<T>()` builds endpoint URLs from the base URL, applies JSON headers, parses non-2xx responses, and throws normalized `ApiError` objects for API/network failures.
- Endpoint functions are defined in `lib/api/jobSentry.ts`:
  - `getServiceInfo()` -> `GET /`
  - `getHealth()` -> `GET /health`
  - `predictScam(payload)` -> `POST /predict`
- Shared request/response types are defined in `lib/api/types.ts`, including `PredictRequest`, `PredictPost`, `PredictRate`, `PredictResponse`, and `ApiError`.
- Public re-exports are exposed in `lib/api/index.ts` for stable imports.

### Current UI input implementation

- The main UI is implemented in `app/page.tsx` as a client component with dark mode local state (`isDarkMode`).
- Input areas currently rendered:
  - Job title
  - Job Description
  - Skills Description
  - Company Profile
  - Full Job Post Text (Optional)
  - Compensation fields: Amount Min, Amount Max, Currency, Rate Type
- The reusable `Field` component renders either `<input>` or `<textarea>`, but without `value`, `onChange`, `name`, or `defaultValue`.
- The inline "Full Job Post Text (Optional)" textarea is also rendered without binding handlers/state.
- The "Validate & Analyze" button is `type="button"` and currently has no click handler.
- There is no `<form>` submit flow and no imports from `lib/api` in `app/page.tsx`, so no endpoint call occurs from this UI at present.

### Current cross-component interaction state

- API service code exists and is export-ready in `lib/api`, but no runtime call sites were found outside `lib/api` itself.
- `app/page.tsx` currently functions as presentation + theme-toggle UI without request construction or response rendering.

## Code References

- `lib/api/http.ts:3-8` - API base URL default and environment override behavior.
- `lib/api/http.ts:42-88` - Generic JSON request wrapper and error normalization path.
- `lib/api/jobSentry.ts:9-22` - Endpoint functions for `/`, `/health`, and `/predict`.
- `lib/api/types.ts:1-49` - API request/response and error interfaces.
- `lib/api/index.ts:1-12` - Public API barrel exports.
- `app/page.tsx:77-113` - Job-post input fields and optional full-text textarea.
- `app/page.tsx:143-151` - Compensation input fields.
- `app/page.tsx:154-168` - "Validate & Analyze" button with no submit handler.
- `app/page.tsx:175-204` - `Field` component rendering uncontrolled inputs/textareas.

## Architecture Documentation

- API transport is layered as:
  - `types.ts` (contracts)
  - `http.ts` (transport + error normalization)
  - `jobSentry.ts` (endpoint-level functions)
  - `index.ts` (barrel exports)
- UI currently uses a componentized visual structure (`Home` + `Field`) and Tailwind class styling with dark mode class toggling.
- UI inputs are displayed as free-entry controls and are not currently linked to domain objects (`PredictRequest`) at render time.

## Historical Context (from cursor/project/)

- `cursor/project/docs/frontend-api-endpoints.md` - endpoint contract baseline, request/response examples, and `/predict` payload rules.
- `cursor/project/plan/2026-03-28-api-service-for-frontend-endpoints.md` - planned phased work: API foundation, validation layer, and UI wiring.
- `cursor/project/implementation/2026-03-28-NA-0001-api-service-foundation-phase-1.md` - records completed Phase 1 API foundation implementation and verification status.

## Related Research

- No prior research documents were found under `cursor/project/research/` at the time of this research.

## Open Questions

- None identified for this specific mapping request.

