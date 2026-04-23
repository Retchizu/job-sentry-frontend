/**
 * One-off generator for improvement-seed-data-extra-500.json
 * Run: npx tsx scripts/generate-improvement-seed-500.ts > scripts/improvement-seed-data-extra-500.json
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

type RateType = "hourly" | "daily" | "weekly" | "monthly" | "yearly";

interface SeedEntry {
  post: {
    job_title: string;
    job_desc: string;
    skills_desc: string;
    company_profile: string;
    rate: {
      amount_min: number;
      amount_max: number;
      currency: string;
      type: RateType;
    };
  };
  warning_flags: string[];
  labeled_risk: "legit" | "warning" | "fraud";
  warnings?: string;
}

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

const SCAM_TEMPLATES: SeedEntry[] = [
  {
    post: {
      job_title: "Wire transfer associate — your bank login for training",
      job_desc:
        "We onboard you faster if you add our device to your online banking (read only)..",
      skills_desc: "online banking",
      company_profile: "Unknown — credential solicitation pattern.",
      rate: { amount_min: 35, amount_max: 50, currency: "USD", type: "hourly" },
    },
    warning_flags: ["other_suspicious_patterns", "poor_grammar"],
    labeled_risk: "fraud",
    warnings: "Bank login request under training pretense.",
  },
  {
    post: {
      job_title: "Reshipping coordinator — use your address",
      job_desc:
        "Recieve packages relabel and reship we pay per box (high volume).",
      skills_desc: "UPS, fedex",
      company_profile: "Unknown — reshipping mule pattern.",
      rate: {
        amount_min: 2800,
        amount_max: 4500,
        currency: "USD",
        type: "monthly",
      },
    },
    warning_flags: ["typographical_errors", "other_suspicious_patterns"],
    labeled_risk: "fraud",
    warnings: "Reshipping / parcel mule.",
  },
  {
    post: {
      job_title: "Crypto liquidity miner — send ETH to unlock dashboard",
      job_desc:
        "Small gas fee to activate wallet then daily yields posted to dashboard (not withdrawable first 30d).",
      skills_desc: "metamask",
      company_profile: "Unknown — advance-fee crypto pattern.",
      rate: {
        amount_min: 200,
        amount_max: 2000,
        currency: "USD",
        type: "daily",
      },
    },
    warning_flags: ["other_suspicious_patterns"],
    labeled_risk: "fraud",
    warnings: "Advance fee; unrealistic daily yield.",
  },
  {
    post: {
      job_title: "Gift card procurement — reimburse after event",
      job_desc:
        "Buy steam cards for vendor hold we wire you back same day (receipt photo to whatsapp only).",
      skills_desc: "gift cards",
      company_profile: "Unknown — gift-card advance fee.",
      rate: { amount_min: 4000, amount_max: 7000, currency: "USD", type: "monthly" },
    },
    warning_flags: ["poor_grammar", "other_suspicious_patterns"],
    labeled_risk: "fraud",
    warnings: "Gift-card reimbursement scam language.",
  },
  {
    post: {
      job_title: "Mystery shopper — cash your check first",
      job_desc:
        "We mail you a check deposit keep 10% forward rest via moneygram (training assignment).",
      skills_desc: "retail",
      company_profile: "Unknown — fake check / money mule.",
      rate: { amount_min: 22, amount_max: 35, currency: "USD", type: "hourly" },
    },
    warning_flags: ["other_suspicious_patterns", "poor_grammar"],
    labeled_risk: "fraud",
    warnings: "Classic fake-check forwarding.",
  },
  {
    post: {
      job_title: "Forex \"guaranteed\" hedger — broker match",
      job_desc:
        "Broker matches deposit we hedge both sides you cant loose math is proven.",
      skills_desc: "mt5",
      company_profile: "Unknown — impossible hedge claim.",
      rate: {
        amount_min: 500,
        amount_max: 4000,
        currency: "USD",
        type: "daily",
      },
    },
    warning_flags: [
      "typographical_errors",
      "poor_grammar",
      "other_suspicious_patterns",
    ],
    labeled_risk: "fraud",
    warnings: "Unrealistic daily rate; gambling language.",
  },
  {
    post: {
      job_title: "Payroll assistant — share your Indeed login",
      job_desc:
        "We post jobs from your account you forward applicants to us (split commission).",
      skills_desc: "indeed",
      company_profile: "Unknown — account misuse.",
      rate: { amount_min: 19, amount_max: 28, currency: "USD", type: "hourly" },
    },
    warning_flags: ["other_suspicious_patterns"],
    labeled_risk: "fraud",
    warnings: "Credential sharing for posting.",
  },
  {
    post: {
      job_title: "Dropshipping CEO assistant — LLC in your name",
      job_desc:
        "Open US LLC + bank for stripe you forward payouts minus small fee trust based partnership.",
      skills_desc: "LLC",
      company_profile: "Unknown — nominee financial identity.",
      rate: {
        amount_min: 90000,
        amount_max: 140000,
        currency: "USD",
        type: "yearly",
      },
    },
    warning_flags: ["poor_grammar", "other_suspicious_patterns"],
    labeled_risk: "fraud",
    warnings: "Nominee company pattern.",
  },
];

function scamEntry(_rng: () => number, i: number): SeedEntry {
  const base = SCAM_TEMPLATES[i % SCAM_TEMPLATES.length]!;
  return {
    post: { ...base.post, rate: { ...base.post.rate } },
    warning_flags: [...base.warning_flags],
    labeled_risk: base.labeled_risk,
    ...(base.warnings ? { warnings: base.warnings } : {}),
  };
}

function main() {
  const rng = mulberry32(0x4a7f_5000);
  const out: SeedEntry[] = [];

  for (let i = 0; i < 500; i++) {
    const roll = rng();

    if (roll < 0.06) {
      out.push(scamEntry(rng, i));
      continue;
    }

    const [corp, blurb] = pick(rng, COMPANIES);
    const role = pick(rng, ROLES);
    const suffix = pick(rng, SUFFIXES);
    const title = `${role}${suffix}`;

    const messy = roll > 0.55 && roll < 0.72;
    const flaggedOnly = roll > 0.88;

    const useAbsurd = rng() < 0.18;
    const rate = useAbsurd ? absurdRate(rng) : normalRate(rng);

    let job_desc = buildBenignDesc(rng, role);
    if (messy) {
      job_desc = maybeTypo(rng, job_desc + " Must be avaliable immeditely.");
    }

    const entry: SeedEntry = {
      post: {
        job_title: title,
        job_desc,
        skills_desc: buildSkills(rng),
        company_profile: `${corp} — ${blurb}.`,
        rate,
      },
      warning_flags: [],
      labeled_risk: "legit",
    };

    if (flaggedOnly) {
      entry.warning_flags = pick(rng, [
        ["typographical_errors"],
        ["poor_grammar"],
        ["typographical_errors", "poor_grammar"],
        ["excessive_punctuation"],
      ]);
      entry.post.job_desc = maybeTypo(
        rng,
        entry.post.job_desc + "!!!  !!!  contact asap!!!!"
      );
      entry.labeled_risk = "warning";
    }

    out.push(entry);
  }

  const path = join(__dirname, "improvement-seed-data-extra-500.json");
  writeFileSync(path, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.error(`Wrote ${out.length} entries to ${path}`);
}

main();
