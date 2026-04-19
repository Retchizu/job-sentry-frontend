# FE-TICKET-004 Product decision — closure and verification

## Overview

[`FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md) is the authoritative record that v1 improvement feedback uses **three-class** reviewer labels (**legit / warning / fraud** → indices **0 / 1 / 2**), persisted as **`user_risk_class`** with derived binary **`fraudulent`**, and that training merge prefers **`user_risk_class`** for **`risk_class`**. This document is a **closure plan** for that ticket: confirm the artifact, obtain stakeholder acknowledgment, update statuses, and align cross-references. It does **not** replace the technical roadmap in [`2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md`](2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md); that plan remains the detailed implementation reference.

## Current State Analysis

- **Decision file**: [`FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md) exists and states storage, derivation, legacy backfill rules, and backend merge preference. Status: **Agreed for implementation planning**.
- **Implementation (codebase)**: Types use **`labeled_risk: ReviewerRiskLabel`**, **`reviewerRiskLabelToStorage`** maps to **`user_risk_class`** and **`fraudulent`**, improvement UI exposes three radios, server action and insert persist both columns, migration **`20260420120000_job_postings_user_risk_class.sql`** adds **`user_risk_class`** with backfill, and **`job-sentry-backend/datasets_row_merge.py`** **`derive_labels`** prefers valid **`user_risk_class`** for **`risk_class`**. No remaining **`labeled_scam`** references under **`job-sentry-frontend`** `*.ts` / `*.tsx` / `*.json` at plan time.
- **Generated Supabase types**: `package.json` defines `supabase:types` / `supabase:types:linked` targeting `lib/supabase/database.types.ts`; that file may be absent until the team runs codegen against a database that has applied the migration.
- **Implementation plan doc drift**: [`2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md`](2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md) “Current State Analysis” still describes **`labeled_scam`** and two radios; that section is stale relative to the repository.

### Key Discoveries

- The **product decision** ticket’s remaining explicit gap is **process**: Phase 0 of the technical plan lists **stakeholder acknowledgment** as manual verification (unchecked).
- **FE-TICKET-004** (improvement feedback) companion ticket already points at the product decision and implementation plan as implemented; the **product-decision** ticket status can move forward independently once acknowledgment is recorded.

## Desired End State

- Stakeholders have **explicitly acknowledged** that the decision in [`FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md) matches product intent (same bullets: three-class v1, `user_risk_class`, derived `fraudulent`, legacy mapping, warnings JSON separate, backend precedence).
- [`FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md) **Status** reflects closure (for example **Accepted** or **Closed**), with optional one-line **Acknowledged by / date** if the team tracks sign-off in-repo.
- Cross-links remain valid: decision → implementation plan; optional refresh of the implementation plan’s **Current State Analysis** so future readers are not misled by binary-era wording.

## What We're NOT Doing

- Re-scoping or re-debating the three-class vs binary product choice (already locked in the decision file).
- Re-implementing the improvement flow, migration, or backend merge (covered by the existing technical plan and current code).
- Expanding [`frontend-api-endpoints.md`](../docs/frontend-api-endpoints.md) unless a separate ticket (for example FE-TICKET-003 scope) requires improvement-storage documentation.

## Implementation Approach

1. Validate the decision document against the live schema and mapping (read-only checklist).
2. Run the minimum automated checks that apply to the touched surface (`tsc`, targeted backend tests if backend checkout is part of release verification).
3. Capture stakeholder acknowledgment and update the product-decision ticket file status.
4. Optionally patch the stale “Current State Analysis” in the FE-TICKET-004 implementation plan so it describes **`labeled_risk`** / **`user_risk_class`** as implemented.

---

## Phase 1: Decision completeness and code alignment (read-only audit)

### Overview

Confirm that [`FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md) matches what the code and migration actually do, so sign-off is defensible.

### Changes Required

#### 1. Checklist (no code changes required if audit passes)

**Reviewer actions:**

- [x] Open [`lib/api/types.ts`](../../lib/api/types.ts) — verify **`reviewerRiskLabelToStorage`** sets **`fraudulent === 1`** only for **`"fraud"`** and **`user_risk_class`** **0 / 1 / 2** as in the decision.
- [x] Open [`supabase/migrations/20260420120000_job_postings_user_risk_class.sql`](../../supabase/migrations/20260420120000_job_postings_user_risk_class.sql) — verify backfill is **0** vs **2** from legacy **`fraudulent`** only.
- [x] Open [`job-sentry-backend/datasets_row_merge.py`](../../../../job-sentry-backend/datasets_row_merge.py) **`derive_labels`** — verify **`risk_class`** uses valid **`user_risk_class`** when present, else legacy **`fraudulent`** + **`warnings`** heuristics.

### Success Criteria

#### Automated Verification

- [x] `cd job-sentry-frontend && npx tsc --noEmit` passes.
- [x] `cd job-sentry-backend && pytest tests/test_row_merge.py` passes (confirms FE-TICKET-004 merge behavior including **`user_risk_class`** precedence).

#### Manual Verification

- [ ] Audit checklist above completed with no contradictions to the decision bullets.

**Implementation note**: If the audit finds a contradiction, stop and fix the **code or the decision doc** in a follow-up change before closing the product-decision ticket.

---

## Phase 2: Stakeholder acknowledgment and ticket status

### Overview

Satisfy the open manual criterion from Phase 0 of the technical plan: **stakeholder acknowledges the decision matches product intent**.

### Changes Required

#### 1. Product-decision markdown — status (and optional acknowledgment line)

**File**: [`cursor/project/tickets/FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md)

**Changes**: After acknowledgment:

- Set **Status** from **Agreed for implementation planning** to the team’s preferred terminal state (**Accepted** / **Closed**).
- Optionally append a short line under **Reference** or **Decision**, for example: **Acknowledged:** \<name\>, \<date\> (only if the team keeps sign-off in this file).

### Success Criteria

#### Automated Verification

- [ ] N/A (markdown-only).

#### Manual Verification

- [ ] Named stakeholder(s) confirm the four decision bullets (three-class v1, `user_risk_class` + derived `fraudulent`, legacy backfill, warnings JSON separate, backend preference).
- [ ] Status updated in [`FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md).

---

## Phase 3 (optional): Refresh FE-TICKET-004 implementation plan “Current State Analysis”

### Overview

[`2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md`](2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md) still describes **`labeled_scam`** in its historical “Current State Analysis” section. Replacing that subsection with a short **“Implemented state (as of …)”** summary avoids confusion for anyone using the plan as onboarding.

### Changes Required

#### 1. Implementation plan doc — replace stale binary-era bullets

**File**: [`cursor/project/plan/2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md`](2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md)

**Changes**: Edit **Current State Analysis** (and line-number references if cited) to describe **`labeled_risk`**, **`user_risk_class`**, three radios, and **`derive_labels`** precedence as implemented, or add a prominent note that the section is **superseded** with a pointer to [`FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md) and this closure plan.

- [x] **Current State Analysis** and **Key Discoveries** updated to **implemented state** (2026-04-20), with links to the product-decision ticket and this closure plan.

### Success Criteria

#### Automated Verification

- [x] N/A.

#### Manual Verification

- [ ] A reader opening the implementation plan no longer infers the app is still binary-only for improvement feedback.

---

## Phase 4 (optional): Regenerate Supabase TypeScript types

### Overview

If the team relies on `lib/supabase/database.types.ts` for inserts or Row types, generate it after the **`user_risk_class`** migration is applied to the target database.

### Changes Required

#### 1. Run Supabase codegen

**Commands** (from `job-sentry-frontend`, after migration is applied):

- Local: `npm run supabase:types`
- Or linked project: `npm run supabase:types:linked`

**File produced**: `lib/supabase/database.types.ts`

**Implementation note (2026-04-20):** `npm run supabase:types` failed here because Docker was not available (`Cannot connect to the Docker daemon`). Run locally when Docker Desktop (or linked Supabase) is available, then re-run `tsc`.

### Success Criteria

#### Automated Verification

- [ ] `npx tsc --noEmit` passes with the new types file present.
- [ ] No new type errors in `lib/supabase/` or `insert-job-posting.ts` if those files are wired to generated types.

#### Manual Verification

- [ ] Generated types include **`user_risk_class`** on `job_postings` Row/Insert as expected.

---

## Testing Strategy

### Automated

- Frontend: `npx tsc --noEmit` in `job-sentry-frontend`.
- Backend: `pytest tests/test_row_merge.py` in `job-sentry-backend` when verifying merge behavior as part of closure.

### Manual

- Stakeholder sign-off conversation or written approval captured per Phase 2.

## Performance Considerations

- None for this closure-only ticket.

## Migration Notes

- Product decision does not introduce new migrations; Phase 4 assumes the existing **`20260420120000_job_postings_user_risk_class.sql`** migration is already applied in environments where types are generated.

## References

- Product decision: [`cursor/project/tickets/FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md)
- Technical implementation plan: [`cursor/project/plan/2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md`](2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md)
- Related research: [`cursor/project/research/2026-04-20-FE-TICKET-004-product-decision.md`](../research/2026-04-20-FE-TICKET-004-product-decision.md)
- Companion ticket: [`cursor/project/tickets/FE-TICKET-004-improvement-feedback-three-class.md`](../tickets/FE-TICKET-004-improvement-feedback-three-class.md)
- Dependencies for terminology alignment: [`FE-TICKET-001`](../tickets/FE-TICKET-001-multiclass-api-types-and-client.md), [`FE-TICKET-002`](../tickets/FE-TICKET-002-result-views-three-class-routing.md), [`FE-TICKET-003`](../tickets/FE-TICKET-003-api-contract-documentation.md)

## Sync note

If your team uses HumanLayer indexing, run **`humanlayer thoughts sync`** locally after adding or editing plans under `cursor/project/plan/` so they are indexed.
