# FE-TICKET-003: API contract documentation — Implementation Plan

## Overview

Bring **`cursor/project/docs/frontend-api-endpoints.md`** in line with the **multiclass** Job Sentry backend API: update the **`GET /`** version sample, **`GET /health`** (including **`artifact_path` nullability** and degraded shape), and **`POST /predict`** success response (replace obsolete binary fields with parallel multiclass arrays and document **`confidence`** semantics). No application code changes.

## Current State Analysis

- **`cursor/project/docs/frontend-api-endpoints.md`** still documents:
  - **`GET /`**: `"version": "0.2.0"` while the backend serves **`SERVICE_VERSION = "0.3.0"`** in `job-sentry-backend/app/main.py` ([`SERVICE_VERSION`](https://github.com/Retchizu/job-sentry-backend/blob/main/app/main.py) at lines 20–21 in local tree).
  - **`GET /health`**: example shows only the “healthy” path with a string **`artifact_path`**; it does not document **`null`** when no artifact applies (degraded / no model).
  - **`POST /predict`**: success example uses **`scam_probabilities`**, **`predicted_scam`**, **`threshold`** — fields the backend **`PredictResponse`** no longer returns (`job-sentry-backend/app/schemas.py`).
- **Frontend types** (`job-sentry-frontend/lib/api/types.ts`) already match the backend multiclass contract (`predicted_class`, `predicted_label`, three probability arrays, `confidence`, `warnings`; `HealthResponse.artifact_path` is `string | null`). Use this file as the **naming and semantics** reference when editing the markdown.
- **Terminology alignment**: If **FE-TICKET-002** is merged, UI copy uses **legit / warning / fraud**; the doc should use the same labels in prose and in the example **`predicted_label`** values.

### Key Discoveries

- **`confidence`** (per post): backend `Field` description in `app/schemas.py` states it is **`max(legit_probability, warning_probability, fraud_probability)`** for that post (winner probability). The doc must state this explicitly to satisfy the ticket.
- **`artifact_path`**: when **`model_loaded`** is false (degraded), the backend returns **`artifact_path: null`** and **`mode: "none"`** (`app/main.py` `health()`).
- **Request section** of `frontend-api-endpoints.md` (posts, rate rules, example request) still matches the backend **`PredictRequest`** / **`JobPostInput`** model; **no change required** unless a separate audit finds drift (out of scope unless discovered during edit).

## Desired End State

- **`frontend-api-endpoints.md`** is the single internal reference for frontend developers and:
  - Uses **valid JSON** in every fenced block (paste-checkable in a JSON validator).
  - Documents **only** response fields the backend actually returns for **`/`**, **`/health`**, and **`/predict`** success paths.
  - States **`confidence`** as the **maximum of the three class probabilities** per post, consistent with **`app/schemas.py`**.
  - Shows **`"version": "0.3.0"`** in the **`GET /`** example (or the current `SERVICE_VERSION` if it differs at implementation time—verify against `app/main.py` **`SERVICE_VERSION`**).
  - Explains that **`artifact_path`** may be **`null`** (e.g. when the model is not loaded / degraded health).
- Optional **one-line** pointer to **`job-sentry-backend` `app/schemas.py`** (and/or a backend ticket) per ticket scope.

### Verification

- **Acceptance (from ticket)**: examples paste cleanly into JSON validators; no documented fields that the backend no longer returns.

## What We're NOT Doing

- **No** edits to **`lib/api/*`**, **`app/page.tsx`**, or any runtime code (this ticket is **docs-only**).
- **No** OpenAPI spec generation or auto-sync pipeline in this ticket.
- **No** broad rewrite of unrelated project docs beyond **`frontend-api-endpoints.md`**.
- **No** backend changes.

## Implementation Approach

1. **Confirm version string**: Read `SERVICE_VERSION` in `job-sentry-backend/app/main.py` at implementation time; set the **`GET /`** JSON example accordingly.
2. **Health section**: Keep a **healthy** example; add **notes** and optionally a **second** fenced JSON example for **degraded** health showing **`artifact_path: null`**, **`model_loaded: false`**, **`status: "degraded"`**, and **`message`** as a string (truncate or paraphrase the real message if needed—must remain valid JSON). Ensure prose states **`artifact_path`** may be **`null`** when the model is not loaded.
3. **Predict success section**: Replace the binary response block with a **multiclass** example for **one post** including:
   - `predicted_class`, `predicted_label`
   - `legit_probability`, `warning_probability`, `fraud_probability`, `confidence`
   - `warnings`
   - Use **numeric values** where the three probabilities read as a plausible softmax triple (approximately sum to **1.0**) and **`confidence`** equals the **max** of those three for that index (e.g. `[0.62]` if max is 0.62).
4. **Notes under predict**: Replace binary-era bullets with:
   - Parallel arrays, **one index per post**, same order as **`posts`**.
   - **`predicted_class`**: **0 = legit**, **1 = warning**, **2 = fraud** (align with `lib/api/types.ts` JSDoc and backend).
   - **`predicted_label`**: **`"legit"`**, **`"warning"`**, or **`"fraud"`** per post.
   - **`confidence`**: maximum of the three softmax probabilities for that post.
   - Keep **`warnings`** semantics and known code list **unless** the backend list changed (verify against `job-sentry-backend` if unsure).
5. **Optional cross-link**: One line at end of doc or under predict: e.g. canonical models live in **`job-sentry-backend`** **`app/schemas.py`**.

## Phase 1: Update `frontend-api-endpoints.md`

### Overview

Apply all markdown edits in **`cursor/project/docs/frontend-api-endpoints.md`** in one focused change.

### Changes Required

**File**: `cursor/project/docs/frontend-api-endpoints.md`

#### 1) Service Info (`GET /`)

- In the **`Response (200)`** JSON example, set **`"version"`** to **`"0.3.0"`** (or current `SERVICE_VERSION` from `app/main.py`).

#### 2) Health Check (`GET /health`)

- Extend **Notes** (or add a bullet list) to state that **`artifact_path`** may be **`null`** when no model artifact is loaded / degraded path.
- Optionally add a **second** ```json``` block showing **degraded** response with **`artifact_path": null`**, consistent with `health()` in `app/main.py`.

#### 3) Scam Prediction (`POST /predict`) — Response (`200`)

- Replace the entire success JSON example: remove **`scam_probabilities`**, **`predicted_scam`**, **`threshold`**.
- Add multiclass fields with **parallel arrays** (single-post example is enough):

```json
{
  "predicted_class": [1],
  "predicted_label": ["warning"],
  "legit_probability": [0.15],
  "warning_probability": [0.62],
  "fraud_probability": [0.23],
  "confidence": [0.62],
  "warnings": [["upfront_payment", "off_platform_contact"]]
}
```

- Adjust numbers if desired; keep **`confidence[0]` === max(`legit_probability[0]`, `warning_probability[0]`, `fraud_probability[0]`)**.

#### 4) Notes under Predict

- Document **`confidence`** as **max of the three class probabilities** per post (match backend wording).
- Document class indices and label strings as above.
- Preserve **`warnings`** per-post ordering; keep known codes list aligned with current backend/heuristics.

#### 5) Optional one-line reference

- e.g. *Response models: [`app/schemas.py`](https://github.com/Retchizu/job-sentry-backend/blob/main/app/schemas.py)* in the **job-sentry-backend** repo (use the repo URL your team prefers; relative path alone is acceptable for monorepo consumers if both repos are checked out side by side).

### Success Criteria

#### Automated Verification

- [x] `git diff` touches **only** `cursor/project/docs/frontend-api-endpoints.md` (no accidental edits elsewhere). *(Workspace may not be a git repo; deliverable is single-file.)*
- [x] All fenced `json` code blocks parse with `json.loads` (validated locally).

#### Manual Verification

- [ ] Paste each **```json```** block from the updated doc into a JSON validator; all parse with **no trailing commas** and **double-quoted keys**.
- [ ] Field names on **`POST /predict`** success match **`PredictResponse`** in `job-sentry-backend/app/schemas.py` and **`lib/api/types.ts`** **field-for-field** (no binary fields remain).
- [ ] **`GET /`** version string matches **`SERVICE_VERSION`** in `job-sentry-backend/app/main.py`.
- [ ] **`GET /health`** text explains **`artifact_path`** **null** when appropriate; degraded example (if present) matches backend behavior.
- [ ] If **FE-TICKET-002** is in main: wording (**legit** / **warning** / **fraud**) is consistent with the app.

**Implementation note**: This phase is complete when the ticket **Acceptance Criteria** are satisfied and the diff is limited to the single deliverable file.

---

## Testing Strategy

### Automated

- Not applicable beyond **`git diff`** scope check (no unit tests for markdown).

### Manual

1. Open **`frontend-api-endpoints.md`** and copy each JSON example into [jsonlint.com](https://jsonlint.com/) or `python -m json.tool` / `jq .` from a pasted temp file.
2. With backend running locally, optional spot-check: **`curl -s http://127.0.0.1:8000/`** and **`curl -s http://127.0.0.1:8000/health`** and compare keys to the doc (shape, not necessarily exact numbers/strings for **`message`**).

## Performance Considerations

None.

## Migration Notes

None. Documentation-only.

## References

- Ticket: `cursor/project/tickets/FE-TICKET-003-api-contract-documentation.md`
- Related tickets: `cursor/project/tickets/FE-TICKET-001-multiclass-api-types-and-client.md`, `cursor/project/tickets/FE-TICKET-002-result-views-three-class-routing.md`
- Research: `cursor/project/research/2026-04-20-FE-TICKET-003-api-contract-documentation.md`
- Frontend types (naming reference): `lib/api/types.ts`
- Backend: `job-sentry-backend/app/schemas.py`, `job-sentry-backend/app/main.py` (`SERVICE_VERSION`, `health`, `predict`)
