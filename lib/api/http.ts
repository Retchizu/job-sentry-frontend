import type { ApiError } from "@/lib/api/types";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  return baseUrl && baseUrl.trim().length > 0 ? baseUrl : DEFAULT_API_BASE_URL;
}

function toApiError(error: Partial<ApiError> & Pick<ApiError, "message">): ApiError {
  return {
    status: error.status ?? 0,
    code: error.code ?? "UNKNOWN_ERROR",
    message: error.message,
    details: error.details,
  };
}

async function parseErrorPayload(response: Response): Promise<{ message: string; details?: unknown }> {
  const text = await response.text();

  if (!text) {
    return { message: response.statusText || "Request failed" };
  }

  try {
    const json = JSON.parse(text) as { message?: string; detail?: unknown };
    return {
      message:
        typeof json.message === "string"
          ? json.message
          : typeof json.detail === "string"
            ? json.detail
            : response.statusText || "Request failed",
      details: json.detail ?? json,
    };
  } catch {
    return { message: text };
  }
}

export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = new URL(path, baseUrl).toString();

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init.headers,
      },
    });

    if (!response.ok) {
      const parsedError = await parseErrorPayload(response);
      throw toApiError({
        status: response.status,
        code: `HTTP_${response.status}`,
        message: parsedError.message,
        details: parsedError.details,
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    const maybeApiError = error as Partial<ApiError>;
    if (
      maybeApiError &&
      typeof maybeApiError.message === "string" &&
      typeof maybeApiError.code === "string" &&
      typeof maybeApiError.status === "number"
    ) {
      throw maybeApiError as ApiError;
    }

    throw toApiError({
      code: "NETWORK_ERROR",
      message: error instanceof Error ? error.message : "Network request failed",
      details: error,
    });
  }
}
