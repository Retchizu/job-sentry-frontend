import { requestJson } from "@/lib/api/http";
import type {
  HealthResponse,
  PredictRequest,
  PredictResponse,
  ServiceInfoResponse,
} from "@/lib/api/types";

/** Raw `/predict` body; parallel arrays may be omitted by partial or malformed JSON. */
type PredictResponseBody = Partial<PredictResponse>;

function normalizePredictResponse(raw: PredictResponseBody): PredictResponse {
  return {
    predicted_class: Array.isArray(raw.predicted_class) ? raw.predicted_class : [],
    predicted_label: Array.isArray(raw.predicted_label) ? raw.predicted_label : [],
    legit_probability: Array.isArray(raw.legit_probability) ? raw.legit_probability : [],
    warning_probability: Array.isArray(raw.warning_probability) ? raw.warning_probability : [],
    fraud_probability: Array.isArray(raw.fraud_probability) ? raw.fraud_probability : [],
    confidence: Array.isArray(raw.confidence) ? raw.confidence : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
  };
}

export function getServiceInfo(): Promise<ServiceInfoResponse> {
  return requestJson<ServiceInfoResponse>("/");
}

export function getHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/health");
}

export async function predictScam(payload: PredictRequest): Promise<PredictResponse> {
  const raw = await requestJson<PredictResponseBody>("/predict", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizePredictResponse(raw);
}
