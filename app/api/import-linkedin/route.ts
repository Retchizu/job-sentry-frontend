import { NextResponse } from "next/server";

import type { JobPostFormState } from "@/lib/job-post-form";
import {
  isLikelyLinkedInBlocked,
  linkedInGuestPostingUrl,
  normalizeLinkedInJobUrl,
  parseLinkedInJobHtml,
} from "@/lib/linkedin-import";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const MAX_BYTES = 1_500_000;

function isAllowedLinkedInHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "www.linkedin.com" || h === "linkedin.com" || h.endsWith(".linkedin.com");
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

  const n = normalizeLinkedInJobUrl(urlRaw);
  if ("error" in n) {
    return NextResponse.json({ ok: false as const, error: n.error }, { status: 400 });
  }
  const { id, url: canonical } = n;

  const fetchUrl = linkedInGuestPostingUrl(id);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  let res: Response;
  try {
    res = await fetch(fetchUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json(
      { ok: false as const, error: "Could not reach LinkedIn. Try again in a moment." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }

  const finalUrl = new URL(res.url);
  if (!isAllowedLinkedInHost(finalUrl.hostname)) {
    return NextResponse.json({ ok: false as const, error: "Unexpected redirect host." }, { status: 502 });
  }

  if (!res.ok) {
    if (res.status === 429 || res.status === 999 || res.status === 403) {
      return NextResponse.json(
        {
          ok: false as const,
          error:
            "LinkedIn throttled this request (they block automated fetches even for public job pages). Open the job in your browser, then copy the title and description into the form below, or try again in a few minutes.",
        },
        { status: 502 },
      );
    }
    if (res.status === 404 || res.status === 410) {
      return NextResponse.json(
        {
          ok: false as const,
          error: "This LinkedIn job is no longer available (it may have been closed or removed).",
        },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { ok: false as const, error: `LinkedIn returned HTTP ${res.status}.` },
      { status: 502 },
    );
  }

  const lenHeader = res.headers.get("content-length");
  if (lenHeader != null) {
    const nBytes = parseInt(lenHeader, 10);
    if (Number.isFinite(nBytes) && nBytes > MAX_BYTES) {
      return NextResponse.json({ ok: false as const, error: "Response too large." }, { status: 502 });
    }
  }

  const html = await res.text();
  if (html.length > MAX_BYTES) {
    return NextResponse.json({ ok: false as const, error: "Response too large." }, { status: 502 });
  }

  if (isLikelyLinkedInBlocked(html)) {
    return NextResponse.json(
      {
        ok: false as const,
        error:
          "LinkedIn asked our server to sign in (authwall) instead of returning the job. Open the job in your browser and paste the title and description into the form below.",
      },
      { status: 422 },
    );
  }

  const canonicalUrl = `${canonical.origin}${canonical.pathname}`;
  const fields: Partial<JobPostFormState> = parseLinkedInJobHtml(html, canonicalUrl);

  if (!fields.jobTitle && !fields.jobDescription) {
    return NextResponse.json(
      {
        ok: false as const,
        error:
          "Could not read this LinkedIn page as a job listing. Confirm it is a public job URL (/jobs/view/<id>/) and try again, or paste the text manually.",
      },
      { status: 422 },
    );
  }

  console.log("[import-linkedin] scraped", { sourceUrl: canonicalUrl, id, fields });

  return NextResponse.json({ ok: true as const, fields });
}
