import type { JobPostFormState } from "@/lib/job-post-form";
import type { PredictRate, PredictRateType } from "@/lib/api/types";

function decodeHtml(s: string): string {
  return s
    .replace(/&#8230;/g, "…")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

/** Strip tags; collapse whitespace (for short fields like title / wage). */
function stripTags(s: string): string {
  return decodeHtml(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function htmlJobDescriptionToText(html: string): string {
  const noFilter = html.replace(/<ojfilter[^>]*>[\s\S]*?<\/ojfilter>/gi, "");
  const withBreaks = noFilter
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeHtml(withBreaks)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Many job posts embed an "about the employer" / "about the agency owner" section inside the
 * same `#job-description` block. This splits it out so the narrative can go to company profile.
 */
function splitDescriptionAndEmployerAbout(
  fullText: string,
): { job: string; employer: string } | null {
  const patterns: RegExp[] = [
    /(?:^|\n)\s*={3,}\s*\n\s*ABOUT THE (?:AGENCY OWNER|EMPLOYER|HIRING MANAGER)\s*\n\s*={3,}/im,
    /(?:^|\n)\s*ABOUT THE (?:AGENCY OWNER|EMPLOYER|HIRING MANAGER)\s*\n/im,
    /(?:^|\n)\s*={3,}\s*\n\s*ABOUT ME\s*\n\s*={3,}/im,
  ];

  let splitIndex: number | undefined;
  for (const p of patterns) {
    p.lastIndex = 0;
    const m = p.exec(fullText);
    if (m && m.index !== undefined) {
      splitIndex = m.index;
      break;
    }
  }
  if (splitIndex == null) return null;

  const before = fullText.slice(0, splitIndex).trim();
  const after = fullText.slice(splitIndex).trim();
  if (before.length === 0 || after.length === 0) return null;
  return { job: before, employer: after };
}

function trimEmployerSectionClosing(employerText: string): string {
  return employerText
    .replace(/\n\s*={3,}\s*\n\s*CLOSING\s*\n\s*={3,}[\s\S]*$/i, "")
    .trim();
}

/** Remove leading "===== / ABOUT THE … / =====" banner if present. */
function stripAboutEmployerHeadingBanners(employerText: string): string {
  return employerText
    .replace(
      /^\s*={3,}\s*\n+\s*ABOUT THE (?:AGENCY OWNER|EMPLOYER|HIRING MANAGER|ME)\s*\n+\s*={3,}\s*\n?/i,
      "",
    )
    .replace(/^\s*ABOUT THE (?:AGENCY OWNER|EMPLOYER|HIRING MANAGER|ME)\s*\n+/i, "")
    .trim();
}

function predictRateToCompensationFields(rate: PredictRate): Pick<
  JobPostFormState,
  "amountMin" | "amountMax" | "currency" | "rateType"
> {
  return {
    amountMin: String(rate.amount_min),
    amountMax: String(rate.amount_max),
    currency: rate.currency,
    rateType: rate.type,
  };
}

/**
 * Parses wage text as shown on OnlineJobs.ph job detail pages (e.g. "$4 per hour", "$400/month").
 * Extends the seed-script heuristics with common single-value monthly/hourly formats.
 */
export function parseOnlineJobsWageText(raw: string): Pick<
  JobPostFormState,
  "amountMin" | "amountMax" | "currency" | "rateType"
> | null {
  const t = raw.trim();
  if (!t || /^tbd$/i.test(t)) return null;

  const cur: "USD" | "SGD" = t.includes("SGD") ? "SGD" : "USD";

  const sgd = t.match(/SGD\s*\$?\s*([\d,]+)\s*(?:to|-|–)\s*\$?\s*([\d,]+)/i);
  if (sgd) {
    return predictRateToCompensationFields({
      amount_min: parseInt(sgd[1].replace(/,/g, ""), 10),
      amount_max: parseInt(sgd[2].replace(/,/g, ""), 10),
      currency: "SGD",
      type: "monthly",
    });
  }

  const perMonthSingle =
    t.match(/\$\s*([\d,.]+)\s*\/\s*month\b/i) || t.match(/\$\s*([\d,.]+)\s+per\s+month\b/i);
  if (perMonthSingle) {
    const v = parseFloat(perMonthSingle[1].replace(/,/g, ""));
    if (Number.isFinite(v)) {
      return predictRateToCompensationFields({
        amount_min: v,
        amount_max: v,
        currency: "USD",
        type: "monthly",
      });
    }
  }

  if (/\b(hour|\/hr|\/hour|hr\.|per\s+hour)\b/i.test(t)) {
    const range =
      t.match(/\$?\s*([\d,.]+)\s*[–-]\s*\$?\s*([\d,.]+)/) ||
      t.match(/\$\s*([\d,.]+)\s*to\s*\$?\s*([\d,.]+)/i);
    if (range) {
      const a = parseFloat(range[1]);
      const b = parseFloat(range[2]);
      if (Number.isFinite(a) && Number.isFinite(b)) {
        return predictRateToCompensationFields({
          amount_min: a,
          amount_max: b,
          currency: cur,
          type: "hourly",
        });
      }
    }
    const dollarsAfter = t.match(/^([\d,.]+)\s*\$\s*(?:per\s+)?hour/i);
    if (dollarsAfter) {
      const v = parseFloat(dollarsAfter[1]);
      if (Number.isFinite(v)) {
        return predictRateToCompensationFields({
          amount_min: v,
          amount_max: v,
          currency: cur,
          type: "hourly",
        });
      }
    }
    const single =
      t.match(/\$\s*([\d,.]+)\s+per\s+hour\b/i) ||
      t.match(/\$\s*([\d,.]+)\s*\/?\s*hour\b/i) ||
      t.match(/([\d,.]+)\s*\$?\s*hour\b/i) ||
      t.match(/\$\s*([\d,.]+)\s*\/\s*hr\b/i);
    if (single) {
      const v = parseFloat(single[1]);
      if (Number.isFinite(v)) {
        return predictRateToCompensationFields({
          amount_min: v,
          amount_max: v,
          currency: cur,
          type: "hourly",
        });
      }
    }
  }

  const monthPhrase = /\b(per\s+month|\/month|monthly)\b/i.test(t);
  const rangeMoney = t.match(/\$\s*([\d,]+)\s*[-–]\s*\$?\s*([\d,]+)/);
  if (rangeMoney) {
    const a = parseInt(rangeMoney[1].replace(/,/g, ""), 10);
    const b = parseInt(rangeMoney[2].replace(/,/g, ""), 10);
    const type: PredictRateType =
      monthPhrase || !/\bhour\b/i.test(t) ? "monthly" : "hourly";
    return predictRateToCompensationFields({
      amount_min: a,
      amount_max: b,
      currency: cur,
      type,
    });
  }

  const singleUsd = t.match(/\$\s*([\d,]+)\s*USD/i);
  if (singleUsd) {
    const v = parseInt(singleUsd[1].replace(/,/g, ""), 10);
    return predictRateToCompensationFields({
      amount_min: v,
      amount_max: v,
      currency: "USD",
      type: "monthly",
    });
  }

  const lone = t.match(/^\$\s*([\d,]+)\s*$/);
  if (lone) {
    const v = parseInt(lone[1].replace(/,/g, ""), 10);
    return predictRateToCompensationFields({
      amount_min: v,
      amount_max: v,
      currency: "USD",
      type: "monthly",
    });
  }

  return null;
}

function extractMetaDescription(html: string): string | undefined {
  const m = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (!m) return undefined;
  const text = decodeHtml(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  return text.trim() || undefined;
}

function extractTypeOfWork(html: string): string | undefined {
  const m = html.match(
    /<h3 class="fs-12 mb-0">TYPE OF WORK<\/h3>\s*<p class="fs-18">\s*([\s\S]*?)\s*<\/p>/i,
  );
  if (!m) return undefined;
  const text = stripTags(m[1]);
  return text || undefined;
}

function extractWageSalaryHtml(html: string): string | undefined {
  const m = html.match(
    /<h3 class="fs-12 mb-0">WAGE \/ SALARY<\/h3>\s*<p class="fs-18">\s*([\s\S]*?)\s*<\/p>/i,
  );
  return m ? m[1] : undefined;
}

function extractJobTitle(html: string): string | undefined {
  const m = html.match(/<h1[^>]*class="[^"]*job__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return undefined;
  const text = stripTags(m[1]);
  return text || undefined;
}

function extractJobDescriptionHtml(html: string): string | undefined {
  const m = html.match(/<p[^>]*\bid="job-description"[^>]*>([\s\S]*?)<\/p>/i);
  return m ? m[1] : undefined;
}

function extractSkillTags(html: string): string[] {
  const skills: string[] = [];
  const re = /<a[^>]+class="card-worker-topskill"[^>]*>([^<]*)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const text = stripTags(match[1]);
    if (text) skills.push(text);
  }
  return skills;
}

/**
 * Parses server-fetched HTML from an OnlineJobs.ph **job detail** page (`/jobseekers/job/...`).
 */
export function parseOnlineJobsJobDetailHtml(
  html: string,
  canonicalUrl: string,
): Partial<JobPostFormState> {
  const jobTitle = extractJobTitle(html);
  const descHtml = extractJobDescriptionHtml(html);
  const fullDescriptionText = descHtml ? htmlJobDescriptionToText(descHtml) : undefined;

  let jobDescription: string | undefined;
  let employerAboutText: string | undefined;
  if (fullDescriptionText) {
    const split = splitDescriptionAndEmployerAbout(fullDescriptionText);
    if (split) {
      jobDescription = split.job;
      employerAboutText = stripAboutEmployerHeadingBanners(
        trimEmployerSectionClosing(split.employer),
      );
    } else {
      jobDescription = fullDescriptionText;
    }
  }

  const skillTags = extractSkillTags(html);
  const skillsDescription =
    skillTags.length > 0 ? skillTags.map((s) => s.trim()).join(", ") : undefined;

  const wageHtml = extractWageSalaryHtml(html);
  const wageText = wageHtml ? stripTags(wageHtml) : "";
  const comp = wageText ? parseOnlineJobsWageText(wageText) : null;

  const metaDesc = extractMetaDescription(html);
  const workType = extractTypeOfWork(html);
  const companyBits: string[] = [];
  if (employerAboutText) {
    companyBits.push(employerAboutText);
  } else if (metaDesc) {
    companyBits.push(metaDesc);
  }
  if (workType) {
    companyBits.push(`Type of work: ${workType}.`);
  }
  companyBits.push(`Imported from OnlineJobs.ph — ${canonicalUrl}`);
  const companyProfile = companyBits.length > 0 ? companyBits.join("\n\n") : undefined;

  const out: Partial<JobPostFormState> = {};
  if (jobTitle) out.jobTitle = jobTitle;
  if (jobDescription) out.jobDescription = jobDescription;
  if (skillsDescription) out.skillsDescription = skillsDescription;
  if (companyProfile) out.companyProfile = companyProfile;
  if (comp) {
    Object.assign(out, comp);
  }
  return out;
}

export function normalizeOnlineJobsJobUrl(input: string): URL | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (host !== "www.onlinejobs.ph" && host !== "onlinejobs.ph") {
    return null;
  }
  const path = u.pathname;
  if (!path.toLowerCase().startsWith("/jobseekers/job/")) {
    return null;
  }
  u.protocol = "https:";
  u.hostname = "www.onlinejobs.ph";
  u.hash = "";
  u.search = "";
  return u;
}
