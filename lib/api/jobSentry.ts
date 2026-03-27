import { requestJson } from "@/lib/api/http";
import type {
  HealthResponse,
  PredictRequest,
  PredictResponse,
  ServiceInfoResponse,
} from "@/lib/api/types";

export function getServiceInfo(): Promise<ServiceInfoResponse> {
  return requestJson<ServiceInfoResponse>("/");
}

export function getHealth(): Promise<HealthResponse> {
  return requestJson<HealthResponse>("/health");
}

export function predictScam(payload: PredictRequest): Promise<PredictResponse> {
  return requestJson<PredictResponse>("/predict", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
