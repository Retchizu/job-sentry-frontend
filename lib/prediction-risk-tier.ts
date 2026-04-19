import type { PredictResponse } from "@/lib/api/types";

export type RiskTier = "legit" | "warning" | "fraud";

/**
 * Maps multiclass API output to a single-post risk tier. If arrays are missing or
 * values are unrecognized, returns `"warning"` so we never falsely reassure.
 */
export function getRiskTier(result: PredictResponse): RiskTier {
  const cls = result.predicted_class[0];
  if (cls === 0) return "legit";
  if (cls === 1) return "warning";
  if (cls === 2) return "fraud";

  const label = result.predicted_label[0]?.trim().toLowerCase();
  if (label === "legit") return "legit";
  if (label === "warning") return "warning";
  if (label === "fraud") return "fraud";

  return "warning";
}

/** Winner probability (API `confidence`) as a 0–100 integer. */
export function confidencePercent(result: PredictResponse, index = 0): number {
  const p = result.confidence[index];
  if (typeof p !== "number" || !Number.isFinite(p)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(p * 100)));
}

export function triplePercents(
  result: PredictResponse,
  index = 0,
): { legit: number; warning: number; fraud: number } {
  function pct(v: unknown): number {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(v * 100)));
  }
  return {
    legit: pct(result.legit_probability[index]),
    warning: pct(result.warning_probability[index]),
    fraud: pct(result.fraud_probability[index]),
  };
}
