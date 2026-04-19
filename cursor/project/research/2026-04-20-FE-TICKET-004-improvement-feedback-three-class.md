---
date: 2026-04-20T05:41:20+08:00
researcher: Cursor Agent
git_commit: 3bd51b5463ee3dd73ea2c159653726a194a93458
branch: Riche
repository: job-sentry-frontend
topic: "Improvement feedback and three-class labels (FE-TICKET-004)"
tags: [research, codebase, improvement-feedback, labeled_scam, job_postings, FE-TICKET-004]
status: complete
last_updated: 2026-04-20
last_updated_by: Cursor Agent
metadata_note: "hack/spec_metadata.sh was not found in the workspace; git_commit, branch, and timestamps were gathered via git and date commands."
---

# Research: Improvement feedback and three-class labels (FE-TICKET-004)

**Date**: 2026-04-20T05:41:20+08:00  
**Researcher**: Cursor Agent  
**Git Commit**: `3bd51b5463ee3dd73ea2c159653726a194a93458`  
**Branch**: Riche  
**Repository**: job-sentry-frontend  

**Working tree note**: At research time, `git status` showed modified and untracked files on branch `Riche` (including `lib/api/types.ts`, `app/page.tsx`, and new ticket/plan files). Line numbers and behavior below reflect the tree as read during this research; they may differ from the commit alone.

## Research Question

Document the codebase as it relates to `cursor/project/tickets/FE-TICKET-004-improvement-feedback-three-class.md`: the improvement / feedback flow, `ImprovementFeedbackRequest` and `labeled_scam`, UI and persistence, and how that relates to multiclass prediction types elsewhere in the app.

## Summary

**Update (2026-04-20):** The improvement flow now uses **three-class reviewer labels** end-to-end: `ImprovementFeedbackRequest.labeled_risk` (`"legit" | "warning" | "fraud"`) maps to `job_postings.user_risk_class` (`0|1|2`) and derived binary `fraudulent` (`1` iff fraud). See [`FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md) and the implementation plan. The research detail below describes the **prior** binary `labeled_scam` design for historical context.

The improvement flow was **binary end-to-end** at research time: the TypeScript type `ImprovementFeedbackRequest` included `labeled_scam: boolean` ([`lib/api/types.ts`](../../../lib/api/types.ts)); the improvement page collected that value with two radio options (“Not a scam” / “Scam”) ([`app/improvement/page.tsx`](../../../app/improvement/page.tsx)); the server action mapped `labeled_scam` to `fraudulent` `0 | 1` and serialized warning flags into the `job_postings.warnings` text column as JSON ([`app/improvement/actions.ts`](../../../app/improvement/actions.ts)); [`insertJobPostingFromPost`](../../../lib/supabase/insert-job-posting.ts) inserted into `public.job_postings` with column `fraudulent` constrained to `{0, 1}` (see migration). Seed scripts and JSON fixtures under `scripts/` used the same boolean `labeled_scam` field. Multiclass **`POST /predict`** response types (`predicted_label`, three probabilities, etc.) live in the same [`lib/api/types.ts`](../../../lib/api/types.ts) file but were **separate** from the improvement feedback payload and storage.

## Detailed Findings

### Types (`lib/api/types.ts`)

- **`ImprovementWarningFlag`**, **`ImprovementWarningsStored`**, and **`ImprovementFeedbackRequest`** are defined alongside **`PredictResponse`** (multiclass). The improvement payload is documented as training feedback / local preview ([`lib/api/types.ts` lines 68–88](../../../lib/api/types.ts)).
- **`ImprovementFeedbackRequest`** fields: `post: PredictPost`, `warning_flags: ImprovementWarningFlag[]`, optional `warnings?: string` (note for “other suspicious patterns”), **`labeled_scam: boolean`**.

### UI (`app/improvement/page.tsx`)

- Client component: local state includes `labeledScam` (default `false`), checkbox `flags`, optional `otherSuspiciousNote`, form `JobPostFormState`.
- Submit builds `post` via `buildSinglePost(form)`, collects active `warning_flags`, calls `saveImprovementFeedback` with `labeled_scam: labeledScam` ([`app/improvement/page.tsx` lines 50–66](../../../app/improvement/page.tsx)).
- The “Scam label” section shows helper copy “Stored as labeled_scam” and a fieldset legend referencing `labeled_scam` ([`app/improvement/page.tsx` lines 217–258](../../../app/improvement/page.tsx)).

### Server action (`app/improvement/actions.ts`)

- **`buildWarningsColumnJson`**: if no flags, returns `null`; else `JSON.stringify({ flags, note })` matching **`ImprovementWarningsStored`** ([`app/improvement/actions.ts` lines 10–18](../../../app/improvement/actions.ts)).
- **`saveImprovementFeedback`**: `fraudulent = payload.labeled_scam ? 1 : 0`, then `insertJobPostingFromPost(payload.post, fraudulent, { warnings })` ([`app/improvement/actions.ts` lines 20–32](../../../app/improvement/actions.ts)).

### Persistence (`lib/supabase/insert-job-posting.ts`)

- **`FraudulentFlag`** is `0 | 1`; **`insertJobPostingFromPost`** maps `PredictPost` fields plus `fraudulent` and optional `warnings` string into `job_postings` ([`lib/supabase/insert-job-posting.ts` lines 21–67](../../../lib/supabase/insert-job-posting.ts)).
- Uses **`createAdminSupabaseClient()`** (service role) for insert.

### Database schema

- **`20260328150000_job_postings_fraudulent.sql`** adds **`fraudulent smallint not null default 0 check (fraudulent in (0, 1))`** ([`supabase/migrations/20260328150000_job_postings_fraudulent.sql`](../../../supabase/migrations/20260328150000_job_postings_fraudulent.sql)).
- Earlier/later migrations create `job_postings` and evolve the `warnings` column (renamed from other-suspicious note); the analyzer sub-agent summarized the full column set; the invariant relevant to FE-TICKET-004 is **binary `fraudulent`**.

### Seed scripts and JSON fixtures (`scripts/`)

- **`seed-improvement-batch.ts`**: reads `ImprovementFeedbackRequest[]` JSON and inserts using the same `labeled_scam → fraudulent` and `buildWarningsColumnJson` pattern as the server action.
- **Generators / fetch**: `generate-improvement-seed-500.ts`, `generate-noisy-jobs-1000.ts`, `generate-noisy-jobs-1000-fresh.ts`, `fetch-onlinejobs-seed.ts` produce or set **`labeled_scam: boolean`** on each row.
- Multiple **`improvement-seed-data*.json`** files contain boolean `labeled_scam` (catalogued in sub-agent output).

### Backend test fixtures (related, not `labeled_scam`)

- **`job-sentry-backend/tests/fixtures/`** CSVs use the **`fraudulent`** integer column directly (e.g. `fake_job_postings_rows_tiny.csv`), not the frontend boolean name.

### Relationship to multiclass `/predict`

- **`PredictResponse`** in [`lib/api/types.ts`](../../../lib/api/types.ts) uses three-class **`predicted_class`**, **`predicted_label`**, three probability arrays, and **`confidence`** (documented as max softmax probability per post). That contract is for inference responses, not for **`ImprovementFeedbackRequest`** storage.

## Code References

- [`job-sentry-frontend/lib/api/types.ts:68-88`](../../../lib/api/types.ts) — `ImprovementFeedbackRequest` and `labeled_scam: boolean`.
- [`job-sentry-frontend/app/improvement/page.tsx:32-66`](../../../app/improvement/page.tsx) — `labeledScam` state and payload to `saveImprovementFeedback`.
- [`job-sentry-frontend/app/improvement/page.tsx:217-258`](../../../app/improvement/page.tsx) — Scam label radios and UI copy referencing `labeled_scam`.
- [`job-sentry-frontend/app/improvement/actions.ts:10-32`](../../../app/improvement/actions.ts) — `buildWarningsColumnJson`, `labeled_scam` → `fraudulent`.
- [`job-sentry-frontend/lib/supabase/insert-job-posting.ts:21-67`](../../../lib/supabase/insert-job-posting.ts) — insert row including `fraudulent` and `warnings`.
- [`job-sentry-frontend/supabase/migrations/20260328150000_job_postings_fraudulent.sql`](../../../supabase/migrations/20260328150000_job_postings_fraudulent.sql) — `fraudulent` check constraint.

## Architecture Documentation

- **Separation of concerns**: Inference responses are multiclass in **`PredictResponse`**; user-annotated training rows use **binary** `labeled_scam` / **`fraudulent`** and structured **warnings** JSON in **`job_postings`**.
- **Server Actions boundary**: The improvement page (client) invokes **`saveImprovementFeedback`** (server module); persistence goes through **admin Supabase** and **`insertJobPostingFromPost`**.
- **Warning flags**: Four fixed checkbox codes plus optional note; stored as JSON in **`job_postings.warnings`**, not as `/predict` **`warnings`** string codes (different semantics from **`PredictWarningCode`** on the predict API).

## Historical Context (from `cursor/project/`)

- [`cursor/project/tickets/FE-TICKET-004-improvement-feedback-three-class.md`](../tickets/FE-TICKET-004-improvement-feedback-three-class.md) — Ticket scope: optional alignment with three-class targets; mentions `labeled_risk` or three radios; acceptance criteria include recording a product decision and matching schema if implemented.
- [`cursor/project/tickets/README.md`](../tickets/README.md) — Lists FE-TICKET-004 as optional; does not block basic integration.
- [`cursor/project/plan/2026-04-20-FE-TICKET-002-result-views-three-class-routing.md`](../plan/2026-04-20-FE-TICKET-002-result-views-three-class-routing.md) — Cross-reference to FE-TICKET-004 for improvement / `labeled_scam` vs three-way labels.
- [`cursor/project/plan/2026-03-28-supabase-hosted-no-cli.md`](../plan/2026-03-28-supabase-hosted-no-cli.md) — Supabase workflow; references `labeled_scam` / `saveImprovementFeedback` in plan context.
- Backend notes (outside this repo’s primary focus but cited by locator): e.g. `job-sentry-backend/cursor/project/notes/TICKET-006-evaluation-summary.md` — evaluation summary for 3-class model (context for training labels, not frontend improvement UI).

## Related Research

- [`cursor/project/research/2026-04-20-FE-TICKET-002-result-views-three-class-routing.md`](2026-04-20-FE-TICKET-002-result-views-three-class-routing.md) — Result views and three-class routing on the main predict UI.
- [`cursor/project/research/2026-04-20-FE-TICKET-003-api-contract-documentation.md`](2026-04-20-FE-TICKET-003-api-contract-documentation.md) — API contract and multiclass `/predict` documentation context.

## GitHub permalinks (optional)

Remote: **Retchizu/job-sentry-frontend**. Example permalinks at commit `3bd51b5463ee3dd73ea2c159653726a194a93458` (paths must exist at that commit on the default branch for links to resolve):

- Types: `https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/lib/api/types.ts`
- Improvement page: `https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/app/improvement/page.tsx`
- Actions: `https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/app/improvement/actions.ts`
- Insert helper: `https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/lib/supabase/insert-job-posting.ts`

## Open Questions

- Whether a standalone **product decision** document exists outside the paths searched (ticket acceptance criteria ask for it; only ticket/README/plan references were found in this research).
- If FE-TICKET-004 is implemented, **schema migration** from **`fraudulent` 0/1** to a three-way label (or parallel column) would need to align with backend/dataset conventions referenced in the ticket.
