---
date: 2026-04-20T00:00:00Z
researcher: Cursor Agent
git_commit: 3bd51b5463ee3dd73ea2c159653726a194a93458
branch: Riche
repository: job-sentry-frontend
topic: "Multiclass API types and client (FE-TICKET-001 scope)"
tags: [research, codebase, lib/api, PredictResponse, predictScam, FE-TICKET-001]
status: complete
last_updated: 2026-04-20
last_updated_by: Cursor Agent
---

# Research: Multiclass API types and client (FE-TICKET-001 scope)

**Date**: 2026-04-20T00:00:00Z  
**Researcher**: Cursor Agent  
**Git Commit**: `3bd51b5463ee3dd73ea2c159653726a194a93458`  
**Branch**: Riche  
**Repository**: job-sentry-frontend  

## Research Question

Document the current state of TypeScript API types and the `/predict` client in `job-sentry-frontend` relative to the multiclass backend response, as described in `cursor/project/tickets/FE-TICKET-001-multiclass-api-types-and-client.md`.

## Summary

The frontend `lib/api` layer today models **`PredictResponse`** as a **binary** contract: `scam_probabilities`, `predicted_scam`, `threshold`, and `warnings`. The function **`predictScam`** posts to `/predict` and returns that shape, with **only `warnings` normalized** when omitted. **`HealthResponse.artifact_path`** is typed as **`string`**, not nullable.

The **job-sentry-backend** repository (separate git repo) defines **`PredictResponse`** in `app/schemas.py` as a **multiclass** contract: parallel arrays `predicted_class`, `predicted_label`, `legit_probability`, `warning_probability`, `fraud_probability`, `confidence`, and `warnings`. The **`predict`** handler in `app/main.py` constructs responses using those fields from `predictor.predict_full`.

There is **no** `hack/spec_metadata.sh` script in the workspace; metadata for this note was collected with `git` and `gh` in `job-sentry-frontend`.

## Detailed Findings

### `lib/api/types.ts` — `PredictResponse` and `HealthResponse`

- **`PredictResponse`** ([`lib/api/types.ts`](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/lib/api/types.ts)) declares:
  - `scam_probabilities: number[]`
  - `predicted_scam: boolean[]`
  - `threshold: number`
  - `warnings: string[][]` (documented as one list per post)
- **`HealthResponse`** sets `artifact_path: string` (required). `status` is `"ok" | "degraded"`; `message` is `string | null`.

### `lib/api/jobSentry.ts` — `predictScam`

- **`predictScam`** requests `POST /predict` via `requestJson<PredictResponseBody>`, where `PredictResponseBody` is `PredictResponse` with optional `warnings`.
- The returned object spreads `raw` and sets `warnings` to `[]` if `raw.warnings` is not an array. No other fields are defaulted or renamed.

### `lib/api/index.ts` — Re-exports

- Exports **`predictScam`**, **`getHealth`**, **`getServiceInfo`**, **`requestJson`**, **`getApiBaseUrl`**, and the types listed in the file, including **`PredictResponse`** and **`HealthResponse`**.

### `lib/api` references to binary `PredictResponse` fields

- **`scam_probabilities`**, **`predicted_scam`**, and **`threshold`** appear **only** in the **`PredictResponse`** interface in `lib/api/types.ts` (definition). There are **no** other references under `lib/api/` to those names.

### `lib/api/http.ts`

- **`requestJson<T>`** parses JSON for 2xx responses and does not transform response bodies for `/predict`.

### Backend `PredictResponse` and `predict` (cross-repo, current `job-sentry-backend`)

- **`app/schemas.py`**: `PredictResponse` uses lists for `predicted_class`, `predicted_label`, `legit_probability`, `warning_probability`, `fraud_probability`, `confidence`, and `warnings`. **`HealthResponse.artifact_path`** is **`Optional[str]`**.
- **`app/main.py`**: `predict` builds `PredictResponse` from `predictor.predict_full(texts)` rows (parallel lists) plus heuristic `warnings`.

### Consumers outside `lib/api` (context for the ticket’s “align types” goal)

- **`app/page.tsx`** imports **`PredictResponse`** and **`predictScam`**, calls **`predictScam`**, and helper functions read **`result.scam_probabilities[0]`** for display logic. The ticket lists **`app/page.tsx`** as out of scope for FE-TICKET-001; this file is noted here only as a **downstream** use of the current type shape.

### Project documentation

- **`cursor/project/docs/frontend-api-endpoints.md`** documents a **`/predict`** example response using **`scam_probabilities`**, **`predicted_scam`**, **`threshold`**, and **`warnings`**.

## Code References

- [`job-sentry-frontend/lib/api/types.ts:7-14`](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/lib/api/types.ts#L7-L14) — `HealthResponse`
- [`job-sentry-frontend/lib/api/types.ts:46-52`](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/lib/api/types.ts#L46-L52) — `PredictResponse`
- [`job-sentry-frontend/lib/api/jobSentry.ts:9-31`](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/lib/api/jobSentry.ts#L9-L31) — `PredictResponseBody` and `predictScam`
- [`job-sentry-frontend/lib/api/index.ts:1-16`](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/lib/api/index.ts#L1-L16) — exports
- [`job-sentry-frontend/app/page.tsx:30-41`](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/app/page.tsx#L30-L41) — `scamConfidencePercent` / `safeConfidencePercent` using `scam_probabilities`
- [`job-sentry-backend/app/schemas.py:62-92`](https://github.com/Retchizu/job-sentry-backend/blob/26c01727e996da4fcc64221713a2f75fad464f18/app/schemas.py#L62-L92) — backend `PredictResponse`
- [`job-sentry-backend/app/schemas.py:95-101`](https://github.com/Retchizu/job-sentry-backend/blob/26c01727e996da4fcc64221713a2f75fad464f18/app/schemas.py#L95-L101) — backend `HealthResponse` (`artifact_path` optional)
- [`job-sentry-backend/app/main.py:98-154`](https://github.com/Retchizu/job-sentry-backend/blob/26c01727e996da4fcc64221713a2f75fad464f18/app/main.py#L98-L154) — `predict` builds multiclass `PredictResponse`

## Architecture Documentation

- The frontend API module separates **transport** (`http.ts`), **endpoint wrappers** (`jobSentry.ts`), and **shared types** (`types.ts`), with a single **barrel** export in `index.ts`.
- **`predictScam`** is the only `/predict` client; it applies **optional-array fallback** only for **`warnings`**.

## Historical Context (from cursor/project/)

- No `cursor/project/notes/` tree was present under `job-sentry-frontend` at research time.
- **`cursor/project/tickets/FE-TICKET-001-multiclass-api-types-and-client.md`** records the intended alignment work (multiclass fields, remove binary fields, nullable `artifact_path`, normalization in `jobSentry.ts`, exports).
- **`cursor/project/docs/frontend-api-endpoints.md`** still describes the binary JSON example for `/predict`.
- Prior research **`cursor/project/research/2026-03-28-api-endpoints-and-ui-input.md`** describes the three endpoints and `lib/api` types at that time (including `PredictResponse`).

## Related Research

- [`cursor/project/research/2026-03-28-api-endpoints-and-ui-input.md`](2026-03-28-api-endpoints-and-ui-input.md) — earlier `lib/api` and UI input survey
- Backend (sibling repo in workspace): `job-sentry-backend/cursor/project/research/2026-04-19-TICKET-005-inference-contract-and-serving.md` — HTTP contract and `PredictResponse` (see GitHub permalink in that file if cloned elsewhere)

## Open Questions

- **`PredictPost`** in the frontend omits an optional **`text`** field that exists on backend **`JobPostInput`**; this is unchanged by FE-TICKET-001 scope but is a request-shape difference between repos.

## Metadata note

- **`hack/spec_metadata.sh`** was not found in `/Users/riche/job-sentry`; frontmatter fields were filled from `git` / `gh` in `job-sentry-frontend` and `job-sentry-backend` as appropriate for cross-repo citations.
