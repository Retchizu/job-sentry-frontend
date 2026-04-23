import type { JobPostFormState } from "@/lib/job-post-form";

function decodeHtml(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

function stripTagsCollapse(s: string): string {
  return decodeHtml(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/**
 * Converts a fragment of LinkedIn description HTML (typical tags: <p>, <br>, <ul>, <li>, <strong>)
 * into plain text while preserving paragraph / list breaks.
 */
function htmlDescriptionToText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(ul|ol|div|section)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeHtml(withBreaks)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * LinkedIn public job URLs show the numeric id at the very end of the `/jobs/view/...` path, either
 * alone (`/jobs/view/4123456789/`) or preceded by a slug (`/jobs/view/senior-engineer-at-acme-4123456789/`).
 * Search/feed pages carry it in `?currentJobId=...` instead and require login, so we accept that
 * shape only for the id extraction — the request still goes against the public guest endpoint.
 */
export function extractLinkedInJobId(u: URL): string | null {
  const host = u.hostname.toLowerCase();
  if (!host.endsWith("linkedin.com")) return null;

  const fromQuery = u.searchParams.get("currentJobId");
  if (fromQuery && /^\d{5,}$/.test(fromQuery)) return fromQuery;

  const path = u.pathname.replace(/\/+$/, "");
  const viewMatch = path.match(/\/jobs\/view\/(?:[^/]*?-)?(\d{5,})\/?$/i);
  if (viewMatch) return viewMatch[1];

  const idOnly = path.match(/\/(\d{8,})\/?$/);
  if (idOnly && /\/jobs\//i.test(path)) return idOnly[1];

  return null;
}

export function normalizeLinkedInJobUrl(input: string): { id: string; url: URL } | { error: string } {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return { error: "Invalid URL." };
  }
  const host = u.hostname.toLowerCase();
  if (!host.endsWith("linkedin.com")) {
    return { error: "URL must be on linkedin.com." };
  }
  const id = extractLinkedInJobId(u);
  if (!id) {
    return {
      error:
        "Could not find a LinkedIn job id. Use a public job URL like https://www.linkedin.com/jobs/view/<id>/ (open a job and copy from the address bar).",
    };
  }
  const canonical = new URL(`https://www.linkedin.com/jobs/view/${id}/`);
  return { id, url: canonical };
}

/** Public guest endpoint that returns an HTML fragment without requiring a logged-in session. */
export function linkedInGuestPostingUrl(id: string): string {
  return `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${id}`;
}

const CHALLENGE_TITLE_RE = /<title>\s*(?:Security Verification|Authwall|Sign Up\s*\|\s*LinkedIn)\s*<\/title>/i;
const AUTHWALL_RE = /window\.location\s*=\s*["']https:\/\/www\.linkedin\.com\/authwall/i;

export function isLikelyLinkedInBlocked(html: string): boolean {
  if (CHALLENGE_TITLE_RE.test(html)) return true;
  if (AUTHWALL_RE.test(html)) return true;
  return false;
}

function extractFirst(html: string, patterns: RegExp[]): string | undefined {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) {
      const text = stripTagsCollapse(m[1]);
      if (text) return text;
    }
  }
  return undefined;
}

function extractJobTitle(html: string): string | undefined {
  return extractFirst(html, [
    /<h2[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i,
    /<h1[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
    /<h3[^>]*class="[^"]*sub-nav-cta__header[^"]*"[^>]*>([\s\S]*?)<\/h3>/i,
  ]);
}

function extractCompanyName(html: string): string | undefined {
  return extractFirst(html, [
    /<a[^>]*class="[^"]*topcard__org-name-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
    /<span[^>]*class="[^"]*topcard__flavor[^"]*topcard__flavor--black-link[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  ]);
}

function extractLocation(html: string): string | undefined {
  const m = html.match(
    /<span[^>]*class="[^"]*topcard__flavor[^"]*topcard__flavor--bullet[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
  );
  if (m) {
    const text = stripTagsCollapse(m[1]);
    if (text) return text;
  }
  return undefined;
}

function extractDescriptionHtml(html: string): string | undefined {
  const m =
    html.match(/<div[^>]*class="[^"]*show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<section[^>]*class="[^"]*show-more-less-html[^"]*"[^>]*>([\s\S]*?)<\/section>/i) ||
    html.match(/<div[^>]*class="[^"]*description__text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  return m ? m[1] : undefined;
}

function extractCriteriaList(html: string): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  const listMatch = html.match(
    /<ul[^>]*class="[^"]*description__job-criteria-list[^"]*"[^>]*>([\s\S]*?)<\/ul>/i,
  );
  if (!listMatch) return out;
  const itemRe =
    /<li[^>]*class="[^"]*description__job-criteria-item[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  const headerRe =
    /<h3[^>]*class="[^"]*description__job-criteria-subheader[^"]*"[^>]*>([\s\S]*?)<\/h3>/i;
  const bodyRe =
    /<span[^>]*class="[^"]*description__job-criteria-text[^"]*"[^>]*>([\s\S]*?)<\/span>/i;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemRe.exec(listMatch[1])) !== null) {
    const block = itemMatch[1];
    const h = block.match(headerRe);
    const b = block.match(bodyRe);
    const label = h ? stripTagsCollapse(h[1]) : "";
    const value = b ? stripTagsCollapse(b[1]) : "";
    if (label && value) out.push({ label, value });
  }
  return out;
}

function extractMetaContent(
  html: string,
  key: "og:title" | "og:description" | "description",
): string | undefined {
  const attr = key === "description" ? "name" : "property";
  const first = new RegExp(
    `<meta[^>]+${attr}=["']${key.replace(":", "\\:")}["'][^>]+content=["']([^"']*)["']`,
    "i",
  ).exec(html);
  if (first) return decodeHtml(first[1]).trim() || undefined;
  const second = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${key.replace(":", "\\:")}["']`,
    "i",
  ).exec(html);
  if (second) return decodeHtml(second[1]).trim() || undefined;
  return undefined;
}

export function parseLinkedInJobHtml(
  html: string,
  canonicalUrl: string,
): Partial<JobPostFormState> {
  const jobTitle = extractJobTitle(html) ?? extractMetaContent(html, "og:title");

  const descHtml = extractDescriptionHtml(html);
  const jobDescription = descHtml
    ? htmlDescriptionToText(descHtml)
    : extractMetaContent(html, "og:description") ?? extractMetaContent(html, "description");

  const company = extractCompanyName(html);
  const location = extractLocation(html);
  const criteria = extractCriteriaList(html);

  const companyBits: string[] = [];
  if (company) companyBits.push(`Company: ${company}${location ? ` — ${location}` : ""}`);
  else if (location) companyBits.push(`Location: ${location}`);
  for (const c of criteria) {
    companyBits.push(`${c.label}: ${c.value}`);
  }
  companyBits.push(`Imported from LinkedIn — ${canonicalUrl}`);
  const companyProfile = companyBits.join("\n");

  const out: Partial<JobPostFormState> = {};
  if (jobTitle) out.jobTitle = jobTitle;
  if (jobDescription) out.jobDescription = jobDescription;
  if (companyProfile) out.companyProfile = companyProfile;
  return out;
}
