# FE-TICKET-004: Improvement feedback — three-class labels — Implementation Plan

## Overview

Implement **three-class reviewer labels** on the improvement feedback flow so human-supplied training targets align with backend multiclass indices (**0 = legit**, **1 = warning**, **2 = fraud**, matching `PredictResponse.predicted_class` / `app/schemas.py`). Persist them in Supabase as a new column **`user_risk_class`** while keeping legacy **`fraudulent`** (0/1) **derived** as `1` iff `user_risk_class === 2` so existing CSV exports and binary benchmark code keep working. Update **`job-sentry-backend`** `datasets_row_merge.py` so **`risk_class`** for merged training data prefers **`user_risk_class`** when present. Record the product decision in-repo (see Phase 0).

**Product decision (locked for this plan):** v1 of this work **does** adopt three-class user labels in the improvement UI; binary-only feedback is **not** the target end state for this implementation. Binary **`fraudulent`** remains a **compatibility projection**, not the sole source of truth for class.

## Current State Analysis

**Implemented state (2026-04-20):** The following supersedes the earlier pre-build “binary `labeled_scam`” description. Product record: [`FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md). Closure verification: [`2026-04-20-FE-TICKET-004-product-decision-closure.md`](2026-04-20-FE-TICKET-004-product-decision-closure.md).

- **Types**: `ImprovementFeedbackRequest` uses `labeled_risk: ReviewerRiskLabel`; `reviewerRiskLabelToStorage` maps to `user_risk_class` (`0|1|2`) and derived `fraudulent` (`1` iff fraud) in [`lib/api/types.ts`](../../../lib/api/types.ts).
- **UI**: Three options (Legit / Warning / Fraud), default `"legit"`, in [`app/improvement/page.tsx`](../../../app/improvement/page.tsx).
- **Server action**: [`app/improvement/actions.ts`](../../../app/improvement/actions.ts) uses `reviewerRiskLabelToStorage`, builds `warnings` JSON, calls `insertJobPostingFromPost` with `user_risk_class` and `fraudulent`.
- **Insert**: [`lib/supabase/insert-job-posting.ts`](../../../lib/supabase/insert-job-posting.ts) persists `fraudulent` (`0|1`) and `user_risk_class`. Column added by [`20260420120000_job_postings_user_risk_class.sql`](../../../supabase/migrations/20260420120000_job_postings_user_risk_class.sql) with legacy backfill from `fraudulent`.
- **Seeds**: [`scripts/seed-improvement-batch.ts`](../../../scripts/seed-improvement-batch.ts) and JSON fixtures align with `labeled_risk` / three-class storage.
- **Backend**: [`datasets_row_merge.py`](../../../../job-sentry-backend/datasets_row_merge.py) `derive_labels` sets `risk_class` from valid `user_risk_class` when present; otherwise legacy `fraudulent` + `warnings` heuristics. Covered by [`tests/test_row_merge.py`](../../../../job-sentry-backend/tests/test_row_merge.py).

## Desired End State

- Reviewers pick **Legit**, **Warning**, or **Fraud** on the improvement page; payload uses a **three-way** field (e.g. `labeled_risk: "legit" | "warning" | "fraud"`).
- Each insert writes **`user_risk_class`** `0 | 1 | 2` and **`fraudulent`** `0 | 1` with **`fraudulent = (user_risk_class === 2) ? 1 : 0`**.
- Exported `job_postings` CSV includes **`user_risk_class`**; **`datasets_row_merge.derive_labels`** sets **`risk_class`** from **`user_risk_class`** (see Phase 4), with **`warning_label`** still derived from warnings JSON flags for traceability.
- Seed scripts and generated JSON fixtures carry the three-way label; legacy JSON can be migrated with a deterministic map (`labeled_scam: true` → fraud; `false` → legit) with a documented loss of nuance for any intended “warning-only” binary rows.
- **Product decision** is recorded in [`cursor/project/tickets/FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md) (see [`FE-TICKET-004-product-decision.md`](../tickets/FE-TICKET-004-product-decision.md)).

### Key Discoveries

- DB **`CHECK (fraudulent in (0, 1))`** remains; reviewer three-way labels live on **`user_risk_class`**, not on **`fraudulent`**.
- **`derive_labels`** gives **precedence** to numeric **`user_risk_class`** in `{0,1,2}` for **`risk_class`** when the export column is valid; otherwise the legacy **`fraudulent`** + **`warnings`** path applies ([`datasets_row_merge.py`](../../../../job-sentry-backend/datasets_row_merge.py) `derive_labels`, `merge_dataframes` summary `rules`).

## What We're NOT Doing

- Changing **`POST /predict`** schemas or inference code (already multiclass elsewhere).
- Replacing heuristic **`warnings` JSON** checkboxes — they remain separate from the three-class **reviewer** label (same as today: flags are orthogonal signals).
- Rewriting all downstream notebooks or legacy Phase 6 artifacts under `job-sentry-backend/artifacts/` beyond what’s needed for **`combine_job_postings_rows.py`** / tests when **`user_risk_class`** is added.
- **Alternative branch:** If product later chooses **binary-only** for v1, stop after Phase 0 and add a short deferred note per ticket deliverables instead of Phases 1–5 — not the default path here.

## Implementation Approach

1. Record the product decision (Phase 0).
2. Add **`user_risk_class`** via Supabase migration + backfill; keep **`fraudulent`** derived in application code.
3. Update TypeScript types, server action, insert helper, improvement UI (three radios).
4. Update seed script + fixtures + any generators that emit `labeled_scam`.
5. Update backend merge pipeline and tests; regenerate **`lib/supabase/database.types.ts`** if used.

---

## Phase 0: Product decision artifact

### Overview

Satisfy acceptance criterion “Product decision recorded” with a short, authoritative note in the tickets folder.

### Changes Required

#### 1. New file — product decision

**File**: `cursor/project/tickets/FE-TICKET-004-product-decision.md`  
**Changes**: Create 1-page markdown stating: (1) three-class reviewer labels are in scope; (2) storage is `user_risk_class` 0/1/2; (3) `fraudulent` remains 0/1 derived for compatibility; (4) coordination with backend merge (`datasets_row_merge.py`) is required for training **`risk_class`**.

### Success Criteria

#### Automated Verification

- [x] File exists at `cursor/project/tickets/FE-TICKET-004-product-decision.md`

#### Manual Verification

- [ ] Stakeholder acknowledges the decision matches product intent

**Implementation note**: Pause after Phase 0 if the stakeholder rejects three-class scope; in that case switch to the deferred-note deliverable only.

---

## Phase 1: Database migration (Supabase)

### Overview

Add **`user_risk_class`** with a safe backfill from existing **`fraudulent`**.

### Changes Required

#### 1. New migration SQL

**File**: `job-sentry-frontend/supabase/migrations/YYYYMMDDHHMMSS_job_postings_user_risk_class.sql` (use next timestamp after existing migrations)  
**Changes**:

- `ALTER TABLE public.job_postings ADD COLUMN user_risk_class smallint NOT NULL DEFAULT 0;`
- `CHECK (user_risk_class in (0, 1, 2))` (combine with column add or add constraint after backfill).
- Backfill: `UPDATE public.job_postings SET user_risk_class = CASE WHEN fraudulent = 1 THEN 2 ELSE 0 END;` (historical rows: binary data becomes legit or fraud only; no reviewer “warning” in legacy data).
- Document in comment: 0=legit, 1=warning, 2=fraud (aligned with fused model indices).

#### 2. Regenerate types (if workflow uses them)

**File**: `lib/supabase/database.types.ts` (if present / in use)  
**Changes**: Run `npm run supabase:types` or `npm run supabase:types:linked` per team practice after migration is applied locally.

### Success Criteria

#### Automated Verification

- [ ] `supabase db reset` or equivalent applies migrations cleanly (project-specific; use the repo’s documented Supabase workflow from [`cursor/project/plan/2026-03-28-supabase-hosted-no-cli.md`](2026-03-28-supabase-hosted-no-cli.md) if applicable) — *not run here (local Docker unavailable); migration added at `supabase/migrations/20260420120000_job_postings_user_risk_class.sql`.*
- [ ] Insert smoke test: row with `user_risk_class = 1`, `fraudulent = 0` succeeds

#### Manual Verification

- [ ] Supabase Studio shows `user_risk_class` populated for existing rows after migration

---

## Phase 2: TypeScript types, insert helper, server action

### Overview

Replace boolean **`labeled_scam`** with a three-way reviewer label on the request type; map to **`user_risk_class`** and derived **`fraudulent`**.

### Changes Required

#### 1. API types

**File**: [`lib/api/types.ts`](../../../lib/api/types.ts)  
**Changes**:

- Add exported type e.g. `export type ReviewerRiskLabel = "legit" | "warning" | "fraud";`
- On `ImprovementFeedbackRequest`, replace `labeled_scam: boolean` with `labeled_risk: ReviewerRiskLabel` (or `user_risk_class: 0 | 1 | 2` — **prefer string union** for UI clarity and parity with `predicted_label` strings).
- Update JSDoc on the interface.

#### 2. Insert helper

**File**: [`lib/supabase/insert-job-posting.ts`](../../../lib/supabase/insert-job-posting.ts)  
**Changes**:

- Extend `FraudulentFlag` usage: still `0 | 1` for **`fraudulent`** column.
- Add parameter or options field for **`user_risk_class: 0 | 1 | 2`** and include it in the `row` object passed to `.insert()`.
- Optionally centralize mapping `ReviewerRiskLabel` → `{ user_risk_class, fraudulent }` in one small helper to avoid drift between action and seed script.

#### 3. Server action

**File**: [`app/improvement/actions.ts`](../../../app/improvement/actions.ts)  
**Changes**:

- Map `payload.labeled_risk` → `user_risk_class` and `fraudulent` (fraudulent = 1 only for `"fraud"`).
- Pass both into `insertJobPostingFromPost`.

#### 4. Barrel export

**File**: [`lib/api/index.ts`](../../../lib/api/index.ts)  
**Changes**: Re-export new type(s).

### Success Criteria

#### Automated Verification

- [ ] `npm run lint` (from `job-sentry-frontend`) — *fails on pre-existing `components/animate-ui/primitives/animate/slot.tsx` (react-hooks/static-components); unchanged by this work.*
- [x] `npx tsc --noEmit` (from `job-sentry-frontend`)

#### Manual Verification

- [ ] None required until UI is wired (Phase 3)

---

## Phase 3: Improvement page UI

### Overview

Replace two radios with **three** options; align copy with FE-TICKET-002 terminology (legit / warning / fraud) where applicable.

### Changes Required

#### 1. Improvement page

**File**: [`app/improvement/page.tsx`](../../../app/improvement/page.tsx)  
**Changes**:

- Replace `labeledScam: boolean` with state holding `ReviewerRiskLabel` (default **`"legit"`**).
- Render three labeled radios; remove misleading copy “Stored as labeled_scam”; replace with neutral text (e.g. “Stored as user_risk_class” / “Your risk label”) **without** exposing raw column names if product prefers user-facing copy only.
- Submit `labeled_risk` in the payload; reset default to **`"legit"`** on success.

### Success Criteria

#### Automated Verification

- [ ] `npm run lint` and `npx tsc --noEmit` — *tsc passed; lint same pre-existing failure as Phase 2.*

#### Manual Verification

- [ ] Submitting each of the three labels persists without error (against dev Supabase)
- [ ] DB row shows matching `user_risk_class` and `fraudulent` only high for fraud

---

## Phase 4: Seed scripts, fixtures, generators

### Overview

Align bulk seeding and generated JSON with the new payload shape and DB columns.

### Changes Required

#### 1. Seed batch script

**File**: [`scripts/seed-improvement-batch.ts`](../../../scripts/seed-improvement-batch.ts)  
**Changes**:

- Update `JobPostingRow` type to include `user_risk_class`.
- Map `ImprovementFeedbackRequest` → `user_risk_class` + `fraudulent` (same mapping as server action).
- Refresh header comments listing example JSON files if field names change.

#### 2. JSON fixtures

**Files**: `scripts/improvement-seed-data*.json` (all that contain `labeled_scam`)  
**Changes**: Either:

- Replace `labeled_scam` with `labeled_risk` and three string values, **or**
- Add a one-off script under `scripts/` to transform JSON in place: `labeled_scam: true` → `"fraud"`, `false` → `"legit"`.

#### 3. Generator / fetch scripts

**Files**: [`scripts/generate-improvement-seed-500.ts`](../../../scripts/generate-improvement-seed-500.ts), [`scripts/generate-noisy-jobs-1000.ts`](../../../scripts/generate-noisy-jobs-1000.ts), [`scripts/generate-noisy-jobs-1000-fresh.ts`](../../../scripts/generate-noisy-jobs-1000-fresh.ts), [`scripts/fetch-onlinejobs-seed.ts`](../../../scripts/fetch-onlinejobs-seed.ts)  
**Changes**: Emit `labeled_risk` (and **warning** where bucket logic implies intermediate risk, if those scripts already model tiers; otherwise map prior boolean to legit/fraud only and document).

### Success Criteria

#### Automated Verification

- [ ] `npx tsx scripts/seed-improvement-batch.ts` runs against local Supabase with a small sample file without insert errors — *requires DB with migration applied.*
- [ ] `npm run lint` / `npx tsc --noEmit` still pass — *tsc passed; lint pre-existing failure.*

#### Manual Verification

- [ ] Spot-check a few seeded rows in Studio for `user_risk_class` distribution

---

## Phase 5: Backend dataset merge (`job-sentry-backend`)

### Overview

Teach **`datasets_row_merge`** to read **`user_risk_class`** from exported CSVs and set **`risk_class`** from it, falling back to the existing **`fraudulent` + flags** rule for older files if needed.

### Changes Required

#### 1. Required columns and normalization

**File**: [`job-sentry-backend/datasets_row_merge.py`](../../../job-sentry-backend/datasets_row_merge.py)  
**Changes**:

- Add **`user_risk_class`** to **`REQUIRED_COLUMNS`** once all exported CSVs include it, **or** make it optional and branch: if column missing, use legacy `derive_labels` behavior.
- In **`derive_labels`**: set `out["risk_class"] = out["user_risk_class"].astype(int)` when column present and valid; else keep existing `np.where` logic (lines 156–158).
- Extend **`summary["rules"]`** text to describe precedence.

#### 2. Tests

**Files**: [`job-sentry-backend/tests/test_row_merge.py`](../../../job-sentry-backend/tests/test_row_merge.py) (and fixtures under `tests/fixtures/` as needed)  
**Changes**: Add cases for CSV rows with **`user_risk_class = 1`** and **`fraudulent = 0`** ensuring **`risk_class`** is **1**.

#### 3. Coordination

- Ensure **`scripts/combine_job_postings_rows.py`** and export docs mention the new column when exporting from Supabase.

### Success Criteria

#### Automated Verification

- [x] `cd job-sentry-backend && pytest tests/test_row_merge.py` (or project-standard test command)

#### Manual Verification

- [ ] Run `merge_sources` on a sample **`combined_job_postings_rows.csv`** that includes mixed legacy + new rows and inspect **`risk_class`** distribution

---

## Phase 6: Documentation and cross-links

### Overview

Keep internal docs consistent with FE-TICKET-002 terminology and backend schema.

### Changes Required

#### 1. Internal API / improvement docs (if any mention `labeled_scam`)

**Files**: Search `cursor/project/docs/` and [`cursor/project/research/2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md`](../research/2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md)  
**Changes**: Update references from binary **`labeled_scam`** to **`labeled_risk`** / **`user_risk_class`** as appropriate.

#### 2. Ticket folder

**File**: [`cursor/project/tickets/FE-TICKET-004-improvement-feedback-three-class.md`](../tickets/FE-TICKET-004-improvement-feedback-three-class.md)  
**Changes**: Optional one-line status pointer to this plan and the product-decision file.

### Success Criteria

#### Automated Verification

- [ ] N/A (docs)

#### Manual Verification

- [ ] Docs read coherently with FE-TICKET-002 copy on the main app

---

## Testing Strategy

### Unit / integration

- Frontend: typecheck + lint; optional component test if the project adds tests later.
- Backend: **`test_row_merge`** covers new **`risk_class`** precedence.

### Manual E2E

1. Open `/improvement`, submit **Warning**, verify DB **`user_risk_class = 1`**, **`fraudulent = 0`**.
2. Submit **Fraud**, verify **`user_risk_class = 2`**, **`fraudulent = 1`**.
3. Run CSV export → `combine_job_postings_rows.py` → confirm merged **`risk_class`** matches **`user_risk_class`** for new rows.

## Performance Considerations

- One extra smallint column per row; negligible. Backfill runs once at migration time.

## Migration Notes

- Legacy **`fraudulent`**-only rows backfill to **`user_risk_class` 0 or 2**; historical **“warning”** signal that existed only via heuristic flags remains in **`warnings` JSON**, not in legacy **`user_risk_class`** (all zeros for non-fraud). Document this limitation in the product-decision file.

## References

- Ticket: [`cursor/project/tickets/FE-TICKET-004-improvement-feedback-three-class.md`](../tickets/FE-TICKET-004-improvement-feedback-three-class.md)
- Prior research: [`cursor/project/research/2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md`](../research/2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md)
- Backend merge: [`job-sentry-backend/datasets_row_merge.py`](../../../job-sentry-backend/datasets_row_merge.py) (`derive_labels`, lines 145–159)
- Related UX ticket: [`cursor/project/tickets/FE-TICKET-002-result-views-three-class-routing.md`](../tickets/FE-TICKET-002-result-views-three-class-routing.md)

## Sync note

`humanlayer thoughts sync` was not available in this environment. If your team uses HumanLayer indexing, run **`humanlayer thoughts sync`** locally after adding this plan so it is indexed.
