# FE-TICKET-002: Result views and three-class routing

## Objective

Replace binary “high risk vs looks safe” branching with three outcomes driven by `predicted_label[0]` / `predicted_class[0]`, and surface multiclass confidence consistently with the backend contract.

## Scope

- **`app/page.tsx`**
  - Route results:
    - **fraud** (`predicted_class === 2` or `predicted_label === "fraud"`) — strongest alert (reuse/extend current high-risk visual tier).
    - **warning** — new intermediate screen (e.g. amber / “review carefully”) so warning is not lumped with fraud or legit.
    - **legit** — “looks safe” / green path.
  - Replace `scamConfidencePercent` / `safeConfidencePercent` logic with **`confidence[0]`** from the API (winner probability). Optionally show **all three probabilities** (e.g. compact bars or percentages) for transparency.
  - Keep heuristic `warnings[0]` display; wire it appropriately for each tier (especially warning + fraud).
- Extract small helpers if useful (e.g. `getPrimaryRiskLabel(result)`, `confidencePercent(result)`) without large refactors.
- Adjust titles/copy minimally so “scam-only” wording matches three-class behavior where needed.

## Acceptance Criteria

- No references to `predicted_scam`, `scam_probabilities`, or `threshold` in `app/page.tsx`.
- Three distinct result states render for mocked or live API responses covering legit, warning, and fraud.
- Confidence shown uses API `confidence` (and optional breakdown is consistent with softmax triples).

## Dependencies

- **FE-TICKET-001** merged (types and client).

## Deliverables

- Updated `app/page.tsx` (and any small shared components if split out in the same change).
