import type { PredictPost, PredictRateType } from "@/lib/api/types";

/** Rate type choices shown in the compensation UI (subset of API `PredictRateType`). */
export const RATE_TYPE_SELECT_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export type JobPostFormState = {
  jobTitle: string;
  jobDescription: string;
  skillsDescription: string;
  companyProfile: string;
  amountMin: string;
  amountMax: string;
  currency: string;
  rateType: string;
};

export const INITIAL_JOB_POST_FORM_STATE: JobPostFormState = {
  jobTitle: "",
  jobDescription: "",
  skillsDescription: "",
  companyProfile: "",
  amountMin: "",
  amountMax: "",
  currency: "",
  rateType: "",
};

export function toOptionalValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildSinglePost(form: JobPostFormState): PredictPost {
  const post: PredictPost = {};
  const job_title = toOptionalValue(form.jobTitle);
  const job_desc = toOptionalValue(form.jobDescription);
  const skills_desc = toOptionalValue(form.skillsDescription);
  const company_profile = toOptionalValue(form.companyProfile);

  if (job_title) post.job_title = job_title;
  if (job_desc) post.job_desc = job_desc;
  if (skills_desc) post.skills_desc = skills_desc;
  if (company_profile) post.company_profile = company_profile;

  const amountMin = toOptionalValue(form.amountMin);
  const amountMax = toOptionalValue(form.amountMax);
  const currency = toOptionalValue(form.currency);
  const rateType = toOptionalValue(form.rateType);

  if (amountMin && amountMax && currency && rateType) {
    const parsedMin = Number(amountMin);
    const parsedMax = Number(amountMax);
    if (Number.isFinite(parsedMin) && Number.isFinite(parsedMax)) {
      post.rate = {
        amount_min: parsedMin,
        amount_max: parsedMax,
        currency,
        type: rateType.toLowerCase() as PredictRateType,
      };
    }
  }

  return post;
}

export function hasJobPostText(form: JobPostFormState): boolean {
  return (
    form.jobTitle.trim().length > 0 ||
    form.jobDescription.trim().length > 0 ||
    form.skillsDescription.trim().length > 0 ||
    form.companyProfile.trim().length > 0
  );
}
