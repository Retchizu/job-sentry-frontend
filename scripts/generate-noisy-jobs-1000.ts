/**
 * Generates 1000 noisy / low-quality / scam-pattern job postings for model training.
 * Same row shape and generators as improvement-seed-data-extra-500.json
 * (see scripts/generate-improvement-seed-500.ts: COMPANIES blurbs, ROLES/SUFFIXES,
 * maybeTypo / buildBenignDesc / buildSkills / normalRate / absurdRate).
 *
 * Schema: ImprovementFeedbackRequest (lib/api/types.ts — PredictPost + feedback fields).
 *
 * Run: npx tsx scripts/generate-noisy-jobs-1000.ts
 * Output: scripts/improvement-seed-data-noisy-<uuid>.json (new random id each run)
 */

import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ImprovementFeedbackRequest, ImprovementWarningFlag } from "../lib/api/types";

type RateType = "hourly" | "daily" | "weekly" | "monthly" | "yearly";

type SeedEntry = ImprovementFeedbackRequest;

/** Same list as generate-improvement-seed-500.ts — blurb includes `; location` for company_profile. */
const COMPANIES: [string, string][] = [
  ["3M", "industrial / consumer products; Midwest US"],
  ["Abbott", "medical devices & diagnostics; Illinois"],
  ["Accenture", "consulting; global"],
  ["Adobe", "creative software; San Jose"],
  ["Airbnb", "short-term rentals; remote-first"],
  ["Albertsons", "grocery retail; Western US"],
  ["AMD", "semiconductors; Austin"],
  ["Amtrak", "passenger rail; Northeast"],
  ["Anthropic", "AI research; SF"],
  ["Apple", "consumer electronics; Cupertino"],
  ["Aramark", "food & facilities; stadiums"],
  ["Atlassian", "developer tools; Sydney / SF"],
  ["Bank of America", "banking; Charlotte"],
  ["Best Buy", "consumer electronics retail"],
  ["Boeing", "aerospace; Seattle"],
  ["Bristol Myers Squibb", "pharma; NYC"],
  ["Cardinal Health", "healthcare supply chain"],
  ["Caterpillar", "heavy equipment; Illinois"],
  ["Chevron", "energy; Houston"],
  ["Cisco", "networking; San Jose"],
  ["Coca-Cola", "beverages; Atlanta"],
  ["Comcast", "telecom; Philadelphia"],
  ["Costco", "warehouse retail; Issaquah"],
  ["CVS Health", "pharmacy & retail health"],
  ["Dell Technologies", "IT hardware; Round Rock"],
  ["Delta Air Lines", "airline; Atlanta"],
  ["Deutsche Bank", "investment banking; Frankfurt"],
  ["Disney", "media & parks; Burbank"],
  ["Dow", "materials science; Midland"],
  ["Dropbox", "cloud storage; SF"],
  ["DuPont", "specialty materials; Wilmington"],
  ["Eli Lilly", "pharma; Indianapolis"],
  ["ExxonMobil", "oil & gas; Irving"],
  ["FedEx", "logistics; Memphis"],
  ["Fidelity", "asset management; Boston"],
  ["Ford", "automotive; Dearborn"],
  ["GE Aerospace", "aviation; Evendale"],
  ["General Mills", "CPG; Minneapolis"],
  ["Goldman Sachs", "investment banking; NYC"],
  ["Google", "search & cloud; Mountain View"],
  ["HCA Healthcare", "hospital operator; Nashville"],
  ["Home Depot", "home improvement retail; Atlanta"],
  ["Honeywell", "industrial tech; Charlotte"],
  ["HP", "PC & print; Palo Alto"],
  ["Humana", "insurance; Louisville"],
  ["IBM", "enterprise IT; Armonk"],
  ["Intel", "semiconductors; Santa Clara"],
  ["Intuit", "financial software; Mountain View"],
  ["Johnson & Johnson", "healthcare; New Brunswick"],
  ["JPMorgan Chase", "banking; NYC"],
  ["Kaiser Permanente", "integrated care; Oakland"],
  ["Kroger", "grocery; Cincinnati"],
  ["Lockheed Martin", "defense; Bethesda"],
  ["Lowe's", "home improvement; Mooresville"],
  ["Marriott", "hospitality; Bethesda"],
  ["Mastercard", "payments; Purchase"],
  ["McDonald's", "QSR; Chicago"],
  ["McKesson", "healthcare distribution; Irving"],
  ["Merck", "pharma; Rahway"],
  ["Meta", "social & VR; Menlo Park"],
  ["Microsoft", "software & cloud; Redmond"],
  ["Morgan Stanley", "investment bank; NYC"],
  ["Netflix", "streaming; Los Gatos"],
  ["Nike", "apparel; Beaverton"],
  ["Northrop Grumman", "defense; Falls Church"],
  ["Nvidia", "GPUs; Santa Clara"],
  ["Oracle", "enterprise software; Austin"],
  ["PepsiCo", "beverages & snacks; Purchase"],
  ["Pfizer", "pharma; NYC"],
  ["PG&E", "utilities; Oakland"],
  ["Philip Morris", "tobacco; NYC"],
  ["Pinterest", "social discovery; SF"],
  ["Procter & Gamble", "CPG; Cincinnati"],
  ["Progressive", "auto insurance; Mayfield"],
  ["Prudential", "insurance; Newark"],
  ["Publix", "grocery; Lakeland"],
  ["Raytheon", "defense; Waltham"],
  ["Rite Aid", "pharmacy retail"],
  ["Rivian", "EVs; Irvine"],
  ["Salesforce", "CRM; SF"],
  ["Samsung Electronics", "electronics; Korea / US"],
  ["Schneider Electric", "energy management; France"],
  ["Shell", "energy; Houston"],
  ["Shopify", "e-commerce; Ottawa"],
  ["Slack", "workplace chat; SF"],
  ["Snap", "social; Santa Monica"],
  ["Southern Company", "utilities; Atlanta"],
  ["SpaceX", "aerospace; Hawthorne"],
  ["Spotify", "audio streaming; Stockholm"],
  ["Starbucks", "coffee retail; Seattle"],
  ["Stripe", "payments; SF"],
  ["Sysco", "foodservice distribution; Houston"],
  ["T-Mobile", "wireless; Bellevue"],
  ["Target", "retail; Minneapolis"],
  ["Tesla", "EVs & energy; Austin"],
  ["Thermo Fisher", "life sciences; Waltham"],
  ["TJX", "off-price retail; Framingham"],
  ["Toyota North America", "automotive; Plano"],
  ["Twilio", "communications APIs; SF"],
  ["Uber", "mobility; SF"],
  ["Union Pacific", "rail; Omaha"],
  ["United Airlines", "airline; Chicago"],
  ["UnitedHealth", "insurance; Minnetonka"],
  ["UPS", "logistics; Atlanta"],
  ["Verizon", "telecom; NYC"],
  ["Visa", "payments; SF"],
  ["VMware", "virtualization; Palo Alto"],
  ["Walgreens", "pharmacy; Deerfield"],
  ["Walmart", "retail; Bentonville"],
  ["Wells Fargo", "banking; SF"],
  ["Wells Fargo Advisors", "wealth; St. Louis"],
  ["Weyerhaeuser", "timber; Seattle"],
  ["Workday", "HCM software; Pleasanton"],
  ["Zillow", "real estate tech; Seattle"],
];

/** Same as generate-improvement-seed-500.ts */
const ROLES = [
  "Staff Accountant",
  "Senior Accountant",
  "Payroll Analyst",
  "AP Specialist",
  "AR Analyst",
  "Financial Analyst",
  "Revenue Analyst",
  "IT Support Specialist",
  "Network Engineer",
  "Security Analyst",
  "DevOps Engineer",
  "Data Analyst",
  "HR Generalist",
  "Recruiter",
  "Benefits Coordinator",
  "Customer Success Manager",
  "Sales Development Rep",
  "Marketing Coordinator",
  "Content Writer",
  "UX Researcher",
  "Product Designer",
  "QA Engineer",
  "Backend Engineer",
  "Frontend Engineer",
  "ML Engineer",
  "Solutions Architect",
  "Business Analyst",
  "Project Manager",
  "Scrum Master",
  "Paralegal",
  "Legal Assistant",
  "Facilities Coordinator",
  "Office Manager",
  "Executive Assistant",
  "Warehouse Associate",
  "Inventory Specialist",
  "Purchasing Agent",
  "Clinical Research Associate",
  "Medical Coder",
  "Pharmacy Tech",
  "Registered Nurse — contract",
  "Licensed Practical Nurse",
  "Dental Hygienist",
  "Field Service Technician",
  "Help Desk Tier 1",
  "Systems Administrator",
  "Database Administrator",
  "SOC Analyst",
  "Penetration Tester",
  "Compliance Analyst",
  "Internal Auditor",
];

const SUFFIXES = [
  "",
  " — remote",
  " — hybrid",
  " — onsite",
  " — contract",
  " — temp-to-hire",
  " — night shift",
  " — part-time",
];

const AI_BUZZ = [
  "synergize cross-functional stakeholders in a fast-paced agile ecosystem",
  "leverage cutting-edge AI-driven workflows to unlock exponential value",
  "rockstar mindset with passion for disruption and world-class excellence",
  "best-in-class synergy across the digital transformation journey",
  "hyper-growth mindset; we move fast and break things (responsibly)",
  "thought leadership in the innovation space with OKR alignment",
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

/** Same typo injection as generate-improvement-seed-500.ts */
function maybeTypo(rng: () => number, text: string): string {
  if (rng() > 0.35) return text;
  const typos: [RegExp, string][] = [
    [/the /g, "teh "],
    [/ and /g, " adn "],
    [/with /g, "wiht "],
    [/reports/gi, "repoorts"],
    [/experience/gi, "experiance"],
    [/requirements/gi, "requirments"],
    [/responsible/gi, "repsonsible"],
    [/\./g, ".."],
    [/ing /g, "ingg "],
  ];
  let out = text;
  const [re, rep] = pick(rng, typos);
  out = out.replace(re, rep as string);
  if (rng() < 0.2) out = out + " (urgent hire!!)";
  return out;
}

function buildBenignDesc(rng: () => number, role: string): string {
  const templates = [
    () =>
      `${role} duties include day-to-day operations, stakeholder updates, and documentation. Reports to department lead.`,
    () =>
      `Looking for someone who can hit the ground running. ${role} will partner with cross-functional teams and track KPIs.`,
    () =>
      `Support month-end processes, ad hoc analysis, and process improvement. ${role} reports to site lead.`,
    () =>
      `Fast-paced environment. ${role} must be detail oriented and comfortable with ambiguity.`,
    () =>
      `We are growing the team. ${role} will own workflows, triage requests, and maintain SLAs where applicable.`,
    () =>
      `${role}: triage inbound requests, document runbooks, and coordinate with vendors. Reports to site lead.`,
    () =>
      `Own the queue for your pod. ${role} works closely with ops and sometimes weekends during cutover (rare).`,
    () =>
      `Month-end close support, reconciliations, flux commentary where needed. ${role} reports to site lead.`,
  ];
  return maybeTypo(rng, pick(rng, templates)());
}

function buildSkills(rng: () => number): string {
  const pools = [
    "Excel, communication",
    "SQL, Tableau",
    "Python, pandas",
    "AWS basics",
    "Jira, Confluence",
    "ERP, attention to detail",
    "Salesforce, CRM hygiene",
    "Slack, Google Workspace",
    "Kubernetes helpful not required",
    "CI/CD, Git",
    "HIPAA awareness",
    "SOC2 familiarity",
    "Stakeholder mgmt",
  ];
  const a = pick(rng, pools);
  let b = "";
  if (rng() > 0.5) {
    const rest = pools.filter((p) => p !== a);
    b = `, ${pick(rng, rest)}`;
  }
  return maybeTypo(rng, a + b).slice(0, 120);
}

function absurdRate(rng: () => number): {
  amount_min: number;
  amount_max: number;
  currency: string;
  type: RateType;
} {
  const kind = Math.floor(rng() * 12);
  switch (kind) {
    case 0:
      return { amount_min: 2, amount_max: 5, currency: "USD", type: "hourly" };
    case 1:
      return {
        amount_min: 400000,
        amount_max: 750000,
        currency: "USD",
        type: "yearly",
      };
    case 2:
      return {
        amount_min: 95000,
        amount_max: 110000,
        currency: "USD",
        type: "hourly",
      };
    case 3:
      return {
        amount_min: 18,
        amount_max: 22,
        currency: "EUR",
        type: "yearly",
      };
    case 4:
      return {
        amount_min: 500,
        amount_max: 800,
        currency: "GBP",
        type: "daily",
      };
    case 5:
      return {
        amount_min: 12000,
        amount_max: 14000,
        currency: "USD",
        type: "weekly",
      };
    case 6:
      return {
        amount_min: 480000,
        amount_max: 520000,
        currency: "JPY",
        type: "yearly",
      };
    case 7:
      return {
        amount_min: 3,
        amount_max: 4,
        currency: "USD",
        type: "monthly",
      };
    default: {
      const hourly = 18 + Math.floor(rng() * 80);
      return {
        amount_min: hourly,
        amount_max: hourly + 10 + Math.floor(rng() * 40),
        currency: pick(rng, ["USD", "USD", "USD", "CAD", "EUR"]),
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
    const lo = 22 + Math.floor(rng() * 55);
    return {
      amount_min: lo,
      amount_max: lo + 8 + Math.floor(rng() * 25),
      currency: "USD",
      type: "hourly",
    };
  }
  if (t === "monthly") {
    const lo = 4200 + Math.floor(rng() * 4000);
    return {
      amount_min: lo,
      amount_max: lo + 800 + Math.floor(rng() * 2000),
      currency: "USD",
      type: "monthly",
    };
  }
  const lo = 62000 + Math.floor(rng() * 70000);
  return {
    amount_min: lo,
    amount_max: lo + 8000 + Math.floor(rng() * 25000),
    currency: pick(rng, ["USD", "USD", "USD", "EUR"]),
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

/** Exactly 1000 entries: fixed counts per bucket for coverage */
const BUCKET_COUNTS: Record<Bucket, number> = {
  realistic: 150,
  typo_grammar: 120,
  nonsense: 100,
  ai_slop: 95,
  prompt_leak: 75,
  bad_rate: 85,
  skill_mismatch: 80,
  incomplete: 60,
  punct_noise: 45,
  urgency_scam: 55,
  contradictory: 35,
  keyword_stuff: 100,
};

/** Benign baseline matching generate-improvement-seed-500.ts main loop (no messy / no flagged-only). */
function buildRealistic(rng: () => number): SeedEntry {
  const [corp, blurb] = pick(rng, COMPANIES);
  const role = pick(rng, ROLES);
  const suffix = pick(rng, SUFFIXES);
  const title = `${role}${suffix}`;
  const useAbsurd = rng() < 0.18;
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

/** Same “messy” path as seed-500: `Must be avaliable immeditely.` + maybeTypo on title/skills. */
function buildTypoGrammar(rng: () => number): SeedEntry {
  const [corp, blurb] = pick(rng, COMPANIES);
  const role = pick(rng, ROLES);
  const suffix = pick(rng, SUFFIXES);
  const title = `${role}${suffix}`;
  const useAbsurd = rng() < 0.18;
  const rate = useAbsurd ? absurdRate(rng) : normalRate(rng);
  const job_desc = maybeTypo(
    rng,
    buildBenignDesc(rng, role) + " Must be avaliable immeditely."
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
    "do the needful",
    "touch base offline",
    "bring your own laptop (maybe)",
    "role is fluid",
    "sometimes weekends forever",
    "KPIs are vibes-based",
    "we need someone who knows things",
  ]);
  const rawDesc = fragments.slice(0, 4).join(". ") + ".";
  return {
    post: {
      job_title: pick(rng, [
        "Specialist (various)",
        "Doer of stuff",
        "??? urgent role ???",
      ]),
      job_desc: maybeTypo(rng, rawDesc),
      skills_desc: pick(rng, ["???", "misc", "see title"]),
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
      job_title: `${role}${suffix} — ${pick(rng, ["rockstar", "ninja", "guru"])}`,
      job_desc: `${buzz}. We are looking for a passionate team player who thrives in ambiguity and scales impact. ${pick(rng, AI_BUZZ)}.`,
      skills_desc:
        "Agile, scrum, stakeholder management, synergy, passion, hustle",
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
    `Generate a job description for a ${role} at a Fortune 500 company. Include salary range.`,
    `You are ChatGPT. Write a posting for ${role}. Tone: professional.`,
    `### Prompt\nCreate 5 bullet responsibilities for ${role}.\n\n### Output\n`,
    `[INST] Summarize ideal candidate for ${role} [/INST]`,
  ]);
  return {
    post: {
      job_title: `${role}${suffix}`,
      job_desc: `${leak}\n\nAlso: manage backlog and attend standups.`,
      skills_desc: "Jira, communication",
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
  const labeled = rng() < 0.2;
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
      job_title: "VP of Engineering — hands-on lead",
      job_desc:
        "Lead the entire engineering org. Must be comfortable with ambiguity and board updates.",
      skills_desc:
        "Basic email, Microsoft Word, willing to learn Git someday, entry-level curiosity",
      warnings: "Senior title vs beginner skills.",
    },
    {
      job_title: "Principal Data Scientist",
      job_desc:
        "Own our ML roadmap, mentor PhDs, publish at NeurIPS. Set strategy for the data org.",
      skills_desc: "Excel pivot tables, can open Jupyter once, statistics 101 helpful",
      warnings: "Senior DS title vs spreadsheet-level skills.",
    },
    {
      job_title: "Staff Security Architect",
      job_desc:
        "Design zero-trust for global infra; interface with CISO and auditors.",
      skills_desc: "Password must be 8 chars; used antivirus; heard of firewall",
      warnings: "Senior security role vs novice skills.",
    },
    {
      job_title: "Senior iOS Engineer (10+ yrs)",
      job_desc: "Ship features to millions of users; lead app architecture.",
      skills_desc: "HTML basics, willing to learn mobile, watched Swift tutorial",
      warnings: "Senior mobile vs web-beginner skills.",
    },
    {
      job_title: "Director of Finance",
      job_desc: "Own forecasting, FP&A, and board materials for public company segment.",
      skills_desc: "Used calculator, organized receipts in folder",
      warnings: "Executive finance vs trivial skills.",
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
      job_title: pick(rng, ["Contract role", "Temp", "—"]),
      job_desc: rng() < 0.5 ? "See above." : "Start ASAP. More info later.",
      skills_desc: rng() < 0.4 ? "" : "TBD",
      company_profile:
        rng() < 0.3 ? pick(rng, COMPANIES)[0]! : companyLine(rng),
      rate:
        rng() < 0.25
          ? { amount_min: 30, amount_max: 30, currency: "USD", type: "hourly" }
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

/** Same “flaggedOnly” punctuation path as generate-improvement-seed-500.ts */
function buildPunctNoise(rng: () => number): SeedEntry {
  const [corp, blurb] = pick(rng, COMPANIES);
  const role = pick(rng, ROLES);
  const suffix = pick(rng, SUFFIXES);
  const title = `${role}${suffix}`;
  const useAbsurd = rng() < 0.18;
  const rate = useAbsurd ? absurdRate(rng) : normalRate(rng);
  const job_desc = maybeTypo(
    rng,
    buildBenignDesc(rng, role) + "!!!  !!!  contact asap!!!!"
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
  const scammy = rng() < 0.55;
  return {
    post: {
      job_title: pick(rng, [
        "URGENT HIRING!!! APPLY NOW!!!",
        "Work from phone — $5000/day no experience",
        "Instant hire — wire training fee reimbursed",
      ]),
      job_desc: scammy
        ? "Earn $5000/day from home no experience needed. We send you checks you cash and forward (training). URGENT!!! WhatsApp only."
        : "URGENT OPENING start Monday!!! Must respond within 1 hour!!! Not a scam just fast hiring!!!",
      skills_desc: scammy ? "none needed!!!" : "fast typer",
      company_profile: scammy
        ? pick(rng, [
            "Unknown — guaranteed income claim.",
            "Unknown — high-pressure outreach.",
            "Unknown — suspicious benefits language.",
          ])
        : companyLine(rng),
      rate: scammy
        ? { amount_min: 5000, amount_max: 5000, currency: "USD", type: "daily" }
        : normalRate(rng),
    },
    warning_flags: [
      "excessive_punctuation",
      "poor_grammar",
      "other_suspicious_patterns",
    ],
    labeled_risk: scammy ? "fraud" : "legit",
    warnings: scammy ? "Guaranteed income / advance-fee pattern." : undefined,
  };
}

function buildContradictory(rng: () => number): SeedEntry {
  return {
    post: {
      job_title: `${pick(rng, ROLES)} — remote`,
      job_desc:
        "100% remote work from anywhere. Must attend daily on-site standup at our Austin office at 8am sharp. No relocation — local only. Travel 0% except weekly site visits.",
      skills_desc: "Remote collaboration, on-site presence",
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
    "python java rust go kubernetes docker aws azure gcp sql nosql react vue angular node rust blockchain agile scrum sales marketing SEO SEM CPA RN LPN HIPAA SOC2 PCI GDPR";
  const role = pick(rng, ROLES);
  const suffix = pick(rng, SUFFIXES);
  return {
    post: {
      job_title: `${role}${suffix}`,
      job_desc: `Looking for a generalist. ${kw} ${kw} ${kw}`,
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

function main() {
  const rng = mulberry32(0x2026_0411);
  const out: SeedEntry[] = [];

  (Object.keys(BUCKET_COUNTS) as Bucket[]).forEach((bucket) => {
    expandBucket(rng, bucket, BUCKET_COUNTS[bucket], out);
  });

  // Shuffle final order so categories aren't contiguous
  const shuffled = shuffle(rng, out);

  const path = join(
    __dirname,
    `improvement-seed-data-noisy-${randomUUID()}.json`
  );
  writeFileSync(path, JSON.stringify(shuffled, null, 2) + "\n", "utf8");
  console.error(`Wrote ${shuffled.length} entries to ${path}`);
}

main();
