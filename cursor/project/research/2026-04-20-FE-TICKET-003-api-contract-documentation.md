---
date: 2026-04-20T05:33:54+08:00
researcher: Cursor Agent
git_commit: 3bd51b5463ee3dd73ea2c159653726a194a93458
branch: Riche
repository: job-sentry-frontend
topic: "API contract documentation (FE-TICKET-003 scope)"
tags: [research, codebase, frontend-api-endpoints, PredictResponse, HealthResponse, FE-TICKET-003]
status: complete
last_updated: 2026-04-20
last_updated_by: Cursor Agent
---

# Research: API contract documentation (FE-TICKET-003 scope)

**Date**: 2026-04-20T05:33:54+08:00  
**Researcher**: Cursor Agent  
**Git Commit**: `3bd51b5463ee3dd73ea2c159653726a194a93458`  
**Branch**: Riche  
**Repository**: job-sentry-frontend  

**Backend reference commit** (separate repository `job-sentry-backend`): `26c01727e996da4fcc64221713a2f75fad464f18`

## Research Question

As described in [`cursor/project/tickets/FE-TICKET-003-api-contract-documentation.md`](../../tickets/FE-TICKET-003-api-contract-documentation.md), document how internal frontend API documentation (`cursor/project/docs/frontend-api-endpoints.md`) relates to the **current** multiclass `POST /predict` contract, health payload, and service version—alongside what the frontend TypeScript layer and backend implementation define today.

## Summary

- **`cursor/project/docs/frontend-api-endpoints.md`** still describes a **binary** `/predict` response (`scam_probabilities`, `predicted_scam`, `threshold`) and shows **`"version": "0.2.0"`** on `GET /`. The health example uses a **non-null** string for `artifact_path`.
- The **frontend runtime types and client** in `lib/api/types.ts` and `lib/api/jobSentry.ts` already model the **multiclass** response (`predicted_class`, `predicted_label`, three probability arrays, `confidence`, `warnings`) and **`artifact_path: string | null`** on health. `predictScam` normalizes all listed response arrays when missing.
- The **backend** exposes `SERVICE_VERSION = "0.3.0"` in `app/main.py`, implements multiclass `PredictResponse` in `app/schemas.py`, and sets `HealthResponse.artifact_path` to **`None`** when no predictor is loaded (degraded path).

The ticket’s deliverable scope is **only** updating `frontend-api-endpoints.md`; the research note records the **as-is** alignment gap between that markdown file and the code-backed contract.

## Detailed Findings

### `cursor/project/docs/frontend-api-endpoints.md`

- Documents base URL `http://127.0.0.1:8000`, `GET /`, `GET /health`, `POST /predict`.
- **`GET /` example** includes `"version": "0.2.0"`.
- **`GET /health` example** includes `"artifact_path": "artifacts/models/phase6_fused"` (always a string in the sample).
- **`POST /predict` success example** uses `scam_probabilities`, `predicted_scam`, `threshold`, and `warnings` (binary-era fields).
- Request schema and validation notes (posts, optional fields, rate rules) remain detailed; error codes `422` / `503` are described.

### `lib/api/types.ts` — contracts used by the app

- **`ServiceInfoResponse`**: `service`, `version`, `docs` (no fixed version in the type).
- **`HealthResponse`**: `status` union `"ok" | "degraded"`, `model_loaded`, `mode`, **`artifact_path: string | null`**, `device`, `message: string | null`.
- **`PredictResponse`**: parallel arrays `predicted_class`, `predicted_label`, `legit_probability`, `warning_probability`, `fraud_probability`, `confidence`, `warnings`; JSDoc states class indices 0/1/2 and that **`confidence` is the max of the three softmax probabilities per post**.

### `lib/api/jobSentry.ts` — client behavior

- **`getServiceInfo`**, **`getHealth`**, **`predictScam`** call `requestJson` against `/`, `/health`, `/predict` respectively.
- **`normalizePredictResponse`** fills each multiclass array with `[]` when the corresponding field is missing or not an array (partial JSON still yields defined arrays on the returned object).

### `lib/api/http.ts`

- **`requestJson`** performs `fetch`, parses JSON for 2xx, and does not reshape endpoint-specific bodies.

### `job-sentry-backend` — source of HTTP response shapes

- **`app/main.py`**: `SERVICE_VERSION = "0.3.0"`; `root()` returns `RootResponse` with that version; `health()` returns `artifact_path=None` when `predictor is None` (degraded), else a string path when loaded; `predict()` builds `PredictResponse` from `predictor.predict_full` row fields plus heuristic `warnings`.
- **`app/schemas.py`**: `PredictResponse` lists multiclass fields; `HealthResponse` has `artifact_path: Optional[str] = None`; `RootResponse` has `version: str`. Field descriptions on `PredictResponse.confidence` state the **max** of the three class probabilities.

## Code References

- [`cursor/project/docs/frontend-api-endpoints.md`](../../docs/frontend-api-endpoints.md) — internal API markdown (binary `/predict` example, version `0.2.0`).
- [`lib/api/types.ts`](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/lib/api/types.ts) — `HealthResponse`, `PredictResponse` (multiclass).
- [`lib/api/jobSentry.ts`](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/lib/api/jobSentry.ts) — `normalizePredictResponse`, `predictScam`.
- [`lib/api/http.ts`](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/lib/api/http.ts) — `requestJson`.
- [`job-sentry-backend/app/main.py`](https://github.com/Retchizu/job-sentry-backend/blob/26c01727e996da4fcc64221713a2f75fad464f18/app/main.py) — `SERVICE_VERSION`, `root`, `health`, `predict`.
- [`job-sentry-backend/app/schemas.py`](https://github.com/Retchizu/job-sentry-backend/blob/26c01727e996da4fcc64221713a2f75fad464f18/app/schemas.py) — `PredictResponse`, `HealthResponse`, `RootResponse`.

## Architecture Documentation

- The frontend treats the backend as a JSON HTTP API; types in `lib/api/types.ts` are the **in-repo contract** for TypeScript consumers. Project markdown under `cursor/project/docs/` is a **human-readable mirror** of that contract for developers; at the time of research, `frontend-api-endpoints.md` still reflected an older binary response while `lib/api` reflects multiclass.
- Backend Pydantic models in `app/schemas.py` are the server’s declared response models; FastAPI registers them with `response_model` on the routes in `create_app()`.

## Historical Context (from `cursor/project/`)

- [`cursor/project/tickets/FE-TICKET-003-api-contract-documentation.md`](../../tickets/FE-TICKET-003-api-contract-documentation.md) — ticket defining scope: update `frontend-api-endpoints.md` for multiclass `/predict`, health (`artifact_path` null), version example (`0.3.0`), `confidence` definition, optional cross-link to backend.
- [`cursor/project/research/2026-04-20-FE-TICKET-001-multiclass-api-types-and-client.md`](2026-04-20-FE-TICKET-001-multiclass-api-types-and-client.md) — earlier research captured **binary** `PredictResponse` in `lib/api/types.ts` at that time; the **current** `lib/api` files are multiclass as described above. Use live files and this document for FE-TICKET-003 rather than the outdated portions of FE-TICKET-001 research.
- [`cursor/project/research/2026-04-20-FE-TICKET-002-result-views-three-class-routing.md`](2026-04-20-FE-TICKET-002-result-views-three-class-routing.md) — UI routing and labels related to three-class results (context for terminology consistency with docs per ticket dependencies).

## Related Research

- [`cursor/project/research/2026-04-20-FE-TICKET-001-multiclass-api-types-and-client.md`](2026-04-20-FE-TICKET-001-multiclass-api-types-and-client.md) — superseded for `lib/api` binary-vs-multiclass details; still useful for ticket lineage.
- [`cursor/project/research/2026-04-20-FE-TICKET-002-result-views-three-class-routing.md`](2026-04-20-FE-TICKET-002-result-views-three-class-routing.md) — result views and three-class routing.
- [`cursor/project/research/2026-03-28-api-endpoints-and-ui-input.md`](2026-03-28-api-endpoints-and-ui-input.md) — earlier API endpoints and UI input research.

## Open Questions

- None required for documenting current state. The workspace does not contain `hack/spec_metadata.sh`; metadata for this file was collected with `git` and `gh` in `job-sentry-frontend` and `job-sentry-backend`.
