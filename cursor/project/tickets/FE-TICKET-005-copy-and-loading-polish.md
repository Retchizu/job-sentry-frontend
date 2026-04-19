# FE-TICKET-005: Copy and loading polish (optional)

## Objective

Tune user-facing strings and loading experience for multiclass rollout (**TICKET-006** migration tone on the backend side).

## Scope

- **`app/page.tsx`** (and related): loading spinner messages (`LOADING_STATUS_MESSAGES`, `LOADING_TIP_LINES`) — reference risk tiers (e.g. fraud vs warning) where it improves clarity without alarming users.
- Main hero copy (“Job Post Scam Check”) — optional rename or subtitle if product prefers “risk” or “safety” framing.
- Result screen headings (“High Risk Detected” vs fraud-specific vs warning-specific) — align with **FE-TICKET-002** if not already done there; this ticket is for editorial pass only.

## Acceptance Criteria

- Copy is consistent with three-class behavior (no implication that only binary scam exists unless intentional).
- No required functional changes; text-only unless a tiny label tweak needs a constant rename.

## Dependencies

- **FE-TICKET-002** complete preferred.

## Deliverables

- String updates only (no API contract changes).
