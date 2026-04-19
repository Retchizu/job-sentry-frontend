export interface ServiceInfoResponse {
  service: string;
  version: string;
  docs: string;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  model_loaded: boolean;
  mode: string;
  /** Null when no artifact is loaded (e.g. degraded health). */
  artifact_path: string | null;
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
  /** Risk class per post: 0 = legit, 1 = warning, 2 = fraud. */
  predicted_class: number[];
  /** Per post: `"legit"`, `"warning"`, or `"fraud"`. */
  predicted_label: string[];
  legit_probability: number[];
  warning_probability: number[];
  fraud_probability: number[];
  /** Max of the three softmax probabilities per post (winner probability). */
  confidence: number[];
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

/** Shape of `job_postings.warnings` JSON (improvement feedback). */
export interface ImprovementWarningsStored {
  flags: ImprovementWarningFlag[];
  /** Present when `other_suspicious_patterns` is in `flags`; null if unchecked or empty after trim. */
  note: string | null;
}

/** Reviewer-supplied risk label for improvement feedback; aligns with `predicted_label` strings. */
export type ReviewerRiskLabel = "legit" | "warning" | "fraud";

/** Stored on `job_postings.user_risk_class` (same indices as `PredictResponse.predicted_class`). */
export type UserRiskClass = 0 | 1 | 2;

/** Maps UI label to DB columns: `user_risk_class` and derived binary `fraudulent` (1 iff fraud). */
export function reviewerRiskLabelToStorage(label: ReviewerRiskLabel): {
  user_risk_class: UserRiskClass;
  fraudulent: 0 | 1;
} {
  const user_risk_class: UserRiskClass = label === "legit" ? 0 : label === "warning" ? 1 : 2;
  return { user_risk_class, fraudulent: user_risk_class === 2 ? 1 : 0 };
}

export interface ImprovementFeedbackRequest {
  post: PredictPost;
  warning_flags: ImprovementWarningFlag[];
  /** Free text when `other_suspicious_patterns` is checked; stored inside `job_postings.warnings` JSON. */
  warnings?: string;
  /** Human label for training; persisted as `user_risk_class` and derived `fraudulent`. */
  labeled_risk: ReviewerRiskLabel;
}
