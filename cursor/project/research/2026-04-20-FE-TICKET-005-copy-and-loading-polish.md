---
date: 2026-04-20T06:08:53+08:00
researcher: Cursor Agent
git_commit: 3bd51b5463ee3dd73ea2c159653726a194a93458
branch: Riche
repository: job-sentry-frontend
topic: "Copy and loading polish (FE-TICKET-005)"
tags: [research, codebase, FE-TICKET-005, app/page.tsx, loading, copy, multiclass]
status: complete
last_updated: 2026-04-20
last_updated_by: Cursor Agent
---

# Research: Copy and loading polish (FE-TICKET-005)

**Date**: 2026-04-20T06:08:53+08:00  
**Researcher**: Cursor Agent  
**Git Commit**: `3bd51b5463ee3dd73ea2c159653726a194a93458`  
**Branch**: Riche  
**Repository**: job-sentry-frontend  

## Research Question

Document the codebase as it relates to `cursor/project/tickets/FE-TICKET-005-copy-and-loading-polish.md`: where hero copy, loading messages, and result headings live today; how they behave; and how they relate to three-class (`legit` / `warning` / `fraud`) routing.

## Summary

**Ticket `FE-TICKET-005`** targets an editorial pass on user-facing strings and the loading experience for the multiclass rollout, scoped primarily to **`app/page.tsx`** (`LOADING_STATUS_MESSAGES`, `LOADING_TIP_LINES`), optional hero framing (“Job Post Scam Check”), and result headings aligned with **FE-TICKET-002**. Deliverables are string updates only (no API contract changes).

**In the current working tree** (uncommitted changes present; `app/page.tsx` is modified relative to last commit), the main surface is consolidated in **`app/page.tsx`**:

- **Hero**: `<h1>` reads **“Job Post Scam Check”** with a subtitle about AI analysis for scam patterns and inconsistent compensation.
- **Loading**: **`LoadingFrame`** shows **“Analyzing job post”** with animated ellipsis, a rotating **`LOADING_STATUS_MESSAGES`** carousel (eight strings), a timed progress bar driven by **`minDurationMs`** (from **`estimateLoadingDurationMs`**, 3000–5000 ms), duration hint copy, and staggered **`LOADING_TIP_LINES`** (five bullets). The last status line and last tip line already mention a multi-signal / “risk signals” style summary.
- **Results**: After **`getRiskTier`** (`lib/prediction-risk-tier.ts`) selects **`fraud`**, **`warning`**, or **`legit`**, **`FraudResultView`**, **`WarningResultView`**, or **`LooksSafeResultView`** render. All three use the same page **`<h1>`**: **“Prediction Results”**. Tier-specific copy appears in the card badge (**“Fraud risk”**, **“Review carefully”**, **“Looks Safe”**) and in breakdown bullets. **`ProbabilityBreakdown`** always shows **“Model estimates: Legit … · Warning … · Fraud …”**.

**Related UI outside the ticket’s primary file**: **`app/improvement/page.tsx`** uses tier labels **Legit / Warning / Fraud** and helper text that names **“legit, warning, or fraud.”**

**Metadata**: There is no `hack/spec_metadata.sh` in this workspace; git metadata was collected from `job-sentry-frontend`. Line numbers and quoted strings reflect files as read during this research (working tree).

## Detailed Findings

### Ticket source (`FE-TICKET-005`)

- File: `cursor/project/tickets/FE-TICKET-005-copy-and-loading-polish.md`
- Scope lists `app/page.tsx` loading constants, optional hero rename/subtitle, and result headings as an editorial pass dependent on FE-TICKET-002.
- Acceptance criteria: copy consistent with three-class behavior; no required functional changes beyond tiny label/constant renames.

### Hero copy (`app/page.tsx`)

- The home frame (when not loading and no prediction) includes the hero **`<h1>`** and supporting paragraph describing AI analysis for scam patterns, suspicious language, and inconsistent compensation (`app/page.tsx` around lines 166–172 in the current file).

### Loading experience (`LoadingFrame`, `app/page.tsx`)

- **`estimateLoadingDurationMs`** (`app/page.tsx` ~79–92): Computes a duration in **3000–5000 ms** from character count and filled fields; comment states minimum time 3–5s so copy can cycle.
- **`Home`**: On submit, sets **`loadingDurationMs`**, shows **`LoadingFrame`** while **`isSubmitting`** is true (~137–139).
- **`LOADING_STATUS_MESSAGES`** (~585–594): Eight `as const` strings; content focuses on scam-pattern checks, high-risk phrases, compensation review, pressure tactics, off-platform/fees, sensitive data, scam templates, and synthesizing signals for the result.
- **`LOADING_TIP_LINES`** (~596–602): Five `as const` strings describing parsing fields, company alignment, rate verification, weighting longer posts, and **“Building your risk signals for the final summary.”**
- **`LoadingFrame`** (~604–755):
  - **`statusIndex`** rotates via **`setInterval`**; step is **`max(900, floor(minDurationMs / LOADING_STATUS_MESSAGES.length))`** (~613–621).
  - Status lines render in an **`aria-live="polite"`** region with cross-fade / slide transitions (~679–694).
  - Title line: **“Analyzing job post”** with animated dots (~658–678).
  - Progress bar animation duration is **`minDurationMs`** (~697–708).
  - Subtext explains duration scales with input (~711–714).
  - Tip lines use CSS animation delays **`180 + i * 160` ms** (~716–729).

### Three-class routing and result copy (`app/page.tsx`, `lib/prediction-risk-tier.ts`)

- **`getRiskTier`** maps **`predicted_class[0]`** `0` / `1` / `2` to **`legit`** / **`warning`** / **`fraud`**, with **`predicted_label[0]`** string fallback; default **`warning`** if unknown (`lib/prediction-risk-tier.ts` ~9–21).
- **`Home`** branches to **`FraudResultView`**, **`WarningResultView`**, or **`LooksSafeResultView`** based on tier (~141–155).
- Shared **`<h1>`** for all result views: **“Prediction Results”** (~344–348, ~433–437, ~520–524).
- Badge titles: **“Looks Safe”** (~357), **“Review carefully”** (~446), **“Fraud risk”** (~535).
- **`ProbabilityBreakdown`**: **“Model estimates: Legit {n}% · Warning {n}% · Fraud {n}%”** (~73–75), using **`triplePercents`** from **`lib/prediction-risk-tier.ts`** (~32–47).
- **`WARNING_LABELS`** / **`formatWarningCode`**: human-readable heuristic labels (~18–29).
- Fraud/warning breakdown fallback strings when no heuristic codes: fraud-specific and warning-specific wording (~458–463, ~547–552).

### Improvement / feedback copy (`app/improvement/page.tsx`)

- Tier options: **Legit**, **Warning**, **Fraud** (~24–26).
- Field helper: **“Your overall risk tier for this posting (legit, warning, or fraud).”** (~225).

## Code References

- `app/page.tsx` — Hero, submit/loading flow, three result views, `LOADING_STATUS_MESSAGES`, `LOADING_TIP_LINES`, `LoadingFrame`.
- `lib/prediction-risk-tier.ts` — `getRiskTier`, `confidencePercent`, `triplePercents`.
- `app/improvement/page.tsx` — Reviewer risk tier labels and helper text.

## Architecture Documentation

- User-facing copy for the main check flow is largely **colocated in `app/page.tsx`** (single file for home, loading, and result views).
- Multiclass semantics in the UI are expressed through **`getRiskTier`**, per-view badge strings, shared **`ProbabilityBreakdown`**, and **`warnings[0]`** heuristic display.

## Historical Context (from cursor/project/)

- `cursor/project/tickets/FE-TICKET-005-copy-and-loading-polish.md` — Ticket definition and acceptance criteria.
- `cursor/project/tickets/README.md` — Lists FE-TICKET-005 as optional polish after multiclass integration; references backend TICKET-005 / TICKET-008.
- `cursor/project/plan/2026-04-20-FE-TICKET-002-result-views-three-class-routing.md` — Planning doc for three-class result routing (related dependency).

## Related Research

- `cursor/project/research/2026-04-20-FE-TICKET-002-result-views-three-class-routing.md` — Earlier research on result views and routing (note: that document’s snapshot of `app/page.tsx` at commit time may differ from the current working tree).

## GitHub permalinks (commit `3bd51b5463ee3dd73ea2c159653726a194a93458`)

Repository: [Retchizu/job-sentry-frontend](https://github.com/Retchizu/job-sentry-frontend). The paths below point at **committed** content; the working tree may differ where files are modified.

- [app/page.tsx](https://github.com/Retchizu/job-sentry-frontend/blob/3bd51b5463ee3dd73ea2c159653726a194a93458/app/page.tsx) (last committed version)

## Open Questions

- None for documenting current layout; product choices for FE-TICKET-005 (exact hero wording, whether to differentiate the shared **“Prediction Results”** `<h1>` per tier) are outside codebase documentation.
