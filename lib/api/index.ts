export { getApiBaseUrl, requestJson } from "@/lib/api/http";
export { getHealth, getServiceInfo, predictScam } from "@/lib/api/jobSentry";
export type {
  ApiError,
  HealthResponse,
  PredictPost,
  PredictRate,
  PredictRateType,
  PredictRequest,
  PredictResponse,
  ServiceInfoResponse,
} from "@/lib/api/types";
