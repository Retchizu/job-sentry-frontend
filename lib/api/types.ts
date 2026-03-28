export interface ServiceInfoResponse {
  service: string;
  version: string;
  docs: string;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  model_loaded: boolean;
  mode: string;
  artifact_path: string;
  device: string;
  message: string | null;
}

export type PredictRateType = "hourly" | "daily" | "weekly" | "monthly" | "yearly";

export interface PredictRate {
  amount_min: number;
  amount_max: number;
  currency: string;
  type: PredictRateType;
}

export interface PredictPost {
  text?: string;
  job_title?: string;
  job_desc?: string;
  skills_desc?: string;
  company_profile?: string;
  rate?: PredictRate;
}

export interface PredictRequest {
  posts: PredictPost[];
}

/** Stable codes from rule-based heuristics (one list per post, same order as `posts`). */
export type PredictWarningCode =
  | "upfront_payment"
  | "off_platform_contact"
  | "high_pressure"
  | "guaranteed_income"
  | "crypto_or_gift_card"
  | "sensitive_info_request";

export interface PredictResponse {
  scam_probabilities: number[];
  predicted_scam: boolean[];
  threshold: number;
  /** One entry per post; each entry is an array of warning codes (may be empty). */
  warnings: string[][];
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

/** Training feedback payload assembled on the improvement page (local preview / future API). */
export type ImprovementWarningFlag =
  | "typographical_errors"
  | "excessive_punctuation"
  | "poor_grammar"
  | "other_suspicious_patterns";

export interface ImprovementFeedbackRequest {
  post: PredictPost;
  warning_flags: ImprovementWarningFlag[];
  labeled_scam: boolean;
}
