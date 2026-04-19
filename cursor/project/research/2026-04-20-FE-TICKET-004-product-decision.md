---
date: 2026-04-20T06:01:28+08:00
researcher: Richmond Baltazar
git_commit: 3bd51b5463ee3dd73ea2c159653726a194a93458
branch: Riche
repository: job-sentry-frontend
topic: "FE-TICKET-004 product decision — three-class reviewer labels, storage, and training merge behavior"
tags: [research, codebase, FE-TICKET-004, user_risk_class, improvement-feedback, datasets_row_merge]
status: complete
last_updated: 2026-04-20
last_updated_by: Richmond Baltazar
metadata_note: "hack/spec_metadata.sh was not found in the workspace; git_commit, branch, and timestamps were gathered via git and date in job-sentry-frontend. The frontend working tree had uncommitted modifications at research time; findings describe files as present on disk. Backend citations use job-sentry-backend at commit 26c01727e996da4fcc64221713a2f75fad464f18 on branch main."
---

# Research: FE-TICKET-004 product decision — three-class reviewer labels, storage, and training merge behavior

**Date**: 2026-04-20T06:01:28+08:00  
**Researcher**: Richmond Baltazar  
**Git Commit (job-sentry-frontend)**: `3bd51b5463ee3dd73ea2c159653726a194a93458`  
**Branch (job-sentry-frontend)**: `Riche`  
**Repository**: `job-sentry-frontend` (cross-repo: `job-sentry-backend` where noted)

## Research Question

How does the codebase today reflect [`cursor/project/tickets/FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md): three-class reviewer labels (**legit / warning / fraud**, indices **0 / 1 / 2**), storage as **`user_risk_class`** on **`public.job_postings`**, binary **`fraudulent`** derived as **`1` iff `user_risk_class = 2`**, separation of heuristic **`warnings`** JSON from the reviewer tier, legacy backfill behavior, and backend **`datasets_row_merge.derive_labels`** / **`risk_class`** preference for **`user_risk_class`** when valid?

## Summary

The product decision is expressed in code across **`job-sentry-frontend`** (types, improvement UI and server action, Supabase insert helper, migration) and **`job-sentry-backend`** (row merge pipeline, tests, combine script). Reviewer input uses string labels **`"legit" | "warning" | "fraud"`** on **`ImprovementFeedbackRequest.labeled_risk`**, mapped to **`user_risk_class`** and derived **`fraudulent`** via **`reviewerRiskLabelToStorage`**. The migration adds **`user_risk_class`** with a check constraint and backfills legacy rows from **`fraudulent`** to **0** or **2** only. **`datasets_row_merge.derive_labels`** sets **`risk_class`** from valid **`user_risk_class`** when present; otherwise it uses legacy logic from **`fraudulent`** and parsed **`warnings`** flags. **`warning_label`** continues to come only from **`warnings`** JSON, independent of the reviewer’s three-class field.

## Detailed Findings

### Product decision artifact (ticket)

[`FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md) records: three-class v1 scope; **`user_risk_class`** `smallint` **`0|1|2`**; **`fraudulent`** kept as derived **`0|1`**; legacy rows backfilled to **0** or **2** only; heuristic warnings in **`warnings`** JSON separate from reviewer tier; backend merge prefers **`user_risk_class`** for training **`risk_class`** when present (references the implementation plan).

### Frontend API types and mapping

[`lib/api/types.ts`](../../../lib/api/types.ts) defines **`ReviewerRiskLabel`**, **`UserRiskClass`**, **`ImprovementFeedbackRequest.labeled_risk`**, and **`reviewerRiskLabelToStorage`**, which sets **`user_risk_class`** to **0**, **1**, or **2** and **`fraudulent`** to **1** only when the label is **`"fraud"`** (lines 82–104).

### Improvement server action

[`app/improvement/actions.ts`](../../../app/improvement/actions.ts) calls **`reviewerRiskLabelToStorage(payload.labeled_risk)`** and passes **`fraudulent`**, **`user_risk_class`**, and optional **`warnings`** JSON into **`insertJobPostingFromPost`** (lines 20–31).

### Supabase insert

[`lib/supabase/insert-job-posting.ts`](../../../lib/supabase/insert-job-posting.ts) **`insertJobPostingFromPost`** accepts **`user_risk_class: UserRiskClass`** and writes both **`fraudulent`** and **`user_risk_class`** on the inserted row (lines 28–55).

### Improvement page UI

[`app/improvement/page.tsx`](../../../app/improvement/page.tsx) uses state **`labeledRisk: ReviewerRiskLabel`** default **`"legit"`**, three radio options **Legit / Warning / Fraud**, submits **`labeled_risk: labeledRisk`** with the post and flags (lines 23–27, 39–72, 223–249), and resets **`labeledRisk`** to **`"legit"`** after a successful save (lines 82–83).

### Database migration

[`supabase/migrations/20260420120000_job_postings_user_risk_class.sql`](../../../supabase/migrations/20260420120000_job_postings_user_risk_class.sql) adds **`user_risk_class smallint not null default 0`**, **`check (user_risk_class in (0, 1, 2))`**, a column comment for semantic indices, and **`update`** backfill **`user_risk_class = case when fraudulent = 1 then 2 else 0 end`** (lines 4–15).

### Backend `datasets_row_merge` — `derive_labels` and merge summary

In **`job-sentry-backend`** [`datasets_row_merge.py`](../../../../job-sentry-backend/datasets_row_merge.py):

- **`align_user_risk_class_columns`** adds **`user_risk_class = np.nan`** to either input frame when the column is missing so schemas align before merge (lines 145–155).
- **`derive_labels`** ensures a **`user_risk_class`** column (NaN if missing), builds **`warning_label`** from **`parse_warnings_flags`** on **`warnings`**, computes **`legacy_rc`** from **`fraudulent`** and **`warning_label`**, then sets **`risk_class`** to rounded **`user_risk_class`** where numeric and in **{0,1,2}**, else **`legacy_rc`** (lines 158–181).
- **`merge_dataframes`** summary **`rules`** text documents **`risk_class`** precedence including reviewer **`user_risk_class`** vs legacy rules (lines 216–218).

**`REQUIRED_COLUMNS`** in the same file still lists core export columns including **`fraudulent`** and **`warnings`** but not **`user_risk_class`**; missing **`user_risk_class`** is handled in **`align_user_risk_class_columns`** / **`derive_labels`** (lines 17–30, 145–162).

### Combine script and tests

[`job-sentry-backend/scripts/combine_job_postings_rows.py`](../../../../job-sentry-backend/scripts/combine_job_postings_rows.py) documents exports including **`user_risk_class`** and **`risk_class`** preference in the module docstring; output column order includes **`user_risk_class`** (lines 1–6, 57–63).

[`job-sentry-backend/tests/test_row_merge.py`](../../../../job-sentry-backend/tests/test_row_merge.py) includes **`test_risk_class_from_user_risk_class`** (**`user_risk_class = 1`**, **`fraudulent = 0`** → **`risk_class == 1`**) and **`test_risk_class_precedence`** for legacy-only rows (lines 27–74).

### Seed batch script

[`scripts/seed-improvement-batch.ts`](../../../scripts/seed-improvement-batch.ts) imports **`reviewerRiskLabelToStorage`** and **`ImprovementFeedbackRequest`**, defines **`JobPostingRow`** with **`user_risk_class`**, and mirrors the server action mapping for bulk inserts (lines 29–47, 87–91).

## Code References

- `job-sentry-frontend/lib/api/types.ts:82-104` — **`ReviewerRiskLabel`**, **`reviewerRiskLabelToStorage`**, **`ImprovementFeedbackRequest`**
- `job-sentry-frontend/app/improvement/actions.ts:20-31` — **`saveImprovementFeedback`**
- `job-sentry-frontend/lib/supabase/insert-job-posting.ts:28-55` — **`insertJobPostingFromPost`**
- `job-sentry-frontend/app/improvement/page.tsx:23-90,223-249` — risk label UI and submit payload
- `job-sentry-frontend/supabase/migrations/20260420120000_job_postings_user_risk_class.sql` — column, constraint, backfill
- `job-sentry-backend/datasets_row_merge.py:145-181,216-218` — **`align_user_risk_class_columns`**, **`derive_labels`**, summary rules
- `job-sentry-backend/scripts/combine_job_postings_rows.py:1-63` — CLI docstring and **`user_risk_class`** in output order
- `job-sentry-backend/tests/test_row_merge.py:27-74` — **`user_risk_class`** / **`risk_class`** tests

## Architecture Documentation

- **Indices**: Reviewer **`user_risk_class`** and inference **`PredictResponse.predicted_class`** both use **0 = legit, 1 = warning, 2 = fraud** in shared TypeScript docs ([`lib/api/types.ts`](../../../lib/api/types.ts) lines 47–58, 85–86).
- **Storage**: Two columns on insert — **`user_risk_class`** (three-way) and **`fraudulent`** (binary projection for compatibility).
- **Training merge**: **`risk_class`** prefers valid exported **`user_risk_class`**; otherwise **`fraudulent`** + **`warnings`** heuristics produce **`legacy_rc`**. **`warning_label`** remains derived from **`warnings`** JSON only.

## Historical Context (from cursor/project/notes/)

No `cursor/project/notes/` tree was present under `job-sentry-frontend/cursor/project/` at research time. Supplementary narrative and prior binary-state description appear in [`cursor/project/research/2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md`](2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md) and the implementation plan [`cursor/project/plan/2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md`](../plan/2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md).

## Related Research

- [`2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md`](2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md) — earlier research on the improvement flow and binary vs multiclass context (includes post-implementation update pointer).

## Open Questions

- None required for documenting current wiring; stakeholder sign-off on the product decision remains a process step listed on the ticket itself.
