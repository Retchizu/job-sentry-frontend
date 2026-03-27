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

export interface PredictResponse {
  scam_probabilities: number[];
  predicted_scam: boolean[];
  threshold: number;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}
