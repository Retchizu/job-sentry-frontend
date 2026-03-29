import "server-only";

import type { PredictPost } from "@/lib/api/types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const RATE_TYPES = new Set(["hourly", "daily", "weekly", "monthly", "yearly"]);

export type InsertJobPostingResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

function normalizeRateType(type: string | undefined): string | null {
  if (type == null || type === "") return null;
  const lower = type.toLowerCase();
  if (!RATE_TYPES.has(lower)) {
    return null;
  }
  return lower;
}

/** 0 = not fraudulent, 1 = fraudulent (DB `smallint` check). */
export type FraudulentFlag = 0 | 1;

/**
 * Persists structured fields from a {@link PredictPost} into `public.job_postings`.
 * Uses the service-role client (server-only); table RLS has no anon policies.
 */
export async function insertJobPostingFromPost(
  post: PredictPost,
  fraudulent: FraudulentFlag,
  options?: { otherSuspiciousPatternsNote?: string | null },
): Promise<InsertJobPostingResult> {
  const rate = post.rate;
  const rateType = rate ? normalizeRateType(rate.type) : null;

  if (rate && rateType === null) {
    return { ok: false, message: "Invalid rate type." };
  }

  const note = options?.otherSuspiciousPatternsNote;
  const row = {
    job_title: post.job_title ?? null,
    job_desc: post.job_desc ?? null,
    skills_desc: post.skills_desc ?? null,
    company_profile: post.company_profile ?? null,
    rate_min: rate?.amount_min ?? null,
    rate_max: rate?.amount_max ?? null,
    currency: rate?.currency ?? null,
    rate_type: rateType,
    fraudulent,
    other_suspicious_patterns_note:
      note != null && note !== "" ? note : null,
  };

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from("job_postings").insert(row).select("id").single();

  if (error) {
    return { ok: false, message: error.message };
  }

  if (!data?.id) {
    return { ok: false, message: "Insert did not return an id." };
  }

  return { ok: true, id: data.id };
}
