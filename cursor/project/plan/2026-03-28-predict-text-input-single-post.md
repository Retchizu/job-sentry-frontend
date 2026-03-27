# `/predict` Single-Post Text Input Integration Plan

## Overview

Integrate the existing frontend UI in `app/page.tsx` with the `/predict` endpoint so clicking `Validate & Analyze` submits exactly one post payload (`posts[0]`) using the current text input flow.

## Current State Analysis

- The typed API client exists in `lib/api` and already includes `predictScam(payload)` for `POST /predict`.
- The page UI has input fields but they are currently uncontrolled and not connected to submit logic.
- The submit button has no click handler, loading state, validation state, or result rendering.
- API contract rules require either non-empty `text` or at least one structured field per post.

## Desired End State

`app/page.tsx` sends a single-post `PredictRequest` to `/predict` on user action, validates input before request, and renders loading/success/error feedback. The payload shape is always:

```json
{
  "posts": [
    {
      "...": "..."
    }
  ]
}
```

No multi-post UI or batch submit behavior is introduced.

### Key Discoveries

- `predictScam(payload)` is already implemented in `lib/api/jobSentry.ts`.
- `PredictRequest` in `lib/api/types.ts` is `posts: PredictPost[]`, so single-post support is naturally represented as index `0`.
- `app/page.tsx` currently has only `isDarkMode` state, so form and async state must be added.
- Endpoint validation constraints are documented in `cursor/project/docs/frontend-api-endpoints.md`.

## What We're NOT Doing

- Multi-post/batch prediction (no dynamic rows, no arrays beyond index `0`).
- New backend endpoints or contract changes.
- Adding new HTTP libraries or schema validation dependencies.
- Building historical result storage or analytics in this iteration.

## Implementation Approach

Use a single page-level form state object and map it to one `PredictPost`. On submit:
1. Build one post object from input fields.
2. Validate the single-post payload against known `/predict` rules.
3. Call `predictScam({ posts: [post] })`.
4. Render success/error feedback inline.

## Phase 1: Wire Single-Post Form State and Submission

### Overview

Convert current inputs to controlled fields and connect the button to one `/predict` request.

### Changes Required

#### 1. Add Controlled State in Page
**File**: `app/page.tsx`  
**Changes**:
- Add state for user inputs (full text + existing structured fields).
- Add async UI state:
  - `isSubmitting`
  - `submitError`
  - `predictionResult`
- Keep `isDarkMode` behavior unchanged.

#### 2. Update `Field` Component Usage
**File**: `app/page.tsx`  
**Changes**:
- Extend `Field` props to accept `value` and `onChange`.
- Keep visual styling intact.
- Bind all existing text inputs and textareas to state.

#### 3. Add Submit Handler
**File**: `app/page.tsx`  
**Changes**:
- Implement `handleAnalyze`.
- Build one `PredictPost` object.
- Submit as `predictScam({ posts: [post] })` (single post only).
- Disable button while in flight to prevent duplicate requests.

### Success Criteria

#### Automated Verification
- [x] Type check passes: `npm run build`
- [x] Lint passes: `npm run lint`
- [x] No TypeScript errors in `app/page.tsx` from new handlers/props/state.

#### Manual Verification
- [ ] Clicking `Validate & Analyze` triggers exactly one `/predict` request.
- [ ] Request body always contains one-element `posts` array.
- [ ] Repeated fast clicks do not create duplicate submissions while loading.
- [ ] Dark mode toggle still works after form state additions.

**Implementation Note**: After this phase and automated checks, pause for human confirmation on submit behavior before extending feedback UX.

---

## Phase 2: Enforce Single-Post Input Validation Rules

### Overview

Add client-side checks to reduce avoidable backend `422` errors for the one-post flow.

### Changes Required

#### 1. Validate Content Presence
**File**: `app/page.tsx` (or `lib/api/validation.ts` if extracted)  
**Changes**:
- Require at least one of:
  - non-empty `text`, or
  - non-empty structured fields (`job_title`, `job_desc`, `skills_desc`, `company_profile`).

#### 2. Validate Optional Compensation
**File**: `app/page.tsx` (or `lib/api/validation.ts`)  
**Changes**:
- If any compensation field is provided, validate full `rate` object:
  - `amount_min >= 0`
  - `amount_max >= 0`
  - `amount_min <= amount_max`
  - `currency` is 3-letter uppercase code
  - `type` in allowed enum
- Show actionable validation messages before request.

### Success Criteria

#### Automated Verification
- [ ] Build passes with validation logic: `npm run build`
- [ ] Lint passes with validation branches/messages: `npm run lint`

#### Manual Verification
- [ ] Empty text + empty structured fields is blocked client-side.
- [ ] Invalid currency (e.g. `usd`) is blocked client-side.
- [ ] Invalid rate range (`amount_min > amount_max`) is blocked client-side.
- [ ] Valid single-post input proceeds to `/predict`.

**Implementation Note**: Pause for human sign-off on validation wording/UX before finalizing result presentation details.

---

## Phase 3: Render Prediction and Error Feedback

### Overview

Show clear response details and distinguish common failure modes.

### Changes Required

#### 1. Success Rendering
**File**: `app/page.tsx`  
**Changes**:
- Render `scam_probabilities[0]`, `predicted_scam[0]`, and threshold from `PredictResponse`.
- Ensure stale previous result clears on new submit.

#### 2. Error Rendering
**File**: `app/page.tsx`  
**Changes**:
- Show inline user-friendly messages for:
  - client validation failures
  - backend `422`
  - backend `503`
  - network/general failures
- Continue using normalized API error shape from `lib/api/http.ts`.

### Success Criteria

#### Automated Verification
- [ ] App compiles successfully: `npm run build`
- [ ] Linting passes for UI states and conditional rendering: `npm run lint`

#### Manual Verification
- [ ] Successful response displays index `0` prediction fields correctly.
- [ ] `422` and `503` scenarios show differentiated, understandable guidance.
- [ ] Network failure produces a clear retry-oriented error message.
- [ ] Starting a new request clears old error/result state appropriately.

**Implementation Note**: After this phase, pause for full human UX validation before any cleanup refactors.

---

## Testing Strategy

### Unit-Level Logic Checks
- Single-post payload builder excludes empty optional fields.
- Validation correctly blocks invalid content/rate combinations.
- Error-to-message mapper returns expected user-facing strings.

### Integration Checks
- Mocked `predictScam` success updates loading and result states.
- Mocked `predictScam` failure updates loading and error states.
- Button disabled state prevents double-submit races.

### Manual Testing Steps
1. Run `npm run dev` with backend available.
2. Enter only full text and submit; verify one `/predict` call and result rendering.
3. Enter only structured fields and submit; verify valid behavior.
4. Trigger validation failures and confirm request is not sent.
5. Simulate backend `503` and confirm recovery guidance.

## Performance Considerations

- Keep submission strictly single-request per click.
- Avoid heavy derived computations in render.
- Prevent duplicate in-flight requests with button disable and submit guard.

## Migration Notes

- No data or backend migration is required.
- Ensure `NEXT_PUBLIC_API_BASE_URL` is set appropriately per environment.

## References

- Research: `cursor/project/research/2026-03-28-api-endpoints-and-ui-input.md`
- Endpoint contract: `cursor/project/docs/frontend-api-endpoints.md`
- Existing API foundation: `lib/api/http.ts`, `lib/api/jobSentry.ts`, `lib/api/types.ts`, `lib/api/index.ts`
- Existing broad plan: `cursor/project/plan/2026-03-28-api-service-for-frontend-endpoints.md`
