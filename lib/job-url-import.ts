export type JobImportSource = "onlinejobs" | "linkedin";

const API_PATH: Record<JobImportSource, string> = {
  onlinejobs: "/api/import-onlinejobs",
  linkedin: "/api/import-linkedin",
};

export function importApiPathForSource(source: JobImportSource): string {
  return API_PATH[source];
}

/** Add https:// when the user omitted the scheme so `new URL` can parse. */
function withScheme(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/**
 * Detects the job board from the URL host. Returns which API to call and a normalized URL string
 * to send in the request body.
 */
export function detectJobImportSource(
  input: string,
):
  | { source: JobImportSource; requestUrl: string }
  | { error: string } {
  const withProtocol = withScheme(input);
  if (!withProtocol) {
    return { error: "Enter a job URL first." };
  }
  let u: URL;
  try {
    u = new URL(withProtocol);
  } catch {
    return { error: "That URL is not valid." };
  }
  if (!u.hostname) {
    return { error: "That URL is not valid." };
  }
  const host = u.hostname.toLowerCase();
  if (host === "www.onlinejobs.ph" || host === "onlinejobs.ph") {
    u.protocol = "https:";
    return { source: "onlinejobs", requestUrl: u.toString() };
  }
  if (host === "www.linkedin.com" || host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    u.protocol = "https:";
    return { source: "linkedin", requestUrl: u.toString() };
  }
  return {
    error: `This domain is not supported for import (${host}). Use an OnlineJobs.ph or LinkedIn job link.`,
  };
}

export function sourceLabel(source: JobImportSource): string {
  if (source === "onlinejobs") return "OnlineJobs.ph";
  if (source === "linkedin") return "LinkedIn";
  return source;
}
