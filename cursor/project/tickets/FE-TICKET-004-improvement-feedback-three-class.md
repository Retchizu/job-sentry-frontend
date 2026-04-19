# FE-TICKET-004: Improvement feedback and three-class labels (optional)

**Status (2026-04-20):** Implemented per [product decision](FE-TICKET-004-product-decision.md) and [implementation plan](../plan/2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md) (`labeled_risk` → `user_risk_class` + derived `fraudulent`; backend merge prefers `user_risk_class` for `risk_class`).

## Objective

Align the improvement / feedback flow with backend **TICKET-001** three-class targets if labeled data is used for retraining or evaluation.

## Scope

- Review `ImprovementFeedbackRequest` (`labeled_scam: boolean`) and the improvement page (`app/improvement/page.tsx`, server actions).
- Design a minimal extension: e.g. `labeled_risk: "legit" | "warning" | "fraud"` or three radio buttons, with migration path for existing boolean data if stored in Supabase.
- Update any seed scripts or JSON fixtures that assume binary labels only if this ticket is in scope.

## Acceptance Criteria

- Product decision recorded: whether user-supplied labels must be 3-class or binary is still acceptable for v1.
- If implemented: feedback payload and storage match the chosen schema; no broken improvement flow.

## Dependencies

- **FE-TICKET-002** recommended (consistent terminology in app).
- Coordination with backend/dataset schema for `job_postings` or equivalent.

## Deliverables

- Schema + UI + persistence changes as agreed; or a short “deferred” note in this folder if not pursued.
