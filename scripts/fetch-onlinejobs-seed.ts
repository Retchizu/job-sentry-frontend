/**
 * Fetches job listings from OnlineJobs.ph job search (paginated: /jobseekers/jobsearch,
 * /jobseekers/jobsearch/30, /60, … — 30 jobs per page), maps them to ImprovementFeedbackRequest[],
 * dedupes by job path, and writes JSON for seed-improvement-batch.ts.
 *
 *   npx tsx scripts/fetch-onlinejobs-seed.ts
 *   npx tsx scripts/fetch-onlinejobs-seed.ts path/to/out.json
 *   npx tsx scripts/fetch-onlinejobs-seed.ts path/to/out.json 5
 *   npx tsx scripts/fetch-onlinejobs-seed.ts 5
 *
 * Trailing numeric arg = max pages to fetch (default: all pages until empty / no new rows).
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ImprovementFeedbackRequest, PredictRate } from "../lib/api/types";

const BASE = "https://www.onlinejobs.ph";
const JOBS_PER_PAGE = 30;
const PAGE_DELAY_MS = 350;
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
    labeled_scam: false,
  };
  return { row, path };
}

async function fetchHtml(pathSuffix: string): Promise<string> {
  const url = `${BASE}/jobseekers/jobsearch${pathSuffix}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`GET ${url} failed: ${res.status}`);
  }
  return res.text();
}

function parseCliArgs(): { outPath: string; maxPages: number | undefined } {
  const args = process.argv.slice(2);
  let outPath = join(process.cwd(), "scripts/improvement-seed-data-onlinejobs.json");
  let maxPages: number | undefined;
  for (const a of args) {
    if (/^\d+$/.test(a)) {
      maxPages = parseInt(a, 10);
    } else {
      outPath = a.startsWith("/") ? a : join(process.cwd(), a);
    }
  }
  return { outPath, maxPages };
}

function searchPathForPage(pageIndex: number): string {
  if (pageIndex === 0) return "";
  return `/${pageIndex * JOBS_PER_PAGE}`;
}

async function main() {
  const { outPath, maxPages } = parseCliArgs();
  const seenPaths = new Set<string>();
  const items: ImprovementFeedbackRequest[] = [];

  for (let pageIndex = 0; ; pageIndex++) {
    if (maxPages !== undefined && pageIndex >= maxPages) {
      console.log(`Stopped at maxPages=${maxPages}.`);
      break;
    }
    const suf = searchPathForPage(pageIndex);
    const html = await fetchHtml(suf);
    const blocks = extractBlocks(html);
    if (blocks.length === 0) {
      console.log(`Page ${pageIndex + 1}: no listing blocks, done.`);
      break;
    }

    let newOnPage = 0;
    for (const block of blocks) {
      const parsed = parseJobBlock(block);
      if (!parsed) continue;
      if (seenPaths.has(parsed.path)) continue;
      seenPaths.add(parsed.path);
      items.push(parsed.row);
      newOnPage++;
    }

    console.log(
      `Page ${pageIndex + 1} (${BASE}/jobseekers/jobsearch${suf || ""}): +${newOnPage} new (${blocks.length} blocks), total ${items.length} unique`,
    );

    if (newOnPage === 0) {
      console.log("No new jobs on this page, stopping.");
      break;
    }
    if (blocks.length < JOBS_PER_PAGE) {
      console.log("Last page (fewer than 30 listings).");
      break;
    }

    await sleep(PAGE_DELAY_MS);
  }

  writeFileSync(outPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  console.log(`Wrote ${items.length} unique rows to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
