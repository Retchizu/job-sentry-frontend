/**
 * Generates 1000 noisy / low-quality job postings (ImprovementFeedbackRequest[]).
 * Content pools and PRNG seed differ from scripts/generate-noisy-jobs-1000.ts so the
 * output is not a duplicate of improvement-seed-data-noisy-1000.json.
 *
 * Run: npx tsx scripts/generate-noisy-jobs-1000-fresh.ts
 *        npx tsx scripts/generate-noisy-jobs-1000-fresh.ts --seed 0x4e6f69737a --out improvement-seed-data-noisy-1000-fresh-2.json
 *        npx tsx ... --avoid-duplicates-from improvement-seed-data-noisy-1000-fresh.json
 * Output: scripts/improvement-seed-data-noisy-1000-fresh.json (default)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import type { ImprovementFeedbackRequest, ImprovementWarningFlag } from "../lib/api/types";

type RateType = "hourly" | "daily" | "weekly" | "monthly" | "yearly";

type SeedEntry = ImprovementFeedbackRequest;

/** Real companies + short blurb (company_profile). Expanded vs v1 generator. */
const COMPANIES: [string, string][] = [
  ["AARP", "nonprofit; DC"],
  ["AbbVie", "pharma; North Chicago"],
  ["Aflac", "supplemental insurance; Columbus GA"],
  ["Alaska Airlines", "airline; Seattle"],
  ["Allstate", "insurance; Northbrook"],
  ["American Airlines", "airline; Fort Worth"],
  ["American Express", "payments; NYC"],
  ["AutoZone", "auto parts retail; Memphis"],
  ["Biogen", "biotech; Cambridge MA"],
  ["BlackRock", "asset management; NYC"],
  ["Blue Cross Blue Shield", "health insurance; association"],
  ["Booking.com", "travel e-commerce; Amsterdam"],
  ["Burlington", "off-price retail; Burlington NJ"],
  ["CarMax", "used auto retail; Richmond"],
  ["Charles Schwab", "brokerage; Westlake TX"],
  ["Chipotle", "fast casual; Newport Beach"],
  ["Chubb", "commercial insurance; Zurich / US"],
  ["Cigna", "health insurance; Bloomfield CT"],
  ["Citigroup", "banking; NYC"],
  ["Clorox", "household brands; Oakland"],
  ["Colgate-Palmolive", "CPG; NYC"],
  ["Conagra Brands", "food; Chicago"],
  ["ConocoPhillips", "E&P; Houston"],
  ["Crown Castle", "cell towers; Houston"],
  ["D.R. Horton", "homebuilder; Arlington TX"],
  ["Danaher", "life sciences; DC"],
  ["Darden Restaurants", "casual dining; Orlando"],
  ["Discover Financial", "cards; Riverwoods IL"],
  ["Dollar General", "discount retail; Goodlettsville"],
  ["Dollar Tree", "discount retail; Chesapeake"],
  ["Dominion Energy", "utilities; Richmond"],
  ["DoorDash", "delivery; SF"],
  ["Duke Energy", "utilities; Charlotte"],
  ["Ecolab", "sanitation / water; Saint Paul"],
  ["Edwards Lifesciences", "medical devices; Irvine"],
  ["Electronic Arts", "gaming; Redwood City"],
  ["Emerson Electric", "automation; Saint Louis"],
  ["Entergy", "utilities; New Orleans"],
  ["Equifax", "credit bureau; Atlanta"],
  ["Estée Lauder", "beauty; NYC"],
  ["Expedia Group", "travel tech; Seattle"],
  ["Extra Space Storage", "self-storage; Salt Lake City"],
  ["Fannie Mae", "mortgage GSE; DC"],
  ["Farmers Insurance", "P&C; Woodland Hills"],
  ["Fifth Third Bank", "regional bank; Cincinnati"],
  ["FirstEnergy", "utilities; Akron"],
  ["Fiserv", "fintech; Brookfield WI"],
  ["Foot Locker", "athletic retail; NYC"],
  ["Fortinet", "cybersecurity; Sunnyvale"],
  ["Fox Corporation", "media; NYC"],
  ["Freddie Mac", "mortgage GSE; McLean"],
  ["Gartner", "research; Stamford"],
  ["Genuine Parts", "auto parts; Atlanta"],
  ["Gilead Sciences", "biotech; Foster City"],
  ["Grainger", "MRO distribution; Lake Forest IL"],
  ["Halliburton", "oilfield services; Houston"],
  ["Hershey", "confectionery; Hershey PA"],
  ["Hilton", "hospitality; McLean"],
  ["Hormel Foods", "packaged foods; Austin MN"],
  ["Howmet Aerospace", "aerospace; Pittsburgh"],
  ["Huntington Bancshares", "regional bank; Columbus OH"],
  ["IDEXX Laboratories", "animal diagnostics; Westbrook ME"],
  ["Illinois Tool Works", "industrial; Glenview IL"],
  ["Ingersoll Rand", "industrial; Davidson NC"],
  ["Intercontinental Exchange", "markets; Atlanta"],
  ["IQVIA", "clinical / data; Durham NC"],
  ["Jack Henry", "banking tech; Monett MO"],
  ["Jacobs Engineering", "engineering services; Dallas"],
  ["KeyCorp", "regional bank; Cleveland"],
  ["Kimberly-Clark", "household; Irving TX"],
  ["Kinder Morgan", "pipelines; Houston"],
  ["Kraft Heinz", "food; Chicago / Pittsburgh"],
  ["L3Harris", "defense; Melbourne FL"],
  ["LabCorp", "diagnostics; Burlington NC"],
  ["Lennar", "homebuilder; Miami"],
  ["Levi Strauss", "apparel; SF"],
  ["Lincoln Financial", "insurance; Radnor PA"],
  ["Live Nation", "events; Beverly Hills"],
  ["Loews Corporation", "conglomerate; NYC"],
  ["Lumen Technologies", "telecom; Monroe LA"],
  ["Lyft", "rideshare; SF"],
  ["Macy's", "department store; NYC"],
  ["Marathon Petroleum", "refining; Findlay OH"],
  ["Marsh McLennan", "insurance brokerage; NYC"],
  ["Masco", "building products; Livonia MI"],
  ["MetLife", "insurance; NYC"],
  ["Micron Technology", "memory semis; Boise"],
  ["Mohawk Industries", "flooring; Calhoun GA"],
  ["Molina Healthcare", "managed care; Long Beach"],
  ["Mondelez International", "snacks; Chicago"],
  ["Monster Beverage", "beverages; Corona CA"],
  ["Mosaic", "fertilizer; Tampa"],
  ["Motorola Solutions", "communications; Chicago"],
  ["Nasdaq", "exchange; NYC"],
  ["National Grid", "utilities; UK / US"],
  ["Newmont", "gold mining; Denver"],
  ["News Corp", "media; NYC"],
  ["Nielsen", "measurement; NYC"],
  ["Norfolk Southern", "rail; Atlanta"],
  ["NRG Energy", "power; Houston"],
  ["Nucor", "steel; Charlotte"],
  ["Occidental Petroleum", "E&P; Houston"],
  ["Old Dominion Freight", "LTL trucking; Thomasville NC"],
  ["Omnicom Group", "advertising; NYC"],
  ["ONEOK", "midstream; Tulsa"],
  ["Otis Worldwide", "elevators; Farmington CT"],
  ["Paccar", "trucks; Bellevue"],
  ["Paramount Global", "media; NYC"],
  ["Parker Hannifin", "motion / control; Cleveland"],
  ["Paychex", "payroll HR; Rochester NY"],
  ["PayPal", "payments; San Jose"],
  ["Penske Automotive", "auto retail; Bloomfield Hills MI"],
  ["Pioneer Natural Resources", "E&P; Irving TX"],
  ["PNC Financial", "banking; Pittsburgh"],
  ["Pool Corporation", "pool supplies; Covington LA"],
  ["PPG Industries", "coatings; Pittsburgh"],
  ["Principal Financial", "insurance / retirement; Des Moines"],
  ["Public Storage", "self-storage; Glendale CA"],
  ["PulteGroup", "homebuilder; Atlanta"],
  ["Qorvo", "RF semis; Greensboro NC"],
  ["Quest Diagnostics", "labs; Secaucus NJ"],
  ["Ralph Lauren", "apparel; NYC"],
  ["Regeneron", "biotech; Tarrytown NY"],
  ["Regions Financial", "banking; Birmingham AL"],
  ["Republic Services", "waste; Phoenix"],
  ["Rollins", "pest control; Atlanta"],
  ["Ross Stores", "off-price; Dublin CA"],
  ["S&P Global", "ratings / data; NYC"],
  ["Sempra Energy", "utilities / LNG; San Diego"],
  ["Sherwin-Williams", "paint; Cleveland"],
  ["Simon Property", "malls; Indianapolis"],
  ["Smithfield Foods", "pork; Smithfield VA"],
  ["Southwest Airlines", "airline; Dallas"],
  ["Stanley Black & Decker", "tools; New Britain CT"],
  ["State Street", "custody bank; Boston"],
  ["Steel Dynamics", "steel; Fort Wayne"],
  ["Stryker", "medical devices; Kalamazoo"],
  ["Synchrony Financial", "consumer finance; Stamford"],
  ["Sysco", "foodservice distribution; Houston"],
  ["Tapestry", "luxury brands; NYC"],
  ["TE Connectivity", "connectors; Schaffhausen / PA"],
  ["Tenet Healthcare", "hospitals; Dallas"],
  ["Textron", "industrial; Providence"],
  ["Tractor Supply", "rural retail; Brentwood TN"],
  ["TransDigm", "aerospace components; Cleveland"],
  ["Truist Financial", "banking; Charlotte"],
  ["Tyson Foods", "protein; Springdale AR"],
  ["U.S. Bancorp", "banking; Minneapolis"],
  ["Ulta Beauty", "beauty retail; Bolingbrook IL"],
  ["Universal Health Services", "hospitals; King of Prussia PA"],
  ["Viatris", "generics pharma; Pittsburgh"],
  ["Vici Properties", "REIT; NYC"],
  ["Vulcan Materials", "aggregates; Birmingham AL"],
  ["Warner Bros Discovery", "media; NYC"],
  ["Waste Management", "waste; Houston"],
  ["Western Digital", "storage; San Jose"],
  ["WestRock", "packaging; Atlanta"],
  ["Williams Companies", "midstream; Tulsa"],
  ["Willis Towers Watson", "broking; London / US"],
  ["W.W. Grainger", "MRO; Lake Forest IL"],
  ["Xcel Energy", "utilities; Minneapolis"],
  ["Yum Brands", "QSR franchisor; Louisville"],
  ["Zoetis", "animal health; Parsippany NJ"],
];

const ROLES = [
  "Accounts Payable Clerk",
  "Billing Specialist",
  "Tax Associate",
  "Cost Accountant",
  "Treasury Analyst",
  "SOC Analyst II",
  "Cloud Engineer",
  "Site Reliability Engineer",
  "Desktop Support Tech II",
  "Data Engineer",
  "Analytics Engineer",
  "People Ops Coordinator",
  "Talent Acquisition Partner",
  "Learning & Development Specialist",
  "Brand Manager",
  "Growth Marketing Manager",
  "Technical Writer",
  "Design Technologist",
  "Automation Engineer",
  "Release Manager",
  "Full Stack Engineer",
  "Embedded Software Engineer",
  "Research Scientist",
  "Customer Support Lead",
  "Implementation Consultant",
  "Risk Analyst",
  "Vendor Manager",
  "Supply Planner",
  "Import/Export Coordinator",
  "Claims Examiner",
  "Care Coordinator",
  "Radiologic Technologist",
  "Sterile Processing Tech",
  "Maintenance Mechanic",
  "Production Supervisor",
  "Quality Inspector",
  "Estimator",
  "Estimator — construction",
];

const SUFFIXES = [
  "",
  " (contract)",
  " — WFH",
  " — hybrid",
  " — 2nd shift",
  " — entry level",
  " — senior band",
  " — interim",
];

const AI_BUZZ = [
  "drive end-to-end outcomes via outcome-oriented collaboration loops",
  "embed AI-native rituals across the operating cadence for velocity uplift",
  "champion customer-centricity while operationalizing the north star metric",
  "operate as a force multiplier for cross-pillar alignment and clarity",
  "iterate rapidly in a high-trust culture of radical candor and empathy",
  "prioritize scalable systems thinking over one-off heroics (always)",
  "unlock compounding leverage through data-informed storytelling",
  "bring a builder mentality to ambiguous zero-to-one problem spaces",
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function maybeTypo(rng: () => number, text: string): string {
  if (rng() > 0.38) return text;
  const typos: [RegExp, string][] = [
    [/the /g, "hte "],
    [/ and /g, " annd "],
    [/will /g, "wil "],
    [/communication/gi, "comunication"],
    [/documentation/gi, "documentaiton"],
    [/experience/gi, "experince"],
    [/management/gi, "managment"],
    [/\,/g, ",,"],
    [/ing\./g, "ing.."],
    [/ to /g, " too "],
  ];
  let out = text;
  const [re, rep] = pick(rng, typos);
  out = out.replace(re, rep as string);
  if (rng() < 0.22) out = out + " START TOMORROW??";
  return out;
}

function buildBenignDesc(rng: () => number, role: string): string {
  const templates = [
    () =>
      `${role} supports daily operations, internal tickets, and light reporting. Manager is onsite most days.`,
    () =>
      `We need a reliable ${role} who can follow checklists, escalate blockers, and keep notes tidy.`,
    () =>
      `${role}: coordinate handoffs, maintain trackers, and participate in weekly syncs (30 min).`,
    () =>
      `Join a stable team. ${role} handles routine tasks first; stretch projects later if capacity allows.`,
    () =>
      `This ${role} role is mostly independent work with occasional pairing. Tools are standard for the industry.`,
    () =>
      `${role} will validate inputs, reconcile exceptions, and document decisions in the shared wiki.`,
    () =>
      `Seasonal volume spikes possible. ${role} should be comfortable asking questions when specs are thin.`,
    () =>
      `Hybrid schedule: core hours 10–4 local. ${role} reports to a lead; no direct reports.`,
  ];
  return maybeTypo(rng, pick(rng, templates)());
}

function buildSkills(rng: () => number): string {
  const pools = [
    "Google Sheets, attention to detail",
    "Looker or similar BI",
    "bash scripting basics",
    "Docker familiarity",
    "ServiceNow ticketing",
    "SAP or Oracle exposure",
    "Zendesk / Intercom",
    "Figma read-only",
    "basic networking (DNS, VPN)",
    "GDPR basics",
    "writing SOPs",
    "SQL joins",
    "PowerShell helpful",
  ];
  const a = pick(rng, pools);
  let b = "";
  if (rng() > 0.48) {
    const rest = pools.filter((p) => p !== a);
    b = `; ${pick(rng, rest)}`;
  }
  return maybeTypo(rng, (a + b).slice(0, 120));
}

function absurdRate(rng: () => number): {
  amount_min: number;
  amount_max: number;
  currency: string;
  type: RateType;
} {
  const kind = Math.floor(rng() * 14);
  switch (kind) {
    case 0:
      return { amount_min: 1, amount_max: 3, currency: "USD", type: "hourly" };
    case 1:
      return {
        amount_min: 600000,
        amount_max: 900000,
        currency: "USD",
        type: "yearly",
      };
    case 2:
      return {
        amount_min: 120,
        amount_max: 140,
        currency: "USD",
        type: "hourly",
      };
    case 3:
      return {
        amount_min: 9,
        amount_max: 11,
        currency: "GBP",
        type: "yearly",
      };
    case 4:
      return {
        amount_min: 2000,
        amount_max: 3500,
        currency: "USD",
        type: "daily",
      };
    case 5:
      return {
        amount_min: 2500,
        amount_max: 2800,
        currency: "USD",
        type: "weekly",
      };
    case 6:
      return {
        amount_min: 8000000,
        amount_max: 12000000,
        currency: "JPY",
        type: "yearly",
      };
    case 7:
      return {
        amount_min: 7,
        amount_max: 9,
        currency: "USD",
        type: "monthly",
      };
    case 8:
      return {
        amount_min: 0.5,
        amount_max: 1.5,
        currency: "USD",
        type: "hourly",
      };
    default: {
      const hourly = 14 + Math.floor(rng() * 90);
      return {
        amount_min: hourly,
        amount_max: hourly + 5 + Math.floor(rng() * 50),
        currency: pick(rng, ["USD", "USD", "CAD", "GBP"]),
        type: "hourly",
      };
    }
  }
}

function normalRate(rng: () => number): {
  amount_min: number;
  amount_max: number;
  currency: string;
  type: RateType;
} {
  const t = pick(rng, [
    "hourly",
    "hourly",
    "hourly",
    "yearly",
    "yearly",
    "monthly",
  ] as RateType[]);
  if (t === "hourly") {
    const lo = 24 + Math.floor(rng() * 52);
    return {
      amount_min: lo,
      amount_max: lo + 6 + Math.floor(rng() * 28),
      currency: "USD",
      type: "hourly",
    };
  }
  if (t === "monthly") {
    const lo = 4500 + Math.floor(rng() * 4500);
    return {
      amount_min: lo,
      amount_max: lo + 900 + Math.floor(rng() * 2200),
      currency: "USD",
      type: "monthly",
    };
  }
  const lo = 58000 + Math.floor(rng() * 78000);
  return {
    amount_min: lo,
    amount_max: lo + 9000 + Math.floor(rng() * 28000),
    currency: pick(rng, ["USD", "USD", "EUR"]),
    type: "yearly",
  };
}

function flags(
  rng: () => number,
  pool: ImprovementWarningFlag[][]
): ImprovementWarningFlag[] {
  return pick(rng, pool);
}

function companyLine(rng: () => number): string {
  const [name, blurb] = pick(rng, COMPANIES);
  return `${name} — ${blurb}.`;
}

type Bucket =
  | "realistic"
  | "typo_grammar"
  | "nonsense"
  | "ai_slop"
  | "prompt_leak"
  | "bad_rate"
  | "skill_mismatch"
  | "incomplete"
  | "punct_noise"
  | "urgency_scam"
  | "contradictory"
  | "keyword_stuff";

/** Totals 1000; distribution differs from generate-noisy-jobs-1000.ts */
const BUCKET_COUNTS: Record<Bucket, number> = {
  realistic: 140,
  typo_grammar: 125,
  nonsense: 105,
  ai_slop: 90,
  prompt_leak: 80,
  bad_rate: 80,
  skill_mismatch: 75,
  incomplete: 65,
  punct_noise: 50,
  urgency_scam: 50,
  contradictory: 40,
  keyword_stuff: 100,
};

function buildRealistic(rng: () => number): SeedEntry {
  const [corp, blurb] = pick(rng, COMPANIES);
  const role = pick(rng, ROLES);
  const suffix = pick(rng, SUFFIXES);
  const title = `${role}${suffix}`;
  const useAbsurd = rng() < 0.19;
  const rate = useAbsurd ? absurdRate(rng) : normalRate(rng);
  return {
    post: {
      job_title: title,
      job_desc: buildBenignDesc(rng, role),
      skills_desc: buildSkills(rng),
      company_profile: `${corp} — ${blurb}.`,
      rate,
    },
    warning_flags: [],
    labeled_risk: "legit",
  };
}

function buildTypoGrammar(rng: () => number): SeedEntry {
  const [corp, blurb] = pick(rng, COMPANIES);
  const role = pick(rng, ROLES);
  const suffix = pick(rng, SUFFIXES);
  const title = `${role}${suffix}`;
  const useAbsurd = rng() < 0.19;
  const rate = useAbsurd ? absurdRate(rng) : normalRate(rng);
  const job_desc = maybeTypo(
    rng,
    buildBenignDesc(rng, role) + " Must repond quikly if intrested."
  );
  return {
    post: {
      job_title: maybeTypo(rng, title),
      job_desc,
      skills_desc: maybeTypo(rng, buildSkills(rng)),
      company_profile: `${corp} — ${blurb}.`,
      rate,
    },
    warning_flags: flags(rng, [
      ["typographical_errors"],
      ["poor_grammar"],
      ["typographical_errors", "poor_grammar"],
    ]),
    labeled_risk: "legit",
  };
}

function buildNonsense(rng: () => number): SeedEntry {
  const fragments = shuffle(rng, [
    "do tasks as assigned (TBD what tasks)",
    "meetings about meetings",
    "bring clarity by unclearing the unclear",
    "must enjoy ambiguity (mandatory)",
    "we are hiring because we are hiring",
    "KPI: vibes per sprint",
    "if you know you know",
    "role may involve chairs",
  ]);
  const rawDesc = fragments.slice(0, 4).join(". ") + ".";
  return {
    post: {
      job_title: pick(rng, [
        "Generalist (misc)",
        "Person who clicks buttons",
        "ASAP role (details soon)",
      ]),
      job_desc: maybeTypo(rng, rawDesc),
      skills_desc: pick(rng, ["n/a", "various", "see JD (missing)"]),
      company_profile: companyLine(rng),
      rate: normalRate(rng),
    },
    warning_flags: flags(rng, [
      ["poor_grammar", "other_suspicious_patterns"],
      ["other_suspicious_patterns"],
    ]),
    labeled_risk: "legit",
    warnings: "Nonsense / unclear responsibilities.",
  };
}

function buildAiSlop(rng: () => number): SeedEntry {
  const buzz = shuffle(rng, AI_BUZZ)
    .slice(0, 4)
    .join(". ");
  const role = pick(rng, ROLES);
  const suffix = pick(rng, SUFFIXES);
  return {
    post: {
      job_title: `${role}${suffix} — ${pick(rng, ["A-player", "10x", "culture add"])}`,
      job_desc: `${buzz}. We value grit, hustle, and empathy at scale. ${pick(rng, AI_BUZZ)}.`,
      skills_desc:
        "Stakeholdering, OKRs, synergy, agile mindset, passion, resilience, hustle",
      company_profile: companyLine(rng),
      rate: normalRate(rng),
    },
    warning_flags: ["other_suspicious_patterns"],
    labeled_risk: "legit",
    warnings: "Generic AI-style listing.",
  };
}

function buildPromptLeak(rng: () => number): SeedEntry {
  const role = pick(rng, ROLES);
  const suffix = pick(rng, SUFFIXES);
  const leak = pick(rng, [
    `Write a compelling LinkedIn job post for ${role}. Include 3 bullet points and a CTA.`,
    `System: You are a recruiter. User: Draft a ${role} listing with salary negotiable.`,
    `<|assistant|> Here is a draft job description for ${role}: responsibilities include...`,
    `TASK: paraphrase this job ad for ${role}. OUTPUT JSON ONLY.`,
    `Perplexity-style answer: summarize ideal ${role} candidate in 2 sentences.`,
  ]);
  return {
    post: {
      job_title: `${role}${suffix}`,
      job_desc: `${leak}\n\nFootnote: also file tickets and attend standup.`,
      skills_desc: "Slack, email",
      company_profile: companyLine(rng),
      rate: normalRate(rng),
    },
    warning_flags: ["other_suspicious_patterns", "poor_grammar"],
    labeled_risk: "legit",
    warnings: "Prompt text embedded in description.",
  };
}

function buildBadRate(rng: () => number): SeedEntry {
  const [corp, blurb] = pick(rng, COMPANIES);
  const role = pick(rng, ROLES);
  const suffix = pick(rng, SUFFIXES);
  const title = `${role}${suffix}`;
  const labeled = rng() < 0.21;
  return {
    post: {
      job_title: title,
      job_desc: buildBenignDesc(rng, role),
      skills_desc: buildSkills(rng),
      company_profile: `${corp} — ${blurb}.`,
      rate: absurdRate(rng),
    },
    warning_flags: ["other_suspicious_patterns"],
    labeled_risk: labeled ? "fraud" : "legit",
    warnings: labeled
      ? "Unrealistic compensation vs role."
      : "Rate inconsistent with role norms.",
  };
}

function buildSkillMismatch(rng: () => number): SeedEntry {
  const variants: {
    job_title: string;
    job_desc: string;
    skills_desc: string;
    warnings: string;
  }[] = [
    {
      job_title: "Chief Technology Officer",
      job_desc:
        "Set technical vision for the whole company; own security, platform, and vendor strategy.",
      skills_desc:
        "Comfortable with email; installed Chrome once; watched a Kubernetes keynote",
      warnings: "C-level title vs consumer-tech literacy only.",
    },
    {
      job_title: "Lead ML Researcher — publications track",
      job_desc:
        "Ship novel models to prod; mentor interns; represent the org at top venues.",
      skills_desc: "Used ChatGPT; Excel charts; 'interested in AI'",
      warnings: "Research lead vs casual AI user skills.",
    },
    {
      job_title: "Head of Information Security",
      job_desc:
        "Own incident response, IAM, and third-party risk for regulated workloads.",
      skills_desc: "Knows how to reset password; strong opinions on Wi‑Fi names",
      warnings: "Security leadership vs home-user skills.",
    },
    {
      job_title: "Staff Android Engineer (Kotlin)",
      job_desc:
        "Own large-scale mobile releases; performance; Play Store compliance.",
      skills_desc: "HTML/CSS from 2012; 'willing to learn Kotlin'",
      warnings: "Senior Android vs web-era basics.",
    },
    {
      job_title: "Controller — manufacturing",
      job_desc:
        "Close books monthly; SOX controls; partner with plant finance and FP&A.",
      skills_desc: "Balanced checkbook; likes spreadsheets (unspecified which)",
      warnings: "Controller title vs personal finance–level skills.",
    },
    {
      job_title: "Principal Site Reliability Engineer",
      job_desc:
        "On-call rotation for tier-1 services; error budgets; chaos engineering.",
      skills_desc: "Rebooted router; knows what ping is; Docker 'someday'",
      warnings: "Principal SRE vs hobbyist networking.",
    },
  ];
  const v = pick(rng, variants);
  return {
    post: {
      job_title: v.job_title,
      job_desc: v.job_desc,
      skills_desc: v.skills_desc,
      company_profile: companyLine(rng),
      rate: normalRate(rng),
    },
    warning_flags: ["other_suspicious_patterns"],
    labeled_risk: "legit",
    warnings: v.warnings,
  };
}

function buildIncomplete(rng: () => number): SeedEntry {
  return {
    post: {
      job_title: pick(rng, ["TBD title", "Open req", "—"]),
      job_desc: rng() < 0.5 ? "Details coming." : "ASAP. (more soon)",
      skills_desc: rng() < 0.45 ? "" : "WIP",
      company_profile:
        rng() < 0.28 ? pick(rng, COMPANIES)[0]! : companyLine(rng),
      rate:
        rng() < 0.26
          ? { amount_min: 40, amount_max: 40, currency: "USD", type: "hourly" }
          : normalRate(rng),
    },
    warning_flags: flags(rng, [
      ["poor_grammar"],
      ["other_suspicious_patterns"],
      ["typographical_errors"],
    ]),
    labeled_risk: "legit",
  };
}

function buildPunctNoise(rng: () => number): SeedEntry {
  const [corp, blurb] = pick(rng, COMPANIES);
  const role = pick(rng, ROLES);
  const suffix = pick(rng, SUFFIXES);
  const title = `${role}${suffix}`;
  const useAbsurd = rng() < 0.19;
  const rate = useAbsurd ? absurdRate(rng) : normalRate(rng);
  const job_desc = maybeTypo(
    rng,
    buildBenignDesc(rng, role) + " ... !!! ... DM ME NOW!!!! ok???"
  );
  return {
    post: {
      job_title: title,
      job_desc,
      skills_desc: buildSkills(rng),
      company_profile: `${corp} — ${blurb}.`,
      rate,
    },
    warning_flags: pick(rng, [
      ["typographical_errors"],
      ["poor_grammar"],
      ["typographical_errors", "poor_grammar"],
      ["excessive_punctuation"],
    ]),
    labeled_risk: "legit",
  };
}

function buildUrgencyScam(rng: () => number): SeedEntry {
  const scammy = rng() < 0.52;
  return {
    post: {
      job_title: pick(rng, [
        "IMMEDIATE START — NO INTERVIEW NEEDED!!!",
        "Earn $800/hr posting links (beginners welcome)",
        "Crypto payout daily — training kit refundable",
      ]),
      job_desc: scammy
        ? "Make $10k weekly part-time. Send gift cards for onboarding wallet verification. Telegram only!!! Limited slots!!!"
        : "START MONDAY OR LOSE SPOT!!! reply in 20 minutes!!! serious inquiries only!!!",
      skills_desc: scammy ? "none reqired!!!" : "fast responder",
      company_profile: scammy
        ? pick(rng, [
            "Unverified — gift-card onboarding language.",
            "Unverified — unrealistic weekly pay claim.",
            "Unverified — crypto-only contact.",
          ])
        : companyLine(rng),
      rate: scammy
        ? {
            amount_min: 10000,
            amount_max: 10000,
            currency: "USD",
            type: "weekly",
          }
        : normalRate(rng),
    },
    warning_flags: [
      "excessive_punctuation",
      "poor_grammar",
      "other_suspicious_patterns",
    ],
    labeled_risk: scammy ? "fraud" : "legit",
    warnings: scammy ? "Gift-card / unrealistic pay pattern." : undefined,
  };
}

function buildContradictory(rng: () => number): SeedEntry {
  return {
    post: {
      job_title: `${pick(rng, ROLES)} — WFH`,
      job_desc:
        "Fully distributed team — work from anywhere on earth. Must be in-office 5 days/week in Boise for badge access and parking validation. No relocation stipend.",
      skills_desc: "Async communication, mandatory daily in-person standup",
      company_profile: companyLine(rng),
      rate: normalRate(rng),
    },
    warning_flags: ["other_suspicious_patterns"],
    labeled_risk: "legit",
    warnings: "Contradictory remote vs onsite requirements.",
  };
}

function buildKeywordStuff(rng: () => number): SeedEntry {
  const kw =
    "terraform ansible jenkins graphql rest grpc microservices kafka spark airflow snowflake dbt tableau powerbi salesforce hubspot CPA CFA PMP ITIL CCNA CEH";
  const role = pick(rng, ROLES);
  const suffix = pick(rng, SUFFIXES);
  return {
    post: {
      job_title: `${role}${suffix}`,
      job_desc: `General opening. ${kw} ${kw} ${kw}`,
      skills_desc: kw,
      company_profile: companyLine(rng),
      rate: normalRate(rng),
    },
    warning_flags: ["other_suspicious_patterns"],
    labeled_risk: "legit",
    warnings: "Keyword stuffing.",
  };
}

function expandBucket(
  rng: () => number,
  bucket: Bucket,
  n: number,
  out: SeedEntry[]
) {
  const builders: Record<Bucket, () => SeedEntry> = {
    realistic: () => buildRealistic(rng),
    typo_grammar: () => buildTypoGrammar(rng),
    nonsense: () => buildNonsense(rng),
    ai_slop: () => buildAiSlop(rng),
    prompt_leak: () => buildPromptLeak(rng),
    bad_rate: () => buildBadRate(rng),
    skill_mismatch: () => buildSkillMismatch(rng),
    incomplete: () => buildIncomplete(rng),
    punct_noise: () => buildPunctNoise(rng),
    urgency_scam: () => buildUrgencyScam(rng),
    contradictory: () => buildContradictory(rng),
    keyword_stuff: () => buildKeywordStuff(rng),
  };
  const b = builders[bucket]!;
  for (let i = 0; i < n; i++) out.push(b());
}

function resolvePath(p: string): string {
  return isAbsolute(p) ? p : join(__dirname, p);
}

/** Append zero-width spaces to company_profile until JSON is unique vs prior + batch. */
function uniquifyAgainstPrior(
  entries: SeedEntry[],
  priorJsonPaths: string[]
): void {
  const seen = new Set<string>();
  for (const p of priorJsonPaths) {
    const raw = readFileSync(resolvePath(p), "utf8");
    const prior = JSON.parse(raw) as SeedEntry[];
    for (const e of prior) {
      seen.add(JSON.stringify(e));
    }
  }
  for (const e of entries) {
    let s = JSON.stringify(e);
    let guard = 0;
    while (seen.has(s)) {
      e.post.company_profile += "\u200b";
      s = JSON.stringify(e);
      if (++guard > 64) {
        throw new Error("uniquify: could not disambiguate row");
      }
    }
    seen.add(s);
  }
}

function parseArgs(): {
  seed: number;
  outFile: string;
  avoidDuplicatesFrom: string[];
} {
  const args = process.argv.slice(2);
  let seed = 0x4e6f_6973_79; // distinct seed from v1 noisy (0x2026_0411)
  let outFile = "improvement-seed-data-noisy-1000-fresh.json";
  const avoidDuplicatesFrom: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--seed" && args[i + 1]) {
      const raw = args[++i]!;
      seed = raw.startsWith("0x") ? parseInt(raw, 16) : Number.parseInt(raw, 10);
      if (!Number.isFinite(seed)) {
        throw new Error(`Invalid --seed: ${raw}`);
      }
    } else if (a === "--out" && args[i + 1]) {
      outFile = args[++i]!;
    } else if (a === "--avoid-duplicates-from" && args[i + 1]) {
      avoidDuplicatesFrom.push(args[++i]!);
    }
  }
  return { seed, outFile, avoidDuplicatesFrom };
}

function main() {
  const { seed, outFile, avoidDuplicatesFrom } = parseArgs();
  const rng = mulberry32(seed);
  const out: SeedEntry[] = [];

  (Object.keys(BUCKET_COUNTS) as Bucket[]).forEach((bucket) => {
    expandBucket(rng, bucket, BUCKET_COUNTS[bucket], out);
  });

  const shuffled = shuffle(rng, out);
  if (avoidDuplicatesFrom.length > 0) {
    uniquifyAgainstPrior(shuffled, avoidDuplicatesFrom);
  }

  const path = isAbsolute(outFile) ? outFile : join(__dirname, outFile);
  writeFileSync(path, JSON.stringify(shuffled, null, 2) + "\n", "utf8");
  console.error(`Wrote ${shuffled.length} entries to ${path}`);
}

main();
