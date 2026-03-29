"use server";

import type { ImprovementFeedbackRequest } from "@/lib/api/types";
import { insertJobPostingFromPost } from "@/lib/supabase/insert-job-posting";

export type SaveImprovementFeedbackResult =
  | { ok: true; jobPostingId: string }
  | { ok: false; message: string };

export async function saveImprovementFeedback(
  payload: ImprovementFeedbackRequest,
): Promise<SaveImprovementFeedbackResult> {
  const fraudulent = payload.labeled_scam ? 1 : 0;
  const hasOtherFlag = payload.warning_flags.includes("other_suspicious_patterns");
  const trimmedNote = payload.other_suspicious_patterns_note?.trim() ?? "";
  const otherSuspiciousPatternsNote = hasOtherFlag
    ? trimmedNote || null
    : null;
  const result = await insertJobPostingFromPost(payload.post, fraudulent, {
    otherSuspiciousPatternsNote,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return { ok: true, jobPostingId: result.id };
}
