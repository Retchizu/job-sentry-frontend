# Frontend API Service for Job Sentry Endpoints Implementation Plan

## Overview

Build a typed frontend API service layer for the backend endpoints documented in `cursor/project/docs/frontend-api-endpoints.md`, then wire the existing `app/page.tsx` UI to submit data to `/predict` and render result/error states.

## Current State Analysis

The frontend currently has a single client page with form-like UI and no API integration. There is no shared service module, no runtime payload validation for requests, and no consistent request error normalization.

## Desired End State

The frontend has a reusable `lib/api` service with typed request/response contracts for `/`, `/health`, and `/predict`, plus client-side validation for `/predict` payload rules from the spec. `app/page.tsx` consumes this service to execute scam analysis and present loading, success, and error states.

### Key Discoveries:
- Existing UI is local-state only and has no network calls, so API integration must be introduced cleanly without breaking current styling in `app/page.tsx`.
- The project already supports alias imports through `@/*`, so service modules should be imported as `@/lib/...` from `tsconfig.json`.
- Strict TypeScript is enabled, so endpoint contracts should be explicit and centrally typed to avoid implicit `any` and brittle UI logic in `tsconfig.json`.
- Next.js config is minimal and does not currently define rewrites/proxy behavior for backend traffic in `next.config.ts`.
- API contract includes strict `/predict` validation and known status behaviors (`422`, `503`) in `cursor/project/docs/frontend-api-endpoints.md`.

## What We're NOT Doing

- Building authentication/session handling.
- Adding a third-party HTTP library (e.g. Axios) for this iteration.
- Creating a backend proxy route in this phase unless required by CORS/runtime constraints.
- Implementing batch prediction UX for multiple posts in one submission (single-post UI flow only).
- Adding a full schema validation dependency (e.g. Zod) in this first pass.

## Implementation Approach

Use a small typed `fetch` wrapper and endpoint module approach:
- Keep transport fields aligned with backend snake_case schema.
- Add lightweight runtime validators for the `/predict` request rules before sending network traffic.
- Normalize API/network errors into a shared `ApiError` shape.
- Keep page-level logic thin by delegating request construction and validation into `lib/api`.

## Phase 1: Create Typed API Foundation

### Overview
Create reusable API modules for base URL resolution, HTTP execution, and endpoint contract typing.

### Changes Required:

#### 1. API Types and Contracts
**File**: `lib/api/types.ts`  
**Changes**:
- Add interfaces/types for:
  - `ServiceInfoResponse`
  - `HealthResponse`
  - `PredictRateType`, `PredictRate`
  - `PredictPost`, `PredictRequest`
  - `PredictResponse`
  - `ApiError` (status/code/message/details)
- Keep field names matching backend schema (`job_title`, `scam_probabilities`, etc.).

```ts
export interface PredictRequest {
  posts: PredictPost[];
}
```

#### 2. Base URL and HTTP Client
**File**: `lib/api/http.ts`  
**Changes**:
- Add `getApiBaseUrl()` with precedence:
  1. `NEXT_PUBLIC_API_BASE_URL` when defined
  2. fallback to `http://127.0.0.1:8000`
- Add generic `requestJson<T>()` wrapper around `fetch`:
  - JSON headers
  - optional body
  - parse error response JSON/text
  - throw normalized `ApiError` on non-2xx or network failures.

```ts
export async function requestJson<T>(path: string, init?: RequestInit): Promise<T>
```

#### 3. Endpoint Service Module
**File**: `lib/api/jobSentry.ts`  
**Changes**:
- Add typed service functions:
  - `getServiceInfo()`
  - `getHealth()`
  - `predictScam(payload: PredictRequest)`
- Route all network calls through `requestJson<T>()`.

```ts
export function predictScam(payload: PredictRequest) {
  return requestJson<PredictResponse>("/predict", { method: "POST", body: JSON.stringify(payload) });
}
```

#### 4. Barrel Exports
**File**: `lib/api/index.ts`  
**Changes**:
- Re-export public service functions and shared types for stable imports.

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `npm run build`
- [x] Linting passes for new modules: `npm run lint`
- [x] API modules compile with strict TS and no implicit `any`.

#### Manual Verification:
- [ ] API base URL can be changed via `NEXT_PUBLIC_API_BASE_URL` without code edits.
- [ ] Calling `getServiceInfo()` and `getHealth()` in dev console returns typed data.
- [ ] Network failures produce clear, normalized user-displayable errors.

**Implementation Note**: After this phase, pause for human confirmation that local environment base URL setup and basic service calls are working as expected.

---

## Phase 2: Add Predict Request Validation Layer

### Overview
Enforce endpoint request rules on the frontend before network submission to reduce avoidable `422` responses.

### Changes Required:

#### 1. Validation Utilities
**File**: `lib/api/validation.ts`  
**Changes**:
- Add `validatePredictRequest(payload)` with checks mirroring documented rules:
  - `posts.length >= 1`
  - per post: either non-empty `text` OR at least one structured field
  - `rate.amount_min >= 0`, `rate.amount_max >= 0`
  - `amount_min <= amount_max`
  - `currency` matches `^[A-Z]{3}$`
  - `type` is one of `hourly|daily|weekly|monthly|yearly`
- Throw or return structured validation errors using `ApiError`-compatible shape.

```ts
export function validatePredictRequest(payload: PredictRequest): void
```

#### 2. Integrate Validation in Service
**File**: `lib/api/jobSentry.ts`  
**Changes**:
- Run `validatePredictRequest(payload)` before POSTing to `/predict`.
- Keep network behavior unchanged for valid inputs.

### Success Criteria:

#### Automated Verification:
- [ ] Linting passes: `npm run lint`
- [ ] Build passes with validator integration: `npm run build`
- [ ] Validation unit-like checks (if added as pure-function tests) pass.

#### Manual Verification:
- [ ] Empty payload submission shows validation error before network request.
- [ ] Invalid currency (e.g. `usd`) is rejected client-side.
- [ ] Invalid range (`amount_min > amount_max`) is rejected client-side.
- [ ] Valid payload proceeds to backend request.

**Implementation Note**: After this phase, pause for human confirmation that client-side validation messages and behavior are acceptable before UI wiring refinements.

---

## Phase 3: Integrate API Service into Page UI

### Overview
Connect `app/page.tsx` form fields to typed state, call `predictScam`, and render response data and failures.

### Changes Required:

#### 1. Introduce Form State and Submission Logic
**File**: `app/page.tsx`  
**Changes**:
- Add controlled state for job fields and optional compensation fields.
- Add submit handler to construct `PredictRequest` payload and call `predictScam`.
- Add `isSubmitting`, `result`, and `error` state.
- Disable submit button while request is in flight.

```tsx
const [isSubmitting, setIsSubmitting] = useState(false);
const [result, setResult] = useState<PredictResponse | null>(null);
```

#### 2. Render Output and Error Feedback
**File**: `app/page.tsx`  
**Changes**:
- Show probability + boolean prediction after successful response.
- Show distinct messaging for:
  - client validation failures
  - backend `422`
  - backend `503`
  - general/network errors
- Preserve current visual style and dark mode behavior.

#### 3. Optional Basic Service/Health UX Hook
**File**: `app/page.tsx` (or a small helper module)  
**Changes**:
- Optionally call `getHealth()` on initial load to surface backend readiness in UI (non-blocking).
- If backend unavailable, still allow user to input data and display actionable error on submit.

### Success Criteria:

#### Automated Verification:
- [ ] App builds successfully: `npm run build`
- [ ] Linting passes after state/event handler additions: `npm run lint`
- [ ] No TypeScript errors from new form/service imports.

#### Manual Verification:
- [ ] Submitting a valid job post returns and displays prediction values.
- [ ] `Validate & Analyze` button shows loading state and prevents duplicate submits.
- [ ] Known invalid inputs surface helpful client-side errors.
- [ ] Backend unavailable (`503`) displays clear recovery guidance.
- [ ] Dark mode toggle continues to work with new interaction states.

**Implementation Note**: After this phase and successful automated checks, pause for human sign-off on manual UX behavior before any additional refactors.

---

## Testing Strategy

### Unit Tests:
- Validate request-rule helper behavior for:
  - empty posts
  - missing required content fields
  - invalid currency / invalid rate type
  - invalid numeric ranges
- Validate HTTP error normalizer for JSON and non-JSON error bodies.

### Integration Tests:
- Service-level call tests (mocked `fetch`) for `/`, `/health`, `/predict` success and error paths.
- UI submit flow test with mocked `predictScam` result and failure cases.

### Manual Testing Steps:
1. Configure `NEXT_PUBLIC_API_BASE_URL` and run `npm run dev`.
2. Submit minimal valid payload (e.g. `job_title` + `job_desc`) and confirm result rendering.
3. Submit invalid payload and confirm client-side validation blocks request.
4. Simulate backend-down/model-not-loaded scenarios and confirm error messaging.
5. Verify all interaction states in both light and dark mode.

## Performance Considerations

- Keep submission flow single-request and avoid redundant health checks on every render.
- Memoize or isolate expensive transformations only if profiling shows need.
- Avoid rerender churn by grouping related state updates in submit lifecycle.

## Migration Notes

- No data migration required.
- Deployment should include setting `NEXT_PUBLIC_API_BASE_URL` for non-local environments.
- If CORS issues appear in production, evaluate adding Next route handlers as a proxy in a separate scoped plan.

## References

- Endpoint contract: `cursor/project/docs/frontend-api-endpoints.md`
- Current UI integration target: `app/page.tsx`
- Path alias configuration: `tsconfig.json`
- Runtime/build configuration: `next.config.ts`
