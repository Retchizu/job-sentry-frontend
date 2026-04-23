/**
 * Runs the same persistence path as saveImprovementFeedback (actions.ts) +
 * insertJobPostingFromPost, without importing server-only modules.
 *
 * Usage (from repo root):
 *   npx tsx scripts/seed-improvement-batch.ts
 *   npx tsx scripts/seed-improvement-batch.ts scripts/improvement-seed-data-extra-80.json
 *   npx tsx scripts/seed-improvement-batch.ts scripts/improvement-seed-data-extra-100.json
 *   npx tsx scripts/seed-improvement-batch.ts scripts/improvement-seed-data-extra-100-batch2.json
 *   npx tsx scripts/seed-improvement-batch.ts scripts/improvement-seed-data-extra-200.json
 *   npx tsx scripts/seed-improvement-batch.ts scripts/improvement-seed-data-extra-500.json
 *   npx tsx scripts/seed-improvement-batch.ts scripts/improvement-seed-data-onlinejobs.json
 *   npx tsx scripts/seed-improvement-batch.ts scripts/improvement-seed-data-onlinejobs-500.json
 *   npx tsx scripts/seed-improvement-batch.ts scripts/improvement-seed-data-onlinejobs-500-alt.json
 *   npx tsx scripts/seed-improvement-batch.ts scripts/improvement-seed-data-noisy-1000.json
 *   npx tsx scripts/seed-improvement-batch.ts scripts/improvement-seed-data-noisy-1000-fresh.json
 *   npx tsx scripts/seed-improvement-batch.ts scripts/improvement-seed-data-noisy-1000-fresh-2.json
 *   npx tsx scripts/seed-improvement-batch.ts scripts/improvement-seed-data-upwork-60.json
 *
 * `improvement-seed-data.json` is the baseline batch; `improvement-seed-data-extra-80.json` is an
 * additional batch so you can seed it once without re-inserting the baseline (each run inserts
 * every row in the chosen file — no deduplication).
 * Loads `scripts/../.env` when variables are not already set.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { reviewerRiskLabelToStorage, type ImprovementFeedbackRequest } from "../lib/api/types";

/**
 * Minimal schema for this script only (`lib/supabase/database.types.ts` is not generated yet).
 * Keeps `.insert()` typed (explicit `SeedDatabase`, not `ReturnType<typeof createClient>`).
 */
type JobPostingRow = {
  id: string;
  job_title: string | null;
  job_desc: string | null;
  skills_desc: string | null;
  company_profile: string | null;
  rate_min: number | null;
  rate_max: number | null;
  currency: string | null;
  rate_type: string | null;
  fraudulent: number;
  user_risk_class: number;
  warnings: string | null;
};

type SeedDatabase = {
  public: {
    Tables: {
      job_postings: {
        Row: JobPostingRow;
        Insert: Omit<JobPostingRow, "id"> & { id?: string };
        Update: Partial<Omit<JobPostingRow, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const RATE_TYPES = new Set(["hourly", "daily", "weekly", "monthly", "yearly"]);

function normalizeRateType(type: string | undefined): string | null {
  if (type == null || type === "") return null;
  const lower = type.toLowerCase();
  if (!RATE_TYPES.has(lower)) {
    return null;
  }
  return lower;
}

function buildWarningsColumnJson(payload: ImprovementFeedbackRequest): string | null {
  const flags = payload.warning_flags;
  if (flags.length === 0) return null;
  const hasOther = flags.includes("other_suspicious_patterns");
  const trimmedNote = payload.warnings?.trim() ?? "";
  const note = hasOther ? (trimmedNote || null) : null;
  return JSON.stringify({ flags, note });
}

async function saveImprovementFeedback(
  supabase: SupabaseClient<SeedDatabase, "public", "public">,
  payload: ImprovementFeedbackRequest,
): Promise<{ ok: true; jobPostingId: string } | { ok: false; message: string }> {
  const { fraudulent, user_risk_class } = reviewerRiskLabelToStorage(payload.labeled_risk);
  const warnings = buildWarningsColumnJson(payload);
  const post = payload.post;
  const rate = post.rate;
  const rateType = rate ? normalizeRateType(rate.type) : null;

  if (rate && rateType === null) {
    return { ok: false, message: "Invalid rate type." };
  }

  const warningsCol = warnings != null && warnings !== "" ? warnings : null;
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
    user_risk_class,
    warnings: warningsCol,
  };

  const { data, error } = await supabase.from("job_postings").insert(row).select("id").single();

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data?.id) {
    return { ok: false, message: "Insert did not return an id." };
  }
  return { ok: true, jobPostingId: data.id };
}

function requireEnv(name: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing ${name}. Set it in .env (see .env.example).`);
  }
  return value;
}

/** Minimal .env loader so `npx tsx` picks up secrets without `--env-file`. */
function loadDotEnvIfNeeded() {
  const p = join(process.cwd(), ".env");
  try {
    const raw = readFileSync(p, "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  } catch {
    // no .env file
  }
}

async function main() {
  loadDotEnvIfNeeded();
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);

  const supabase = createClient<SeedDatabase>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const arg = process.argv[2]?.trim();
  const dataPath =
    arg && arg.length > 0
      ? arg.startsWith("/")
        ? arg
        : join(process.cwd(), arg)
      : join(process.cwd(), "scripts/improvement-seed-data.json");
  const items = JSON.parse(readFileSync(dataPath, "utf8")) as ImprovementFeedbackRequest[];

  let ok = 0;
  const failures: { index: number; message: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = await saveImprovementFeedback(supabase, items[i]);
    if (result.ok) {
      ok++;
      console.log(`[${i + 1}/${items.length}] inserted id=${result.jobPostingId}`);
    } else {
      failures.push({ index: i, message: result.message });
      console.error(`[${i + 1}/${items.length}] FAILED: ${result.message}`);
    }
  }

  console.log(`\nDone: ${ok} ok, ${failures.length} failed`);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
