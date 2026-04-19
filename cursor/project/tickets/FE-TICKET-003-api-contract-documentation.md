# FE-TICKET-003: API contract documentation

## Objective

Update internal frontend API docs so they match the multiclass `POST /predict` and current health payload.

## Scope

- Edit `cursor/project/docs/frontend-api-endpoints.md`:
  - Replace binary `/predict` response example with multiclass fields (`predicted_class`, `predicted_label`, probabilities, `confidence`, `warnings`).
  - Document that `confidence` is the maximum of the three class probabilities (align with backend description).
  - Update service version example if the backend version string has changed (e.g. `0.3.0`).
  - Note `artifact_path` may be `null` when the model is not loaded.
- Cross-link to backend tickets or `app/schemas.py` only if helpful (one line).

## Acceptance Criteria

- Doc examples paste cleanly into JSON validators.
- No documented fields that the backend no longer returns.

## Dependencies

- **FE-TICKET-001** (and preferably **FE-TICKET-002** so UI terminology in docs matches implementation).

## Deliverables

- Updated `frontend-api-endpoints.md` only.
