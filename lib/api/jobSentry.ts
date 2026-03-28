import { requestJson } from "@/lib/api/http";
import type {
  HealthResponse,
  PredictRequest,
  PredictResponse,
  ServiceInfoResponse,
} from "@/lib/api/types";

/** Raw `/predict` body; `warnings` may be omitted on older servers. */
type PredictResponseBody = Omit<PredictResponse, "warnings"> & {
  warnings?: string[][];
};

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
  return {
    ...raw,
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
  };
}
