# FE-TICKET-002: Result views and three-class routing — Implementation Plan

## Overview

Update **`app/page.tsx`** so the main prediction flow branches on the **multiclass** `POST /predict` contract already modeled in **`lib/api/types.ts`** (`PredictResponse`): three distinct full-screen result states (**legit**, **warning**, **fraud**), confidence from **`confidence[0]`** (winner probability), optional display of the three softmax probabilities, and **`warnings[0]`** surfaced on each tier. Remove all use of **`predicted_scam`**, **`scam_probabilities`**, and **`threshold`** in this file.

**Precondition:** **FE-TICKET-001** is merged (or equivalent): `PredictResponse` and `predictScam` normalization match `job-sentry-backend/app/schemas.py`. The workspace already contains multiclass `lib/api` types and `normalizePredictResponse` in `lib/api/jobSentry.ts`; **`app/page.tsx` on `main` may still be binary** until this ticket ships.

## Current State Analysis

- **`app/page.tsx`** (typical `main` state):
  - Routes with a **binary** check: `predictionResult?.predicted_scam?.[0] === true` → `HighRiskResultView`, else non-null → `LooksSafeResultView` (see ~lines 137–155).
  - Uses **`scamConfidencePercent`** / **`safeConfidencePercent`** based on **`result.scam_probabilities[0]`** (~lines 30–41).
  - **`HighRiskResultView`** shows “High Risk Detected” and heuristic `warnings[0]` (~392–478). **`LooksSafeResultView`** shows “Looks Safe” and static green bullets; **does not** list `warnings[0]` (~309–390).
- **`lib/api/types.ts`** (post–FE-TICKET-001): `predicted_class`, `predicted_label`, `legit_probability`, `warning_probability`, `fraud_probability`, **`confidence`**, `warnings` — aligned with backend `PredictResponse` (`job-sentry-backend/app/schemas.py` lines 62–92).
- **Backend semantics:** `predicted_class` 0 = legit, 1 = warning, 2 = fraud; `predicted_label` values `"legit"`, `"warning"`, `"fraud"`; `confidence` = max of the three class probabilities per post.
- **Tooling:** `package.json` has `npm run lint` and `next build`; no dedicated `typecheck` script — use **`npx tsc --noEmit`** for TypeScript. Other pages (e.g. `app/improvement/page.tsx`) may have unrelated TS issues; goal is **project typecheck clean** or at least **`app/page.tsx` + `lib/api`** consistent.

## Desired End State

- **`app/page.tsx`** contains **no** identifiers `predicted_scam`, `scam_probabilities`, or `threshold`.
- **Three** mutually exclusive result views render from **`predictionResult`** after a successful predict:
  - **Fraud** — `predicted_class[0] === 2` **or** normalized `predicted_label[0] === "fraud"` (reuse/extend current red **high-risk** card and icons).
  - **Warning** — new **amber** tier (not fraud, not legit): `predicted_class[0] === 1` **or** label `"warning"`.
  - **Legit** — `predicted_class[0] === 0` **or** label `"legit"` (reuse green **Looks Safe** path).
- **Primary confidence** shown everywhere is **`confidencePercentFromApi(result)`** = `Math.round((result.confidence[0] ?? 0) * 100)` clamped to 0–100 when the value is finite; document that this is the **winner** probability per API.
- **Optional:** compact **three-way** breakdown using `legit_probability[0]`, `warning_probability[0]`, `fraud_probability[0]` (percentages that sum to ~100%) — keeps UI consistent with softmax triples.
- **`warnings[0]`** displayed for **warning** and **fraud** (existing pattern); for **legit**, show the same list when non-empty (ticket: wire appropriately — legit + non-empty heuristics is a real edge case).

### Key Discoveries

- Routing is **React conditional rendering** in `Home`, not Next.js file routes (`app/page.tsx` ~90–155).
- **Shared UI primitives:** `AppChromeHeader`, `WARNING_LABELS` / `formatWarningCode`, `LoadingFrame`, IBM Plex Mono styling — keep consistency across new warning tier.
- **Icons:** Fraud tier can reuse `HIGH_RISK_ICONS`; warning tier can reuse the same warning glyphs on an amber card or add a dedicated asset later — **no new asset required** for MVP if palette/layout distinguish tiers.

## What We're NOT Doing

- **FE-TICKET-001** work (already separate): `lib/api/types.ts`, `lib/api/jobSentry.ts` beyond **imports/types** used by the page.
- **FE-TICKET-003:** `cursor/project/docs/frontend-api-endpoints.md` binary → multiclass doc update.
- **FE-TICKET-004:** Improvement feedback / `labeled_scam` → three-way labels.
- **FE-TICKET-005:** Full loading-copy and marketing polish pass.
- **Renaming `predictScam`** — keep import name unless product requests a rename.
- **Automated E2E** — optional follow-up; manual verification is in scope for this plan unless tests already exist.

## Implementation Approach

1. Add a small **risk tier** model: `type RiskTier = "legit" | "warning" | "fraud"` and **`getRiskTier(result: PredictResponse): RiskTier`** that:
   - Reads index `0` for single-post flow.
   - If **`predicted_class[0]`** is `0`, `1`, or `2`, map to **legit / warning / fraud** respectively.
   - Else if **`predicted_label[0]`** (trim, lowercase) is `legit`, `warning`, or `fraud`, use that.
   - **Else** (missing arrays, unknown class, or unrecognized label): return **`"warning"`** — avoids falsely reassuring the user when the API response is incomplete or inconsistent. Document in a one-line comment next to the helper.

2. Replace **`scamConfidencePercent` / `safeConfidencePercent`** with **`confidencePercent(result: PredictResponse, index = 0)`** using **`result.confidence[index]`**.

3. Add **`WarningResultView`** (amber) mirroring the layout of fraud/legit: hero card, title e.g. **“Review carefully”** or **“Warning”**, confidence line, **Analysis Breakdown** with `warnings[0]` same as fraud.

4. **`Home` return chain:** `isSubmitting` → `LoadingFrame`; else if `predictionResult` then switch **`getRiskTier(predictionResult)`** → fraud / warning / legit components; else form.

5. **Copy:** Rename fraud headline from “High Risk Detected” toward **fraud-specific** wording only if minimal (ticket: adjust titles/copy minimally) — e.g. **“Fraud risk”** or keep **“High Risk”** if design prefers continuity.

6. **Optional breakdown:** a small inline block under the confidence line: three lines or a stacked bar for Legit / Warning / Fraud % — use the three `*_probability` arrays.

---

## Phase 1: Helpers and types (same module or `lib/`)

### Overview

Centralize tier detection and confidence formatting so `Home` stays readable and acceptance criteria are easy to grep/verify.

### Changes Required

**File:** `app/page.tsx` **or** new `lib/prediction-risk-tier.ts` (re-export helpers from `page.tsx` if split).

1. **`getRiskTier(result: PredictResponse): RiskTier`** — logic as in Implementation Approach; unit-testable if you add `vitest` later; for this ticket, **inline tests via manual cases** are enough.

2. **`confidencePercent(result, index)`** — `confidence[index]` → 0–100 integer; non-finite → `0`.

3. **Optional:** **`triplePercents(result, index)`** → `{ legit, warning, fraud }` each 0–100 rounded from `legit_probability`, `warning_probability`, `fraud_probability`.

### Success Criteria

#### Automated Verification

- [x] `rg 'predicted_scam|scam_probabilities|threshold' app/page.tsx` returns **no matches** (after Phases 1–3).
- [x] `npx eslint app/page.tsx` passes (and any new `lib/*.ts` file).
- [x] `npx tsc --noEmit` passes for the repo **or** only pre-existing failures outside this ticket are documented.

#### Manual Verification

- [ ] Helpers return **fraud** for `predicted_class: [2]` and for `predicted_label: ["fraud"]` with class omitted (if you support partial mocks).

---

## Phase 2: Three-way routing in `Home`

### Overview

Replace the binary branch with **`switch (getRiskTier(predictionResult))`** or ordered `if` checks (fraud first, then warning, then legit).

### Changes Required

**File:** `app/page.tsx`

1. Remove **`predicted_scam`** branch (~137–145).

2. Insert:
   - `fraud` → fraud result component (existing **`HighRiskResultView`** renamed or wrapped).
   - `warning` → **`WarningResultView`**.
   - `legit` → **`LooksSafeResultView`** (updated to use new confidence + optional warnings).

### Success Criteria

#### Automated Verification

- [x] TypeScript: `PredictResponse` props on all three views compile.

#### Manual Verification

- [ ] With a mocked API or dev backend, three responses produce **three visibly different** screens.

---

## Phase 3: `WarningResultView` (new)

### Overview

New intermediate **amber** screen: same structural sections as fraud (header, title, confidence, analysis breakdown, reset).

### Changes Required

**File:** `app/page.tsx` (or `components/warning-result-view.tsx` if extracted)

1. Card: amber border/background (e.g. border amber-500 / bg amber-50; dark mode equivalents consistent with existing hex style in file).

2. Title: e.g. **“Review carefully”** + subtitle optional.

3. **`warnings[0]`** via existing **`formatWarningCode`** list; empty state message distinct from fraud (e.g. model flagged warning tier without matching heuristics).

4. Reuse **`HIGH_RISK_ICONS`** or **`SAFE_RESULT_ICONS`** info line for grammar line — match existing pattern.

### Success Criteria

#### Automated Verification

- [x] Lint clean for new component.

#### Manual Verification

- [ ] Warning-only response shows **amber** tier, not red or green.

---

## Phase 4: Update `FraudResultView` / `LooksSafeResultView`

### Overview

Rename **`HighRiskResultView`** → **`FraudResultView`** (optional rename; keeps grep clear). Replace **`scamConfidencePercent`** usage with **`confidencePercent`**. Add **optional** triple breakdown.

### Changes Required

**File:** `app/page.tsx`

1. **`FraudResultView`**: `pct` from **`confidence[0]`**; copy tweak if desired (“Fraud risk” vs “High Risk Detected”).

2. **`LooksSafeResultView`**: `pct` from **`confidence[0]`** (no longer `100 - scam`); if **`warnings[0].length > 0`**, render a **muted** or **amber** bullet list so heuristics are visible even when model says legit.

3. Remove obsolete **`scamConfidencePercent`**, **`safeConfidencePercent`**.

### Success Criteria

#### Automated Verification

- [x] `rg 'scamConfidence|safeConfidence|scam_probabilities|predicted_scam' app/page.tsx` — **no matches**.

#### Manual Verification

- [ ] Legit path shows green tier; confidence matches API `confidence[0]`.

---

## Phase 5: Final verification and acceptance checklist

### Overview

Map work to **FE-TICKET-002** acceptance criteria and run full frontend checks.

### Success Criteria

#### Automated Verification

- [ ] `npm run lint` (repo-wide: fails on pre-existing `components/animate-ui/primitives/animate/slot.tsx` react-hooks/static-components; ticket files pass `npx eslint app/page.tsx lib/prediction-risk-tier.ts`)
- [x] `npx tsc --noEmit`
- [x] `npm run build` (Next.js production build)

#### Manual Verification

- [ ] **Legit** sample: green view, plausible confidence.
- [ ] **Warning** sample: amber view, warnings list behaves.
- [ ] **Fraud** sample: red view, warnings list behaves.
- [ ] Optional **triple** probabilities visible and sum ~100% when enabled.

---

## Testing Strategy

### Manual Testing Steps

1. Point **`NEXT_PUBLIC_API_BASE_URL`** (or equivalent in `lib/api/http.ts`) at a backend returning known `predicted_class` / `predicted_label` triples.
2. Craft three JSON fixtures (or temporary dev-only mock of `predictScam`) for legit / warning / fraud.
3. Confirm **Reset Analysis** clears state and returns to the form (unchanged behavior).

### Unit Tests (optional follow-up)

- Pure functions `getRiskTier`, `confidencePercent` — add when the repo introduces a unit test runner for `lib/`.

## Performance Considerations

- No change to network or render performance; same single POST and client-side state.

## Migration Notes

- No database migration. Deploy order: **backend multiclass** already live → **FE-TICKET-001** merged → **this ticket** updates UI only.

## References

- Ticket: `cursor/project/tickets/FE-TICKET-002-result-views-three-class-routing.md`
- Dependency: `cursor/project/tickets/FE-TICKET-001-multiclass-api-types-and-client.md`
- Plan: `cursor/project/plan/2026-04-20-FE-TICKET-001-multiclass-api-types-and-client.md`
- Research: `cursor/project/research/2026-04-20-FE-TICKET-002-result-views-three-class-routing.md`
- Backend contract: `job-sentry-backend/app/schemas.py` (`PredictResponse`)
- Current UI: `job-sentry-frontend/app/page.tsx`
