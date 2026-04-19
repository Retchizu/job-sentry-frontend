# FE-TICKET-004 — Product decision

**Date:** 2026-04-20  
**Status:** Agreed for implementation planning

## Decision

- **User-supplied labels in the improvement flow will be three-class** for v1 of FE-TICKET-004: **legit**, **warning**, and **fraud**, aligned with multiclass training targets (indices **0 / 1 / 2**).
- **Storage:** persist as **`user_risk_class`** (`smallint`, `0|1|2`) on `public.job_postings`. Keep **`fraudulent`** as a **derived** `0|1` column with **`fraudulent = 1` iff `user_risk_class = 2`**, so existing binary CSV tooling and benchmarks that read **`fraudulent`** remain valid.
- **Legacy data:** rows created under the old boolean model are backfilled to **`user_risk_class` 0 or 2** only (no historical reviewer “warning” tier). Heuristic **warning flags** in the **`warnings`** JSON remain separate from the reviewer’s three-class label.
- **Backend:** `datasets_row_merge.derive_labels` / training **`risk_class`** will prefer **`user_risk_class`** when present (see implementation plan).

## Reference

- Implementation plan: `cursor/project/plan/2026-04-20-FE-TICKET-004-improvement-feedback-three-class.md`
