# FE-TICKET-001: Multiclass API types and client

## Objective

Align TypeScript types and the `/predict` client with the backend multiclass response (no binary `scam_probabilities` / `predicted_scam` / `threshold`).

## Scope

- Update `PredictResponse` in `lib/api/types.ts` to match backend `PredictResponse`:
  - `predicted_class: number[]` (0 = legit, 1 = warning, 2 = fraud)
  - `predicted_label: string[]` (`"legit" | "warning" | "fraud"` per post)
  - `legit_probability`, `warning_probability`, `fraud_probability`, `confidence` (each `number[]`, one per post)
  - `warnings: string[][]` (unchanged semantics)
- Remove obsolete fields: `scam_probabilities`, `predicted_scam`, `threshold`.
- Widen `HealthResponse.artifact_path` to `string | null` when `model_loaded` is false (matches degraded health).
- In `lib/api/jobSentry.ts`, ensure `predictScam` (or renamed export) parses the JSON body and normalizes optional arrays if the server ever omits a field (same pattern as current `warnings` fallback).
- Re-export updated types from `lib/api/index.ts` as needed.

## Acceptance Criteria

- `PredictResponse` matches `app/schemas.py` field-for-field.
- No remaining references in `lib/api` to removed binary fields.
- Typecheck passes for the API module.

## Out of scope

- Changes to `app/page.tsx` (covered by FE-TICKET-002).

## Deliverables

- Updated `lib/api/types.ts`, `lib/api/jobSentry.ts`, and exports.
