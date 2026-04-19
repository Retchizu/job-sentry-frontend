/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { predictScam } from "@/lib/api";
import type { ApiError, PredictResponse } from "@/lib/api";
import { confidencePercent, getRiskTier, triplePercents } from "@/lib/prediction-risk-tier";
import { AppChromeHeader } from "@/app/app-chrome-header";
import { JobPostField } from "@/components/job-post-field";
import {
  buildSinglePost,
  hasJobPostText,
  INITIAL_JOB_POST_FORM_STATE,
  RATE_TYPE_SELECT_OPTIONS,
  type JobPostFormState,
} from "@/lib/job-post-form";
import { useAppDarkMode } from "@/lib/use-app-dark-mode";

const RESULT_PAGE_TITLE = "Risk check results";

const WARNING_LABELS: Record<string, string> = {
  upfront_payment: "Upfront payment",
  off_platform_contact: "Off-platform contact",
  high_pressure: "High pressure tactics",
  guaranteed_income: "Guaranteed income claims",
  crypto_or_gift_card: "Crypto or gift card payment",
  sensitive_info_request: "Sensitive information requested",
};

function formatWarningCode(code: string): string {
  return WARNING_LABELS[code] ?? code.replace(/_/g, " ");
}

/** Frame 3 (high risk / fraud) — icons in /public/images (from Figma MCP exports). */
const HIGH_RISK_ICONS = {
  warningLg: {
    light: "/images/high-risk-warning-lg-light.svg",
    dark: "/images/high-risk-warning-lg-dark.svg",
  },
  warningSm: {
    light: "/images/high-risk-warning-sm-light.svg",
    dark: "/images/high-risk-warning-sm-dark.svg",
  },
  info: {
    light: "/images/high-risk-info-light.svg",
    dark: "/images/info-icon-dark.svg",
  },
} as const;

/** Frame 4 (light) / Frame 10 (dark) — looks-safe prediction (JOBSENTRY). */
const SAFE_RESULT_ICONS = {
  checkLg: {
    light: "/images/safe-check-lg.svg",
    dark: "/images/safe-check-lg.svg",
  },
  checkSm: {
    light: "/images/safe-check-sm.svg",
    dark: "/images/safe-check-sm.svg",
  },
  info: {
    light: "/images/safe-info-light.svg",
    dark: "/images/info-icon-dark.svg",
  },
} as const;

function ProbabilityBreakdown({
  result,
  isDarkMode,
}: {
  result: PredictResponse;
  isDarkMode: boolean;
}) {
  const t = triplePercents(result);
  const muted = isDarkMode ? "text-[#bdb9d1]" : "text-[#767676]";
  return (
    <p className={`w-full text-center text-sm tabular-nums ${muted}`}>
      Model estimates: Legit {t.legit}% · Warning {t.warning}% · Fraud {t.fraud}%
    </p>
  );
}

/** Minimum time on the loading screen (3–5s). Longer posts get more time so copy can cycle. */
function estimateLoadingDurationMs(form: JobPostFormState): number {
  const parts = [
    form.jobTitle,
    form.jobDescription,
    form.skillsDescription,
    form.companyProfile,
  ];
  const totalChars = parts.reduce((n, s) => n + s.trim().length, 0);
  const filledFields = parts.filter((s) => s.trim().length > 0).length;
  const depth = totalChars + filledFields * 120;
  const t = Math.min(1, depth / 6000);
  return Math.round(3000 + t * 2000);
}

export default function Home() {
  const isDarkMode = useAppDarkMode();
  const [form, setForm] = useState<JobPostFormState>(INITIAL_JOB_POST_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<PredictResponse | null>(null);
  const [loadingDurationMs, setLoadingDurationMs] = useState(4000);

  const jobPostFilled = hasJobPostText(form);

  const handleAnalyze = async () => {
    if (isSubmitting || !jobPostFilled) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setPredictionResult(null);

    const minLoadingMs = estimateLoadingDurationMs(form);
    setLoadingDurationMs(minLoadingMs);
    const started = performance.now();

    try {
      const payload = { posts: [buildSinglePost(form)] };
      const result = await predictScam(payload);
      const remaining = minLoadingMs - (performance.now() - started);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setPredictionResult(result);
    } catch (error) {
      const apiError = error as ApiError;
      const remaining = minLoadingMs - (performance.now() - started);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setSubmitError(apiError.message || "Unable to analyze the job post right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return <LoadingFrame isDarkMode={isDarkMode} minDurationMs={loadingDurationMs} />;
  }

  if (predictionResult != null) {
    const tier = getRiskTier(predictionResult);
    const reset = () => setPredictionResult(null);
    if (tier === "fraud") {
      return (
        <FraudResultView isDarkMode={isDarkMode} result={predictionResult} onReset={reset} />
      );
    }
    if (tier === "warning") {
      return (
        <WarningResultView isDarkMode={isDarkMode} result={predictionResult} onReset={reset} />
      );
    }
    return <LooksSafeResultView isDarkMode={isDarkMode} result={predictionResult} onReset={reset} />;
  }

  return (
    <div
      className={`w-full pb-[60px] ${isDarkMode ? "bg-[#040016] text-white" : "bg-white text-black"}`}
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div className="flex w-full flex-col items-center gap-5">
        <AppChromeHeader activeTab="main" isDarkMode={isDarkMode} />

        <main className="flex w-full max-w-[874px] flex-col items-end gap-10">
          <section className="w-full text-center">
            <h1 className="text-4xl font-semibold">Job Post Risk Check</h1>
            <p className={`mt-5 text-base ${isDarkMode ? "text-white" : "text-[#767676]"}`}>
              Enter job post details below. Our model scores the posting across
              three risk levels—legitimate-looking, needs review, and higher
              fraud risk—using language cues and compensation consistency.
            </p>
          </section>

          <section
            className={`w-full rounded-lg p-7 shadow-[0_0_4px_0_rgba(0,0,0,0.25)] ${isDarkMode ? "border border-[#767676]/70 bg-[#05001b]" : "bg-white"}`}
          >
            <div className="space-y-5">
              <JobPostField
                label="Job title"
                placeholder="e.g. Software Engineer"
                isDarkMode={isDarkMode}
                value={form.jobTitle}
                onChange={(value) => setForm((prev) => ({ ...prev, jobTitle: value }))}
              />
              <JobPostField
                label="Job Description"
                placeholder="Paste the main body of the job description here..."
                textarea
                heightClass="h-[200px]"
                isDarkMode={isDarkMode}
                value={form.jobDescription}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, jobDescription: value }))
                }
              />
              <JobPostField
                label="Skills Description"
                placeholder="Required skills, qualifications, or experience..."
                textarea
                heightClass="h-[140px]"
                isDarkMode={isDarkMode}
                value={form.skillsDescription}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, skillsDescription: value }))
                }
              />
              <JobPostField
                label="Company Profile"
                placeholder="e.g. Industry, company size, culture, or mission..."
                textarea
                heightClass="h-[140px]"
                isDarkMode={isDarkMode}
                value={form.companyProfile}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, companyProfile: value }))
                }
              />
            </div>
          </section>

          <section
            className={`w-full rounded-lg p-7 shadow-[0_0_4px_0_rgba(0,0,0,0.25)] ${isDarkMode ? "border border-[#767676]/70 bg-[#05001b]" : "bg-white"}`}
          >
            <div className="flex items-center gap-5">
              <h2 className="text-2xl font-semibold">Compensation</h2>
              <p className="text-base text-[#8d8d8d]">(Optional)</p>
            </div>

            <div
              className={`mt-5 flex items-start gap-5 rounded-lg px-5 py-4 ${isDarkMode ? "bg-[#1b1537]" : "bg-[#f6f4ff]"}`}
            >
              <img
                alt="Information icon"
                src={
                  isDarkMode ? "/images/compensation-hint-dark.svg" : "/images/compensation-hint-light.svg"
                }
                className="mt-0.5 h-5 w-5"
              />
              <p className="text-sm">
                If you enter any amount, currency, or type, it&apos;s recommended
                to fill all compensation fields for a more accurate analysis.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <JobPostField
                label="Amount Min"
                placeholder="0"
                isDarkMode={isDarkMode}
                value={form.amountMin}
                onChange={(value) => setForm((prev) => ({ ...prev, amountMin: value }))}
              />
              <JobPostField
                label="Amount Max"
                placeholder="0"
                isDarkMode={isDarkMode}
                value={form.amountMax}
                onChange={(value) => setForm((prev) => ({ ...prev, amountMax: value }))}
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
              <JobPostField
                label="Currency"
                placeholder="USD"
                isDarkMode={isDarkMode}
                value={form.currency}
                onChange={(value) => setForm((prev) => ({ ...prev, currency: value }))}
              />
              <JobPostField
                label="Rate Type"
                placeholder="Select"
                isDarkMode={isDarkMode}
                value={form.rateType}
                onChange={(value) => setForm((prev) => ({ ...prev, rateType: value }))}
                selectOptions={RATE_TYPE_SELECT_OPTIONS}
              />
            </div>
          </section>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isSubmitting || !jobPostFilled}
            className={`flex items-center gap-2 rounded-lg p-5 text-2xl font-semibold shadow-[0_0_4px_0_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-40 ${isDarkMode ? "bg-white text-[#6c4bff]" : "bg-[#6c4bff] text-white"}`}
          >
            <img
              alt="Search icon"
              src={
                isDarkMode
                  ? "/images/validate-button-icon-dark.svg"
                  : "/images/validate-button-icon-light.svg"
              }
              className="h-5 w-5"
            />
            {isSubmitting ? "Checking..." : "Check post"}
          </button>
          {submitError && (
            <p className={`w-full text-sm ${isDarkMode ? "text-[#ff9b9b]" : "text-[#b00020]"}`}>
              {submitError}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

function LooksSafeResultView({
  isDarkMode,
  result,
  onReset,
}: {
  isDarkMode: boolean;
  result: PredictResponse;
  onReset: () => void;
}) {
  const pct = confidencePercent(result);
  const warningCodes = result.warnings[0] ?? [];
  const checkLg = isDarkMode ? SAFE_RESULT_ICONS.checkLg.dark : SAFE_RESULT_ICONS.checkLg.light;
  const checkSm = isDarkMode ? SAFE_RESULT_ICONS.checkSm.dark : SAFE_RESULT_ICONS.checkSm.light;
  const infoIcon = isDarkMode ? SAFE_RESULT_ICONS.info.dark : SAFE_RESULT_ICONS.info.light;
  const warnSm = isDarkMode ? HIGH_RISK_ICONS.warningSm.dark : HIGH_RISK_ICONS.warningSm.light;

  const cardClass = isDarkMode
    ? "border-[#2a8f3c] bg-[#0a1f0f]"
    : "border-[#00b20c] bg-[#effff0]";
  const circleBg = isDarkMode ? "bg-[#143d22]" : "bg-[#d7ffd9]";
  const titleGreen = isDarkMode ? "text-[#5ef79a]" : "text-[#00b20c]";
  const bulletGreen = isDarkMode ? "text-[#7dffb3]" : "text-[#00b20c]";
  const scoreMuted = isDarkMode ? "text-[#bdb9d1]" : "text-[#767676]";
  const infoMuted = isDarkMode ? "text-[#bdb9d1]" : "text-[#767676]";
  const heuristicMuted = isDarkMode ? "text-[#fbbf24]" : "text-[#b45309]";

  return (
    <div
      className={`flex min-h-dvh w-full flex-col ${isDarkMode ? "bg-[#040016] text-white" : "bg-white text-black"}`}
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div className="flex w-full flex-col items-center gap-5 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
        <AppChromeHeader activeTab="main" isDarkMode={isDarkMode} />

        <main className="flex w-full max-w-[874px] flex-col items-center gap-10 px-6 sm:px-0">
          <h1
            className={`w-full text-center text-4xl font-semibold ${isDarkMode ? "text-white" : "text-black"}`}
          >
            {RESULT_PAGE_TITLE}
          </h1>

          <div
            className={`flex w-full max-w-[426px] flex-col items-center gap-[30px] rounded-lg border px-10 py-7 ${cardClass}`}
          >
            <div className={`relative size-[120px] shrink-0 overflow-hidden rounded-full ${circleBg}`}>
              <img alt="" src={checkLg} className="absolute left-5 top-5 size-20" />
            </div>
            <div className="flex w-full flex-col items-center gap-2 text-center">
              <p className={`text-[32px] font-semibold leading-none ${titleGreen}`}>Looks Safe</p>
              <p className={`text-xl font-semibold ${scoreMuted}`}>Confidence Score: {pct}%</p>
              <ProbabilityBreakdown result={result} isDarkMode={isDarkMode} />
            </div>
          </div>

          <section className="flex w-full flex-col gap-3">
            <h2 className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>
              Analysis Breakdown
            </h2>
            {warningCodes.map((code) => (
              <div key={code} className="flex gap-3">
                <img alt="" src={warnSm} className="mt-0.5 size-5 shrink-0" />
                <p className={`text-left text-base ${heuristicMuted}`}>{formatWarningCode(code)}</p>
              </div>
            ))}
            <div className="flex gap-3">
              <img alt="" src={checkSm} className="mt-0.5 size-5 shrink-0" />
              <p className={`text-left text-base ${bulletGreen}`}>Clear job role and responsibilities.</p>
            </div>
            <div className="flex gap-3">
              <img alt="" src={checkSm} className="mt-0.5 size-5 shrink-0" />
              <p className={`text-left text-base ${bulletGreen}`}>Reasonable compensation details provided.</p>
            </div>
            <div className="flex gap-3">
              <img alt="" src={infoIcon} className="mt-0.5 size-5 shrink-0" />
              <p className={`text-left text-base ${infoMuted}`}>
                Language processing complete. No obvious grammar anomalies found.
              </p>
            </div>
          </section>

          <button
            type="button"
            onClick={onReset}
            className={`flex w-full max-w-[426px] items-center justify-center rounded-lg p-5 text-xl font-medium shadow-[0_0_4px_0_rgba(0,0,0,0.25)] ${isDarkMode ? "border border-white text-white" : "border border-black text-black"}`}
          >
            Reset Analysis
          </button>
        </main>
      </div>
    </div>
  );
}

function WarningResultView({
  isDarkMode,
  result,
  onReset,
}: {
  isDarkMode: boolean;
  result: PredictResponse;
  onReset: () => void;
}) {
  const pct = confidencePercent(result);
  const warningCodes = result.warnings[0] ?? [];
  const warnLg = isDarkMode ? HIGH_RISK_ICONS.warningLg.dark : HIGH_RISK_ICONS.warningLg.light;
  const warnSm = isDarkMode ? HIGH_RISK_ICONS.warningSm.dark : HIGH_RISK_ICONS.warningSm.light;
  const infoIcon = isDarkMode ? HIGH_RISK_ICONS.info.dark : HIGH_RISK_ICONS.info.light;

  const cardClass = isDarkMode
    ? "border-amber-500/80 bg-amber-950/35"
    : "border-amber-500 bg-amber-50";
  const circleBg = isDarkMode ? "bg-amber-900/50" : "bg-amber-100";
  const titleClass = isDarkMode ? "text-amber-200" : "text-amber-800";
  const bulletClass = isDarkMode ? "text-amber-200" : "text-amber-900";

  return (
    <div
      className={`flex min-h-dvh w-full flex-col ${isDarkMode ? "bg-[#040016] text-white" : "bg-white text-black"}`}
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div className="flex w-full flex-col items-center gap-5 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
        <AppChromeHeader activeTab="main" isDarkMode={isDarkMode} />

        <main className="flex w-full max-w-[874px] flex-col items-center gap-10 px-6 sm:px-0">
          <h1
            className={`w-full text-center text-4xl font-semibold ${isDarkMode ? "text-white" : "text-black"}`}
          >
            {RESULT_PAGE_TITLE}
          </h1>

          <div
            className={`flex w-full max-w-[426px] flex-col items-center gap-[30px] rounded-lg border px-10 py-7 ${cardClass}`}
          >
            <div className={`relative size-[120px] shrink-0 overflow-hidden rounded-full ${circleBg}`}>
              <img alt="" src={warnLg} className="absolute left-5 top-5 size-20" />
            </div>
            <div className="flex w-full flex-col items-center gap-2 text-center">
              <p className={`text-[32px] font-semibold leading-none ${titleClass}`}>Review carefully</p>
              <p className={`text-xl font-semibold ${isDarkMode ? "text-[#bdb9d1]" : "text-[#767676]"}`}>
                Confidence Score: {pct}%
              </p>
              <ProbabilityBreakdown result={result} isDarkMode={isDarkMode} />
            </div>
          </div>

          <section className="flex w-full flex-col gap-3">
            <h2 className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>
              Analysis Breakdown
            </h2>
            {warningCodes.length === 0 ? (
              <div className="flex gap-3">
                <img alt="" src={warnSm} className="mt-0.5 size-5 shrink-0" />
                <p className={`text-left text-base ${bulletClass}`}>
                  Model flagged this post for review; no specific heuristic rules matched.
                </p>
              </div>
            ) : (
              warningCodes.map((code) => (
                <div key={code} className="flex gap-3">
                  <img alt="" src={warnSm} className="mt-0.5 size-5 shrink-0" />
                  <p className={`text-left text-base ${bulletClass}`}>{formatWarningCode(code)}</p>
                </div>
              ))
            )}
            <div className="flex gap-3">
              <img alt="" src={infoIcon} className="mt-0.5 size-5 shrink-0" />
              <p
                className={`text-left text-base ${isDarkMode ? "text-white" : "text-[#767676]"}`}
              >
                Language processing complete. No obvious grammar anomalies found.
              </p>
            </div>
          </section>

          <button
            type="button"
            onClick={onReset}
            className={`flex w-full max-w-[426px] items-center justify-center rounded-lg p-5 text-xl font-medium shadow-[0_0_4px_0_rgba(0,0,0,0.25)] ${isDarkMode ? "border border-white text-white" : "border border-black text-black"}`}
          >
            Reset Analysis
          </button>
        </main>
      </div>
    </div>
  );
}

function FraudResultView({
  isDarkMode,
  result,
  onReset,
}: {
  isDarkMode: boolean;
  result: PredictResponse;
  onReset: () => void;
}) {
  const pct = confidencePercent(result);
  const warningCodes = result.warnings[0] ?? [];
  const warnLg = isDarkMode ? HIGH_RISK_ICONS.warningLg.dark : HIGH_RISK_ICONS.warningLg.light;
  const warnSm = isDarkMode ? HIGH_RISK_ICONS.warningSm.dark : HIGH_RISK_ICONS.warningSm.light;
  const infoIcon = isDarkMode ? HIGH_RISK_ICONS.info.dark : HIGH_RISK_ICONS.info.light;

  return (
    <div
      className={`flex min-h-dvh w-full flex-col ${isDarkMode ? "bg-[#040016] text-white" : "bg-white text-black"}`}
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div className="flex w-full flex-col items-center gap-5 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
        <AppChromeHeader activeTab="main" isDarkMode={isDarkMode} />

        <main className="flex w-full max-w-[874px] flex-col items-center gap-10 px-6 sm:px-0">
          <h1
            className={`w-full text-center text-4xl font-semibold ${isDarkMode ? "text-white" : "text-black"}`}
          >
            {RESULT_PAGE_TITLE}
          </h1>

          <div className="flex w-full max-w-[426px] flex-col items-center gap-[30px] rounded-lg border border-[#f42b2b] bg-[#ffe3e3] px-10 py-7">
            <div className="relative size-[120px] shrink-0 overflow-hidden rounded-full bg-[#ffd0d0]">
              <img
                alt=""
                src={warnLg}
                className="absolute left-5 top-5 size-20"
              />
            </div>
            <div className="flex w-full flex-col items-center gap-2 text-center">
              <p className="text-[32px] font-semibold leading-none text-[#f42b2b]">Fraud risk</p>
              <p className="text-xl font-semibold text-[#767676]">
                Confidence Score: {pct}%
              </p>
              <ProbabilityBreakdown result={result} isDarkMode={isDarkMode} />
            </div>
          </div>

          <section className="flex w-full flex-col gap-3">
            <h2 className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>
              Analysis Breakdown
            </h2>
            {warningCodes.length === 0 ? (
              <div className="flex gap-3">
                <img alt="" src={warnSm} className="mt-0.5 size-5 shrink-0" />
                <p className="text-left text-base text-[#f42b2b]">
                  Model flagged this post as fraud risk; no specific heuristic rules matched.
                </p>
              </div>
            ) : (
              warningCodes.map((code) => (
                <div key={code} className="flex gap-3">
                  <img alt="" src={warnSm} className="mt-0.5 size-5 shrink-0" />
                  <p className="text-left text-base text-[#f42b2b]">{formatWarningCode(code)}</p>
                </div>
              ))
            )}
            <div className="flex gap-3">
              <img alt="" src={infoIcon} className="mt-0.5 size-5 shrink-0" />
              <p
                className={`text-left text-base ${isDarkMode ? "text-white" : "text-[#767676]"}`}
              >
                Language processing complete. No obvious grammar anomalies found.
              </p>
            </div>
          </section>

          <button
            type="button"
            onClick={onReset}
            className={`flex w-full max-w-[426px] items-center justify-center rounded-lg p-5 text-xl font-medium shadow-[0_0_4px_0_rgba(0,0,0,0.25)] ${isDarkMode ? "border border-white text-white" : "border border-black text-black"}`}
          >
            Reset Analysis
          </button>
        </main>
      </div>
    </div>
  );
}

const LOADING_STATUS_MESSAGES = [
  "We're reading your post and weighing signals from safer-looking text through review-level cues to stronger fraud risk.",
  "Cross-referencing language with common recruitment red flags and pressure tactics.",
  "Reviewing compensation fields for numbers that look inconsistent or inflated.",
  "Scanning for vague job titles, off-platform nudges, or pay that sounds too good to be true.",
  "Checking whether the post asks for fees up front or sensitive data too early.",
  "Separating softer review-level signals from stronger fraud-style patterns when both show up.",
  "Matching phrasing against known high-risk templates—almost there.",
  "Combining scores into legit, warning, and fraud-style probabilities for your summary.",
] as const;

const LOADING_TIP_LINES = [
  "Parsing job title, description, and skills text.",
  "Evaluating company profile and how well it aligns with the role.",
  "When you added a rate, we verify currency, range, and type together.",
  "Weighting longer posts a bit more so nothing important is skipped.",
  "Layering model scores so the summary reflects legit, warning, or fraud-tier risk.",
] as const;

function LoadingFrame({
  isDarkMode,
  minDurationMs,
}: {
  isDarkMode: boolean;
  minDurationMs: number;
}) {
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const step = Math.max(
      900,
      Math.floor(minDurationMs / Math.max(1, LOADING_STATUS_MESSAGES.length)),
    );
    const id = setInterval(() => {
      setStatusIndex((i) => (i + 1) % LOADING_STATUS_MESSAGES.length);
    }, step);
    return () => clearInterval(id);
  }, [minDurationMs]);

  const mutedClass = isDarkMode ? "text-[#bdb9d1]" : "text-[#767676]";
  const tipClass = isDarkMode ? "text-[#a8a3c4]" : "text-[#5c5c5c]";
  const barTrack = isDarkMode ? "bg-white/15" : "bg-[#e8e0ff]";
  const barFill = isDarkMode ? "bg-[#8a72ff]" : "bg-[#6c4bff]";
  const dotClass = isDarkMode ? "bg-[#c4b5ff]" : "bg-[#6c4bff]";

  const spinner = isDarkMode ? (
    <div className="relative mx-auto mb-8 h-24 w-24">
      <div className="absolute inset-0 animate-spin rounded-full border-4 border-[#2a1f57] border-t-[#8a72ff]" />
      <div className="absolute inset-[10px] animate-spin rounded-full border-4 border-transparent border-t-white [animation-direction:reverse] [animation-duration:1.4s]" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <img
          alt="Job Sentry logo"
          src="/images/job-sentry-shield-dark.svg"
          className="h-9 w-9 motion-safe:animate-[loading-title-soft_2.2s_ease-in-out_infinite]"
        />
      </div>
    </div>
  ) : (
    <div className="relative mx-auto mb-6 h-20 w-20">
      <div className="h-20 w-20 animate-spin rounded-full border-4 border-[#e5deff] border-t-[#6c4bff]" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <img
          alt="Job Sentry logo"
          src="/images/job-sentry-shield-light.svg"
          className="h-7 w-7 motion-safe:animate-[loading-title-soft_2.2s_ease-in-out_infinite]"
        />
      </div>
    </div>
  );

  const body = (
    <div className="w-full max-w-[560px] text-center">
      {spinner}
      <p
        className="text-3xl font-semibold motion-safe:animate-[loading-title-soft_2.6s_ease-in-out_infinite]"
        style={{ animationDelay: "0.15s" }}
      >
        Checking your post
        <span className="inline-flex w-[1.35em] justify-start tabular-nums">
          <span className="motion-safe:animate-[loading-ellipsis_1.2s_ease-in-out_infinite]">.</span>
          <span
            className="motion-safe:animate-[loading-ellipsis_1.2s_ease-in-out_infinite]"
            style={{ animationDelay: "0.2s" }}
          >
            .
          </span>
          <span
            className="motion-safe:animate-[loading-ellipsis_1.2s_ease-in-out_infinite]"
            style={{ animationDelay: "0.4s" }}
          >
            .
          </span>
        </span>
      </p>
      <div
        className={`relative mx-auto mt-5 min-h-[5rem] max-w-[480px] text-base leading-relaxed ${mutedClass}`}
        aria-live="polite"
      >
        {LOADING_STATUS_MESSAGES.map((line, i) => (
          <p
            key={line}
            className={`absolute inset-x-0 top-0 transition-all duration-700 ease-out motion-reduce:transition-none ${
              i === statusIndex
                ? "z-10 translate-y-0 opacity-100 blur-0"
                : "z-0 translate-y-2 opacity-0 blur-[2px] pointer-events-none"
            }`}
          >
            {line}
          </p>
        ))}
      </div>

      <div className={`mx-auto mt-8 h-2 w-full max-w-[400px] overflow-hidden rounded-full ${barTrack}`}>
        <div
          className={`h-full ${barFill} rounded-full`}
          style={{
            transformOrigin: "left center",
            transform: "scaleX(0)",
            animationName: "loading-bar-fill, loading-bar-glow",
            animationDuration: `${minDurationMs}ms, 1.8s`,
            animationTimingFunction: "linear, ease-in-out",
            animationIterationCount: "1, infinite",
            animationFillMode: "forwards, none",
          }}
        />
      </div>
      <p className={`mt-3 text-xs ${tipClass}`}>
        This pass runs about {(minDurationMs / 1000).toFixed(1)}s for your submission (3–5s depending on how much you
        entered).
      </p>

      <ul className={`mx-auto mt-8 max-w-[440px] space-y-3 text-left text-sm ${tipClass}`}>
        {LOADING_TIP_LINES.map((line, i) => (
          <li
            key={line}
            className="flex gap-3 opacity-0"
            style={{
              animation: "loading-tip-in 0.5s ease-out forwards",
              animationDelay: `${180 + i * 160}ms`,
            }}
          >
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass} motion-safe:animate-pulse`} />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  if (isDarkMode) {
    return (
      <div
        className="flex min-h-dvh w-full items-center justify-center bg-[#040016] px-6 text-white"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {body}
      </div>
    );
  }

  return (
    <div
      className="flex min-h-dvh w-full items-center justify-center bg-white px-6 text-black"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div className="w-full max-w-[560px] rounded-2xl bg-white p-10 text-center shadow-[0_0_8px_0_rgba(0,0,0,0.25)]">
        {body}
      </div>
    </div>
  );
}

