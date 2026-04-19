# FE-TICKET-001: Multiclass API types and client — Implementation Plan

## Overview

Align the frontend `lib/api` layer with the backend multiclass `POST /predict` and `GET /health` contracts defined in **job-sentry-backend** `app/schemas.py`: replace binary `PredictResponse` fields with parallel arrays for 3-class outputs, widen `HealthResponse.artifact_path` for degraded health, and harden `predictScam` so missing array keys in JSON still yield safe arrays (same spirit as today’s `warnings` fallback).

## Current State Analysis

- **`lib/api/types.ts`**: `PredictResponse` still declares `scam_probabilities`, `predicted_scam`, `threshold`, and `warnings`. `HealthResponse.artifact_path` is required `string`.
- **`lib/api/jobSentry.ts`**: `predictScam` types the raw body as `PredictResponse` with optional `warnings` only; returned value spreads `raw` and defaults `warnings` to `[]`.
- **`lib/api/index.ts`**: Re-exports types and `predictScam` (name unchanged).
- **Backend reference** (`job-sentry-backend/app/schemas.py`): `PredictResponse` uses `predicted_class`, `predicted_label`, `legit_probability`, `warning_probability`, `fraud_probability`, `confidence`, `warnings`; `HealthResponse.artifact_path` is optional (`None` allowed).
- **Downstream consumer**: `app/page.tsx` imports `PredictResponse` and reads `scam_probabilities` and `predicted_scam` — **explicitly out of scope** for this ticket (FE-TICKET-002). Updating `PredictResponse` will cause TypeScript errors in `app/page.tsx` until that ticket ships.
- **Root `tsc`**: The repo uses a single `tsconfig.json` including all `**/*.tsx`. There is no dedicated `npm run typecheck` script; verification is typically `npx tsc --noEmit` or `next build`. Unrelated TS errors may already exist elsewhere (e.g. other pages).

## Desired End State

- **`PredictResponse`** in TypeScript matches **`PredictResponse`** in `app/schemas.py` **field-for-field** (same names; parallel `number[]` / `string[]` / `string[][]` as in Python lists).
- **`HealthResponse.artifact_path`** is `string | null` to match optional/nullable artifact path when the model is not loaded.
- **`predictScam`** returns a fully normalized `PredictResponse` where every list field is a real array (empty `[]` if the key is missing or not an array), mirroring the existing `warnings` pattern.
- **`lib/api`** contains **no** references to `scam_probabilities`, `predicted_scam`, or `threshold`.
- Exports in **`lib/api/index.ts`** remain sufficient for consumers (add new type exports only if new named types are introduced).

### Key Discoveries

- Backend lists are **required** in Pydantic; defensive normalization in the client is for **robustness** against partial or malformed JSON, not the happy-path server response.
- Renaming **`predictScam`** is optional (“or renamed export” in the ticket); keeping the name avoids churn in imports until a dedicated rename ticket.

## What We're NOT Doing

- **No changes** to `app/page.tsx` or other UI (FE-TICKET-002).
- **No** backend changes.
- **No** rename of `predictScam` unless product asks (default: keep).
- **No** updates to `cursor/project/docs/frontend-api-endpoints.md` (not listed in ticket deliverables).
- **No** new `tsconfig` project split solely for this ticket.

## Implementation Approach

1. Update **`types.ts`**: new `PredictResponse` shape; optional branded/narrow type for labels (`"legit" | "warning" | "fraud"`) as `string[]` or a stricter per-element union array if desired — match ticket wording (`string[]` with documentation is enough).
2. Update **`jobSentry.ts`**: define a **raw/partial** body type (all array fields optional), then implement a small **`normalizePredictResponse(raw)`** that coerces each field with `Array.isArray(x) ? x : []` (and preserves number/string element types as returned by `JSON.parse`).
3. Keep **`PredictResponseBody`** pattern: raw type → normalize → `PredictResponse`.
4. **`index.ts`**: re-export updated types; no change unless new exports are added.

## Phase 1: Types (`lib/api/types.ts`)

### Overview

Replace binary fields with multiclass fields and align `HealthResponse` with degraded-health JSON.

### Changes Required

**File**: `lib/api/types.ts`

1. **`HealthResponse`**: Change `artifact_path` from `string` to `string | null`.
2. **`PredictResponse`**: Remove `scam_probabilities`, `predicted_scam`, `threshold`. Add:
   - `predicted_class: number[]`
   - `predicted_label: string[]` (optionally document or type as tuple of literals per index — ticket allows `string[]`)
   - `legit_probability: number[]`
   - `warning_probability: number[]`
   - `fraud_probability: number[]`
   - `confidence: number[]`
   - `warnings: string[][]` (keep JSDoc: one entry per post, same order as request `posts`)

### Success Criteria

#### Automated Verification

- [x] `rg 'scam_probabilities|predicted_scam|threshold' lib/api` returns no matches.
- [x] `npx eslint lib/api` passes (if ESLint is configured for these paths).

#### Manual Verification

- [ ] Side-by-side check: every field on `PredictResponse` in `types.ts` has a matching field name on `PredictResponse` in `job-sentry-backend/app/schemas.py` (open both files).

**Implementation note**: After this phase alone, **`app/page.tsx` will not typecheck** against the new `PredictResponse`. That is expected until FE-TICKET-002.

---

## Phase 2: Client normalization (`lib/api/jobSentry.ts`)

### Overview

Parse `/predict` JSON into the new shape and default missing array fields to empty arrays.

### Changes Required

**File**: `lib/api/jobSentry.ts`

1. Replace `PredictResponseBody` with a type where **each** of the parallel array fields on `PredictResponse` is optional (e.g. `Partial<Pick<PredictResponse, ...>>` or an explicit interface), still allowing `requestJson` to return parsed data.
2. Implement normalization, for example:

```typescript
function normalizePredictResponse(raw: PredictResponseBody): PredictResponse {
  const empty: [] = [];
  return {
    predicted_class: Array.isArray(raw.predicted_class) ? raw.predicted_class : empty,
    predicted_label: Array.isArray(raw.predicted_label) ? raw.predicted_label : empty,
    legit_probability: Array.isArray(raw.legit_probability) ? raw.legit_probability : empty,
    warning_probability: Array.isArray(raw.warning_probability) ? raw.warning_probability : empty,
    fraud_probability: Array.isArray(raw.fraud_probability) ? raw.fraud_probability : empty,
    confidence: Array.isArray(raw.confidence) ? raw.confidence : empty,
    warnings: Array.isArray(raw.warnings) ? raw.warnings : empty,
  };
}
```

3. **`predictScam`**: `const raw = await requestJson<PredictResponseBody>(...); return normalizePredictResponse(raw);`

Adjust types so `requestJson` still receives a generic that matches partial bodies.

### Success Criteria

#### Automated Verification

- [x] No binary field names in `lib/api/jobSentry.ts`.
- [x] `npx eslint lib/api/jobSentry.ts` passes.

#### Manual Verification

- [ ] Confirm normalization covers every array field on `PredictResponse` (not only `warnings`).

---

## Phase 3: Exports (`lib/api/index.ts`)

### Overview

Ensure public API surface exports all types consumers need after the change.

### Changes Required

**File**: `lib/api/index.ts`

- If no new named types are introduced, **re-export list may be unchanged** beyond `PredictResponse` / `HealthResponse` already exported.
- If you add a helper type (e.g. `PredictLabel`) for stricter labels, export it from `types.ts` and add to the `export type { ... }` block.

### Success Criteria

#### Automated Verification

- [x] `rg "from \"@/lib/api\"" app lib` — importers still resolve `PredictResponse`, `HealthResponse`, `predictScam` (no missing export errors when FE-TICKET-002 updates call sites).

#### Manual Verification

- [ ] Barrel file lists `PredictResponse` and `HealthResponse` with updated shapes.

---

## Testing Strategy

### Unit / type tests

- The ticket does not require new test files. If the project later adds tests for `lib/api`, assert `normalizePredictResponse` maps omitted keys to `[]`.

### Integration (manual)

- With backend running multiclass `POST /predict`, call `predictScam` from a small script or React and log the normalized object (optional smoke, not a deliverable).

### Full-project TypeScript

- **`npx tsc --noEmit`**: After FE-TICKET-001 only, expect errors in **`app/page.tsx`** (and any other consumers of old fields) until FE-TICKET-002.
- To get a **green** full-repo `tsc`, ship **FE-TICKET-002** in the same merge train or immediately after FE-TICKET-001.
- The repository may already report **unrelated** TypeScript errors in other files; fix those on a separate change if they block CI, or scope verification to `lib/api` via review until the tree is clean.

---

## Performance Considerations

- None beyond O(n) array copies only if normalization allocates new arrays (acceptable for batch sizes enforced by backend `max_batch_size`).

## Migration Notes

- **Runtime**: Backend already returns the multiclass shape; the old frontend types were stale relative to production API.
- **Git**: Frontend and backend are separate repositories; pin backend `app/schemas.py` revision when verifying field-for-field parity.

## References

- Ticket: `cursor/project/tickets/FE-TICKET-001-multiclass-api-types-and-client.md`
- Backend schema: `job-sentry-backend/app/schemas.py` (`PredictResponse`, `HealthResponse`)
- Prior research: `cursor/project/research/2026-04-20-FE-TICKET-001-multiclass-api-types-and-client.md`

## Sync note

- `humanlayer thoughts sync` was not available in the environment used to author this plan; run it locally if your workflow requires indexing this file in **humanlayer**.
