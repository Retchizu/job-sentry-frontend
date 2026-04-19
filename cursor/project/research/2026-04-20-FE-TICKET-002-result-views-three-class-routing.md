---
date: 2026-04-20T05:23:21+08:00
researcher: Cursor Agent
git_commit: 3bd51b5463ee3dd73ea2c159653726a194a93458
branch: Riche
repository: job-sentry-frontend
topic: "Result views and three-class routing (FE-TICKET-002)"
tags: [research, codebase, app/page.tsx, PredictResponse, FE-TICKET-002, multiclass]
status: complete
last_updated: 2026-04-20
last_updated_by: Cursor Agent
---

# Research: Result views and three-class routing (FE-TICKET-002)

**Date**: 2026-04-20T05:23:21+08:00  
**Researcher**: Cursor Agent  
**Git Commit**: `3bd51b5463ee3dd73ea2c159653726a194a93458`  
**Branch**: Riche  
**Repository**: job-sentry-frontend  

## Research Question

Document the codebase as it relates to `cursor/project/tickets/FE-TICKET-002-result-views-three-class-routing.md`: how prediction results are routed in the UI today, how that compares to the ticket’s three-class objectives, and how it connects to API types and the `/predict` client.

## Summary

**Ticket intent (`FE-TICKET-002`)** is to replace binary “high risk vs looks safe” branching with **three** outcomes driven by `predicted_label[0]` / `predicted_class[0]` (**fraud**, **warning**, **legit**), use **`confidence[0]`** (and optionally all three softmax probabilities) instead of `scam_probabilities`-based helpers, remove **`predicted_scam`**, **`scam_probabilities`**, and **`threshold`** from `app/page.tsx`, and keep **`warnings[0]`** wired for each tier.

**At git HEAD** (`3bd51b5`), `app/page.tsx` implements **binary** routing only: it branches on `predictionResult?.predicted_scam?.[0] === true` to choose `HighRiskResultView` vs `LooksSafeResultView`, and uses `scamConfidencePercent` / `safeConfidencePercent` based on `result.scam_probabilities[0]`. There is **no** separate “warning” tier view. **`lib/api/types.ts`** at HEAD defines a **binary** `PredictResponse` (`scam_probabilities`, `predicted_scam`, `threshold`, `warnings`), which is **consistent** with `page.tsx` for those field names.

**In the current working tree** (uncommitted changes), `lib/api/types.ts` and `lib/api/jobSentry.ts` have been updated toward the **multiclass** contract (`predicted_class`, `predicted_label`, per-class probability arrays, `confidence`, `warnings`), while **`app/page.tsx` is unchanged** and still references `scam_probabilities` and `predicted_scam`. Running `npx tsc --noEmit` in this state reports **type errors** on `app/page.tsx` for those missing properties (and a separate typo error in `app/improvement/page.tsx`). That reflects the ticket’s stated dependency: **FE-TICKET-001** (types/client) ahead of **FE-TICKET-002** (page routing and views).

There is **no** `hack/spec_metadata.sh` script in this workspace; metadata was gathered with `git` and `gh` in `job-sentry-frontend`.

## Detailed Findings

### Ticket `FE-TICKET-002` (source of requirements)

- File: `cursor/project/tickets/FE-TICKET-002-result-views-three-class-routing.md`
- **Routing rules (specified):**
  - **fraud**: `predicted_class === 2` or `predicted_label === "fraud"` — reuse/extend current high-risk visual tier.
  - **warning**: new intermediate screen (amber / “review carefully”).
  - **legit**: green “looks safe” path.
- **Confidence:** replace `scamConfidencePercent` / `safeConfidencePercent` with **`confidence[0]`**; optional display of all three probabilities.
- **Heuristics:** keep `warnings[0]` display; wire for warning and fraud tiers.
- **Acceptance:** no `predicted_scam`, `scam_probabilities`, or `threshold` in `app/page.tsx`; three distinct result states for legit, warning, and fraud.
- **Dependency:** FE-TICKET-001 merged (types and client).

### `app/page.tsx` — view routing and result components (committed behavior)

The default export `Home` uses **React state** only (no URL routes): `isSubmitting` shows `LoadingFrame`; then if `predictionResult` is set, the component chooses between two result views or falls through to the form.

- **High risk:** `predictionResult?.predicted_scam?.[0] === true` → `HighRiskResultView` ([`app/page.tsx` lines 137–145](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/app/page.tsx#L137-L145)).
- **Otherwise non-null result:** `LooksSafeResultView` ([`app/page.tsx` lines 147–155](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/app/page.tsx#L147-L155)).
- **Confidence helpers:** `scamConfidencePercent` reads `result.scam_probabilities[0]` ([lines 30–36](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/app/page.tsx#L30-L36)); `safeConfidencePercent` returns `100 - scamConfidencePercent` ([lines 38–41](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/app/page.tsx#L38-L41)).
- **`HighRiskResultView`:** shows “High Risk Detected”, scam confidence %, and `result.warnings[0]` via `WARNING_LABELS` / `formatWarningCode` ([`app/page.tsx` ~392–478](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/app/page.tsx#L392-L478)).
- **`LooksSafeResultView`:** shows “Looks Safe” and safe confidence %; breakdown copy is static (not driven by `warnings` in the same way as high risk) ([`app/page.tsx` ~309–390](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/app/page.tsx#L309-L390)).

### `lib/api` — types and `predictScam`

- **At HEAD:** `PredictResponse` in [`lib/api/types.ts`](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/lib/api/types.ts) is binary (`scam_probabilities`, `predicted_scam`, `threshold`, `warnings`). [`lib/api/jobSentry.ts`](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/lib/api/jobSentry.ts) normalizes only `warnings` when missing.
- **Working tree (uncommitted):** `PredictResponse` includes multiclass fields (`predicted_class`, `predicted_label`, `legit_probability`, `warning_probability`, `fraud_probability`, `confidence`, `warnings`); `normalizePredictResponse` fills parallel arrays when absent. This matches the direction described in `FE-TICKET-001` / `FE-TICKET-002` but leaves **`app/page.tsx`** out of sync until FE-TICKET-002 is implemented.

### API documentation in-repo

- [`cursor/project/docs/frontend-api-endpoints.md`](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/cursor/project/docs/frontend-api-endpoints.md) still documents a **binary** `/predict` example (`scam_probabilities`, `predicted_scam`, etc.). Ticket **FE-TICKET-003** (per related project tickets) targets updating that doc to the multiclass shape.

## Code References

- `job-sentry-frontend/app/page.tsx:30-41` — `scamConfidencePercent` / `safeConfidencePercent` using `scam_probabilities`
- `job-sentry-frontend/app/page.tsx:137-155` — binary branch: `predicted_scam[0]` → `HighRiskResultView` vs `LooksSafeResultView`
- `job-sentry-frontend/lib/api/index.ts` — re-exports `predictScam`, `PredictResponse`
- Git HEAD `job-sentry-frontend/lib/api/types.ts` — binary `PredictResponse` definition (matches `page.tsx` field names)
- Working tree `job-sentry-frontend/lib/api/types.ts` — multiclass `PredictResponse` (mismatched with `page.tsx` until FE-TICKET-002)

## Architecture Documentation

- **Result “routing”** for predictions is **conditional rendering inside `Home`**, not Next.js file-based routes or `useRouter` paths.
- **Shared concerns:** `AppChromeHeader`, dark mode via `useAppDarkMode`, and `predictScam({ posts: [buildSinglePost(form)] })` for the request payload.

## Historical Context (from cursor/project/)

- `cursor/project/tickets/FE-TICKET-002-result-views-three-class-routing.md` — ticket scope and acceptance criteria for three-class UI routing.
- `cursor/project/tickets/FE-TICKET-001-multiclass-api-types-and-client.md` — types/client alignment; `app/page.tsx` explicitly out of scope for that ticket.
- `cursor/project/tickets/README.md` — describes ticket ordering (001 → 002 → 003 on the critical path).
- `cursor/project/plan/2026-04-20-FE-TICKET-001-multiclass-api-types-and-client.md` — notes TypeScript on `app/page.tsx` may break after `PredictResponse` changes until FE-TICKET-002.
- `cursor/project/research/2026-04-20-FE-TICKET-001-multiclass-api-types-and-client.md` — prior research at HEAD `3bd51b5` describing binary `lib/api` and `page.tsx` usage (superseded for `lib/api` **only** if/when FE-TICKET-001 lands in git).

## Related Research

- [`cursor/project/research/2026-04-20-FE-TICKET-001-multiclass-api-types-and-client.md`](2026-04-20-FE-TICKET-001-multiclass-api-types-and-client.md) — `lib/api` and downstream `page.tsx` references at time of that note.

## Open Questions

- None for documenting **current** layout; **FE-TICKET-002** itself defines the target behavior once dependencies are merged.
