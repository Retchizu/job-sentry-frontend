/**
 * Fetches job listings from OnlineJobs.ph (paginated list views — 30 jobs per page). Uses several
 * search URLs in order (global jobsearch + skill/category paths) because each index caps around
 * ~300 rows with different overlaps; union yields enough unique rows for large `--max-jobs` runs.
 *
 *   npx tsx scripts/fetch-onlinejobs-seed.ts
 *   npx tsx scripts/fetch-onlinejobs-seed.ts path/to/out.json
 *   npx tsx scripts/fetch-onlinejobs-seed.ts path/to/out.json 5
 *   npx tsx scripts/fetch-onlinejobs-seed.ts 5
 *   npx tsx scripts/fetch-onlinejobs-seed.ts scripts/out.json --max-jobs 500
 *   npx tsx scripts/fetch-onlinejobs-seed.ts scripts/out.json --max-jobs 500 --preset alt
 *   npx tsx scripts/fetch-onlinejobs-seed.ts scripts/out.json --max-jobs 500 --preset industry
 *
 * Trailing numeric arg = max pages to fetch (default: all pages until empty / no new rows).
 * `--max-jobs N` stops after collecting N unique listings (may fetch multiple pages).
 * `--preset default` — global jobsearch + VA / video / marketing / admin categories (default).
 * `--preset alt` — software, finance, sales, writing, legal, HR, engineering, etc. (no global index first).
 * `--preset industry` — teaching, project management, translation, mobile, architecture, logistics, etc.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ImprovementFeedbackRequest, PredictRate } from "../lib/api/types";

const BASE = "https://www.onlinejobs.ph";
const JOBS_PER_PAGE = 30;
const PAGE_DELAY_MS = 350;

type ListingPreset = "default" | "alt" | "industry";

/** Path prefix for each listing index (pagination: `{prefix}`, `{prefix}/30`, `{prefix}/60`, …). */
const LISTING_PRESETS: Record<ListingPreset, readonly string[]> = {
  default: [
    "/jobseekers/jobsearch",
    "/jobseekers/search/c/video-editing",
    "/jobseekers/search/c/virtual-assistant",
    "/jobseekers/search/c/web-development",
    "/jobseekers/search/c/graphics-and-multimedia--graphic-design",
    "/jobseekers/search/c/customer-service",
    "/jobseekers/search/c/marketing--social-media-management",
    "/jobseekers/search/c/office-and-administration--data-entry",
  ],
  /** Different role mix: professional / technical / industry categories (skips global jobsearch first). */
  alt: [
    "/jobseekers/search/c/software-development",
    "/jobseekers/search/c/accounting",
    "/jobseekers/search/c/finance",
    "/jobseekers/search/c/sales-and-telemarketing",
    "/jobseekers/search/c/writing",
    "/jobseekers/search/c/real-estate",
    "/jobseekers/search/c/health-care",
    "/jobseekers/search/c/legal",
    "/jobseekers/search/c/human-resources",
    "/jobseekers/search/c/ecommerce",
    "/jobseekers/search/c/content-writing",
  ],
  /** Teaching, ops, creative-tech, and physical-sector categories (minimal overlap with default/alt). */
  industry: [
    "/jobseekers/search/c/teaching--education",
    "/jobseekers/search/c/project-management",
    "/jobseekers/search/c/translation",
    "/jobseekers/search/c/mobile-development",
    "/jobseekers/search/c/architecture",
    "/jobseekers/search/c/manufacturing-and-production",
    "/jobseekers/search/c/logistics-and-warehousing",
    "/jobseekers/search/c/restaurant-and-food-services",
    "/jobseekers/search/c/science-and-research",
    "/jobseekers/search/c/games-development",
    "/jobseekers/search/c/audio-and-music-production",
  ],
};
const USER_AGENT =
  "Mozilla/5.0 (compatible; JobSentrySeed/1.0; +https://github.com/job-sentry)";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeHtml(s: string): string {
  return s
    .replace(/&#8230;/g, "…")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeHtml(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseRate(salaryRaw: string): PredictRate | undefined {
  const t = salaryRaw.trim();
  if (!t || /^tbd$/i.test(t)) return undefined;

  const cur = t.includes("SGD") ? "SGD" : "USD";

  const sgd = t.match(/SGD\s*\$?\s*([\d,]+)\s*(?:to|-|–)\s*\$?\s*([\d,]+)/i);
  if (sgd) {
    return {
      amount_min: parseInt(sgd[1].replace(/,/g, ""), 10),
      amount_max: parseInt(sgd[2].replace(/,/g, ""), 10),
      currency: "SGD",
      type: "monthly",
    };
  }

  if (/\b(hour|\/hr|\/hour|hr\.|per\s+hour)\b/i.test(t)) {
    const range =
      t.match(/\$?\s*([\d,.]+)\s*[–-]\s*\$?\s*([\d,.]+)/) ||
      t.match(/\$\s*([\d,.]+)\s*to\s*\$?\s*([\d,.]+)/i);
    if (range) {
      return {
        amount_min: parseFloat(range[1]),
        amount_max: parseFloat(range[2]),
        currency: cur,
        type: "hourly",
      };
    }
    const dollarsAfter = t.match(/^([\d,.]+)\s*\$\s*(?:per\s+)?hour/i);
    if (dollarsAfter) {
      const v = parseFloat(dollarsAfter[1]);
      return { amount_min: v, amount_max: v, currency: cur, type: "hourly" };
    }
    const single =
      t.match(/\$\s*([\d,.]+)\s*\/?\s*hour/i) ||
      t.match(/([\d,.]+)\s*\$?\s*hour/i) ||
      t.match(/\$\s*([\d,.]+)\s*\/\s*hr/i);
    if (single) {
      const v = parseFloat(single[1]);
      return { amount_min: v, amount_max: v, currency: cur, type: "hourly" };
    }
  }

  const monthPhrase = /\b(per\s+month|\/month|monthly)\b/i.test(t);
  const rangeMoney = t.match(/\$\s*([\d,]+)\s*[-–]\s*\$?\s*([\d,]+)/);
  if (rangeMoney) {
    return {
      amount_min: parseInt(rangeMoney[1].replace(/,/g, ""), 10),
      amount_max: parseInt(rangeMoney[2].replace(/,/g, ""), 10),
      currency: cur,
      type: monthPhrase || !/\bhour\b/i.test(t) ? "monthly" : "hourly",
    };
  }

  const singleUsd = t.match(/\$\s*([\d,]+)\s*USD/i);
  if (singleUsd) {
    const v = parseInt(singleUsd[1].replace(/,/g, ""), 10);
    return { amount_min: v, amount_max: v, currency: "USD", type: "monthly" };
  }

  const lone = t.match(/^\$\s*([\d,]+)\s*$/);
  if (lone) {
    const v = parseInt(lone[1].replace(/,/g, ""), 10);
    return { amount_min: v, amount_max: v, currency: "USD", type: "monthly" };
  }

  return undefined;
}

function extractBlocks(html: string): string[] {
  return html
    .split("<!-- Start -->")
    .slice(1)
    .map((chunk) => chunk.split("<!-- End -->")[0] ?? "");
}

function parseJobBlock(block: string): { row: ImprovementFeedbackRequest; path: string } | null {
  const hrefM = block.match(/href="(\/jobseekers\/job\/[^"]+)"/);
  if (!hrefM) return null;
  const path = hrefM[1];

  const h4M = block.match(/<h4 class="fs-16 fw-700">([\s\S]*?)<\/h4>/);
  if (!h4M) return null;
  const title = stripTags(h4M[1].replace(/<span[^>]*>[\s\S]*?<\/span>/gi, " ")).replace(/\s+/g, " ").trim();
  if (!title) return null;

  const salaryM = block.match(
    /<i class="icon icon-round-dollar[^"]*"[^>]*>[\s\S]*?<dd class="col">([\s\S]*?)<\/dd>/,
  );
  const salaryHtml = salaryM ? salaryM[1] : "";
  const salaryText = stripTags(salaryHtml);

  const descM = block.match(/<div class="desc fs-14 d-none d-sm-block">([\s\S]*?)<\/div>/);
  let jobDesc = descM ? stripTags(descM[1].replace(/<a[^>]*>[\s\S]*?<\/a>/gi, "")) : "";
  jobDesc = jobDesc.replace(/\s*…\s*$/, "").trim();

  const skills: string[] = [];
  const tagRe = /<a[^>]*class='badge'[^>]*>([^<]*)<\/a>|<a[^>]*class="badge"[^>]*>([^<]*)<\/a>/g;
  let tm: RegExpExecArray | null;
  while ((tm = tagRe.exec(block)) !== null) {
    const text = (tm[1] || tm[2] || "").trim();
    if (text) skills.push(text);
  }
  const skillsDesc = skills.length > 0 ? skills.join(", ") : undefined;

  const logoM = block.match(/class="jobpost-cat-box-logo"[^>]*alt="([^"]*)"/);
  const employer = logoM?.[1]?.trim();
  const company_profile = employer
    ? `${employer} — listing on OnlineJobs.ph (${BASE}${hrefM[1]})`
    : `Employer on OnlineJobs.ph — ${BASE}${hrefM[1]}`;

  const rate = parseRate(salaryText);
  const post: ImprovementFeedbackRequest["post"] = {
    job_title: title,
    job_desc: jobDesc || undefined,
    skills_desc: skillsDesc,
    company_profile,
    ...(rate ? { rate } : {}),
  };

  const sal = salaryText.trim();
  const typoSalary =
    sal.length > 0 &&
    (/\)\)\s*$/.test(sal) || /^\d+\$\s/i.test(sal) || /\*{2,}/.test(sal));
  const warning_flags = typoSalary ? (["typographical_errors"] as const) : [];

  const row: ImprovementFeedbackRequest = {
    post,
    warning_flags: [...warning_flags],
    labeled_risk: "legit",
  };
  return { row, path };
}

function listingUrl(listingPrefix: string, pageIndex: number): string {
  const off = pageIndex === 0 ? "" : `/${pageIndex * JOBS_PER_PAGE}`;
  return `${BASE}${listingPrefix}${off}`;
}

async function fetchListingPage(listingPrefix: string, pageIndex: number): Promise<string> {
  const url = listingUrl(listingPrefix, pageIndex);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status}`);
  }
  return res.text();
}

function parseCliArgs(): {
  outPath: string;
  maxPages: number | undefined;
  maxJobs: number | undefined;
  preset: ListingPreset;
} {
  const args = process.argv.slice(2);
  let outPath = join(process.cwd(), "scripts/improvement-seed-data-onlinejobs.json");
  let maxPages: number | undefined;
  let maxJobs: number | undefined;
  let preset: ListingPreset = "default";
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--max-jobs" && args[i + 1] != null) {
      maxJobs = parseInt(args[++i]!, 10);
      continue;
    }
    if (a === "--preset" && args[i + 1] != null) {
      const v = args[++i]!;
      if (v !== "default" && v !== "alt" && v !== "industry") {
        throw new Error(`Unknown --preset "${v}" (use default, alt, or industry)`);
      }
      preset = v;
      continue;
    }
    if (/^\d+$/.test(a)) {
      maxPages = parseInt(a, 10);
    } else {
      outPath = a.startsWith("/") ? a : join(process.cwd(), a);
    }
  }
  return { outPath, maxPages, maxJobs, preset };
}

async function main() {
  const { outPath, maxPages, maxJobs, preset } = parseCliArgs();
  const listingPrefixes = LISTING_PRESETS[preset];
  console.log(`Preset "${preset}" — ${listingPrefixes.length} listing source(s)`);
  const seenPaths = new Set<string>();
  const items: ImprovementFeedbackRequest[] = [];
  let totalPagesFetched = 0;

  outer: for (const listingPrefix of listingPrefixes) {
    for (let pageIndex = 0; ; pageIndex++) {
      if (maxJobs !== undefined && items.length >= maxJobs) {
        console.log(`Stopped at maxJobs=${maxJobs}.`);
        break outer;
      }
      if (maxPages !== undefined && totalPagesFetched >= maxPages) {
        console.log(`Stopped at maxPages=${maxPages}.`);
        break outer;
      }

      const html = await fetchListingPage(listingPrefix, pageIndex);
      totalPagesFetched++;
      const blocks = extractBlocks(html);
      if (blocks.length === 0) {
        console.log(`[${listingPrefix}] page ${pageIndex + 1}: no listing blocks, next source.`);
        break;
      }

      let newOnPage = 0;
      for (const block of blocks) {
        if (maxJobs !== undefined && items.length >= maxJobs) break;
        const parsed = parseJobBlock(block);
        if (!parsed) continue;
        if (seenPaths.has(parsed.path)) continue;
        seenPaths.add(parsed.path);
        items.push(parsed.row);
        newOnPage++;
      }

      const url = listingUrl(listingPrefix, pageIndex);
      console.log(
        `[${listingPrefix}] page ${pageIndex + 1} (${url}): +${newOnPage} new (${blocks.length} blocks), total ${items.length} unique`,
      );

      if (blocks.length < JOBS_PER_PAGE) {
        console.log(`[${listingPrefix}] last page (fewer than ${JOBS_PER_PAGE} listings).`);
        break;
      }

      await sleep(PAGE_DELAY_MS);
    }
  }

  const finalItems =
    maxJobs !== undefined && items.length > maxJobs ? items.slice(0, maxJobs) : items;

  writeFileSync(outPath, `${JSON.stringify(finalItems, null, 2)}\n`, "utf8");
  console.log(`Wrote ${finalItems.length} unique rows to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
