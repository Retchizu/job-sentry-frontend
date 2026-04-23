import { NextResponse } from "next/server";

import type { JobPostFormState } from "@/lib/job-post-form";
import {
  normalizeOnlineJobsJobUrl,
  parseOnlineJobsJobDetailHtml,
} from "@/lib/onlinejobs-ph-import";

const USER_AGENT =
  "Mozilla/5.0 (compatible; JobSentry/1.0; +https://github.com/job-sentry/job-sentry-frontend)";
const MAX_BYTES = 1_500_000;

function isAllowedOnlineJobsHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "www.onlinejobs.ph" || h === "onlinejobs.ph";
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false as const, error: "Expected JSON body." }, { status: 400 });
  }

  const urlRaw =
    typeof body === "object" && body !== null && "url" in body && typeof (body as { url: unknown }).url === "string"
      ? (body as { url: string }).url
      : "";

  const normalized = normalizeOnlineJobsJobUrl(urlRaw);
  if (normalized == null) {
    return NextResponse.json(
      {
        ok: false as const,
        error: "Enter a job link from onlinejobs.ph, e.g. https://www.onlinejobs.ph/jobseekers/job/…",
      },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  let res: Response;
  try {
    res = await fetch(normalized.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json(
      { ok: false as const, error: "Could not reach OnlineJobs.ph. Try again in a moment." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }

  const finalUrl = new URL(res.url);
  if (!isAllowedOnlineJobsHost(finalUrl.hostname)) {
    return NextResponse.json({ ok: false as const, error: "Unexpected redirect host." }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { ok: false as const, error: `OnlineJobs.ph returned HTTP ${res.status}.` },
      { status: 502 },
    );
  }

  const lenHeader = res.headers.get("content-length");
  if (lenHeader != null) {
    const n = parseInt(lenHeader, 10);
    if (Number.isFinite(n) && n > MAX_BYTES) {
      return NextResponse.json({ ok: false as const, error: "Response too large." }, { status: 502 });
    }
  }

  const html = await res.text();
  if (html.length > MAX_BYTES) {
    return NextResponse.json({ ok: false as const, error: "Response too large." }, { status: 502 });
  }

  const canonical = `${normalized.origin}${normalized.pathname}`;
  const fields: Partial<JobPostFormState> = parseOnlineJobsJobDetailHtml(html, canonical);

  if (!fields.jobTitle && !fields.jobDescription) {
    return NextResponse.json(
      {
        ok: false as const,
        error:
          "Could not read this page as a job listing. Open the job in your browser, copy the URL from the address bar, and try again.",
      },
      { status: 422 },
    );
  }

  console.log("[import-onlinejobs] scraped", { sourceUrl: canonical, fields });

  return NextResponse.json({ ok: true as const, fields });
}
