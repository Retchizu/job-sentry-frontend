"use server";

import { reviewerRiskLabelToStorage, type ImprovementFeedbackRequest } from "@/lib/api/types";
import { insertJobPostingFromPost } from "@/lib/supabase/insert-job-posting";

export type SaveImprovementFeedbackResult =
  | { ok: true; jobPostingId: string }
  | { ok: false; message: string };

/** Builds `job_postings.warnings` JSON: flags + optional note for "other suspicious patterns". */
function buildWarningsColumnJson(payload: ImprovementFeedbackRequest): string | null {
  const flags = payload.warning_flags;
  if (flags.length === 0) return null;
  const hasOther = flags.includes("other_suspicious_patterns");
  const trimmedNote = payload.warnings?.trim() ?? "";
  const note = hasOther ? (trimmedNote || null) : null;
  return JSON.stringify({ flags, note });
}

export async function saveImprovementFeedback(
  payload: ImprovementFeedbackRequest,
): Promise<SaveImprovementFeedbackResult> {
  const { fraudulent, user_risk_class } = reviewerRiskLabelToStorage(payload.labeled_risk);
  const warnings = buildWarningsColumnJson(payload);
  const result = await insertJobPostingFromPost(payload.post, fraudulent, user_risk_class, {
    warnings,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, jobPostingId: result.id };
}
